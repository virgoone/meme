import { Elysia, t } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { AppError } from '../../middleware/errorHandler';
import { AuthPlugin } from '../../plugins/auth';
import { rateLimit } from '../shared';
import {
  type CommentInput,
  createComment,
  listCommentsByPost,
  listCommentsByPostAsc,
} from './service';

const commentBody = t.Object({
  body: t.Object({ blockId: t.Optional(t.String({ maxLength: 200 })), text: t.String({ minLength: 1, maxLength: 999 }) }),
  parentId: t.Optional(t.Nullable(t.Integer({ minimum: 1 }))),
});

export const commentsModule = new Elysia({ prefix: '/comments' })
  .use(AuthPlugin)
  .get('/', ({ query }) => {
    if (!query.postId) throw AppError.badRequest('缺少 postId');
    return listCommentsByPost(getCloudflareRuntimeEnv(), query.postId);
  })
  .get('/:postId', ({ params }) =>
    listCommentsByPostAsc(getCloudflareRuntimeEnv(), params.postId),
  )
  .post(
    '/',
    async ({ body, request, user }) => {
      const limited = await rateLimit(request, 'comments', {
        limit: 10,
        windowSeconds: 60,
      });
      if (limited) return limited;
      return createComment(getCloudflareRuntimeEnv(), {
        ...(body as CommentInput),
        userId: user.id,
        userInfo: { name: user.name, imageUrl: user.image },
      });
    },
    { auth: true, body: t.Composite([commentBody, t.Object({ postId: t.String({ minLength: 1, maxLength: 200 }) })]) },
  )
  .post(
    '/:postId',
    async ({ params, body, request, user }) => {
      const limited = await rateLimit(request, `comments:${params.postId}`, {
        limit: 10,
        windowSeconds: 60,
      });
      if (limited) return limited;
      return createComment(getCloudflareRuntimeEnv(), {
        ...(body as CommentInput),
        postId: params.postId,
        userId: user.id,
        userInfo: { name: user.name, imageUrl: user.image },
      });
    },
    { auth: true, body: commentBody },
  );
