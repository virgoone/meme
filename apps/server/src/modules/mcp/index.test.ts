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
const { mcpModule } = await import('./index');
const { postsModule } = await import('../posts');
const { adminModule } = await import('../admin');
const app = new Elysia({ aot: false }).use(errorHandler).use(postsModule).use(adminModule).use(mcpModule);

let sqlite: Database;
let kv: Map<string, string>;
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
  const env = {
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

async function issueToken(scopes: string[] = ['read', 'write']) {
  const response = await http('/admin/mcp/tokens', 'POST', { name: 'Claude', scopes });
  expect(response.status).toBe(201);
  return (await response.json()) as { token: string; record: { id: string; prefix: string; scopes: string[] } };
}

let rpcId = 0;
async function rpc(token: string | null, method: string, params?: unknown) {
  const response = await http('/mcp', 'POST', { jsonrpc: '2.0', id: ++rpcId, method, ...(params === undefined ? {} : { params }) },
    token ? { authorization: `Bearer ${token}` } : {});
  return { status: response.status, body: response.status === 202 ? null : await response.json() };
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
  test('rejects missing, unknown and revoked tokens, and only admins manage tokens', async () => {
    expect((await rpc(null, 'tools/list')).status).toBe(401);
    expect((await rpc('meme_mcp_forged', 'tools/list')).status).toBe(401);
    const { token, record } = await issueToken(['read']);
    expect(token.startsWith(record.prefix)).toBe(true);
    expect((await rpc(token, 'ping')).body.result).toEqual({});

    const listed = await (await http('/admin/mcp/tokens')).json();
    expect(listed).toHaveLength(1);
    expect(JSON.stringify(listed)).not.toContain(token);
    expect(listed[0].hash).toBeUndefined();
    expect(JSON.stringify(await (await http('/admin/settings')).json())).not.toContain('mcp:tokens');

    role = 'user';
    expect((await http('/admin/mcp/tokens')).status).toBe(403);
    expect((await http('/admin/mcp/tokens', 'POST', { name: 'x' })).status).toBe(403);
    role = 'admin';
    expect((await http(`/admin/mcp/tokens/${record.id}`, 'DELETE')).status).toBe(200);
    expect((await rpc(token, 'ping')).status).toBe(401);
  });

  test('rejects foreign browser origins and GET streams', async () => {
    const { token } = await issueToken();
    const foreign = await http('/mcp', 'POST', { jsonrpc: '2.0', id: 1, method: 'ping' }, { authorization: `Bearer ${token}`, origin: 'https://evil.example' });
    expect(foreign.status).toBe(403);
    expect((await http('/mcp', 'GET', undefined, { authorization: `Bearer ${token}` })).status).toBe(405);
  });

  test('read tokens neither list nor run write tools', async () => {
    await seedPost();
    const { token } = await issueToken(['read']);
    const tools = (await rpc(token, 'tools/list')).body.result.tools.map((tool: { name: string }) => tool.name);
    expect(tools).toContain('get_post');
    expect(tools).not.toContain('update_post');
    const denied = await call(token, 'update_post', { slug: 'mcp-fixture', title: 'Hijacked' });
    expect(denied.isError).toBe(true);
    expect((await (await http('/admin/posts/mcp-fixture')).json()).title).toBe('MCP fixture');
  });
});

describe('MCP protocol', () => {
  test('negotiates the protocol version, accepts notifications and reports unknown methods', async () => {
    const { token } = await issueToken();
    const init = await rpc(token, 'initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
    expect(init.body.result.protocolVersion).toBe('2025-03-26');
    expect(init.body.result.capabilities.tools).toBeDefined();
    expect((await rpc(token, 'initialize', { protocolVersion: '1999-01-01' })).body.result.protocolVersion).toBe('2025-06-18');
    const note = await http('/mcp', 'POST', { jsonrpc: '2.0', method: 'notifications/initialized' }, { authorization: `Bearer ${token}` });
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
