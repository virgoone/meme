import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { AuthPlugin } from '../../plugins/auth';
import { listComments } from '../comments/service';
import { listNewsletters, listSubscribers } from '../newsletter/service';
import { getAllSettings, upsertSettings } from '../settings/service';
import { clampLimit } from '../shared';
import { getImportedPostBySlug, listImportedPosts } from '../posts/service';
import { AppError } from '../../middleware/errorHandler';

export const adminModule = new Elysia({ prefix: '/admin' })
  .use(AuthPlugin)
  .get('/posts', ({ query, set }) => {
    set.headers['cache-control'] = 'private, no-store';
    return listImportedPosts(getCloudflareRuntimeEnv(), { limit: clampLimit(query.limit, 100), includeDrafts: true });
  }, { admin: true })
  .get('/posts/:slug', async ({ params, set }) => {
    set.headers['cache-control'] = 'private, no-store';
    const post = await getImportedPostBySlug(getCloudflareRuntimeEnv(), params.slug, { includeDrafts: true });
    if (!post) throw AppError.notFound();
    return post;
  }, { admin: true })
  .get(
    '/comments',
    ({ query }) =>
      listComments(getCloudflareRuntimeEnv(), clampLimit(query.limit, 100)),
    { admin: true },
  )
  .get(
    '/newsletters',
    ({ query }) =>
      listNewsletters(getCloudflareRuntimeEnv(), clampLimit(query.limit, 100)),
    { admin: true },
  )
  .get(
    '/subscribers',
    ({ query }) =>
      listSubscribers(getCloudflareRuntimeEnv(), clampLimit(query.limit, 100)),
    { admin: true },
  )
  .get(
    '/settings',
    () => getAllSettings(getCloudflareRuntimeEnv()),
    { admin: true },
  )
  .put(
    '/settings',
    async ({ body }) => upsertSettings(getCloudflareRuntimeEnv(), body as Record<string, unknown>),
    { admin: true },
  );
