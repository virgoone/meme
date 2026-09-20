import { describe, expect, mock, test } from 'bun:test';
import type { WorkerEnv } from '../../env';
import { getReactions } from './service';

describe('reaction reads', () => {
  test.each([null, '[5,2,3,4]', 'invalid'])('never writes cached counters (%s)', async (value) => {
    const put = mock(async () => {});
    const env = { MEME_KV: { get: async () => value, put } } as unknown as WorkerEnv;
    expect(await getReactions(env, 'post')).toEqual(value === '[5,2,3,4]' ? [5,2,3,4] : [0,0,0,0]);
    expect(put).not.toHaveBeenCalled();
  });
});
