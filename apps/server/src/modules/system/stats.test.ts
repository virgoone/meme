import { beforeEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import type { WorkerEnv } from '../../env';
import { getAdminStats } from './stats';
import { dayViewsKey, postDayViewsKey, recordPageView, totalViewsKey, viewDay } from './views';

let sqlite: Database;
let env: WorkerEnv;
// 2026-09-27 10:00 in Asia/Shanghai.
const now = new Date('2026-09-27T02:00:00Z');
const today = viewDay(now);
const yesterday = viewDay(new Date(now.getTime() - 86_400_000));

beforeEach(() => {
  sqlite?.close();
  sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);
    CREATE TABLE imported_posts (id TEXT PRIMARY KEY, title TEXT, slug TEXT, published_at TEXT);
    CREATE TABLE subscribers (id INTEGER PRIMARY KEY, subscribed_at INTEGER, unsubscribed_at TEXT);
    CREATE TABLE comments (id INTEGER PRIMARY KEY, created_at TEXT);
    CREATE TABLE guestbook (id INTEGER PRIMARY KEY, created_at TEXT);
    INSERT INTO imported_posts VALUES ('a', 'First', 'first', '2026-09-20T00:00:00.000Z'), ('b', 'Second', 'second', '2026-07-02T00:00:00.000Z'), ('d', 'Draft', 'draft', NULL);
    INSERT INTO settings (key, value) VALUES
      ('${totalViewsKey}', '1000'),
      ('analytics:views:post:a', '300'), ('analytics:views:post:b', '700'), ('analytics:views:post:d', '5'),
      ('${dayViewsKey(today)}', '12'), ('${dayViewsKey(yesterday)}', '8'), ('${dayViewsKey('2026-08-01')}', '99'),
      ('${postDayViewsKey('a', today)}', '7'), ('${postDayViewsKey('a', yesterday)}', '2'), ('${postDayViewsKey('b', '2026-09-01')}', '4');
    INSERT INTO subscribers VALUES (1, ${Math.floor(new Date('2026-09-01T00:00:00Z').getTime() / 1000)}, NULL),
      (2, ${Math.floor(new Date('2026-09-26T05:00:00Z').getTime() / 1000)}, NULL),
      (3, ${Math.floor(new Date('2026-06-01T00:00:00Z').getTime() / 1000)}, '2026-09-10 00:00:00'),
      (4, NULL, NULL);
    INSERT INTO comments VALUES (1, '2026-09-26 03:00:00'), (2, '2026-09-26 23:30:00'), (3, '2025-01-01 00:00:00');
    INSERT INTO guestbook VALUES (1, '2026-09-27 01:00:00');
  `);
  class Statement {
    values: (string | number | null)[] = [];
    constructor(readonly sql: string) {}
    bind(...values: (string | number | null)[]) { this.values = values; return this; }
    all() { return Promise.resolve(this.execute()); }
    execute() { return { success: true, results: sqlite.prepare(this.sql).all(...this.values), meta: {} }; }
  }
  env = { DB: {
    prepare: (sql: string) => new Statement(sql),
    batch: (statements: Statement[]) => Promise.resolve(sqlite.transaction(() => statements.map(s => s.execute()))()),
  } } as unknown as WorkerEnv;
});

test('page views roll up totals, today, week and a zero-filled 30 day series', async () => {
  const stats = await getAdminStats(env, now);
  expect(stats.views.total).toBe(1000);
  expect(stats.views.today).toBe(12);
  expect(stats.views.week).toBe(20);
  expect(stats.views.month).toBe(20);
  expect(stats.views.daily).toHaveLength(30);
  expect(stats.views.daily.at(-1)).toEqual({ day: today, value: 12 });
  expect(stats.views.daily.at(-2)).toEqual({ day: yesterday, value: 8 });
  expect(stats.views.daily.filter((point) => point.value > 0)).toHaveLength(2);
  expect(stats.views.trackedSince).toBe('2026-08-01');
});

test('top posts exclude drafts and carry recent windows', async () => {
  const stats = await getAdminStats(env, now);
  expect(stats.topPosts.map((post) => post.slug)).toEqual(['second', 'first']);
  expect(stats.topPosts[1]).toMatchObject({ views: 300, last7: 9, last30: 9 });
  expect(stats.topPosts[0]).toMatchObject({ views: 700, last7: 0, last30: 4 });
});

test('subscribers, comments, guestbook and publishing use the site day', async () => {
  const stats = await getAdminStats(env, now);
  expect(stats.subscribers).toMatchObject({ active: 2, total: 3, today: 0, month: 2 });
  expect(stats.subscribers.daily).toHaveLength(90);
  expect(stats.subscribers.daily.at(-1)?.value).toBe(2);
  expect(stats.subscribers.daily.find((point) => point.day === '2026-09-05')?.value).toBe(2);
  expect(stats.subscribers.daily.find((point) => point.day === '2026-09-12')?.value).toBe(1);
  // 2026-09-26 23:30 UTC is already the 27th in Shanghai.
  expect(stats.comments).toMatchObject({ total: 3, month: 2 });
  expect(stats.comments.daily.find((point) => point.day === '2026-09-26')?.value).toBe(1);
  expect(stats.comments.daily.find((point) => point.day === '2026-09-27')?.value).toBe(1);
  expect(stats.guestbook).toMatchObject({ total: 1, month: 1 });
  expect(stats.publishing.total).toBe(2);
  expect(stats.publishing.monthly).toHaveLength(12);
  expect(stats.publishing.monthly.at(-1)).toEqual({ month: '2026-09', value: 1 });
  expect(stats.publishing.monthly.find((point) => point.month === '2026-07')?.value).toBe(1);
});

test('recording a page view writes the daily counters alongside the totals', async () => {
  await recordPageView(env, '/first');
  await recordPageView(env, '/');
  const stats = await getAdminStats(env, new Date());
  const day = viewDay();
  const seededDay = day === today ? 12 : day === yesterday ? 8 : 0;
  const seededPostDay = day === today ? 7 : day === yesterday ? 2 : 0;
  expect(stats.views.total).toBe(1002);
  expect(stats.views.daily.at(-1)).toEqual({ day, value: seededDay + 2 });
  expect(stats.topPosts.find((post) => post.id === 'a')?.views).toBe(301);
  const rows = sqlite.prepare('SELECT value FROM settings WHERE key = ?').all(postDayViewsKey('a', day)) as { value: string }[];
  expect(Number(rows[0]?.value)).toBe(seededPostDay + 1);
});
