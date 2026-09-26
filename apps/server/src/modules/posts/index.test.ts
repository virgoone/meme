import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { Elysia } from 'elysia';
import { readFileSync } from 'node:fs';
import { exposeCloudflareRuntime } from '../../cloudflare/runtime';
import type { WorkerEnv } from '../../env';
import { errorHandler } from '../../middleware/errorHandler';

let role: string | null = 'admin';
mock.module('../../auth', () => ({
  getAuth: () => ({ api: { getSession: async () => role ? { user: { id: 'test', role }, session: {} } : null } }),
}));
const { postsModule } = await import('./index');
const { adminModule } = await import('../admin');
const { handlePublicRoute } = await import('../../cloudflare/public-routes');
const app = new Elysia({ aot: false }).use(errorHandler).use(postsModule).use(adminModule);
let sqlite: Database;
let env: WorkerEnv;

beforeEach(() => {
  role = 'admin';
  sqlite?.close();
  sqlite = new Database(':memory:');
  sqlite.exec(readFileSync(new URL('../../../../../packages/db/drizzle/0000_content_migration_control.sql', import.meta.url), 'utf8'));
  sqlite.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);');
  class Statement {
    values: (string | number | null)[] = [];
    constructor(readonly sql: string) {}
    bind(...values: (string | number | null)[]) { this.values = values; return this; }
    raw() { return Promise.resolve(sqlite.prepare(this.sql).values(...this.values)); }
    all() { return Promise.resolve(this.execute()); }
    execute() { return { success: true, results: sqlite.prepare(this.sql).all(...this.values), meta: {} }; }
  }
  env = { SITE_URL: 'https://example.com', DB: {
    prepare: (sql: string) => new Statement(sql),
    batch: (statements: Statement[]) => Promise.resolve(sqlite.transaction(() => statements.map((statement) => statement.execute()))()),
  } } as unknown as WorkerEnv;
  exposeCloudflareRuntime(env);
});

function request(path: string, method = 'GET', body?: unknown) {
  return app.handle(new Request(`http://localhost${path}`, { method,
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  }));
}
const paragraph = { type: 'p', children: [{ text: '保存后应保留的正文', bold: true }] };

describe('post creation and persistence', () => {
  test('paginates published posts with stable boundaries, totals and view counts', async () => {
    const insert = sqlite.prepare('INSERT INTO imported_posts (id, sanity_id, slug, title, published_at, portable_text_json) VALUES (?, ?, ?, ?, ?, ?)');
    for (let i = 1; i <= 23; i++) {
      const id = `post-${String(i).padStart(2, '0')}`;
      insert.run(id, id, id, id, '2026-09-01T00:00:00Z', '[]');
    }
    insert.run('draft', 'draft', 'draft', 'Do not expose', null, '[]');
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('analytics:views:post:post-23', '171');
    const pages = await Promise.all([1, 2, 3].map(async page => (await request(`/posts?page=${page}`)).json()));
    expect(pages.map(p => p.items.length)).toEqual([10, 10, 3]);
    expect(pages.map(p => [p.page, p.totalPages, p.total, p.pageSize])).toEqual([[1, 3, 23, 10], [2, 3, 23, 10], [3, 3, 23, 10]]);
    expect(pages[0].items[0]).toMatchObject({ id: 'post-23', views: 171 });
    const ids = pages.flatMap(p => p.items.map((item: { id: string }) => item.id));
    expect(new Set(ids).size).toBe(23);
    expect(ids).not.toContain('draft');
    expect((await (await request('/posts?page=99999')).json()).page).toBe(3);
    for (const page of ['abc', '0', '-3', '1.5', 'Infinity']) expect((await (await request(`/posts?page=${page}`)).json()).page).toBe(1);
    expect((await (await request('/posts?limit=5')).json()).length).toBe(5);
  });

  test('empty archives expose one empty page without a negative offset', async () => {
    expect(await (await request('/posts?page=2')).json()).toEqual({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 });
  });

  test('lists real view counts and keeps new and invalid counters at zero', async () => {
    const first = await (await request('/posts', 'POST', { title: 'Read article', publishedAt: '2026-09-01' })).json();
    const second = await (await request('/posts', 'POST', { title: 'New article', publishedAt: '2026-09-02' })).json();
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(`analytics:views:post:${first.id}`, '1234');
    const posts = await (await request('/posts')).json();
    expect(posts.find((p: { id: string }) => p.id === first.id).views).toBe(1234);
    expect(posts.find((p: { id: string }) => p.id === second.id).views).toBe(0);
    sqlite.prepare('UPDATE settings SET value = ?').run('-10');
    expect((await (await request('/posts')).json()).find((p: { id: string }) => p.id === first.id).views).toBe(0);
  });

  test('creates a draft, protects it publicly, then publishes and reloads it with stable blocks', async () => {
    const created = await request('/posts', 'POST', { title: '中文 新文章', slateJson: [paragraph] });
    expect(created.status).toBe(201);
    const draft = await created.json();
    expect(draft.slug).toBe('中文-新文章');
    expect(draft.publishedAt).toBeNull();
    expect(draft.readingTime).toBe(1);
    expect(draft.blocks[0].slateJson.children[0].bold).toBe(true);
    expect((await request(`/posts/${draft.slug}`)).status).toBe(404);
    expect(await (await request('/posts')).json()).toEqual([]);
    expect((await (await request('/admin/posts')).json()).length).toBe(1);
    expect((await request(`/admin/posts/${draft.slug}`)).status).toBe(200);
    for (const path of ['/feed.xml', '/sitemap.xml']) {
      const response = await handlePublicRoute(new Request(`https://example.com${path}`), env);
      expect(response).not.toBeNull();
      expect(await response?.text()).not.toContain(draft.slug);
    }
    const saved = await request(`/posts/${draft.slug}`, 'PUT', {
      title: '更新后的标题', slug: 'published-article',
      publishedAt: '2026-06-15T04:00:00.000Z', slateJson: draft.slateJson,
    });
    expect(saved.status).toBe(200);
    const loaded = await (await request('/posts/published-article')).json();
    expect(loaded.title).toBe('更新后的标题');
    expect(loaded.publishedAt).toBe('2026-06-15T04:00:00.000Z');
    expect(loaded.blocks[0].blockId).toBe(draft.blocks[0].blockId);
    expect((await (await request('/posts')).json()).length).toBe(1);
    expect((await request(`/posts/${draft.slug}`)).status).toBe(404);
  });

  test('duplicate slug and reserved routes do not overwrite an existing article', async () => {
    expect((await request('/posts', 'POST', { title: 'First', slug: 'same' })).status).toBe(201);
    expect((await request('/posts', 'POST', { title: 'Second', slug: 'same' })).status).toBe(409);
    expect((await request('/posts', 'POST', { title: 'Second', slug: 'new' })).status).toBe(400);
    expect((await (await request('/admin/posts/same')).json()).title).toBe('First');
  });

  test('a failed block insert rolls back the complete article creation', async () => {
    sqlite.exec("CREATE TRIGGER fail_blocks BEFORE INSERT ON post_blocks BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
    expect((await request('/posts', 'POST', { title: 'Rollback', slateJson: [paragraph] })).status).toBe(500);
    expect(sqlite.query('SELECT count(*) AS total FROM imported_posts').get()).toEqual({ total: 0 });
  });

  test('rejects empty title, invalid date and malformed content', async () => {
    for (const body of [{ title: ' ' }, { title: 'Test', publishedAt: 'nonsense' }, { title: 'Test', slateJson: [null] }, { title: 'Test', slateJson: 'broken' }]) {
      expect((await request('/posts', 'POST', body)).status).toBe(400);
    }
  });

  for (const sessionRole of [null, 'user']) {
    test(`protects create, update and draft reads from ${sessionRole ?? 'anonymous'}`, async () => {
      role = sessionRole;
      for (const [path, method, body] of [['/posts', 'POST', { title: 'Forbidden' }], ['/posts/test', 'PUT', {}], ['/admin/posts', 'GET', undefined], ['/admin/posts/test', 'GET', undefined]] as const) {
        expect((await request(path, method, body)).status).toBe(sessionRole ? 403 : 401);
      }
    });
  }
});
