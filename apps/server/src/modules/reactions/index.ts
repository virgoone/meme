import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { rateLimit } from '../shared';
import { getReactions, incrementReaction } from './service';

export const reactionsModule = new Elysia({ prefix: '/reactions' })
  .get('/', async ({ query, request }) => {
    if (!query.id) {
      return Response.json({ error: 'missing_id' }, { status: 400 });
    }
    const limited = await rateLimit(request, `reactions:${query.id}`, {
      limit: 60,
      windowSeconds: 60,
    });
    if (limited) return limited;
    return getReactions(getCloudflareRuntimeEnv(), query.id);
  })
  .patch('/', async ({ query, request }) => {
    if (!query.id) {
      return Response.json({ error: 'missing_id' }, { status: 400 });
    }
    const limited = await rateLimit(request, `reactions:${query.id}`, {
      limit: 60,
      windowSeconds: 60,
    });
    if (limited) return limited;
    return {
      data: await incrementReaction(
        getCloudflareRuntimeEnv(),
        query.id,
        Number(query.index),
      ),
    };
  });
