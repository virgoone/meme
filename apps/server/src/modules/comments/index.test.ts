import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { Elysia } from 'elysia';
import { readFileSync } from 'node:fs';
import { exposeCloudflareRuntime } from '../../cloudflare/runtime';
import { errorHandler } from '../../middleware/errorHandler';
import type { WorkerEnv } from '../../env';

let signedIn = true;
mock.module('../../auth', () => ({ getAuth: () => ({ api: { getSession: async () => signedIn ? { user: { id: 'current-reader', name: 'Current Reader', image: '/current.png' }, session: {} } : null } }) }));
const { commentsModule } = await import('./index');
const app = new Elysia({ aot: false }).use(errorHandler).use(commentsModule);
let sqlite: Database;
beforeEach(() => {
  signedIn = true;
  sqlite = new Database(':memory:');
  for (const migration of ['0000_content_migration_control', '0001_legacy_turso_tables']) sqlite.exec(readFileSync(new URL(`../../../../../packages/db/drizzle/${migration}.sql`, import.meta.url), 'utf8'));
  sqlite.exec(`INSERT INTO imported_posts (id,sanity_id,title,slug,portable_text_json,published_at) VALUES ('post-new','old-sanity-id','Article','article','[]','2020-01-01'),('post-other','other-sanity-id','Other','other','[]','2020-01-01'),('post-draft','draft-sanity-id','Draft','draft','[]',NULL);
    INSERT INTO post_blocks (id,post_id,block_id,sort_index,type,portable_text_json) VALUES ('b1','post-new','retained-block',0,'block','{}'),('b2','post-new','second-block',1,'block','{}'),('b3','post-other','retained-block',0,'block','{}');
    INSERT INTO comments (id,user_id,user_info,post_id,parent_id,body,created_at) VALUES
    (5,'old-reader','{"firstName":"Original","lastName":"Reader","imageUrl":"/old.png","email":"private@example.test"}','old-sanity-id',NULL,'{"blockId":"retained-block","text":"Original comment"}','2025-01-01'),
    (6,'current-reader','{"name":"Current Reader","imageUrl":"/current.png"}','post-new',5,'{"blockId":"retained-block","text":"New reply"}','2025-01-02'),
    (7,'other-reader',NULL,'other-sanity-id',NULL,'{"blockId":"retained-block","text":"Other article"}','2025-01-03'),
    (8,'draft-reader',NULL,'draft-sanity-id',NULL,'{"blockId":"retained-block","text":"Draft comment"}','2025-01-04');`);
  class Statement {
    values: (string | number | null)[] = [];
    constructor(readonly sql: string) {}
    bind(...values: (string | number | null)[]) { this.values = values; return this; }
    raw() { return Promise.resolve(sqlite.prepare(this.sql).values(...this.values)); }
  }
  exposeCloudflareRuntime({ DB: { prepare: (sql: string) => new Statement(sql) }, MEME_KV: { get: async () => null, put: async () => {} } } as unknown as WorkerEnv);
});
afterEach(() => sqlite.close());
const request = (path: string, method = 'GET', body?: unknown) => app.handle(new Request(`http://localhost/comments${path}`, { method, ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }));
const message = { body: { blockId: 'retained-block', text: 'A new reply' }, parentId: 5 };

test('new and old article IDs both return all historical and current comments', async () => {
  for (const id of ['post-new', 'old-sanity-id']) {
    const response = await request(`/${id}`);
    expect(response.status).toBe(200);
    const rows = await response.json();
    expect(rows.map((row: { id: number }) => row.id)).toEqual([5, 6]);
    expect(rows[0]).toMatchObject({ postId: 'post-new', body: { blockId: 'retained-block', text: 'Original comment' }, userInfo: { name: 'Original Reader', imageUrl: '/old.png' } });
    expect(rows[0].userInfo.email).toBeUndefined();
    expect(rows[1].parentId).toBe(5);
  }
  expect(sqlite.query('SELECT post_id FROM comments WHERE id = 5').get()).toEqual({ post_id: 'old-sanity-id' });
});
test('query endpoint retains descending order and never crosses articles', async () => {
  const rows = await (await request('?postId=post-new')).json();
  expect(rows.map((row: { id: number }) => row.id)).toEqual([6, 5]);
  expect((await (await request('/post-other')).json()).map((row: { id: number }) => row.id)).toEqual([7]);
  expect((await (await request('/post-other')).json())[0].userInfo).toEqual({ name: '已登录用户', imageUrl: null });
});
test('unknown and unpublished articles do not expose comments', async () => {
  for (const id of ['missing', 'post-draft', 'draft-sanity-id']) expect(await (await request(`/${id}`)).json()).toEqual([]);
});
test('replies to historical comments persist with the canonical article ID and signed-in profile', async () => {
  const response = await request('/old-sanity-id', 'POST', message);
  expect(response.status).toBe(200);
  const created = await response.json();
  expect(created).toMatchObject({ postId: 'post-new', parentId: 5, userId: 'current-reader', userInfo: { name: 'Current Reader', imageUrl: '/current.png' } });
  expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  expect(Math.abs(Date.now() - Date.parse(created.createdAt))).toBeLessThan(2000);
  expect((await (await request('/post-new')).json()).map((row: { id: number }) => row.id)).toContain(created.id);
  expect((await (await request('/old-sanity-id')).json()).map((row: { id: number }) => row.id)).toContain(created.id);
});
test('posting requires login and does not accept a forged author', async () => {
  signedIn = false;
  expect((await request('/post-new', 'POST', message)).status).toBe(401);
  signedIn = true;
  expect((await request('/post-new', 'POST', { ...message, userId: 'forged', userInfo: { name: 'Forged' } })).status).toBe(400);
});
test('invalid text, missing paragraphs and replies to other articles or blocks are rejected', async () => {
  for (const body of [{ body: { text: ' ' } }, { body: { text: 'x'.repeat(1000) } }, { body: { text: 'hi', blockId: 'deleted-block' } }, { ...message, parentId: 7 }, { body: { text: 'hi', blockId: 'second-block' }, parentId: 5 }]) {
    expect((await request('/post-new', 'POST', body)).status).toBe(400);
  }
  expect((await request('/post-draft', 'POST', message)).status).toBe(404);
});
