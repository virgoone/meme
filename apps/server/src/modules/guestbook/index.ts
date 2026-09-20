import { Elysia, t } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { AuthPlugin } from '../../plugins/auth';
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
