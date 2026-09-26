import { Elysia, t } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { AuthPlugin } from '../../plugins/auth';
import { AppError } from '../../middleware/errorHandler';
import { clampLimit, rateLimit } from '../shared';
import { createGuestbookEntry, listGuestbookEntries } from './service';

export const guestbookModule = new Elysia({ prefix: '/guestbook' })
  .use(AuthPlugin)
  .get('/', ({ query }) =>
    listGuestbookEntries(getCloudflareRuntimeEnv(), clampLimit(query.limit, 50)),
  )
  .post(
    '/',
    async ({ body, request, user }) => {
      if (!user.name?.trim()) throw AppError.badRequest('请先设置公开昵称，再发送留言。');
      const limited = await rateLimit(request, 'guestbook', {
        limit: 5,
        windowSeconds: 60,
      });
      if (limited) return limited;
      return createGuestbookEntry(getCloudflareRuntimeEnv(), {
        message: (body as { message?: string }).message,
        userId: user.id,
        userInfo: { name: user.name, imageUrl: user.image },
      });
    },
    {
      auth: true,
      body: t.Object({ message: t.String() }),
    },
  );
