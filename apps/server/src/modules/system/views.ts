import type { WorkerEnv } from '../../env';
import { AppError } from '../../middleware/errorHandler';
import { lastVisitorKey, type VisitorGeolocation } from './visitor';
import { siteInfoLinks } from '@meme/shared';

export const totalViewsKey = 'analytics:views:total';
export const postViewsKey = (id: string) => `analytics:views:post:${id}`;

export async function readViews(env: WorkerEnv, key: string) {
  const rows = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).all<{ value: string }>();
  const value = Number(rows.results[0]?.value ?? 0);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export async function recordPageView(env: WorkerEnv, path: unknown, visitor?: VisitorGeolocation | null) {
  if (typeof path !== 'string' || path.length > 1000 || !path.startsWith('/') || path.includes('?') || path.includes('#')) throw AppError.badRequest('页面路径无效');
  const normalized = path.replace(/\/$/, '') || '/';
  const isIndex = ['/', '/blog', '/projects', '/guestbook', ...siteInfoLinks.map(page => page.path)].includes(normalized);
  let postId: string | null = null;
  if (!isIndex) {
    if (!/^\/[^/]+$/.test(normalized) || ['/admin', '/login', '/api'].includes(normalized)) return { counted: false };
    let slug: string;
    try { slug = decodeURIComponent(normalized.slice(1)); } catch { throw AppError.badRequest(); }
    const posts = await env.DB.prepare('SELECT id FROM imported_posts WHERE slug = ? AND published_at IS NOT NULL').bind(slug).all<{ id: string }>();
    postId = posts.results[0]?.id ?? null;
    if (!postId) return { counted: false };
  }
  const keys = [totalViewsKey, ...(postId ? [postViewsKey(postId)] : [])];
  // Increment in SQLite, not KV read/modify/write, so concurrent visits cannot
  // overwrite each other. Both counters commit in one D1 batch transaction.
  const statements = keys.map(key => env.DB.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, '1', CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = CAST(settings.value AS INTEGER) + 1, updated_at = CURRENT_TIMESTAMP
    RETURNING value
  `).bind(key));
  if (visitor) statements.push(env.DB.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    WHERE coalesce(json_extract(settings.value, '$.visitedAt'), 0) <= json_extract(excluded.value, '$.visitedAt')
    RETURNING value
  `).bind(lastVisitorKey, JSON.stringify(visitor)));
  const result = await env.DB.batch<{ value: string }>(statements);
  return { counted: true, totalPageViews: Number(result[0].results[0].value),
    ...(postId ? { postId, views: Number(result[1].results[0].value) } : {}),
  };
}
