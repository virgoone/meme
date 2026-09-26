import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { Elysia } from 'elysia';
import type { WorkerEnv } from '../../env';
import { exposeCloudflareRuntime } from '../../cloudflare/runtime';
import { errorHandler } from '../../middleware/errorHandler';
let currentUser: { id: string; name: string; image: string } | null;
mock.module('../../auth', () => ({ getAuth: () => ({ api: { getSession: async () => currentUser ? { user: currentUser, session: {} } : null } }) }));
const { guestbookModule } = await import('./index');
const app = new Elysia({ aot: false }).use(errorHandler).use(guestbookModule);
let sqlite: Database;
beforeEach(() => {
  currentUser = { id: 'signed-in', name: 'Actual Reader', image: '/reader.png' };
  sqlite = new Database(':memory:');
  sqlite.exec('CREATE TABLE guestbook (id INTEGER PRIMARY KEY, user_id TEXT, user_info TEXT, message TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT);');
  class Statement {
    values: unknown[] = [];
    constructor(readonly sql: string) {}
    bind(...values: unknown[]) { this.values = values; return this; }
    raw() { return Promise.resolve(sqlite.prepare(this.sql).values(...this.values as never[])); }
  }
  exposeCloudflareRuntime({ MEME_KV: { get: async () => null, put: async () => {} }, DB: { prepare: (sql: string) => new Statement(sql) } } as unknown as WorkerEnv);
});
afterEach(() => sqlite.close());
const send = (body: object = { message: 'Hello' }) => app.handle(new Request('http://localhost/guestbook', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
test('signed-out visitors must log in before leaving a message', async () => {
  currentUser = null;
  expect((await send()).status).toBe(401);
  expect(sqlite.query('SELECT count(*) AS n FROM guestbook').get()).toEqual({ n: 0 });
});
test('empty profile names cannot create another anonymous snapshot', async () => {
  currentUser = { id: 'signed-in', name: '  ', image: '/reader.png' };
  expect((await send()).status).toBe(400);
  expect(sqlite.query('SELECT count(*) AS n FROM guestbook').get()).toEqual({ n: 0 });
});
test('the message always uses the signed-in profile, never client supplied identity', async () => {
  const response = await send();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.userId).toBe('signed-in');
  expect(body.userInfo).toEqual({ name: 'Actual Reader', imageUrl: '/reader.png' });
  expect((await send({ message: 'Forged', userId: 'other-user', userInfo: { name: 'Forged name' } })).status).toBe(400);
});
