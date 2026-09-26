import { Elysia } from 'elysia';
import { count, isNotNull } from 'drizzle-orm';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { createD1Database, subscribers } from '@meme/db';
import { isAllowedOrigin } from '@meme/shared';
import { AppError } from '../../middleware/errorHandler';
import { readViews, recordPageView, totalViewsKey } from './views';
import { getPublicConfig } from './public-config';
import { readLastVisitor, visitorFromRequest } from './visitor';

export const systemModule = new Elysia()
  .get('/public-config', ({ set }) => {
    set.headers['cache-control'] = 'public, max-age=300';
    return getPublicConfig(getCloudflareRuntimeEnv());
  })
  .get('/health', () => {
    const env = getCloudflareRuntimeEnv();
    return {
      ok: true,
      runtime: 'cloudflare-workers',
      database: 'd1',
      cache: 'kv',
      storage: 'r2',
      appEnv: env.APP_ENV ?? 'development',
    };
  })
  .get('/deployment', () => ({
    mode: 'single-worker',
    frontend: 'TanStack Start via Worker',
    api: 'Elysia on Cloudflare Worker',
    database: 'Cloudflare D1',
    cache: 'Cloudflare KV',
    storage: 'Cloudflare R2',
  }))
  .post('/page-views', async ({ body, request, set }) => {
    const env = getCloudflareRuntimeEnv();
    const origin = request.headers.get('origin');
    if (origin && !isAllowedOrigin(origin, env)) throw AppError.forbidden();
    set.headers['cache-control'] = 'no-store';
    if (/bot|crawler|spider|preview/i.test(request.headers.get('user-agent') ?? '') || /prefetch/i.test(request.headers.get('sec-purpose') ?? '')) return { counted: false };
    return recordPageView(env, (body as { path?: unknown } | null)?.path,
      env.APP_ENV === 'production' ? visitorFromRequest(request) : null);
  })
  .get('/site-stats', async ({ set }) => {
    set.headers['cache-control'] = 'no-store';
    const env = getCloudflareRuntimeEnv();
    const db = createD1Database(env.DB);
    const [subscribersCount] = await db
      .select({ count: count() })
      .from(subscribers)
      .where(isNotNull(subscribers.subscribedAt));

    const totalPageViews = await readViews(env, totalViewsKey);
    const lastVisitor = await readLastVisitor(env);

    return {
      totalPageViews,
      subscriberCount: subscribersCount?.count ?? 0,
      // Older, already-open clients access .city without a null guard.
      // Keep that response shape while leaving unknown location fields empty.
      lastVisitor: lastVisitor ?? { country: '', city: '', flag: '' },
    };
  });
