import { afterEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import type { WorkerEnv } from '../../env';
import { guestbookAuthor, listGuestbookEntries } from './service';

let sqlite: Database | undefined;
afterEach(() => sqlite?.close());

describe('guestbook public author', () => {
  test('preserves legacy names and excludes private snapshot fields', () => {
    expect(guestbookAuthor({ firstName: 'koya', lastName: 'guo', imageUrl: '/old.png', email: 'private@example.test' }))
      .toEqual({ name: 'koya guo', imageUrl: '/old.png' });
    expect(guestbookAuthor({ name: '  ', username: 'visitor' })).toEqual({ name: 'visitor', imageUrl: null });
    expect(guestbookAuthor({ firstName: 'Reader', lastName: 'Reader' }).name).toBe('Reader');
    expect(guestbookAuthor({ name: '', imageUrl: null }).name).toBe('已登录用户');
  });

  test('an empty saved nickname follows the corrected profile without losing old authors', async () => {
    sqlite = new Database(':memory:');
    sqlite.exec(`CREATE TABLE guestbook (id INTEGER PRIMARY KEY, user_id TEXT, user_info TEXT, message TEXT, created_at TEXT, updated_at TEXT);
      CREATE TABLE ba_user (id TEXT PRIMARY KEY, name TEXT, image TEXT);
      INSERT INTO ba_user VALUES ('current', '', NULL);
      INSERT INTO guestbook VALUES (1, 'current', '{"name":"","imageUrl":null}', 'new entry', '2026-09-24', NULL);
      INSERT INTO guestbook VALUES (2, 'legacy', '{"firstName":"Old","lastName":"Reader","imageUrl":"/old.png"}', 'old entry', '2026-06-01', NULL);`);
    const db = sqlite;
    class Statement {
      values: unknown[] = [];
      constructor(readonly sql: string) {}
      bind(...values: unknown[]) { this.values = values; return this; }
      raw() { return Promise.resolve(db.prepare(this.sql).values(...this.values as never[])); }
    }
    const env = { DB: { prepare: (sql: string) => new Statement(sql) } } as unknown as WorkerEnv;
    expect((await listGuestbookEntries(env))[0].userInfo.name).toBe('已登录用户');
    sqlite.exec("UPDATE ba_user SET name = 'Koya', image = '/portrait.png' WHERE id = 'current'");
    const entries = await listGuestbookEntries(env);
    expect(entries[0].userInfo).toEqual({ name: 'Koya', imageUrl: '/portrait.png' });
    expect(entries[1].userInfo).toEqual({ name: 'Old Reader', imageUrl: '/old.png' });
  });
});
