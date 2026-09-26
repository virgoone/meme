import { comments, createD1Database, importedPosts, postBlocks } from '@meme/db';
import { and, asc, desc, eq, inArray, isNotNull, or } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler';

import type { WorkerEnv } from '../../env';

export type CommentInput = {
  userId?: string;
  userInfo?: unknown;
  postId?: string;
  parentId?: number | null;
  body?: unknown;
};

async function resolveCommentPost(env: WorkerEnv, postId: string) {
  const [post] = await createD1Database(env.DB).select({ id: importedPosts.id, sanityId: importedPosts.sanityId })
    .from(importedPosts)
    .where(and(or(eq(importedPosts.id, postId), eq(importedPosts.sanityId, postId)), isNotNull(importedPosts.publishedAt)))
    .limit(1);
  return post ? { id: post.id, ids: [...new Set([post.id, post.sanityId])] } : null;
}

function publicComment(row: typeof comments.$inferSelect, postId: string) {
  const info = row.userInfo && typeof row.userInfo === 'object' ? row.userInfo as Record<string, unknown> : {};
  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  const name = text(info.name) || [...new Set([text(info.firstName), text(info.lastName)].filter(Boolean))].join(' ') || '已登录用户';
  const body = row.body && typeof row.body === 'object' ? row.body as Record<string, unknown> : {};
  // SQLite CURRENT_TIMESTAMP is UTC but omits the timezone suffix.
  const createdAt = row.createdAt?.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/, '$1T$2Z');
  return { ...row, createdAt, postId, userInfo: { name, imageUrl: text(info.imageUrl) || text(info.image) || null },
    body: { ...(typeof body.blockId === 'string' ? { blockId: body.blockId } : {}), text: typeof body.text === 'string' ? body.text : typeof row.body === 'string' ? row.body : '' } };
}

export async function listComments(env: WorkerEnv, limit = 100) {
  const db = createD1Database(env.DB);

  return db
    .select()
    .from(comments)
    .orderBy(desc(comments.createdAt))
    .limit(Math.min(Math.max(limit, 1), 200));
}

export async function listCommentsByPost(env: WorkerEnv, postId: string) {
  return readPostComments(env, postId, 'desc');
}

export async function listCommentsByPostAsc(env: WorkerEnv, postId: string) {
  return readPostComments(env, postId, 'asc');
}

async function readPostComments(env: WorkerEnv, postId: string, order: 'asc' | 'desc') {
  const post = await resolveCommentPost(env, postId);
  if (!post) return [];
  const db = createD1Database(env.DB);
  // Migration preserved the Sanity IDs on historical comments. Read both
  // identities without rewriting the original records or reply relationships.
  const rows = await db
    .select()
    .from(comments)
    .where(inArray(comments.postId, post.ids))
    .orderBy(order === 'asc' ? asc(comments.createdAt) : desc(comments.createdAt), asc(comments.id));
  return rows.map(row => publicComment(row, post.id));
}

export async function createComment(env: WorkerEnv, input: CommentInput) {
  if (!input.userId) throw AppError.unauthorized();
  if (!input.postId) throw AppError.badRequest('缺少文章编号');
  const post = await resolveCommentPost(env, input.postId);
  if (!post) throw AppError.notFound('文章不存在');
  const body = input.body as { text?: unknown; blockId?: unknown } | null;
  if (!body || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 999) throw AppError.badRequest('评论内容需为 1 到 999 个字符');
  if (body.blockId !== undefined && typeof body.blockId !== 'string') throw AppError.badRequest('段落编号无效');

  const db = createD1Database(env.DB);
  if (body.blockId) {
    const [block] = await db.select({ id: postBlocks.id }).from(postBlocks).where(and(eq(postBlocks.postId, post.id), eq(postBlocks.blockId, body.blockId))).limit(1);
    if (!block) throw AppError.badRequest('该段落已变化，请刷新文章后再评论');
  }
  if (input.parentId != null) {
    const [parent] = await db.select().from(comments).where(and(eq(comments.id, input.parentId), inArray(comments.postId, post.ids))).limit(1);
    if (!parent || publicComment(parent, post.id).body.blockId !== body.blockId) throw AppError.badRequest('回复的评论不属于当前段落');
  }
  const [created] = await db
    .insert(comments)
    .values({
      userId: input.userId,
      userInfo: input.userInfo ?? null,
      postId: post.id,
      parentId: input.parentId ?? null,
      body: { ...(body.blockId ? { blockId: body.blockId } : {}), text: body.text.trim() },
    })
    .returning();

  return publicComment(created, post.id);
}
