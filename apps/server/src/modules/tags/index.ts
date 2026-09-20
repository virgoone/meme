import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { rateLimit } from '../shared';
import { listTags } from './service';

export const tagsModule = new Elysia({ prefix: '/tags' }).get(
  '/',
  async ({ query, request, set }) => {
    const limited = await rateLimit(request, 'tags', {
      limit: 30,
      windowSeconds: 60,
    });
    if (limited) return limited;
    set.status = 200;
    return listTags(getCloudflareRuntimeEnv(), {
      page: Number(query.page),
      pageSize: Number(query.pageSize),
      title: query.title,
    });
  },
);
