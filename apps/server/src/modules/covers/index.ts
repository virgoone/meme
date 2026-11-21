import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { AuthPlugin } from '../../plugins/auth';
import { rateLimit } from '../shared';
import { generateCover, readCoverConfig } from './sluice';

export const coversModule = new Elysia({ prefix: '/admin/covers' })
  .use(AuthPlugin)
  .get('/config', ({ set }) => {
    set.headers['cache-control'] = 'private, no-store';
    const { configured, model, size, aspectRatios, defaultAspectRatio } = readCoverConfig(getCloudflareRuntimeEnv());
    return { configured, provider: 'sluice', model, size, aspectRatios, defaultAspectRatio };
  }, { admin: true })
  .post('/generate', async ({ body, request, set }) => {
    set.headers['cache-control'] = 'private, no-store';
    const limited = await rateLimit(request, 'cover-generate', { limit: 20, windowSeconds: 600 });
    if (limited) return limited;
    return generateCover(getCloudflareRuntimeEnv(), (body ?? {}) as Record<string, unknown>);
  }, { admin: true });
