import { Database } from 'bun:sqlite';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

type ImportedPostRow = {
  id: string;
  sanityId: string;
  sanityRev: string | null;
  title: string;
  slug: string;
  description: string | null;
  mood: string;
  readingTime: number;
  portableTextJson: unknown;
  slateJson: unknown;
  publishedAt: string | null;
};

type PostBlockRow = {
  id: string;
  postId: string;
  blockId: string;
  portableTextKey: string | null;
  sortIndex: number;
  type: string;
  portableTextJson: unknown;
  slateJson: unknown;
  plainText: string | null;
};

type PostAssetRow = {
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

type MigrationMapRow = {
  sanityId: string;
  sanityRev: string | null;
  sanityType: string;
  d1Table: string;
  d1Id: string;
  status: string;
  error: string | null;
};

const preparedDir = process.argv[2];
const sqlitePath = process.argv[3] ?? 'data/local/meme-d1.sqlite';

if (!preparedDir) {
  throw new Error(
    'Usage: bun run scripts/import-prepared-sanity-to-sqlite.ts <data/d1-import/timestamp> [data/local/meme-d1.sqlite]',
  );
}

async function readJson<T>(filename: string): Promise<T> {
  return JSON.parse(await readFile(join(preparedDir, filename), 'utf8')) as T;
}

const posts = await readJson<ImportedPostRow[]>('imported_posts.json');
const blocks = await readJson<PostBlockRow[]>('post_blocks.json');
const assets = await readJson<PostAssetRow[]>('post_assets.json');
const migrationMap = await readJson<MigrationMapRow[]>(
  'sanity_migration_map.json',
);

await mkdir(dirname(sqlitePath), { recursive: true });

function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

const db = new Database(sqlitePath, { create: true });
db.exec('PRAGMA foreign_keys = ON');

const insertPost = db.prepare(`
  INSERT INTO imported_posts (
    id,
    sanity_id,
    sanity_rev,
    title,
    slug,
    description,
    mood,
    reading_time,
    portable_text_json,
    slate_json,
    published_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    sanity_rev = excluded.sanity_rev,
    title = excluded.title,
    slug = excluded.slug,
    description = excluded.description,
    mood = excluded.mood,
    reading_time = excluded.reading_time,
    portable_text_json = excluded.portable_text_json,
    slate_json = excluded.slate_json,
    published_at = excluded.published_at,
    updated_at = CURRENT_TIMESTAMP
`);

const insertBlock = db.prepare(`
  INSERT INTO post_blocks (
    id,
    post_id,
    block_id,
    portable_text_key,
    sort_index,
    type,
    portable_text_json,
    slate_json,
    plain_text
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    block_id = excluded.block_id,
    portable_text_key = excluded.portable_text_key,
    sort_index = excluded.sort_index,
    type = excluded.type,
    portable_text_json = excluded.portable_text_json,
    slate_json = excluded.slate_json,
    plain_text = excluded.plain_text,
    updated_at = CURRENT_TIMESTAMP
`);

const insertAsset = db.prepare(`
  INSERT INTO post_assets (
    id,
    sanity_asset_id,
    sanity_ref,
    source_url,
    r2_key,
    content_type,
    size,
    checksum,
    metadata_json
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    source_url = excluded.source_url,
    r2_key = excluded.r2_key,
    content_type = excluded.content_type,
    size = excluded.size,
    checksum = excluded.checksum,
    metadata_json = excluded.metadata_json,
    updated_at = CURRENT_TIMESTAMP
`);

const insertMigrationMap = db.prepare(`
  INSERT INTO sanity_migration_map (
    sanity_id,
    sanity_rev,
    sanity_type,
    d1_table,
    d1_id,
    status,
    error
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(sanity_id) DO UPDATE SET
    sanity_rev = excluded.sanity_rev,
    sanity_type = excluded.sanity_type,
    d1_table = excluded.d1_table,
    d1_id = excluded.d1_id,
    status = excluded.status,
    error = excluded.error,
    updated_at = CURRENT_TIMESTAMP
`);

const runId = `sanity_${Date.now()}`;

db.transaction(() => {
  for (const post of posts) {
    insertPost.run(
      post.id,
      post.sanityId,
      post.sanityRev,
      post.title,
      post.slug,
      post.description,
      post.mood,
      post.readingTime,
      json(post.portableTextJson),
      json(post.slateJson),
      post.publishedAt,
    );
  }

  for (const block of blocks) {
    insertBlock.run(
      block.id,
      block.postId,
      block.blockId,
      block.portableTextKey,
      block.sortIndex,
      block.type,
      json(block.portableTextJson),
      json(block.slateJson),
      block.plainText,
    );
  }

  for (const asset of assets) {
    insertAsset.run(
      asset.id,
      asset.sanityAssetId,
      asset.sanityRef,
      asset.sourceUrl,
      asset.r2Key,
      asset.contentType,
      asset.size,
      asset.checksum,
      json(asset.metadataJson),
    );
  }

  for (const item of migrationMap) {
    insertMigrationMap.run(
      item.sanityId,
      item.sanityRev,
      item.sanityType,
      item.d1Table,
      item.d1Id,
      item.status,
      item.error,
    );
  }

  db.prepare(`
    INSERT INTO migration_runs (
      id,
      source,
      mode,
      status,
      summary_json,
      completed_at
    )
    VALUES (?, 'sanity', 'write', 'completed', ?, CURRENT_TIMESTAMP)
  `).run(
    runId,
    json({
      preparedDir,
      posts: posts.length,
      blocks: blocks.length,
      assets: assets.length,
      migrationMap: migrationMap.length,
    }),
  );
})();

const counts = {
  importedPosts: db
    .query('select count(*) as count from imported_posts')
    .get() as { count: number },
  postBlocks: db.query('select count(*) as count from post_blocks').get() as {
    count: number;
  },
  postAssets: db.query('select count(*) as count from post_assets').get() as {
    count: number;
  },
  sanityMigrationMap: db
    .query('select count(*) as count from sanity_migration_map')
    .get() as { count: number },
};

console.log(
  JSON.stringify(
    {
      sqlitePath,
      runId,
      counts: {
        importedPosts: counts.importedPosts.count,
        postBlocks: counts.postBlocks.count,
        postAssets: counts.postAssets.count,
        sanityMigrationMap: counts.sanityMigrationMap.count,
      },
    },
    null,
    2,
  ),
);
