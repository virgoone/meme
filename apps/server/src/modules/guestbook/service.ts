import { authUser, createD1Database, guestbook } from '@meme/db';
import { desc, eq } from 'drizzle-orm';

import type { WorkerEnv } from '../../env';

export type GuestbookInput = {
  userId?: string;
  userInfo?: unknown;
  message?: string;
};

export async function listGuestbookEntries(env: WorkerEnv, limit = 50) {
  const db = createD1Database(env.DB);

  const entries = await db
    .select({ entry: guestbook, name: authUser.name, image: authUser.image })
    .from(guestbook)
    .leftJoin(authUser, eq(guestbook.userId, authUser.id))
    .orderBy(desc(guestbook.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));

  return entries.map(({ entry, name, image }) => ({
    ...entry,
    userInfo: guestbookAuthor(entry.userInfo, { name, image }),
  }));
}

export function guestbookAuthor(snapshot: unknown, profile?: { name: string | null; image: string | null }) {
  const info = snapshot && typeof snapshot === 'object' ? snapshot as Record<string, unknown> : {};
  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  const legacyName = [...new Set([text(info.firstName), text(info.lastName)].filter(Boolean))].join(' ');
  return {
    name: text(profile?.name) || text(info.name) || text(info.username) || legacyName || '已登录用户',
    imageUrl: text(profile?.image) || text(info.imageUrl) || text(info.image) || null,
  };
}

export async function createGuestbookEntry(
  env: WorkerEnv,
  input: GuestbookInput,
) {
  const message = input.message?.trim();
  if (!message) {
    throw new Error('Guestbook message is required');
  }

  const db = createD1Database(env.DB);
  const [created] = await db
    .insert(guestbook)
    .values({
      userId: input.userId ?? 'anonymous',
      userInfo: input.userInfo ?? null,
      message,
    })
    .returning();

  return created;
}
