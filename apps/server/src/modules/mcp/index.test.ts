import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { Elysia } from 'elysia';
import { readdirSync, readFileSync } from 'node:fs';
import { exposeCloudflareRuntime } from '../../cloudflare/runtime';
import type { WorkerEnv } from '../../env';
import { errorHandler } from '../../middleware/errorHandler';

let role: string | null = 'admin';
mock.module('../../auth', () => ({
  getAuth: () => ({ api: { getSession: async () => role ? { user: { id: 'owner', role }, session: {} } : null } }),
}));
const { handleMcpHttp, handleMcpRequest, resolvePrincipal } = await import('./index');
const { postsModule } = await import('../posts');
const { adminModule } = await import('../admin');
const app = new Elysia({ aot: false }).use(errorHandler).use(postsModule).use(adminModule);

let sqlite: Database;
let kv: Map<string, string>;
let env: WorkerEnv;
const migrations = new URL('../../../../../packages/db/drizzle/', import.meta.url);

beforeEach(() => {
  role = 'admin';
  sqlite?.close();
  sqlite = new Database(':memory:');
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) {
    for (const statement of readFileSync(new URL(file, migrations), 'utf8').split('--> statement-breakpoint')) {
      try { sqlite.exec(statement); } catch { /* columns already present in the base table */ }
    }
  }
  kv = new Map();
  class Statement {
    values: (string | number | null)[] = [];
    constructor(readonly sql: string) {}
    bind(...values: (string | number | null)[]) { this.values = values; return this; }
    raw() { return Promise.resolve(sqlite.prepare(this.sql).values(...this.values)); }
    all() { return Promise.resolve(this.execute()); }
    run() { return Promise.resolve(this.execute()); }
    execute() { return { success: true, results: sqlite.prepare(this.sql).all(...this.values), meta: {} }; }
  }
  env = {
    SITE_URL: 'https://blog.example', TRUSTED_ORIGINS: 'https://blog.example',
    MEME_KV: { get: async (key: string) => kv.get(key) ?? null, put: async (key: string, value: string) => { kv.set(key, value); } },
    DB: {
      prepare: (sql: string) => new Statement(sql),
      batch: (statements: Statement[]) => Promise.resolve(sqlite.transaction(() => statements.map((statement) => statement.execute()))()),
    },
  } as unknown as WorkerEnv;
  exposeCloudflareRuntime(env);
});

function http(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  return app.handle(new Request(`http://localhost${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
}

/** Scopes the verified token carries; the OAuth flow itself is covered end-to-end. */
async function issueToken(scopes: string[] = ['read', 'write']) {
  return { token: scopes.map((scope) => `meme:${scope}`).join(' ') };
}

let rpcId = 0;
async function send(token: string, message: unknown) {
  try {
    const response = await handleMcpRequest(JSON.stringify(message), env, { userId: 'owner', clientId: 'client', scopes: new Set(token.split(' ')) });
    return { status: response.status, body: response.status === 202 ? null : await response.json() };
  } catch (error) {
    // createInsufficientScopeError: requireMcpAuth turns it into a 403 challenge.
    return { status: (error as { statusCode?: number }).statusCode ?? 500, body: null, error };
  }
}

async function rpc(token: string, method: string, params?: unknown) {
  return send(token, { jsonrpc: '2.0', id: ++rpcId, method, ...(params === undefined ? {} : { params }) });
}

async function call(token: string, name: string, args: Record<string, unknown> = {}) {
  const { body } = await rpc(token, 'tools/call', { name, arguments: args });
  // biome-ignore lint/suspicious/noExplicitAny: tool results are asserted field by field below
  return body.result as { isError?: boolean; structuredContent: any; content: { text: string }[] };
}

const richParagraph = { type: 'p', children: [{ text: 'Keep ' }, { text: 'bold', bold: true }, { type: 'a', url: 'https://example.com', children: [{ text: 'link' }] }] };
const heading = { type: 'h2', children: [{ text: 'Old heading', italic: true }] };
const image = { type: 'img', url: 'https://cdn.example/photo.png', width: 320, align: 'right', caption: [{ text: 'Caption' }], children: [{ text: '' }] };

async function seedPost(publishedAt: string | null = '2026-10-01T08:00:00.000Z') {
  const response = await http('/posts', 'POST', { title: 'MCP fixture', slug: 'mcp-fixture', description: 'Fixture', mainImageUrl: 'https://cdn.example/cover.png', publishedAt, readingTime: 7, slateJson: [heading, richParagraph, image] });
  expect(response.status).toBe(201);
  return response.json();
}

describe('MCP authorization', () => {
  test('foreign browser origins and non-POST methods are refused before token verification', async () => {
    const foreign = await handleMcpHttp(new Request('http://localhost/api/mcp', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }), env);
    expect(foreign.status).toBe(403);
    expect((await handleMcpHttp(new Request('http://localhost/api/mcp'), env)).status).toBe(405);
  });

  test('a verified token maps to a current admin with a live consent for that client', async () => {
    const now = Date.now();
    sqlite.prepare("INSERT INTO ba_user (id, name, email, email_verified, role, created_at, updated_at) VALUES ('owner', 'Owner', 'owner@example.com', 1, 'admin', ?, ?)").run(now, now);
    sqlite.prepare("INSERT INTO ba_oauth_client (id, client_id, name, redirect_uris, created_at, updated_at) VALUES ('c1', 'client', 'Claude', ?, ?, ?)").run(JSON.stringify(['http://127.0.0.1:33418/callback']), now, now);
    sqlite.prepare("INSERT INTO ba_oauth_consent (id, client_id, user_id, scopes, created_at, updated_at) VALUES ('k1', 'client', 'owner', 'meme:read', ?, ?)").run(now, now);
    const claims = { sub: 'owner', azp: 'client', scope: 'openid meme:read' };
    const principal = await resolvePrincipal(env, claims);
    expect(principal).toMatchObject({ userId: 'owner', clientId: 'client' });
    expect([...(principal as { scopes: Set<string> }).scopes]).toEqual(['openid', 'meme:read']);

    sqlite.prepare("UPDATE ba_user SET role = 'user' WHERE id = 'owner'").run();
    expect(((await resolvePrincipal(env, claims)) as Response).status).toBe(403);
    sqlite.prepare("UPDATE ba_user SET role = 'admin' WHERE id = 'owner'").run();
    // Deleting the consent (Better Auth /oauth2/delete-consent) disconnects at once,
    // even though the signed access token itself has not expired yet.
    sqlite.prepare("DELETE FROM ba_oauth_consent WHERE id = 'k1'").run();
    expect(((await resolvePrincipal(env, claims)) as Response).status).toBe(401);
    expect(((await resolvePrincipal(env, { ...claims, sub: 'ghost' })) as Response).status).toBe(401);
  });

  test('meme:read lists and runs queries only; edits need meme:write (403 insufficient_scope)', async () => {
    await seedPost();
    const { token } = await issueToken(['read']);
    const tools = (await rpc(token, 'tools/list')).body.result.tools.map((tool: { name: string }) => tool.name);
    expect(tools).toContain('get_post');
    expect(tools).not.toContain('update_post');
    const denied = await rpc(token, 'tools/call', { name: 'update_post', arguments: { slug: 'mcp-fixture', title: 'Hijacked' } });
    expect(denied.status).toBe(403);
    expect(String((denied.error as Error).message ?? denied.error)).toMatch(/insufficient_scope|meme:write/);
    expect((await (await http('/admin/posts/mcp-fixture')).json()).title).toBe('MCP fixture');
  });
});

describe('MCP protocol', () => {
  test('negotiates the protocol version, accepts notifications and reports unknown methods', async () => {
    const { token } = await issueToken();
    const init = await rpc(token, 'initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
    expect(init.body.result.protocolVersion).toBe('2025-03-26');
    expect(init.body.result.capabilities.tools).toBeDefined();
    expect((await rpc(token, 'initialize', { protocolVersion: '1999-01-01' })).body.result.protocolVersion).toBe('2025-11-25');
    const note = await send(token, { jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(note.status).toBe(202);
    expect((await rpc(token, 'resources/list')).body.error.code).toBe(-32601);
  });
});

describe('MCP content tools', () => {
  test('lists drafts and published posts with views, and reads the full text with block IDs', async () => {
    const post = await seedPost();
    await http('/posts', 'POST', { title: 'Unpublished idea', slug: 'unpublished-idea' });
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(`analytics:views:post:${post.id}`, '42');
    const { token } = await issueToken(['read']);

    const all = (await call(token, 'list_posts')).structuredContent.items;
    expect(all.map((item: { slug: string }) => item.slug).sort()).toEqual(['mcp-fixture', 'unpublished-idea']);
    expect(all.find((item: { slug: string }) => item.slug === 'mcp-fixture')).toMatchObject({ status: 'published', views: 42 });
    expect((await call(token, 'list_posts', { status: 'draft' })).structuredContent.items.map((item: { slug: string }) => item.slug)).toEqual(['unpublished-idea']);
    expect((await call(token, 'list_posts', { query: 'IDEA' })).structuredContent.items).toHaveLength(1);

    const read = (await call(token, 'get_post', { slug: 'mcp-fixture', includeSlate: true })).structuredContent;
    expect(read.markdown).toBe('## Old heading\n\nKeep boldlink\n\n![](https://cdn.example/photo.png)');
    expect(read.blocks.map((block: { blockId: string }) => block.blockId)).toEqual(post.blocks.map((block: { blockId: string }) => block.blockId));
    expect(read.blocks[2].attributes).toMatchObject({ url: image.url, width: 320, align: 'right' });
    expect(read.blocks[1].slate.children).toEqual(richParagraph.children);
    expect(read.views).toBe(42);
    expect((await call(token, 'get_post', { slug: 'missing' })).isError).toBe(true);
  });

  test('edits one block and keeps untouched rich text, block IDs, image layout, cover and publish state', async () => {
    const post = await seedPost();
    const before = await (await http('/admin/posts/mcp-fixture')).json();
    const { token } = await issueToken();
    const [headingId, paragraphId, imageId] = before.blocks.map((block: { blockId: string }) => block.blockId);

    const result = await call(token, 'update_post', {
      slug: 'mcp-fixture',
      expectedUpdatedAt: before.updatedAt,
      description: 'Edited by MCP',
      operations: [{ op: 'set_text', blockId: headingId, text: 'New heading' }],
    });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.changedBlocks).toEqual([headingId]);

    const after = await (await http('/admin/posts/mcp-fixture')).json();
    expect(after.blocks.map((block: { blockId: string }) => block.blockId)).toEqual([headingId, paragraphId, imageId]);
    expect(after.blocks[0].slateJson.children).toEqual([{ text: 'New heading', italic: true }]);
    expect(after.blocks[1].slateJson).toEqual(before.blocks[1].slateJson);
    expect(after.blocks[2].slateJson).toEqual(before.blocks[2].slateJson);
    expect(after.blocks[2].slateJson).toMatchObject({ width: 320, align: 'right' });
    expect(after).toMatchObject({ publishedAt: post.publishedAt, mainImageUrl: post.mainImageUrl, coverImageUrl: post.coverImageUrl, readingTime: 7, title: 'MCP fixture', description: 'Edited by MCP' });

    // A stale version is refused instead of overwriting the newer save.
    const stale = await call(token, 'update_post', { slug: 'mcp-fixture', expectedUpdatedAt: before.updatedAt, title: 'Stale' });
    expect(stale.isError).toBe(true);
    expect((await (await http('/admin/posts/mcp-fixture')).json()).title).toBe('MCP fixture');
  });

  test('inserts, replaces, resizes and deletes blocks; drafts stay drafts until publishedAt is given', async () => {
    await seedPost(null);
    const { token } = await issueToken();
    const before = await (await http('/admin/posts/mcp-fixture')).json();
    const [headingId, paragraphId, imageId] = before.blocks.map((block: { blockId: string }) => block.blockId);

    const edited = await call(token, 'update_post', {
      slug: 'mcp-fixture',
      operations: [
        { op: 'insert_after', afterBlockId: paragraphId, block: { type: 'blockquote', children: [{ text: 'Inserted quote' }] } },
        { op: 'set_attributes', blockId: imageId, attributes: { width: '50%', align: 'center' } },
        { op: 'replace_block', blockId: headingId, block: { type: 'h3', children: [{ text: 'Replaced' }] } },
        { op: 'delete_block', blockId: paragraphId },
      ],
    });
    expect(edited.isError).toBeUndefined();
    const after = await (await http('/admin/posts/mcp-fixture')).json();
    expect(after.publishedAt).toBeNull();
    expect(after.blocks.map((block: { type: string }) => block.type)).toEqual(['h3', 'blockquote', 'img']);
    expect(after.blocks[0].blockId).toBe(headingId);
    expect(after.blocks[2]).toMatchObject({ blockId: imageId, slateJson: { url: image.url, width: '50%', align: 'center', caption: image.caption } });

    // Rich paragraphs cannot be flattened by set_text.
    const flattened = await call(token, 'update_post', { slug: 'mcp-fixture', operations: [{ op: 'set_text', blockId: imageId, text: 'x' }] });
    expect(flattened.isError).toBe(true);
    expect((await call(token, 'update_post', { slug: 'mcp-fixture', operations: [{ op: 'delete_block', blockId: 'nope' }] })).isError).toBe(true);

    await call(token, 'update_post', { slug: 'mcp-fixture', publishedAt: '2026-11-01T00:00:00.000Z' });
    expect((await (await http('/posts/mcp-fixture')).json()).publishedAt).toBe('2026-11-01T00:00:00.000Z');
  });

  test('a metadata-only edit of an imported post without post-level Slate JSON keeps its body', async () => {
    sqlite.prepare("INSERT INTO imported_posts (id, sanity_id, slug, title, published_at, portable_text_json) VALUES ('legacy', 'sanity-legacy', 'legacy', 'Legacy', '2024-01-01T00:00:00Z', '[]')").run();
    sqlite.prepare("INSERT INTO post_blocks (id, post_id, block_id, portable_text_key, sort_index, type, portable_text_json, slate_json, plain_text) VALUES ('legacy:k1', 'legacy', 'k1', 'k1', 0, 'block', ?, ?, 'Legacy body')")
      .run(JSON.stringify({ _type: 'block', _key: 'k1', style: 'normal', markDefs: [], children: [{ _type: 'span', text: 'Legacy body', marks: ['strong'] }] }), JSON.stringify({ id: 'k1', type: 'normal', children: [{ text: 'Legacy body', marks: ['strong'] }] }));
    const { token } = await issueToken();
    expect((await call(token, 'update_post', { slug: 'legacy', title: 'Legacy, retitled' })).isError).toBeUndefined();
    const after = await (await http('/admin/posts/legacy')).json();
    expect(after.title).toBe('Legacy, retitled');
    expect(after.blocks).toHaveLength(1);
    expect(after.blocks[0]).toMatchObject({ blockId: 'k1', plainText: 'Legacy body' });
    expect(after.blocks[0].slateJson.children[0]).toMatchObject({ text: 'Legacy body', bold: true });
  });
});

describe('MCP edit consistency', () => {
  test('a version conflict is decided inside the write transaction and changes nothing', async () => {
    await seedPost();
    const before = await (await http('/admin/posts/mcp-fixture')).json();
    const { token } = await issueToken();
    // Another save lands between the tool's read and its batch write.
    const db = (globalThis as { __memeCloudflareRuntime?: { env: WorkerEnv } }).__memeCloudflareRuntime?.env.DB as unknown as { batch: (statements: unknown[]) => Promise<unknown> };
    const batch = db.batch;
    db.batch = async (statements) => {
      db.batch = batch;
      sqlite.prepare("UPDATE imported_posts SET updated_at = '2030-01-01T00:00:00.000Z', title = 'Saved elsewhere' WHERE slug = 'mcp-fixture'").run();
      return batch(statements);
    };
    const result = await call(token, 'update_post', {
      slug: 'mcp-fixture', expectedUpdatedAt: before.updatedAt, title: 'From MCP',
      operations: [{ op: 'set_text', blockId: before.blocks[0].blockId, text: 'Should not land' }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('Version conflict');
    const after = await (await http('/admin/posts/mcp-fixture')).json();
    expect(after.title).toBe('Saved elsewhere');
    expect(after.blocks.map((block: { slateJson: unknown }) => block.slateJson)).toEqual(before.blocks.map((block: { slateJson: unknown }) => block.slateJson));
  });

  test('legacy blocks without an internal ID keep their persisted block_id, so comment anchors survive', async () => {
    sqlite.prepare("INSERT INTO imported_posts (id, sanity_id, slug, title, published_at, portable_text_json, slate_json) VALUES ('old', 'old', 'old-post', 'Old', '2023-01-01T00:00:00Z', '[]', '[]')").run();
    const insert = sqlite.prepare("INSERT INTO post_blocks (id, post_id, block_id, portable_text_key, sort_index, type, portable_text_json, slate_json, plain_text) VALUES (?, 'old', ?, ?, ?, 'p', ?, ?, ?)");
    insert.run('old:anchor-a', 'anchor-a', 'anchor-a', 0, JSON.stringify({ _type: 'slate', _key: 'anchor-a' }), JSON.stringify({ type: 'p', children: [{ text: 'First' }] }), 'First');
    insert.run('old:anchor-b', 'anchor-b', 'anchor-b', 1, JSON.stringify({ _type: 'slate', _key: 'anchor-b' }), JSON.stringify({ type: 'p', children: [{ text: 'Second' }] }), 'Second');
    sqlite.prepare("INSERT INTO comments (user_id, post_id, body) VALUES ('u', 'old', ?)").run(JSON.stringify({ text: 'Anchored', blockId: 'anchor-b' }));
    const { token } = await issueToken();
    const read = (await call(token, 'get_post', { slug: 'old-post' })).structuredContent;
    expect(read.blocks.map((block: { blockId: string }) => block.blockId)).toEqual(['anchor-a', 'anchor-b']);
    expect((await call(token, 'update_post', { slug: 'old-post', title: 'Old, retitled' })).isError).toBeUndefined();
    await call(token, 'update_post', { slug: 'old-post', operations: [{ op: 'set_text', blockId: 'anchor-a', text: 'First, edited' }] });
    const after = await (await http('/admin/posts/old-post')).json();
    expect(after.blocks.map((block: { blockId: string }) => block.blockId)).toEqual(['anchor-a', 'anchor-b']);
    const comments = (await call(token, 'list_comments')).structuredContent.items;
    expect(after.blocks.some((block: { blockId: string }) => block.blockId === comments[0].blockId)).toBe(true);
  });

  test('a retried request with the same requestId replays instead of inserting twice', async () => {
    await seedPost();
    const before = await (await http('/admin/posts/mcp-fixture')).json();
    const { token } = await issueToken();
    const edit = {
      slug: 'mcp-fixture', requestId: 'retry-0001',
      operations: [{ op: 'insert_after', afterBlockId: before.blocks[0].blockId, block: { type: 'p', children: [{ text: 'Inserted once' }] } }],
    };
    const first = await call(token, 'update_post', edit);
    expect(first.isError).toBeUndefined();
    const retry = await call(token, 'update_post', edit);
    expect(retry.structuredContent).toMatchObject({ replayed: true, updatedAt: first.structuredContent.updatedAt, changedBlocks: first.structuredContent.changedBlocks });
    const after = await (await http('/admin/posts/mcp-fixture')).json();
    expect(after.blocks.filter((block: { plainText: string }) => block.plainText === 'Inserted once')).toHaveLength(1);
    expect(after.blocks).toHaveLength(before.blocks.length + 1);
    const reused = await call(token, 'update_post', { ...edit, title: 'Different edit' });
    expect(reused.isError).toBe(true);
    expect(reused.content[0]?.text).toContain('requestId was already used');
    expect(JSON.stringify(await (await http('/admin/settings')).json())).not.toContain('mcp:op:');
  });
});

describe('MCP statistics', () => {
  test('reports site stats and per-article views, reactions and comments', async () => {
    const post = await seedPost();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const insert = sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insert.run('analytics:views:total', '900');
    insert.run(`analytics:views:day:${today}`, '12');
    insert.run(`analytics:views:post:${post.id}`, '300');
    insert.run(`analytics:views:post-day:${post.id}:${today}`, '5');
    sqlite.prepare("INSERT INTO comments (user_id, post_id, body) VALUES ('u1', ?, ?)").run(post.id, JSON.stringify({ text: 'Nice', blockId: post.blocks[1].blockId }));
    kv.set(`reactions:${post.id}`, JSON.stringify([3, 0, 1, 0]));
    const { token } = await issueToken(['read']);

    const site = (await call(token, 'get_site_stats')).structuredContent;
    expect(site.views).toMatchObject({ total: 900, today: 12 });
    expect(site.topPosts[0]).toMatchObject({ slug: 'mcp-fixture', views: 300, last7: 5 });
    expect(site.comments.total).toBe(1);
    expect(site.views.daily).toBeUndefined();
    expect((await call(token, 'get_site_stats', { includeDaily: true })).structuredContent.views.daily).toHaveLength(30);

    const stats = (await call(token, 'get_post_stats', { slug: 'mcp-fixture', days: 7 })).structuredContent;
    expect(stats.views).toMatchObject({ total: 300, last7: 5 });
    expect(stats.views.daily).toHaveLength(7);
    expect(stats.engagement).toMatchObject({ comments: 1, reactions: { counts: [3, 0, 1, 0], total: 4 } });

    const comments = (await call(token, 'list_comments')).structuredContent.items;
    expect(comments[0]).toMatchObject({ postSlug: 'mcp-fixture', text: 'Nice', blockId: post.blocks[1].blockId });
  });
});
