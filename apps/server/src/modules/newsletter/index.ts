import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { rateLimit } from '../shared';
import {
  confirmNewsletterToken,
  getNewsletterById,
  type NewsletterInput,
  subscribeToNewsletter,
} from './service';

export const newsletterModule = new Elysia({ prefix: '/newsletter' })
  .post('/', async ({ body, request }) => {
    const limited = await rateLimit(request, 'newsletter', {
      limit: 5,
      windowSeconds: 600,
    });
    if (limited) return limited;
    return subscribeToNewsletter(
      getCloudflareRuntimeEnv(),
      body as NewsletterInput,
    );
  })
  .get('/confirm', async ({ query, set }) => {
    const subscriber = await confirmNewsletterToken(
      getCloudflareRuntimeEnv(),
      query.token ?? '',
    );
    if (!subscriber) {
      set.status = 404;
      return { error: 'not_found' };
    }
    return { status: 'success' };
  });

export const newslettersModule = new Elysia({ prefix: '/newsletters' }).get(
  '/:id',
  async ({ params, set }) => {
    const newsletter = await getNewsletterById(
      getCloudflareRuntimeEnv(),
      Number(params.id),
    );
    if (!newsletter) {
      set.status = 404;
      return { error: 'not_found' };
    }
    return newsletter;
  },
);
