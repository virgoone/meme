import { createD1Database, importedPosts, postBlocks, settings } from '@meme/db';
import {
  type EditorBlockNode,
  getBlockId,
  withStableBlockIds,
} from '@meme/editor';
import { BLOG_PAGE_SIZE, createPostSlug, isValidPostSlug, normalizePage, type PostPage } from '@meme/shared';
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
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
  options?: { limit?: number; offset?: number; includeDrafts?: boolean },
): Promise<PostListItem[]> {
  const db = createD1Database(env.DB);
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
      mood: importedPosts.mood,
      readingTime: importedPosts.readingTime,
      publishedAt: importedPosts.publishedAt,
    })
    .from(importedPosts)
    .leftJoin(settings, eq(settings.key, sql`'analytics:views:post:' || ${importedPosts.id}`))
    .where(options?.includeDrafts ? undefined : isNotNull(importedPosts.publishedAt))
    .orderBy(desc(importedPosts.publishedAt), desc(importedPosts.createdAt), desc(importedPosts.id))
    .limit(limit)
    .offset(options?.offset ?? 0);

  if (posts.length === 0) return [];

  const imageBlocks = await db
    .select({
      postId: postBlocks.postId,
      sortIndex: postBlocks.sortIndex,
      portableTextJson: postBlocks.portableTextJson,
    })
    .from(postBlocks)
    .where(
      inArray(
        postBlocks.postId,
        posts.map((post) => post.id),
      ),
    )
    .orderBy(asc(postBlocks.sortIndex));

  const coverByPost = new Map<string, string>();
  for (const block of imageBlocks) {
    if (coverByPost.has(block.postId)) continue;
    const imageUrl = sanityImageUrl(block.portableTextJson);
    if (imageUrl) coverByPost.set(block.postId, imageUrl);
  }

  return posts.map((post) => {
    const mainImageUrl = normalizeStoredImageUrl(post.mainImageUrl);
    return {
      ...post,
      views: Number.isSafeInteger(post.views) && post.views >= 0 ? post.views : 0,
      mainImageUrl,
      coverImageUrl: mainImageUrl ?? coverByPost.get(post.id) ?? null,
    };
  });
}

export async function listPublishedPostPage(env: WorkerEnv, requestedPage: unknown): Promise<PostPage<PostListItem>> {
  const db = createD1Database(env.DB);
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
  const db = createD1Database(env.DB);
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
    coverImageUrl:
      normalizeStoredImageUrl(post.mainImageUrl) ??
      blocks
        .map((block) => sanityImageUrl(block.portableTextJson))
        .find(Boolean) ??
      null,
    portableTextJson: post.portableTextJson,
    slateJson: post.slateJson,
    blocks,
  };
}

export async function updateImportedPostBySlug(
  env: WorkerEnv,
  slug: string,
  input: UpdatePostInput,
): Promise<PostDetail | null> {
  validatePostInput(input);
  const existing = await getImportedPostBySlug(env, slug, { includeDrafts: true });
  if (!existing) return null;

  const db = createD1Database(env.DB);
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

  const update = db
    .update(importedPosts)
    .set({
      title: nextTitle,
      slug: nextSlug,
      description: nextDescription,
      mainImageUrl: nextMainImageUrl,
      mood: nextMood,
      readingTime: nextReadingTime,
      publishedAt:
        input.publishedAt === undefined
          ? existing.publishedAt
          : input.publishedAt,
      slateJson: slateBlocks,
      portableTextJson: slateBlocks.map((block, index) => slateBlockToPortableText(block, getBlockId(block) ?? `block_${index}`)),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(importedPosts.id, existing.id));

  await db.batch([update, db.delete(postBlocks).where(eq(postBlocks.postId, existing.id)),
    ...blockInserts(db, existing.id, slateBlocks)]);

  return getImportedPostBySlug(env, nextSlug, { includeDrafts: true });
}

export async function createPost(env: WorkerEnv, input: UpdatePostInput): Promise<PostDetail> {
  validatePostInput(input);
  const title = input.title?.trim();
  if (!title) throw AppError.badRequest('请输入文章标题');
  const slug = input.slug?.trim() || createPostSlug(title);
  validateSlug(slug);
  await ensureAvailableSlug(env, slug);
  const db = createD1Database(env.DB);
  const id = `post_${crypto.randomUUID()}`;
  const blocks = normalizeSlateBlocks(input.slateJson);
  const now = new Date().toISOString();
  try {
    await db.batch([
      db.insert(importedPosts).values({
        id, sanityId: id, title, slug,
        description: input.description ?? null,
        mainImageUrl: normalizeStoredImageUrl(input.mainImageUrl),
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

function blockInserts(db: ReturnType<typeof createD1Database>, postId: string, blocks: EditorBlockNode[]) {
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

function sanityImageUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const asset = (value as { asset?: { _ref?: unknown; url?: unknown } }).asset;
  const directUrl =
    typeof asset?.url === 'string'
      ? asset.url.trim()
      : typeof (value as { url?: unknown }).url === 'string'
        ? String((value as { url?: unknown }).url).trim()
        : '';
  if (directUrl) return directUrl;

  const ref =
    typeof asset?._ref === 'string'
      ? asset._ref
      : typeof (value as { _ref?: unknown })._ref === 'string'
        ? String((value as { _ref?: unknown })._ref)
        : null;
  if (!ref?.startsWith('image-')) return null;

  const match = /^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i.exec(ref);
  if (!match) return null;

  const [, id, dimensions, format] = match;
  return `https://cdn.sanity.io/images/gynhwdlh/production/${id}-${dimensions}.${format}`;
}

function normalizeStoredImageUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed === 'main_image_url') return null;
  return trimmed;
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
