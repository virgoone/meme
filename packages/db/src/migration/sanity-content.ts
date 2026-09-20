import { createHash } from 'node:crypto';

export type SanitySlug = {
  current?: string;
};

export type SanityImageAsset = {
  _id: string;
  _rev?: string;
  _type: 'sanity.imageAsset';
  assetId?: string;
  extension?: string;
  mimeType?: string;
  originalFilename?: string;
  path?: string;
  sha1hash?: string;
  size?: number;
  url?: string;
  metadata?: unknown;
};

export type SanityPortableTextBlock = {
  _key?: string;
  _type?: string;
  children?: SanityPortableTextSpan[];
  markDefs?: unknown[];
  style?: string;
  [key: string]: unknown;
};

export type SanityPortableTextSpan = {
  _key?: string;
  _type?: string;
  marks?: string[];
  text?: string;
  [key: string]: unknown;
};

export type SanityPostDocument = {
  _id: string;
  _rev?: string;
  _type: 'post';
  title?: string;
  slug?: SanitySlug;
  description?: string;
  body?: SanityPortableTextBlock[];
  categories?: unknown[];
  mainImage?: unknown;
  mood?: 'happy' | 'sad' | 'neutral';
  readingTime?: number;
  publishedAt?: string;
};

export type SanityDocument =
  | SanityPostDocument
  | SanityImageAsset
  | {
      _id: string;
      _rev?: string;
      _type: string;
      [key: string]: unknown;
    };

export type PreparedImportedPost = {
  id: string;
  sanityId: string;
  sanityRev: string | null;
  title: string;
  slug: string;
  description: string | null;
  mood: 'happy' | 'sad' | 'neutral';
  readingTime: number;
  portableTextJson: SanityPortableTextBlock[];
  slateJson: SlateBlockNode[];
  publishedAt: string | null;
};

export type PreparedPostBlock = {
  id: string;
  postId: string;
  blockId: string;
  portableTextKey: string | null;
  sortIndex: number;
  type: string;
  portableTextJson: SanityPortableTextBlock;
  slateJson: SlateBlockNode;
  plainText: string;
  usedFallbackBlockId: boolean;
};

export type PreparedPostAsset = {
  id: string;
  sanityAssetId: string;
  sanityRef: string;
  sourceUrl: string;
  r2Key: string;
  contentType: string | null;
  size: number | null;
  checksum: string | null;
  metadataJson: unknown;
};

export type PreparedMigrationMap = {
  sanityId: string;
  sanityRev: string | null;
  sanityType: string;
  d1Table: string;
  d1Id: string;
  status: 'pending' | 'imported' | 'failed' | 'skipped';
  error: string | null;
};

export type PreparedSanityImport = {
  posts: PreparedImportedPost[];
  blocks: PreparedPostBlock[];
  assets: PreparedPostAsset[];
  migrationMap: PreparedMigrationMap[];
  summary: {
    documentCount: number;
    postCount: number;
    imageAssetCount: number;
    blockCount: number;
    fallbackBlockIdCount: number;
    postsMissingSlugs: string[];
  };
};

export type SlateTextNode = {
  text: string;
  marks?: string[];
};

export type SlateBlockNode = {
  id: string;
  type: string;
  children: SlateTextNode[];
  data?: Record<string, unknown>;
};

export function stableHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 24);
}

export function stableD1Id(prefix: string, input: string): string {
  return `${prefix}_${stableHash(input)}`;
}

export function fallbackBlockId(
  postId: string,
  block: unknown,
  index: number,
): string {
  return stableD1Id('block', `${postId}:${index}:${JSON.stringify(block)}`);
}

export function normalizeSlug(slug: unknown): string | null {
  if (typeof slug === 'string' && slug.trim().length > 0) return slug.trim();
  if (
    typeof slug === 'object' &&
    slug !== null &&
    'current' in slug &&
    typeof slug.current === 'string' &&
    slug.current.trim().length > 0
  ) {
    return slug.current.trim();
  }
  return null;
}

export function portableTextPlainText(block: SanityPortableTextBlock): string {
  if (!Array.isArray(block.children)) return '';
  return block.children
    .map((child) => (typeof child.text === 'string' ? child.text : ''))
    .join('');
}

export function portableTextToSlateBlock(
  block: SanityPortableTextBlock,
  blockId: string,
): SlateBlockNode {
  const type =
    block._type === 'block' ? (block.style ?? 'p') : (block._type ?? 'unknown');
  const children = Array.isArray(block.children)
    ? block.children.map((child) => ({
        text: typeof child.text === 'string' ? child.text : '',
        ...(Array.isArray(child.marks) && child.marks.length > 0
          ? { marks: child.marks }
          : {}),
      }))
    : [{ text: portableTextPlainText(block) }];

  return {
    id: blockId,
    type,
    children: children.length > 0 ? children : [{ text: '' }],
    data: {
      portableTextType: block._type ?? null,
      portableTextStyle: block.style ?? null,
      markDefs: block.markDefs ?? [],
      source: 'sanity-portable-text',
    },
  };
}

export function preparePost(document: SanityPostDocument): {
  post: PreparedImportedPost | null;
  blocks: PreparedPostBlock[];
  migrationMap: PreparedMigrationMap[];
  missingSlug: boolean;
} {
  const slug = normalizeSlug(document.slug);
  if (!slug) {
    return {
      post: null,
      blocks: [],
      migrationMap: [
        {
          sanityId: document._id,
          sanityRev: document._rev ?? null,
          sanityType: document._type,
          d1Table: 'imported_posts',
          d1Id: stableD1Id('post', document._id),
          status: 'failed',
          error: 'Missing slug.current',
        },
      ],
      missingSlug: true,
    };
  }

  const postId = stableD1Id('post', document._id);
  const portableTextJson = Array.isArray(document.body) ? document.body : [];
  const blocks = portableTextJson.map((block, index): PreparedPostBlock => {
    const sourceBlockId =
      typeof block._key === 'string' && block._key.length > 0
        ? block._key
        : null;
    const blockId = sourceBlockId ?? fallbackBlockId(postId, block, index);
    const slateJson = portableTextToSlateBlock(block, blockId);

    return {
      id: stableD1Id('post_block', `${postId}:${blockId}`),
      postId,
      blockId,
      portableTextKey: sourceBlockId,
      sortIndex: index,
      type: block._type ?? 'unknown',
      portableTextJson: block,
      slateJson,
      plainText: portableTextPlainText(block),
      usedFallbackBlockId: !sourceBlockId,
    };
  });

  const post: PreparedImportedPost = {
    id: postId,
    sanityId: document._id,
    sanityRev: document._rev ?? null,
    title: document.title ?? slug,
    slug,
    description: document.description ?? null,
    mood: document.mood ?? 'neutral',
    readingTime: document.readingTime ?? 0,
    portableTextJson,
    slateJson: blocks.map((block) => block.slateJson),
    publishedAt: document.publishedAt ?? null,
  };

  return {
    post,
    blocks,
    migrationMap: [
      {
        sanityId: document._id,
        sanityRev: document._rev ?? null,
        sanityType: document._type,
        d1Table: 'imported_posts',
        d1Id: postId,
        status: 'pending',
        error: null,
      },
    ],
    missingSlug: false,
  };
}

export function sanityImageAssetToPreparedAsset(
  asset: SanityImageAsset,
): PreparedPostAsset | null {
  const assetId =
    asset.assetId ?? asset._id.replace(/^image-/, '').replace(/-[^-]+$/, '');
  const extension = asset.extension ?? asset._id.split('-').at(-1) ?? 'bin';
  const sourceUrl = asset.url;
  if (!sourceUrl) return null;

  return {
    id: stableD1Id('asset', asset._id),
    sanityAssetId: assetId,
    sanityRef: asset._id,
    sourceUrl,
    r2Key: `sanity/images/${assetId}.${extension}`,
    contentType: asset.mimeType ?? null,
    size: typeof asset.size === 'number' ? asset.size : null,
    checksum: asset.sha1hash ?? null,
    metadataJson: asset.metadata ?? null,
  };
}

export function prepareSanityImport(
  documents: SanityDocument[],
): PreparedSanityImport {
  const posts: PreparedImportedPost[] = [];
  const blocks: PreparedPostBlock[] = [];
  const assets: PreparedPostAsset[] = [];
  const migrationMap: PreparedMigrationMap[] = [];
  const postsMissingSlugs: string[] = [];

  for (const document of documents) {
    if (document._type === 'post') {
      const prepared = preparePost(document as SanityPostDocument);
      migrationMap.push(...prepared.migrationMap);
      if (prepared.missingSlug) {
        postsMissingSlugs.push(document._id);
        continue;
      }
      if (prepared.post) posts.push(prepared.post);
      blocks.push(...prepared.blocks);
      continue;
    }

    if (document._type === 'sanity.imageAsset') {
      const preparedAsset = sanityImageAssetToPreparedAsset(
        document as SanityImageAsset,
      );
      if (preparedAsset) {
        assets.push(preparedAsset);
        migrationMap.push({
          sanityId: document._id,
          sanityRev: document._rev ?? null,
          sanityType: document._type,
          d1Table: 'post_assets',
          d1Id: preparedAsset.id,
          status: 'pending',
          error: null,
        });
      }
    }
  }

  return {
    posts,
    blocks,
    assets,
    migrationMap,
    summary: {
      documentCount: documents.length,
      postCount: posts.length,
      imageAssetCount: assets.length,
      blockCount: blocks.length,
      fallbackBlockIdCount: blocks.filter((block) => block.usedFallbackBlockId)
        .length,
      postsMissingSlugs,
    },
  };
}
