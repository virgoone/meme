import { createD1Database, importedPosts, postBlocks } from '@meme/db';
import {
  blockPlainText,
  type EditorBlockNode,
  getBlockId,
  withStableBlockIds,
} from '@meme/editor';
import { asc, desc, eq, inArray } from 'drizzle-orm';

import type { WorkerEnv } from '../../env';

export type PostListItem = {
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
  options?: { limit?: number },
): Promise<PostListItem[]> {
  const db = createD1Database(env.DB);
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);

  const posts = await db
    .select({
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
    .orderBy(desc(importedPosts.publishedAt), desc(importedPosts.createdAt))
    .limit(limit);

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
      mainImageUrl,
      coverImageUrl: mainImageUrl ?? coverByPost.get(post.id) ?? null,
    };
  });
}

export async function getImportedPostBySlug(
  env: WorkerEnv,
  slug: string,
): Promise<PostDetail | null> {
  const db = createD1Database(env.DB);
  const [post] = await db
    .select()
    .from(importedPosts)
    .where(eq(importedPosts.slug, slug))
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
  const existing = await getImportedPostBySlug(env, slug);
  if (!existing) return null;

  const db = createD1Database(env.DB);
  const slateBlocks = normalizeSlateBlocks(
    input.slateJson ?? existing.slateJson,
  );
  const nextSlug = input.slug?.trim() || existing.slug;
  const nextTitle = input.title?.trim() || existing.title;
  const nextDescription =
    input.description === undefined ? existing.description : input.description;
  const nextMainImageUrl =
    input.mainImageUrl === undefined
      ? existing.mainImageUrl
      : normalizeOptionalUrl(input.mainImageUrl);
  const nextMood =
    input.mood === undefined ? existing.mood : (input.mood ?? 'neutral');
  const nextReadingTime =
    input.readingTime === undefined
      ? estimateReadingTime(slateBlocks)
      : (input.readingTime ?? 0);

  await db
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
      updatedAt: new Date().toISOString(),
    })
    .where(eq(importedPosts.id, existing.id));

  await db.delete(postBlocks).where(eq(postBlocks.postId, existing.id));

  if (slateBlocks.length > 0) {
    const updatedAt = new Date().toISOString();
    for (const [index, block] of slateBlocks.entries()) {
      const blockId = getBlockId(block) ?? `block_${index}`;
      await db.insert(postBlocks).values({
        id: stableId('post_block', `${existing.id}:${blockId}`),
        postId: existing.id,
        blockId,
        portableTextKey: blockId,
        sortIndex: index,
        type: typeof block.type === 'string' ? block.type : 'p',
        portableTextJson: slateBlockToPortableText(block, blockId),
        slateJson: block,
        plainText: blockPlainText(block),
        updatedAt,
      });
    }
  }

  return getImportedPostBySlug(env, nextSlug);
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
    .map((block) => blockPlainText(block))
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

  if (block.type === 'image' && originalPortableText) {
    return originalPortableText;
  }

  const text = blockPlainText(block);
  return {
    _key: blockId,
    _type: 'block',
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
    type === 'blockquote'
  ) {
    return type;
  }
  return 'normal';
}

function stableId(prefix: string, input: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${prefix}_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
