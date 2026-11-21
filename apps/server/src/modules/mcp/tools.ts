import { postToEditorBlocks } from '@meme/editor';

import type { WorkerEnv } from '../../env';
import { AppError } from '../../middleware/errorHandler';
import { listComments } from '../comments/service';
import { listNewsletters, listSubscribers } from '../newsletter/service';
import { getImportedPostBySlug, listImportedPosts, PostVersionConflictError, type UpdatePostInput, updateImportedPostBySlug } from '../posts/service';
import { settings } from '@meme/db';
import { listProjects } from '../projects/service';
import { getReactions } from '../reactions/service';
import { getAdminStats } from '../system/stats';
import { postDayViewsKey, postViewsKey, readViews, viewDay } from '../system/views';
import { applyBlockOperations, type BlockOperation, BlockOperationError, blockAttributes, blocksToMarkdown, nodeText, parseOperations } from './content';

type JsonSchema = Record<string, unknown>;

export type McpTool = {
  name: string;
  title: string;
  description: string;
  scope: 'read' | 'write';
  inputSchema: JsonSchema;
  annotations: { readOnlyHint: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint: false };
  run: (env: WorkerEnv, args: Record<string, unknown>, context: ToolContext) => Promise<unknown>;
};

/** Who is calling: a stable identity for scoping idempotency records. */
export type ToolContext = { actor: string };

/** Raised for caller mistakes; surfaced to the model as a tool error, not a protocol error. */
export class ToolInputError extends Error {}

const slugSchema = { type: 'string', description: 'Article slug, as in https://blog.douni.one/<slug>' };
const limitSchema = (max: number, fallback: number) => ({ type: 'integer', minimum: 1, maximum: max, default: fallback });

const slateNodeSchema = {
  type: 'object',
  description: 'A Slate element as stored by the editor, e.g. {"type":"p","children":[{"text":"Hello","bold":true}]} or {"type":"img","url":"…","width":480,"align":"center","children":[{"text":""}]}.',
  properties: { type: { type: 'string' }, children: { type: 'array' } },
  required: ['type', 'children'],
};

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'list_posts',
    title: 'List articles',
    description: 'Lists blog articles newest first, including drafts. Each item has slug, title, description, status (published/draft), publishedAt, cover URL and total views. Use get_post for the full text.',
    scope: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['all', 'published', 'draft'], default: 'all' },
        query: { type: 'string', description: 'Case-insensitive match on title, slug or description.' },
        limit: limitSchema(100, 20),
        offset: { type: 'integer', minimum: 0, default: 0 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (env, args) => {
      const limit = intArg(args.limit, 20, 1, 100);
      const offset = intArg(args.offset, 0, 0, 100_000);
      const status = args.status === 'published' || args.status === 'draft' ? args.status : 'all';
      const posts = await listImportedPosts(env, { limit, offset, status, query: optionalString(args.query, 'query') });
      return {
        items: posts.map((post) => ({
          slug: post.slug,
          title: post.title,
          description: post.description,
          status: post.publishedAt ? 'published' : 'draft',
          publishedAt: post.publishedAt,
          coverImageUrl: post.coverImageUrl,
          mood: post.mood,
          readingTime: post.readingTime,
          views: post.views ?? 0,
        })),
        offset,
        nextOffset: posts.length === limit ? offset + limit : null,
      };
    },
  },
  {
    name: 'get_post',
    title: 'Read an article',
    description: 'Returns one article (draft or published) with metadata, the full text as Markdown, and every block with its stable blockId, type, plain text and attributes (image url/width/align, list style, code language…). Pass includeSlate to get each block\'s exact Slate JSON before using replace_block.',
    scope: 'read',
    inputSchema: {
      type: 'object',
      properties: { slug: slugSchema, includeSlate: { type: 'boolean', default: false } },
      required: ['slug'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (env, args) => {
      const post = await requirePost(env, requireString(args.slug, 'slug'));
      const blocks = postToEditorBlocks(post, { attachPortableText: 'legacy' });
      return {
        slug: post.slug,
        title: post.title,
        description: post.description,
        status: post.publishedAt ? 'published' : 'draft',
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        mainImageUrl: post.mainImageUrl,
        coverImageUrl: post.coverImageUrl,
        mood: post.mood,
        readingTime: post.readingTime,
        views: await readViews(env, postViewsKey(post.id)),
        url: `/${post.slug}`,
        markdown: blocksToMarkdown(blocks),
        blocks: blocks.map((block) => ({
          blockId: block.blockId,
          type: block.type ?? 'p',
          text: nodeText(block),
          attributes: blockAttributes(block),
          ...(args.includeSlate === true ? { slate: block } : {}),
        })),
      };
    },
  },
  {
    name: 'update_post',
    title: 'Edit an article',
    description: [
      'Edits one article through the same service the admin editor uses. Only the fields you pass change; publish status and publishedAt are kept unless you pass publishedAt (ISO time to publish, null to make it a draft).',
      'Body edits are block operations addressed by blockId (from get_post), applied in order: set_text {blockId,text} replaces the text of a plain text block keeping its marks; set_attributes {blockId,attributes} merges attributes such as an image url/width/align (null removes one); replace_block {blockId,block} swaps in a full Slate element keeping the blockId; insert_after {afterBlockId|null,block} inserts a new block (null = at the top); delete_block {blockId}.',
      'Blocks you do not name are saved exactly as stored. Pass expectedUpdatedAt (from get_post): the version check runs in the same transaction as the write, so on a conflict nothing changes.',
      'Pass a fresh requestId (8-64 chars of [A-Za-z0-9_-]) per intended edit and reuse it when retrying after a timeout or lost response: a request that already committed returns its original result with replayed=true instead of applying twice, and inserted blocks get IDs derived from it.',
    ].join(' '),
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        slug: slugSchema,
        expectedUpdatedAt: { type: 'string', description: 'updatedAt from get_post; the edit fails, changing nothing, if the article changed since.' },
        requestId: { type: 'string', pattern: '^[A-Za-z0-9_-]{8,64}$', description: 'Idempotency key: reuse it only to retry the same edit.' },
        title: { type: 'string', maxLength: 250 },
        newSlug: { type: 'string', description: 'Rename the article URL.' },
        description: { type: ['string', 'null'] },
        mainImageUrl: { type: ['string', 'null'], description: 'Cover image URL; null falls back to the first image in the body.' },
        mood: { type: 'string', enum: ['happy', 'sad', 'neutral'] },
        readingTime: { type: 'number', minimum: 0 },
        publishedAt: { type: ['string', 'null'], description: 'ISO 8601 time. Omit to keep the current status.' },
        operations: {
          type: 'array',
          maxItems: 200,
          items: {
            type: 'object',
            properties: {
              op: { type: 'string', enum: ['set_text', 'set_attributes', 'replace_block', 'insert_after', 'delete_block'] },
              blockId: { type: 'string' },
              afterBlockId: { type: ['string', 'null'] },
              text: { type: 'string' },
              attributes: { type: 'object' },
              block: slateNodeSchema,
            },
            required: ['op'],
          },
        },
      },
      required: ['slug'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    run: async (env, args, context) => {
      const slug = requireString(args.slug, 'slug');
      const requestId = args.requestId === undefined ? null : requireRequestId(args.requestId);
      const fingerprint = requestId ? await sha256Hex(JSON.stringify(args)) : '';
      const recordKey = requestId ? `mcp:op:${context.actor}:${requestId}` : null;
      if (recordKey) {
        const replay = await readOperationRecord(env, recordKey, fingerprint);
        if (replay) return replay;
      }
      const post = await requirePost(env, slug);
      if (args.expectedUpdatedAt !== undefined && args.expectedUpdatedAt !== null && typeof args.expectedUpdatedAt !== 'string') {
        throw new ToolInputError('expectedUpdatedAt must be the updatedAt string from get_post');
      }
      let operations: BlockOperation[];
      try {
        operations = parseOperations(args.operations);
      } catch (error) {
        throw new ToolInputError(error instanceof Error ? error.message : String(error));
      }
      const input: UpdatePostInput = {
        // Without a new value the stored reading time is kept instead of re-estimated.
        readingTime: args.readingTime === undefined ? post.readingTime : numberArg(args.readingTime, 'readingTime'),
      };
      if (args.title !== undefined) input.title = requireString(args.title, 'title');
      if (args.newSlug !== undefined) input.slug = requireString(args.newSlug, 'newSlug');
      if (args.description !== undefined) input.description = nullableString(args.description, 'description');
      if (args.mainImageUrl !== undefined) input.mainImageUrl = nullableString(args.mainImageUrl, 'mainImageUrl');
      if (args.mood !== undefined) {
        if (args.mood !== 'happy' && args.mood !== 'sad' && args.mood !== 'neutral') throw new ToolInputError('mood must be happy, sad or neutral');
        input.mood = args.mood;
      }
      if (args.publishedAt !== undefined) input.publishedAt = nullableString(args.publishedAt, 'publishedAt');

      // The body is always sent as the editor reads it. The service would otherwise
      // rebuild blocks from the post-level JSON, which older imports do not have.
      const blocks = postToEditorBlocks(post, { attachPortableText: 'legacy' });
      if (!blocks.length && (post.blocks?.length ?? 0) > 0) {
        throw new ToolInputError('This article\'s body could not be read as editor blocks; edit it in the admin editor instead.');
      }
      input.slateJson = blocks;
      let changedBlocks: string[] = [];
      if (operations.length) {
        try {
          const result = applyBlockOperations(blocks, operations, { idSeed: requestId ? `${context.actor}:${requestId}` : undefined });
          input.slateJson = result.blocks;
          changedBlocks = result.changed;
        } catch (error) {
          if (error instanceof BlockOperationError) throw new ToolInputError(error.message);
          throw error;
        }
      }

      let saved: Awaited<ReturnType<typeof updateImportedPostBySlug>>;
      try {
        saved = await withToolErrors(() => updateImportedPostBySlug(env, slug, input, {
          expectedUpdatedAt: typeof args.expectedUpdatedAt === 'string' || args.expectedUpdatedAt === null ? args.expectedUpdatedAt : undefined,
          // The replay record commits in the same transaction as the edit, so a
          // retry either finds it (and replays) or the edit never happened.
          extraStatements: recordKey ? (db, written) => [db.insert(settings).values({
            key: recordKey,
            value: { fingerprint, result: { slug: written.slug, updatedAt: written.updatedAt, changedBlocks } },
          })] : undefined,
        }));
      } catch (error) {
        if (recordKey && error instanceof ToolInputError === false && /constraint/i.test(String(error))) {
          // A concurrent retry with the same requestId committed first.
          const replay = await readOperationRecord(env, recordKey, fingerprint);
          if (replay) return replay;
        }
        throw error;
      }
      if (!saved) throw new ToolInputError(`Article ${slug} does not exist`);
      return {
        slug: saved.slug,
        title: saved.title,
        status: saved.publishedAt ? 'published' : 'draft',
        publishedAt: saved.publishedAt,
        updatedAt: saved.updatedAt,
        mainImageUrl: saved.mainImageUrl,
        coverImageUrl: saved.coverImageUrl,
        blockCount: saved.blocks.length,
        changedBlocks,
      };
    },
  },
  {
    name: 'get_site_stats',
    title: 'Site statistics',
    description: 'The admin dashboard numbers: page views (today, 7 days, month, total, last 30 days per day), top 10 articles by views, subscribers (active, new, 90-day trend), comments and guestbook activity, and publishing per month. Days are in Asia/Shanghai.',
    scope: 'read',
    inputSchema: { type: 'object', properties: { includeDaily: { type: 'boolean', default: false, description: 'Include the per-day series.' } }, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (env, args) => {
      const stats = await getAdminStats(env);
      if (args.includeDaily === true) return stats;
      return {
        generatedAt: stats.generatedAt,
        views: { total: stats.views.total, today: stats.views.today, week: stats.views.week, month: stats.views.month, trackedSince: stats.views.trackedSince },
        topPosts: stats.topPosts,
        subscribers: { active: stats.subscribers.active, total: stats.subscribers.total, today: stats.subscribers.today, month: stats.subscribers.month },
        comments: { total: stats.comments.total, month: stats.comments.month },
        guestbook: { total: stats.guestbook.total, month: stats.guestbook.month },
        publishing: stats.publishing,
      };
    },
  },
  {
    name: 'get_post_stats',
    title: 'Article statistics',
    description: 'Views (total, last 7 and 30 days, daily series) and engagement (reaction counts, comment count) for one article.',
    scope: 'read',
    inputSchema: { type: 'object', properties: { slug: slugSchema, days: limitSchema(90, 30) }, required: ['slug'], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (env, args) => {
      const post = await requirePost(env, requireString(args.slug, 'slug'));
      const days = intArg(args.days, 30, 1, 90);
      const now = Date.now();
      const dayKeys = Array.from({ length: days }, (_, index) => viewDay(new Date(now - (days - 1 - index) * 86_400_000)));
      const keys = dayKeys.map((day) => postDayViewsKey(post.id, day));
      const rows = await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all<{ key: string; value: string }>();
      const counts = new Map(rows.results.map((row) => [row.key, Math.max(0, Number(row.value) || 0)]));
      const daily = dayKeys.map((day) => ({ day, views: counts.get(postDayViewsKey(post.id, day)) ?? 0 }));
      const ids = [...new Set([post.id, post.sanityId])];
      const commentRows = await env.DB.prepare(`SELECT count(*) AS total FROM comments WHERE post_id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all<{ total: number }>();
      const reactions = await getReactions(env, post.id);
      return {
        slug: post.slug,
        title: post.title,
        status: post.publishedAt ? 'published' : 'draft',
        views: {
          total: await readViews(env, postViewsKey(post.id)),
          last7: daily.slice(-7).reduce((sum, point) => sum + point.views, 0),
          [`last${days}`]: daily.reduce((sum, point) => sum + point.views, 0),
          daily,
        },
        engagement: {
          comments: Number(commentRows.results[0]?.total ?? 0),
          reactions: { counts: reactions, total: reactions.reduce((sum, value) => sum + value, 0), note: 'Four reaction slots; their emoji follow the article mood.' },
        },
      };
    },
  },
  {
    name: 'list_comments',
    title: 'Recent comments',
    description: 'Most recent paragraph comments across all articles, newest first, with the article slug and anchored blockId.',
    scope: 'read',
    inputSchema: { type: 'object', properties: { limit: limitSchema(200, 50) }, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (env, args) => {
      const rows = await listComments(env, intArg(args.limit, 50, 1, 200));
      const postIds = [...new Set(rows.map((row) => row.postId))];
      const slugs = new Map<string, string>();
      if (postIds.length) {
        const posts = await env.DB.prepare(`SELECT id, sanity_id, slug FROM imported_posts WHERE id IN (${postIds.map(() => '?').join(',')}) OR sanity_id IN (${postIds.map(() => '?').join(',')})`)
          .bind(...postIds, ...postIds).all<{ id: string; sanity_id: string; slug: string }>();
        for (const post of posts.results) { slugs.set(post.id, post.slug); slugs.set(post.sanity_id, post.slug); }
      }
      return rows.map((row) => {
        const info = (row.userInfo && typeof row.userInfo === 'object' ? row.userInfo : {}) as Record<string, unknown>;
        const body = (row.body && typeof row.body === 'object' ? row.body : {}) as Record<string, unknown>;
        return {
          id: row.id,
          postSlug: slugs.get(row.postId) ?? null,
          parentId: row.parentId,
          author: typeof info.name === 'string' ? info.name : null,
          blockId: typeof body.blockId === 'string' ? body.blockId : null,
          text: typeof body.text === 'string' ? body.text : typeof row.body === 'string' ? row.body : '',
          createdAt: row.createdAt,
        };
      });
    },
  },
  {
    name: 'list_subscribers',
    title: 'Newsletter subscribers',
    description: 'Newsletter subscribers with subscription state. Email addresses are personal data: use them only for the site owner\'s requests.',
    scope: 'read',
    inputSchema: { type: 'object', properties: { limit: limitSchema(500, 100) }, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (env, args) => listSubscribers(env, intArg(args.limit, 100, 1, 500)),
  },
  {
    name: 'list_newsletters',
    title: 'Newsletters',
    description: 'Sent and draft newsletter issues, newest first.',
    scope: 'read',
    inputSchema: { type: 'object', properties: { limit: limitSchema(200, 50) }, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (env, args) => listNewsletters(env, intArg(args.limit, 50, 1, 200)),
  },
  {
    name: 'list_projects',
    title: 'Projects',
    description: 'Project cards shown on the public projects page.',
    scope: 'read',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (env) => listProjects(env),
  },
];

async function readOperationRecord(env: WorkerEnv, key: string, fingerprint: string) {
  const rows = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).all<{ value: string }>();
  const raw = rows.results[0]?.value;
  if (!raw) return null;
  const record = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { fingerprint: string; result: Record<string, unknown> };
  if (record.fingerprint !== fingerprint) throw new ToolInputError('requestId was already used for a different edit; send a new requestId for a new edit.');
  return { ...record.result, replayed: true };
}

function requireRequestId(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(value)) throw new ToolInputError('requestId must be 8-64 characters of A-Z, a-z, 0-9, _ or -');
  return value;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function requirePost(env: WorkerEnv, slug: string) {
  const post = await getImportedPostBySlug(env, slug, { includeDrafts: true });
  if (!post) throw new ToolInputError(`Article ${slug} does not exist`);
  return post;
}

/** Service validation errors (bad slug, duplicate slug…) are the caller's to fix. */
async function withToolErrors<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof PostVersionConflictError) {
      throw new ToolInputError(`Version conflict: the article was saved at ${error.currentUpdatedAt} after the version you read. Nothing was changed. Read it again with get_post and reapply the edit.`);
    }
    if (error instanceof AppError && error.statusCode < 500) throw new ToolInputError(error.message);
    throw error;
  }
}

function requireString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw new ToolInputError(`${field} must be a non-empty string`);
  return value;
}

function optionalString(value: unknown, field: string) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ToolInputError(`${field} must be a string`);
  return value;
}

function nullableString(value: unknown, field: string) {
  if (value === null) return null;
  if (typeof value !== 'string') throw new ToolInputError(`${field} must be a string or null`);
  return value;
}

function numberArg(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new ToolInputError(`${field} must be a non-negative number`);
  return value;
}

function intArg(value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new ToolInputError(`expected an integer between ${min} and ${max}`);
  return Math.min(Math.max(value, min), max);
}
