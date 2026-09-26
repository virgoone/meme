import { describe, expect, mock, test } from 'bun:test';
import type { WorkerEnv } from '../env';
import { handlePublicRoute } from './public-routes';
import { Database } from 'bun:sqlite';

const origin = 'https://blog.douni.one';

describe('legacy public redirects', () => {
  test.each([
    ['/twitter', 'https://x.com/koyaguo'],
    ['/x', 'https://x.com/koyaguo'],
    ['/github', 'https://github.com/virgoone'],
    ['/tool', 'https://douni.one/'],
    ['/youtube', 'https://youtube.com/@calicastle'],
  ])('%s permanently redirects to %s without storage access', async (path, destination) => {
    for (const method of ['GET', 'HEAD']) {
      for (const pathname of [path, `${path}/`, path.toUpperCase()]) {
        const response = await handlePublicRoute(
          new Request(`${origin}${pathname}`, { method }),
          {} as WorkerEnv,
        );
        expect(response?.status).toBe(308);
        expect(response?.headers.get('location')).toBe(destination);
      }
    }
  });

  test('preserves query strings without accepting an arbitrary redirect destination', async () => {
    const search = '?utm_source=blog&tag=one&tag=two&next=https%3A%2F%2Fexample.com';
    const response = await handlePublicRoute(
      new Request(`${origin}/github${search}`),
      {} as WorkerEnv,
    );
    expect(response?.headers.get('location')).toBe(`https://github.com/virgoone${search}`);
  });

  test.each(['/', '/blog', '/twitter/post', '/api/github', '/constructor', '/toString'])(
    'does not intercept unrelated route %s', async (path) => {
      expect(await handlePublicRoute(new Request(`${origin}${path}`), {} as WorkerEnv)).toBeNull();
    },
  );
});

describe('legacy RSS aliases', () => {
  test.each(['/feed.xml', '/feed', '/rss', '/rss.xml', '/rss/'])(
    '%s serves the feed instead of the article page', async (path) => {
      const raw = mock(async () => []);
      const env = {
        SITE_URL: origin,
        DB: { prepare: () => ({ bind: () => ({ raw }) }) },
      } as unknown as WorkerEnv;
      const response = await handlePublicRoute(new Request(`${origin}${path}?source=reader`), env);
      expect(response?.status).toBe(200);
      expect(response?.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8');
      expect(response?.headers.get('location')).toBeNull();
      expect(await response?.text()).toContain(`<link>${origin}</link>`);
      expect(raw).toHaveBeenCalledTimes(1);
    },
  );
});

describe('canonical article URLs', () => {
  test('legacy article URLs redirect permanently, retaining query parameters', async () => {
    const response = await handlePublicRoute(new Request(`${origin}/blog/my-post/?ref=old`), {} as WorkerEnv);
    expect(response?.status).toBe(308);
    expect(response?.headers.get('location')).toBe(`${origin}/my-post?ref=old`);
  });
  test('a reverse proxy request redirects to the configured public origin', async () => {
    const response = await handlePublicRoute(
      new Request('https://meme.moss-dev.workers.dev/blog/my-post/?ref=old'),
      { SITE_URL: origin } as WorkerEnv,
    );
    expect(response?.headers.get('location')).toBe(`${origin}/my-post?ref=old`);
  });
  test('sitemap uses current URLs and the real modification date', async () => {
    let query = '';
    const env = { SITE_URL: origin, DB: { prepare: (sql: string) => { query = sql; return { bind: () => ({ raw: async () => [['post&one', '2026-08-01', '2026-09-25T01:00:00Z']] }) }; } } } as unknown as WorkerEnv;
    const response = await handlePublicRoute(new Request(`${origin}/sitemap.xml`), env);
    const xml = await response!.text();
    expect(xml).toContain(`${origin}/post%26one`);
    expect(xml).not.toContain('/blog/post');
    expect(xml).toContain('<lastmod>2026-09-25</lastmod>');
    expect(query).toContain('is not null');
    expect(query).not.toContain('limit');
    for (const path of ['/about', '/contact', '/privacy', '/terms']) expect(xml).toContain(`<loc>${origin}${path}</loc>`);
  });
});

describe('published content index', () => {
  test('includes more than 100 published posts, excludes drafts, and safely formats Markdown', async () => {
    const database = new Database(':memory:');
    database.exec('CREATE TABLE imported_posts (title TEXT, slug TEXT, description TEXT, published_at TEXT)');
    const insert = database.prepare('INSERT INTO imported_posts VALUES (?, ?, ?, ?)');
    for (let i = 0; i < 105; i++) insert.run(`文章 ${i}`, `post-${i}`, '已发布摘要', '2026-09-25');
    insert.run('PRIVATE DRAFT MARKER', 'draft-private', '草稿机密', null);
    insert.run('链接 [test] <tag>', '中文标题', '第一行\n## 假标题', '2026-09-25');
    const env = { SITE_URL: origin, DB: { prepare: (sql: string) => ({ bind: (...args: any[]) => ({ raw: async () => database.prepare(sql).values(...args) }) }) } } as unknown as WorkerEnv;
    try {
      const response = await handlePublicRoute(new Request(`${origin}/llms.txt`), env);
      expect(response?.status).toBe(200);
      expect(response?.headers.get('content-type')).toBe('text/plain; charset=utf-8');
      const text = await response!.text();
      expect(text).toContain('/post-104)');
      expect(text).not.toContain('PRIVATE DRAFT MARKER');
      expect(text).not.toContain('draft-private');
      expect(text).toContain('[链接 \\[test\\] \\<tag\\>]');
      expect(text).toContain(`/${encodeURIComponent('中文标题')})`);
      expect(text).not.toContain('\n## 假标题');
      expect(text.match(/^- \[文章 /gm)?.length).toBe(105);
    } finally { database.close(); }
  });

  test('HEAD has no body and unsupported methods do not query storage', async () => {
    const head = await handlePublicRoute(new Request(`${origin}/llms.txt`, { method: 'HEAD' }), {} as WorkerEnv);
    expect(head?.status).toBe(200);
    expect(await head?.text()).toBe('');
    const post = await handlePublicRoute(new Request(`${origin}/llms.txt`, { method: 'POST' }), {} as WorkerEnv);
    expect(post?.status).toBe(405);
    expect(post?.headers.get('allow')).toBe('GET, HEAD');
  });
});
