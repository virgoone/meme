import { Elysia, t } from 'elysia';
import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { AuthPlugin } from '../../plugins/auth';
import {
  getCampaign,
  newsletterOptions,
  saveCampaign,
  sendCampaignStep,
  testCampaign,
} from './campaign';

const draft = t.Object({
  version: t.Literal(1),
  subject: t.String({ minLength: 1, maxLength: 160 }),
  headline: t.String({ minLength: 1, maxLength: 100 }),
  introduction: t.String({ maxLength: 1000 }),
  template: t.Union([
    t.Literal('digest'),
    t.Literal('visual'),
    t.Literal('featured'),
  ]),
  includeDescriptions: t.Boolean(),
  posts: t.Array(
    t.Object({
      id: t.String({ maxLength: 200 }),
      title: t.String({ minLength: 1, maxLength: 200 }),
      description: t.String({ maxLength: 800 }),
    }),
    { minItems: 1, maxItems: 10 },
  ),
});
const params = t.Object({ id: t.String({ format: 'uuid' }) });

export const newsletterAdminModule = new Elysia({
  prefix: '/admin/newsletters',
})
  .use(AuthPlugin)
  .onBeforeHandle(({ set }) => {
    set.headers['cache-control'] = 'private, no-store';
  })
  .get('/options', () => newsletterOptions(getCloudflareRuntimeEnv()), {
    admin: true,
  })
  .get(
    '/campaign/:id',
    ({ params }) => getCampaign(getCloudflareRuntimeEnv(), params.id),
    { admin: true, params },
  )
  .put(
    '/campaign/:id',
    ({ params, body }) =>
      saveCampaign(getCloudflareRuntimeEnv(), params.id, body),
    { admin: true, params, body: draft },
  )
  .post(
    '/campaign/:id/test',
    ({ params, user, body }) =>
      testCampaign(
        getCloudflareRuntimeEnv(),
        params.id,
        user.email,
        body.attemptId,
      ),
    {
      admin: true,
      params,
      body: t.Object({ attemptId: t.String({ format: 'uuid' }) }),
    },
  )
  .post(
    '/campaign/:id/send',
    ({ params, body }) =>
      sendCampaignStep(
        getCloudflareRuntimeEnv(),
        params.id,
        body.recipientCount,
      ),
    {
      admin: true,
      params,
      body: t.Object({ recipientCount: t.Integer({ minimum: 0 }) }),
    },
  );
