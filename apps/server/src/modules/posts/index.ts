import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { AppError } from '../../middleware/errorHandler';
import { AuthPlugin } from '../../plugins/auth';
import { clampLimit } from '../shared';
import {
  getImportedPostBySlug,
  listImportedPosts,
  updateImportedPostBySlug,
  type UpdatePostInput,
} from './service';

export const postsModule = new Elysia({ prefix: '/posts' })
  .use(AuthPlugin)
  .get('/', ({ query }) =>
    listImportedPosts(getCloudflareRuntimeEnv(), {
      limit: clampLimit(query.limit, 20),
    }),
  )
  .get('/:slug', async ({ params }) => {
    const post = await getImportedPostBySlug(
      getCloudflareRuntimeEnv(),
      params.slug,
    );
    if (!post) throw AppError.notFound();
    return post;
  })
  .put(
    '/:slug',
    async ({ params, body }) => {
      const post = await updateImportedPostBySlug(
        getCloudflareRuntimeEnv(),
        params.slug,
        normalizePostUpdateInput(body),
      );
      if (!post) throw AppError.notFound();
      return post;
    },
    { admin: true },
  );

function normalizePostUpdateInput(body: unknown): UpdatePostInput {
  if (!body || typeof body !== 'object') return {};
  const input = body as Record<string, unknown>;

  return {
    title: typeof input.title === 'string' ? input.title : undefined,
    slug: typeof input.slug === 'string' ? input.slug : undefined,
    description:
      typeof input.description === 'string' || input.description === null
        ? input.description
        : undefined,
    mainImageUrl:
      typeof input.mainImageUrl === 'string' || input.mainImageUrl === null
        ? input.mainImageUrl
        : undefined,
    mood: isMood(input.mood) ? input.mood : undefined,
    readingTime:
      typeof input.readingTime === 'number' ? input.readingTime : undefined,
    publishedAt:
      typeof input.publishedAt === 'string' || input.publishedAt === null
        ? input.publishedAt
        : undefined,
    slateJson: Array.isArray(input.slateJson) ? input.slateJson : undefined,
  };
}

function isMood(value: unknown): value is UpdatePostInput['mood'] {
  return (
    value === 'happy' || value === 'sad' || value === 'neutral' || value === null
  );
}
