import { beforeEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { Elysia } from 'elysia';
import { exposeCloudflareRuntime } from '../../cloudflare/runtime';
import { systemModule } from './index';
import type { WorkerEnv } from '../../env';
import { postViewsKey, readViews, recordPageView, totalViewsKey } from './views';
import { lastVisitorKey, readLastVisitor, visitorFromRequest } from './visitor';

let sqlite: Database;
let env: WorkerEnv;
beforeEach(() => {
  sqlite?.close(); sqlite = new Database(':memory:');
  sqlite.exec(`CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);
    CREATE TABLE imported_posts (id TEXT PRIMARY KEY, slug TEXT, published_at TEXT);
    INSERT INTO imported_posts VALUES ('published', 'hello', '2026-08-11'), ('private', 'draft', NULL);
    INSERT INTO settings (key,value) VALUES ('analytics:views:total','171499'), ('analytics:views:post:published','15');`);
  class Statement {
    values: (string | number | null)[] = [];
    constructor(readonly sql: string) {}
    bind(...values: (string | number | null)[]) { this.values = values; return this; }
    raw() { return Promise.resolve(sqlite.prepare(this.sql).values(...this.values)); }
    all() { return Promise.resolve(this.execute()); }
    execute() { return { success: true, results: sqlite.prepare(this.sql).all(...this.values), meta: {} }; }
  }
  env = { SITE_URL: 'https://blog.douni.one', DB: {
    prepare: (sql: string) => new Statement(sql),
    batch: (statements: Statement[]) => Promise.resolve(sqlite.transaction(() => statements.map(s => s.execute()))()),
  } } as unknown as WorkerEnv;
});

test('preserves historic totals and increments both counters on article entry', async () => {
  expect(await recordPageView(env, '/hello')).toEqual({ counted: true, postId: 'published', views: 16, totalPageViews: 171500 });
  expect(await recordPageView(env, '/')).toEqual({ counted: true, totalPageViews: 171501 });
  expect(await readViews(env, postViewsKey('published'))).toBe(16);
  expect(await readViews(env, totalViewsKey)).toBe(171501);
  expect(await readViews(env, totalViewsKey)).toBe(171501);
});

test('information pages update site views without being treated as articles', async () => {
  for (const [index, path] of ['/about', '/contact', '/privacy', '/terms'].entries()) {
    expect(await recordPageView(env, path)).toEqual({ counted: true, totalPageViews: 171500 + index });
  }
  expect(await readViews(env, postViewsKey('published'))).toBe(15);
});

test('site stats stay compatible with open clients when visitor location is absent', async () => {
  sqlite.exec('CREATE TABLE subscribers (id TEXT, subscribed_at TEXT);');
  env.MEME_KV = { get: async () => null } as unknown as WorkerEnv['MEME_KV'];
  exposeCloudflareRuntime(env);
  const api = new Elysia({ aot: false }).use(systemModule);
  const response = await api.handle(new Request('http://localhost/site-stats'));
  expect(response.status).toBe(200);
  const stats = await response.json();
  expect(stats.totalPageViews).toBe(171499);
  expect(stats.lastVisitor.city).toBe('');
  expect(stats.lastVisitor.country).toBe('');
  expect(stats.lastVisitor.flag).toBe('');
  expect(response.headers.get('cache-control')).toBe('no-store');
});

test('does not count drafts, missing articles, management or malformed paths', async () => {
  for (const path of ['/draft', '/missing', '/admin', '/admin/content/blog', '/login', '/api/posts']) expect(await recordPageView(env, path)).toEqual({ counted: false });
  for (const path of [null, 'https://example.com', '/hello#heading', '/hello?query']) await expect(recordPageView(env, path)).rejects.toThrow();
  expect(await readViews(env, totalViewsKey)).toBe(171499);
});

test('simultaneous visits are atomic increments instead of last-write-wins', async () => {
  await Promise.all(Array.from({ length: 40 }, () => recordPageView(env, '/hello')));
  expect(await readViews(env, totalViewsKey)).toBe(171539);
  expect(await readViews(env, postViewsKey('published'))).toBe(55);
});

test('a failed article counter rolls back the site counter', async () => {
  sqlite.exec("CREATE TRIGGER fail_counter BEFORE UPDATE ON settings WHEN new.key = 'analytics:views:post:published' BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
  await expect(recordPageView(env, '/hello')).rejects.toThrow();
  expect(await readViews(env, totalViewsKey)).toBe(171499);
});

test('uses only Cloudflare metadata and rejects spoofed or proxied locations', () => {
  const request = new Request('https://meme.moss-dev.workers.dev/api/page-views', { headers: { 'x-city': 'Fake', 'cf-ipcountry': 'GB' } });
  expect(visitorFromRequest(request)).toBeNull();
  Object.defineProperty(request, 'cf', { value: { country: 'JP', city: 'Tokyo', latitude: '35.68', longitude: '139.69' } });
  expect(visitorFromRequest(request)).toMatchObject({ country: 'JP', city: 'Tokyo', flag: '🇯🇵' });
  expect(Object.keys(visitorFromRequest(request)!)).toEqual(['country', 'city', 'flag', 'visitedAt']);
  request.headers.set('x-vercel-id', 'proxy');
  expect(visitorFromRequest(request)).toBeNull();
});

test('latest known visitor persists atomically, and unknown or older visits cannot replace it', async () => {
  const tokyo = { city: 'Tokyo', country: 'JP', flag: '🇯🇵', visitedAt: 20 };
  await recordPageView(env, '/hello', tokyo);
  expect(await readLastVisitor(env)).toEqual(tokyo);
  await recordPageView(env, '/');
  await recordPageView(env, '/', { city: 'Paris', country: 'FR', flag: '🇫🇷', visitedAt: 10 });
  await recordPageView(env, '/draft', { city: 'London', country: 'GB', flag: '🇬🇧', visitedAt: 30 });
  expect(await readLastVisitor(env)).toEqual(tokyo);
  expect(await readViews(env, totalViewsKey)).toBe(171502);
  expect(await readViews(env, postViewsKey('published'))).toBe(16);
});

test('bot and invalid-origin visits cannot change counts or visitor location', async () => {
  exposeCloudflareRuntime(env);
  const api = new Elysia({ aot: false }).use(systemModule);
  for (const headers of [{ 'user-agent': 'Googlebot' }, { origin: 'https://unknown.example' }]) {
    await api.handle(new Request('http://localhost/page-views', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ path: '/hello', city: 'Forged' }) }));
  }
  expect(await readViews(env, totalViewsKey)).toBe(171499);
  expect(sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(lastVisitorKey)).toBeNull();
});

test('same-origin production route records edge location without trusting a client location payload', async () => {
  env.APP_ENV = 'production';
  exposeCloudflareRuntime(env);
  const api = new Elysia({ aot: false }).use(systemModule);
  const request = new Request('https://blog.douni.one/page-views', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://blog.douni.one' }, body: JSON.stringify({ path: '/hello', city: 'Forged' }) });
  Object.defineProperty(request, 'cf', { value: { country: 'SG', city: 'Singapore' } });
  const response = await api.handle(request);
  expect(response.status).toBe(200);
  expect(await readLastVisitor(env)).toMatchObject({ country: 'SG', city: 'Singapore', flag: '🇸🇬' });
});
