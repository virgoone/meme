import { createDatabase, importedPosts, postBlocks, settings } from '@meme/db';
import {
  type EditorBlockNode,
  getBlockId,
  withStableBlockIds,
} from '@meme/editor';
import { BLOG_PAGE_SIZE, createPostSlug, isValidPostSlug, normalizePage, type PostPage } from '@meme/shared';
import { and, asc, desc, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { normalizeStoredImageUrl, resolvePostCover } from '@meme/db/cover';
import { AppError } from '../../middleware/errorHandler';

import type { WorkerEnv } from '../../env';

export type PostListItem = {
  views?: number;
  id: string;
  sanityId: string;
  title: string;
  slug: string;
  description: string | null;
  mainImageUrl: string | null;
  mood: 'happy' | 'sad' | 'neutral' | null;
  readingTime: number | null;
  publishedAt: string | null;
  coverImageUrl: string | null;
};

export type PostDetail = PostListItem & {
  updatedAt: string | null;
  portableTextJson: unknown;
  slateJson: unknown;
  blocks: {
    blockId: string;
    portableTextKey: string | null;
    sortIndex: number;
    type: string;
    portableTextJson: unknown;
    slateJson: unknown;
    plainText: string | null;
  }[];
};

export type UpdatePostInput = {
  title?: string;
  slug?: string;
  description?: string | null;
  mainImageUrl?: string | null;
  mood?: 'happy' | 'sad' | 'neutral' | null;
  readingTime?: number | null;
  publishedAt?: string | null;
  slateJson?: unknown;
};

export async function listImportedPosts(
  env: WorkerEnv,
  options?: { limit?: number; offset?: number; includeDrafts?: boolean; status?: 'all' | 'published' | 'draft'; query?: string },
): Promise<PostListItem[]> {
  const db = createDatabase(env.DB);
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);

  const posts = await db
    .select({
      views: sql<number>`coalesce(cast(${settings.value} as integer), 0)`,
      id: importedPosts.id,
      sanityId: importedPosts.sanityId,
      title: importedPosts.title,
      slug: importedPosts.slug,
      description: importedPosts.description,
      mainImageUrl: importedPosts.mainImageUrl,
      coverImageUrl: importedPosts.coverImageUrl,
      mood: importedPosts.mood,
      readingTime: importedPosts.readingTime,
      publishedAt: importedPosts.publishedAt,
    })
    .from(importedPosts)
    .leftJoin(settings, eq(settings.key, sql`'analytics:views:post:' || ${importedPosts.id}`))
    .where(postListFilter(options))
    .orderBy(desc(importedPosts.publishedAt), desc(importedPosts.createdAt), desc(importedPosts.id))
    .limit(limit)
    .offset(options?.offset ?? 0);

  if (posts.length === 0) return [];

  return posts.map((post) => {
    const mainImageUrl = normalizeStoredImageUrl(post.mainImageUrl);
    return {
      ...post,
      views: Number.isSafeInteger(post.views) && post.views >= 0 ? post.views : 0,
      mainImageUrl,
      coverImageUrl: normalizeStoredImageUrl(post.coverImageUrl),
    };
  });
}

function postListFilter(options?: { includeDrafts?: boolean; status?: 'all' | 'published' | 'draft'; query?: string }) {
  const status = options?.status ?? (options?.includeDrafts ? 'all' : 'published');
  const conditions = [
    status === 'published' ? isNotNull(importedPosts.publishedAt) : status === 'draft' ? isNull(importedPosts.publishedAt) : undefined,
  ];
  const query = options?.query?.trim().toLowerCase();
  if (query) {
    const pattern = `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    conditions.push(or(
      sql`lower(${importedPosts.title}) like ${pattern} escape '\\'`,
      sql`lower(${importedPosts.slug}) like ${pattern} escape '\\'`,
      sql`lower(coalesce(${importedPosts.description}, '')) like ${pattern} escape '\\'`,
    ));
  }
  return and(...conditions);
}

export type AdminPostPage = PostPage<PostListItem> & {
  /** Totals for the status filter chips, under the current search. */
  counts: { all: number; published: number; draft: number };
};

/** One page of the admin article list: search, status filter, offset paging. */
export async function listAdminPostPage(
  env: WorkerEnv,
  options: { query?: string; status?: 'all' | 'published' | 'draft'; page?: unknown; size?: unknown },
): Promise<AdminPostPage> {
  const db = createDatabase(env.DB);
  const size = [10, 25, 50, 100].includes(Number(options.size)) ? Number(options.size) : 25;
  const status = options.status ?? 'all';
  const [row] = await db
    .select({
      all: sql<number>`count(*)`,
      published: sql<number>`sum(case when ${importedPosts.publishedAt} is not null then 1 else 0 end)`,
    })
    .from(importedPosts)
    .where(postListFilter({ status: 'all', query: options.query }));
  const counts = { all: Number(row?.all ?? 0), published: Number(row?.published ?? 0), draft: 0 };
  counts.draft = counts.all - counts.published;
  const total = status === 'all' ? counts.all : counts[status];
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(normalizePage(options.page), totalPages);
  const items = await listImportedPosts(env, { limit: size, offset: (page - 1) * size, status, query: options.query });
  return { items, total, page, pageSize: size, totalPages, counts };
}

export async function listPublishedPostPage(env: WorkerEnv, requestedPage: unknown): Promise<PostPage<PostListItem>> {
  const db = createDatabase(env.DB);
  const [count] = await db.select({ total: sql<number>`count(*)` }).from(importedPosts).where(isNotNull(importedPosts.publishedAt));
  const total = Number(count?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  const page = Math.min(normalizePage(requestedPage), totalPages);
  const items = await listImportedPosts(env, { limit: BLOG_PAGE_SIZE, offset: (page - 1) * BLOG_PAGE_SIZE });
  return { items, total, page, pageSize: BLOG_PAGE_SIZE, totalPages };
}

export async function getImportedPostBySlug(
  env: WorkerEnv,
  slug: string,
  options?: { includeDrafts?: boolean },
): Promise<PostDetail | null> {
  const db = createDatabase(env.DB);
  const [post] = await db
    .select()
    .from(importedPosts)
    .where(and(eq(importedPosts.slug, slug), options?.includeDrafts ? undefined : isNotNull(importedPosts.publishedAt)))
    .limit(1);

  if (!post) return null;

  const blocks = await db
    .select({
      blockId: postBlocks.blockId,
      portableTextKey: postBlocks.portableTextKey,
      sortIndex: postBlocks.sortIndex,
      type: postBlocks.type,
      portableTextJson: postBlocks.portableTextJson,
      slateJson: postBlocks.slateJson,
      plainText: postBlocks.plainText,
    })
    .from(postBlocks)
    .where(eq(postBlocks.postId, post.id))
    .orderBy(asc(postBlocks.sortIndex));

  return {
    id: post.id,
    sanityId: post.sanityId,
    title: post.title,
    slug: post.slug,
    description: post.description,
    mainImageUrl: normalizeStoredImageUrl(post.mainImageUrl),
    mood: post.mood,
    readingTime: post.readingTime,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    coverImageUrl: normalizeStoredImageUrl(post.coverImageUrl),
    portableTextJson: post.portableTextJson,
    slateJson: post.slateJson,
    blocks,
  };
}

export type UpdatePostOptions = {
  /**
   * Optimistic concurrency: the save happens only if the stored `updated_at` is
   * still this value. The check runs inside the same batch transaction as the
   * article and block writes, so a conflict changes nothing.
   */
  expectedUpdatedAt?: string | null;
  /** Extra statements committed atomically with the save (e.g. an idempotency record). */
  extraStatements?: (db: ReturnType<typeof createDatabase>, saved: { id: string; slug: string; updatedAt: string }) => BatchItem[];
};

type BatchItem = Parameters<ReturnType<typeof createDatabase>['batch']>[0][number];

export class PostVersionConflictError extends AppError {
  constructor(readonly currentUpdatedAt: string | null) {
    super(`文章已在 ${currentUpdatedAt ?? '未知时间'} 被保存，请重新读取后再修改`, 409);
  }
}

export async function updateImportedPostBySlug(
  env: WorkerEnv,
  slug: string,
  input: UpdatePostInput,
  options: UpdatePostOptions = {},
): Promise<PostDetail | null> {
  validatePostInput(input);
  const existing = await getImportedPostBySlug(env, slug, { includeDrafts: true });
  if (!existing) return null;
  const expected = options.expectedUpdatedAt;
  if (expected !== undefined && expected !== existing.updatedAt) throw new PostVersionConflictError(existing.updatedAt);

  const db = createDatabase(env.DB);
  const slateBlocks = normalizeSlateBlocks(
    input.slateJson ?? existing.slateJson,
  );
  const nextSlug = input.slug?.trim() || existing.slug;
  const nextTitle = input.title?.trim() || existing.title;
  if (nextSlug !== existing.slug) {
    validateSlug(nextSlug);
    await ensureAvailableSlug(env, nextSlug);
  }
  const nextDescription =
    input.description === undefined ? existing.description : input.description;
  const nextMainImageUrl =
    input.mainImageUrl === undefined
      ? existing.mainImageUrl
      : normalizeOptionalUrl(input.mainImageUrl);
  const nextMood =
    input.mood === undefined ? existing.mood : (input.mood ?? 'neutral');
  const nextReadingTime =
    input.readingTime == null
      ? estimateReadingTime(slateBlocks)
      : input.readingTime;

  // Strictly increasing per article, so two saves in the same millisecond still
  // get distinct versions for optimistic concurrency.
  const now = Date.now();
  const previous = existing.updatedAt ? Date.parse(existing.updatedAt) : Number.NaN;
  const updatedAt = new Date(Number.isFinite(previous) && previous >= now ? previous + 1 : now).toISOString();
  const update = db
    .update(importedPosts)
    .set({
      title: nextTitle,
      slug: nextSlug,
      description: nextDescription,
      mainImageUrl: nextMainImageUrl,
      coverImageUrl: resolvePostCover(nextMainImageUrl, slateBlocks.map((block, index) => slateBlockToPortableText(block, getBlockId(block) ?? `block_${index}`))),
      mood: nextMood,
      readingTime: nextReadingTime,
      publishedAt:
        input.publishedAt === undefined
          ? existing.publishedAt
          : input.publishedAt,
      slateJson: slateBlocks,
      portableTextJson: slateBlocks.map((block, index) => slateBlockToPortableText(block, getBlockId(block) ?? `block_${index}`)),
      updatedAt,
    })
    .where(eq(importedPosts.id, existing.id));

  // The read above is only a fast path. The guard below re-checks the version
  // inside the batch transaction: when another save landed in between, it
  // re-inserts the article's own primary key, the constraint error aborts the
  // whole batch, and nothing (article, blocks, extra records) is written.
  const guard = expected === undefined ? [] : [db.insert(importedPosts).select(
    db.select().from(importedPosts).where(and(eq(importedPosts.id, existing.id), sql`${importedPosts.updatedAt} IS NOT ${expected}`)),
  )];
  try {
    await db.batch([...guard, update, db.delete(postBlocks).where(eq(postBlocks.postId, existing.id)),
      ...blockInserts(db, existing.id, slateBlocks),
      ...(options.extraStatements?.(db, { id: existing.id, slug: nextSlug, updatedAt }) ?? [])] as [BatchItem, ...BatchItem[]]);
  } catch (error) {
    if (expected !== undefined && /constraint/i.test(String(error))) {
      const [current] = await db.select({ updatedAt: importedPosts.updatedAt }).from(importedPosts).where(eq(importedPosts.id, existing.id)).limit(1);
      if (current && current.updatedAt !== expected) throw new PostVersionConflictError(current.updatedAt);
    }
    throw error;
  }

  return getImportedPostBySlug(env, nextSlug, { includeDrafts: true });
}

export async function createPost(env: WorkerEnv, input: UpdatePostInput): Promise<PostDetail> {
  validatePostInput(input);
  const title = input.title?.trim();
  if (!title) throw AppError.badRequest('请输入文章标题');
  const slug = input.slug?.trim() || createPostSlug(title);
  validateSlug(slug);
  await ensureAvailableSlug(env, slug);
  const db = createDatabase(env.DB);
  const id = `post_${crypto.randomUUID()}`;
  const blocks = normalizeSlateBlocks(input.slateJson);
  const now = new Date().toISOString();
  try {
    await db.batch([
      db.insert(importedPosts).values({
        id, sanityId: id, title, slug,
        description: input.description ?? null,
        mainImageUrl: normalizeStoredImageUrl(input.mainImageUrl),
        coverImageUrl: resolvePostCover(input.mainImageUrl, blocks.map((block, index) => slateBlockToPortableText(block, getBlockId(block) ?? `block_${index}`))),
        mood: input.mood ?? 'neutral',
        readingTime: input.readingTime ?? estimateReadingTime(blocks),
        publishedAt: input.publishedAt ?? null,
        slateJson: blocks,
        portableTextJson: blocks.map((block, index) => slateBlockToPortableText(block, getBlockId(block) ?? `block_${index}`)),
        createdAt: now, updatedAt: now,
      }),
      ...blockInserts(db, id, blocks),
    ]);
  } catch (error) {
    if (String(error).includes('imported_posts.slug')) throw new AppError('此文章链接已存在，请修改 Slug', 409);
    throw error;
  }
  const created = await getImportedPostBySlug(env, slug, { includeDrafts: true });
  if (!created) throw AppError.internal('文章创建后读取失败');
  return created;
}

function blockInserts(db: ReturnType<typeof createDatabase>, postId: string, blocks: EditorBlockNode[]) {
  return blocks.map((block, index) => {
    const blockId = getBlockId(block) ?? `block_${index}`;
    return db.insert(postBlocks).values({
      id: `${postId}:${blockId}`, postId, blockId, portableTextKey: blockId,
      sortIndex: index, type: typeof block.type === 'string' ? block.type : 'p',
      portableTextJson: slateBlockToPortableText(block, blockId), slateJson: block,
      plainText: nodeText(block), updatedAt: new Date().toISOString(),
    });
  });
}

function validatePostInput(input: UpdatePostInput) {
  if (input.title !== undefined && (!input.title.trim() || input.title.length > 250)) throw AppError.badRequest('标题不能为空且不能超过 250 个字符');
  if (input.publishedAt != null && !Number.isFinite(Date.parse(input.publishedAt))) throw AppError.badRequest('发布时间无效');
  if (input.readingTime != null && (!Number.isFinite(input.readingTime) || input.readingTime < 0)) throw AppError.badRequest('阅读时长必须是非负数');
  if (input.slateJson !== undefined) {
    if (!Array.isArray(input.slateJson) || input.slateJson.some((node) => !node || typeof node !== 'object' || !Array.isArray(node.children))) throw AppError.badRequest('正文格式无效');
  }
}

function validateSlug(slug: string) {
  if (!isValidPostSlug(slug)) throw AppError.badRequest('Slug 请使用文字、数字和短横线，且不能使用系统保留路径');
}

async function ensureAvailableSlug(env: WorkerEnv, slug: string) {
  const existing = await getImportedPostBySlug(env, slug, { includeDrafts: true });
  if (existing) throw new AppError('此文章链接已存在，请修改 Slug', 409);
}

function nodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const value = node as { text?: unknown; children?: unknown[] };
  return typeof value.text === 'string' ? value.text : Array.isArray(value.children) ? value.children.map(nodeText).join('\n') : '';
}

function normalizeSlateBlocks(value: unknown): EditorBlockNode[] {
  if (!Array.isArray(value)) return [];
  return withStableBlockIds(value as EditorBlockNode[]);
}

function normalizeOptionalUrl(value: string | null) {
  if (value === null) return null;
  return normalizeStoredImageUrl(value);
}

function estimateReadingTime(blocks: EditorBlockNode[]) {
  const words = blocks
    .map(nodeText)
    .join('')
    .trim().length;
  return Math.max(1, Math.ceil(words / 500));
}

function slateBlockToPortableText(block: EditorBlockNode, blockId: string) {
  const originalPortableText =
    block.portableTextJson ??
    (block.data && typeof block.data === 'object'
      ? (block.data as { portableTextJson?: unknown }).portableTextJson
      : null);

  if (block.type === 'image' && !block.url && originalPortableText) {
    return originalPortableText;
  }

  const text = nodeText(block);
  return {
    _key: blockId,
    _type: 'slate',
    ...((block.type === 'img' || block.type === 'image') && typeof block.url === 'string' ? { asset: { url: block.url } } : {}),
    style: slateTypeToPortableTextStyle(block.type),
    children: [
      {
        _key: `${blockId}-span`,
        _type: 'span',
        text,
        marks: [],
      },
    ],
    markDefs: [],
  };
}

function slateTypeToPortableTextStyle(type: string | undefined) {
  if (
    type === 'h1' ||
    type === 'h2' ||
    type === 'h3' ||
    type === 'h4' ||
    type === 'h5' ||
    type === 'h6' ||
    type === 'blockquote'
  ) {
    return type;
  }
  return 'normal';
}
