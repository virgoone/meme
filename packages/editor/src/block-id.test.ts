import { describe, expect, test } from 'bun:test';

import {
  serializeBlocksWithBlockIds,
  splitBlockWithNewId,
  withStableBlockIds,
} from './block-id';

describe('editor block ids', () => {
  test('preserves existing Sanity-derived ids', () => {
    const [block] = withStableBlockIds([
      {
        id: 'sanity-key',
        type: 'p',
        children: [{ text: 'Hello' }],
      },
    ]);

    expect(block?.id).toBe('sanity-key');
    expect(block?.blockId).toBe('sanity-key');
  });

  test('serializes fluxship-compatible block tags', () => {
    const markdown = serializeBlocksWithBlockIds([
      {
        id: 'block-1',
        type: 'p',
        children: [{ text: 'Review me' }],
      },
    ]);

    expect(markdown).toBe('<block id="block-1">Review me</block>');
  });

  test('split block creates a different id for the new block', () => {
    const [first, second] = splitBlockWithNewId(
      { id: 'existing', children: [{ text: 'First' }] },
      { children: [{ text: 'Second' }] },
    );

    expect(first.id).toBe('existing');
    expect(second.id).toBeTruthy();
    expect(second.id).not.toBe(first.id);
  });
});
