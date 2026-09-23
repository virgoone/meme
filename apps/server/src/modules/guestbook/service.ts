import { createD1Database, guestbook } from '@meme/db';
import { desc } from 'drizzle-orm';

import type { WorkerEnv } from '../../env';

export type GuestbookInput = {
  userId?: string;
  userInfo?: unknown;
  message?: string;
};

export async function listGuestbookEntries(env: WorkerEnv, limit = 50) {
  const db = createD1Database(env.DB);

  return db
    .select()
    .from(guestbook)
    .orderBy(desc(guestbook.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
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
