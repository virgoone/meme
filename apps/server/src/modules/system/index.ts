import { Elysia } from 'elysia';
import { count, isNotNull } from 'drizzle-orm';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { createD1Database, subscribers } from '@meme/db';

export const systemModule = new Elysia()
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
  .get('/site-stats', async () => {
    const env = getCloudflareRuntimeEnv();
    const db = createD1Database(env.DB);
    const [subscribersCount] = await db
      .select({ count: count() })
      .from(subscribers)
      .where(isNotNull(subscribers.subscribedAt));

    const totalPageViews =
      Number(await env.MEME_KV.get('total_page_views')) || 12345678;
    const lastVisitor = await env.MEME_KV.get<VisitorGeolocation>(
      'last_visitor',
      'json',
    );

    return {
      totalPageViews,
      subscriberCount: subscribersCount?.count ?? 0,
      lastVisitor: lastVisitor ?? {
        country: 'US',
        flag: '🇺🇸',
      },
    };
  });

type VisitorGeolocation = {
  country: string;
  city?: string;
  flag: string;
};
