import { comments, createD1Database } from '@meme/db';
import { asc, desc, eq } from 'drizzle-orm';

import type { WorkerEnv } from '../../env';

export type CommentInput = {
  userId?: string;
  userInfo?: unknown;
  postId?: string;
  parentId?: number | null;
  body?: unknown;
};

export async function listComments(env: WorkerEnv, limit = 100) {
  const db = createD1Database(env.DB);

  return db
    .select()
    .from(comments)
    .orderBy(desc(comments.createdAt))
    .limit(Math.min(Math.max(limit, 1), 200));
}

export async function listCommentsByPost(env: WorkerEnv, postId: string) {
  const db = createD1Database(env.DB);

  return db
    .select()
    .from(comments)
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt));
}

export async function listCommentsByPostAsc(env: WorkerEnv, postId: string) {
  const db = createD1Database(env.DB);

  return db
    .select()
    .from(comments)
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));
}

export async function createComment(env: WorkerEnv, input: CommentInput) {
  if (!input.postId) throw new Error('postId is required');
  if (input.body === undefined || input.body === null) {
    throw new Error('body is required');
  }

  const db = createD1Database(env.DB);
  const [created] = await db
    .insert(comments)
    .values({
      userId: input.userId ?? 'anonymous',
      userInfo: input.userInfo ?? null,
      postId: input.postId,
      parentId: input.parentId ?? null,
      body: input.body,
    })
    .returning();

  return created;
}
