import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { rateLimit } from '../shared';

export const activityModule = new Elysia({ prefix: '/activity' }).get(
  '/',
  async ({ request }) => {
    const limited = await rateLimit(request, 'activity:app', {
      limit: 30,
      windowSeconds: 60,
    });
    if (limited) return limited;
    return {
      app: await getCloudflareRuntimeEnv().MEME_KV.get('activity:app', 'json'),
    };
  },
);
