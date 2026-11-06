import { afterEach, expect, test } from 'bun:test';
import { createClient, type Client } from '@libsql/client';
import { bindLibsqlClient } from './libsql';
import { createDatabase } from './d1';
import { importedPosts, postBlocks } from '../schema';
import { readFileSync } from 'node:fs';

let client: Client;
afterEach(() => client?.close());
async function database() {
  client = createClient({ url: ':memory:' });
  await client.executeMultiple(readFileSync(new URL('../../drizzle/0000_content_migration_control.sql', import.meta.url), 'utf8'));
  await client.executeMultiple(readFileSync(new URL('../../drizzle/0006_stored_post_covers.sql', import.meta.url), 'utf8'));
  return bindLibsqlClient(client);
}

test('Drizzle returns typed rows and rolls back an entire failed post batch on libSQL', async () => {
  const binding = await database();
  const db = createDatabase(binding);
  const post = { id: 'post-1', sanityId: 'post-1', title: 'Test', slug: 'test', portableTextJson: [], coverImageUrl: 'https://example.com/cover.png' };
  await expect(db.batch([
    db.insert(importedPosts).values(post),
    db.insert(postBlocks).values({ id: 'bad', postId: 'missing-parent', blockId: 'one', sortIndex: 0, type: 'p', portableTextJson: {} }),
  ])).rejects.toThrow();
  expect(await db.select().from(importedPosts)).toEqual([]);
  const [created] = await db.batch([db.insert(importedPosts).values(post).returning()]);
  expect(created[0]).toMatchObject({ id: 'post-1', portableTextJson: [], coverImageUrl: post.coverImageUrl });
  expect((await db.select().from(importedPosts))[0]).toMatchObject({ portableTextJson: [] });
});

test('raw SQL keeps RETURNING, changes, column order and atomic counters', async () => {
  const db = await database();
  await client.execute('CREATE TABLE counters (key TEXT PRIMARY KEY, value INTEGER NOT NULL)');
  const increment = db.prepare('INSERT INTO counters VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET value=value+1 RETURNING value');
  const result = await db.batch([increment.bind('total'), increment.bind('total')]);
  expect(result.map(row => row.results)).toEqual([[{ value: 1 }], [{ value: 2 }]]);
  expect((await db.prepare('UPDATE counters SET value=value WHERE key=?').bind('total').run()).meta.changes).toBe(1);
  expect(await db.prepare('SELECT value, key FROM counters').raw()).toEqual([[2, 'total']]);
  expect(await db.prepare('SELECT value FROM counters').first('value')).toBe(2);
  expect(await db.prepare('SELECT value FROM counters WHERE key=?').bind('missing').first()).toBeNull();
  await expect(db.batch([increment.bind('total'), db.prepare('INSERT INTO counters VALUES (?, NULL)').bind('bad')])).rejects.toThrow();
  expect(await db.prepare('SELECT value FROM counters').first('value')).toBe(2);
  expect(() => db.prepare('BEGIN')).toThrow('batch');
});
