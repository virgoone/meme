import { afterEach, describe, expect, mock, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import type { WorkerEnv } from '../../env';
import { getReactions, incrementReaction } from './service';

const databases: Database[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

function createEnv(values: Record<string, string> = {}, post?: [string, string]) {
  const database = new Database(':memory:');
  databases.push(database);
  database.run('CREATE TABLE imported_posts (id TEXT PRIMARY KEY, sanity_id TEXT NOT NULL)');
  if (post) database.run('INSERT INTO imported_posts VALUES (?, ?)', post);
  const counters = new Map(Object.entries(values));
  const get = mock(async (key: string) => counters.get(key) ?? null);
  const put = mock(async (key: string, value: string) => { counters.set(key, value); });
  const prepare = mock((sql: string) => ({
    bind: (...params: (string | number)[]) => ({
      raw: async () => database.query(sql).values(...params),
    }),
  }));
  const env = { DB: { prepare }, MEME_KV: { get, put } } as unknown as WorkerEnv;
  return { env, get, put, prepare, counters };
}

describe('reaction reads', () => {
  test.each([null, '[5,2,3,4]', 'invalid', '[1,-1,0,0]', '[1,2]'])(
    'never writes cached counters (%s)', async (value) => {
      const { env, put } = createEnv(value ? { 'reactions:post': value } : {});
      expect(await getReactions(env, 'post')).toEqual(value === '[5,2,3,4]' ? [5, 2, 3, 4] : [0, 0, 0, 0]);
      expect(put).not.toHaveBeenCalled();
    },
  );

  test.each(['post_new', 'sanity_old'])('combines legacy and current counts through %s', async (id) => {
    const { env, put } = createEnv({
      'reactions:post_new': '[0,1,1,0]',
      'reactions:sanity_old': '[0,5,0,0]',
    }, ['post_new', 'sanity_old']);
    expect(await getReactions(env, id)).toEqual([0, 6, 1, 0]);
    expect(put).not.toHaveBeenCalled();
  });

  test.each(['post_new', 'sanity_old'])('reads an existing %s counter without creating the missing key', async (id) => {
    const { env, put } = createEnv({ [`reactions:${id}`]: '[1,2,3,4]' }, ['post_new', 'sanity_old']);
    expect(await getReactions(env, 'post_new')).toEqual([1, 2, 3, 4]);
    expect(put).not.toHaveBeenCalled();
  });

  test('does not count an identical legacy ID twice', async () => {
    const { env, get } = createEnv({ 'reactions:post': '[1,2,3,4]' }, ['post', 'post']);
    expect(await getReactions(env, 'post')).toEqual([1, 2, 3, 4]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  test('ignores malformed legacy counts without losing current counts', async () => {
    const { env } = createEnv({
      'reactions:post_new': '[0,1,1,0]',
      'reactions:sanity_old': 'invalid',
    }, ['post_new', 'sanity_old']);
    expect(await getReactions(env, 'post_new')).toEqual([0, 1, 1, 0]);
  });
});

describe('reaction increments', () => {
  test.each(['post_new', 'sanity_old'])('increments only the canonical counter through %s', async (id) => {
    const { env, put, counters } = createEnv({
      'reactions:post_new': '[0,1,1,0]',
      'reactions:sanity_old': '[0,5,0,0]',
    }, ['post_new', 'sanity_old']);
    expect(await incrementReaction(env, id, 1)).toEqual([0, 7, 1, 0]);
    expect(put).toHaveBeenCalledWith('reactions:post_new', '[0,2,1,0]');
    expect(counters.get('reactions:sanity_old')).toBe('[0,5,0,0]');
    expect(await getReactions(env, id)).toEqual([0, 7, 1, 0]);
    expect(await incrementReaction(env, id, 1)).toEqual([0, 8, 1, 0]);
  });

  test('creates only a new increment when only the legacy key exists', async () => {
    const { env, put } = createEnv({ 'reactions:sanity_old': '[0,5,0,0]' }, ['post_new', 'sanity_old']);
    expect(await incrementReaction(env, 'post_new', 1)).toEqual([0, 6, 0, 0]);
    expect(put).toHaveBeenCalledWith('reactions:post_new', '[0,1,0,0]');
  });

  test('preserves unmapped counter behavior', async () => {
    const { env, put } = createEnv({ 'reactions:other': '[1,2,3,4]' });
    expect(await incrementReaction(env, 'other', 3)).toEqual([1, 2, 3, 5]);
    expect(put).toHaveBeenCalledWith('reactions:other', '[1,2,3,5]');
  });

  test.each([-1, 4, 1.5, Number.NaN])('rejects invalid index %s before accessing storage', async (index) => {
    const { env, prepare, get, put } = createEnv();
    await expect(incrementReaction(env, 'post', index)).rejects.toThrow('index must be between 0 and 3');
    expect(prepare).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });
});
