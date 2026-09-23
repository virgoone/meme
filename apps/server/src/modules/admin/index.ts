import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { AuthPlugin } from '../../plugins/auth';
import { listComments } from '../comments/service';
import { listNewsletters, listSubscribers } from '../newsletter/service';
import { getAllSettings, upsertSettings } from '../settings/service';
import { clampLimit } from '../shared';

export const adminModule = new Elysia({ prefix: '/admin' })
  .use(AuthPlugin)
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
