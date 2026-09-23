import { describe, expect, test } from 'bun:test';

import {
  fallbackBlockId,
  preparePost,
  prepareSanityImport,
  type SanityPostDocument,
} from './sanity-content';

describe('Sanity content migration', () => {
  test('preserves Portable Text _key as the imported blockId', () => {
    const document: SanityPostDocument = {
      _id: 'post.sanity-1',
      _rev: 'rev-1',
      _type: 'post',
      title: 'Hello',
      slug: { current: 'hello' },
      body: [
        {
          _key: 'portable-text-key-1',
          _type: 'block',
          style: 'normal',
          children: [{ _type: 'span', text: 'Hello world' }],
        },
      ],
    };

    const prepared = preparePost(document);

    expect(prepared.post?.sanityId).toBe('post.sanity-1');
    expect(prepared.blocks).toHaveLength(1);
    expect(prepared.blocks[0]?.blockId).toBe('portable-text-key-1');
    expect(prepared.blocks[0]?.portableTextKey).toBe('portable-text-key-1');
    expect(prepared.blocks[0]?.slateJson.id).toBe('portable-text-key-1');
    expect(prepared.blocks[0]?.usedFallbackBlockId).toBe(false);
  });

  test('uses a deterministic fallback id for malformed blocks without _key', () => {
    const block = {
      _type: 'block',
      style: 'normal',
      children: [{ _type: 'span', text: 'Missing key' }],
    };
    const first = fallbackBlockId('post_123', block, 0);
    const second = fallbackBlockId('post_123', block, 0);

    expect(first).toBe(second);

    const prepared = preparePost({
      _id: 'post.sanity-2',
      _type: 'post',
      title: 'Missing block key',
      slug: { current: 'missing-block-key' },
      body: [block],
    });

    expect(prepared.blocks[0]?.blockId).toBeTruthy();
    expect(prepared.blocks[0]?.portableTextKey).toBeNull();
    expect(prepared.blocks[0]?.usedFallbackBlockId).toBe(true);
  });

  test('keeps posts with missing slugs out of import rows and reports them', () => {
    const prepared = prepareSanityImport([
      {
        _id: 'post.no-slug',
        _type: 'post',
        title: 'No slug',
        body: [],
      } as SanityPostDocument,
    ]);

    expect(prepared.posts).toHaveLength(0);
    expect(prepared.summary.postsMissingSlugs).toEqual(['post.no-slug']);
    expect(prepared.migrationMap[0]?.status).toBe('failed');
  });
});
