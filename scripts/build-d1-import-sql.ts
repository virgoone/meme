import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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

type CommentBody = {
  blockId?: string;
  text?: string;
};

const preparedDir = process.argv[2];
const tursoExportDir = process.argv[3];
const outDir =
  process.argv[4] ??
  `data/d1-sql-import/${new Date().toISOString().replaceAll(':', '-')}`;
const chunkSizeArg = process.argv.find((arg) =>
  arg.startsWith('--chunk-size='),
);
const chunkSize = Math.min(
  Math.max(Number(chunkSizeArg?.split('=')[1] ?? 220), 1),
  500,
);

if (!preparedDir || !tursoExportDir) {
  throw new Error(
    'Usage: bun run scripts/build-d1-import-sql.ts <data/d1-import/timestamp> <data/turso-export/timestamp> [out-dir]',
  );
}

async function readJson<T>(dir: string, filename: string): Promise<T> {
  return JSON.parse(await readFile(join(dir, filename), 'utf8')) as T;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number')
    return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return `'${text.replaceAll("'", "''")}'`;
}

function quotedIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function insertStatement(
  table: string,
  row: Record<string, unknown>,
  conflictTarget?: string,
  updateColumns?: string[],
): string {
  const columns = Object.keys(row);
  const columnSql = columns.map(quotedIdentifier).join(', ');
  const valueSql = columns.map((column) => sqlLiteral(row[column])).join(', ');
  const base = `INSERT INTO ${quotedIdentifier(table)} (${columnSql}) VALUES (${valueSql})`;

  if (!conflictTarget) return `${base};`;

  const assignments = (updateColumns ?? columns)
    .filter((column) => column !== conflictTarget)
    .map(
      (column) =>
        `${quotedIdentifier(column)} = excluded.${quotedIdentifier(column)}`,
    );

  if (!assignments.includes('"updated_at" = CURRENT_TIMESTAMP')) {
    assignments.push('"updated_at" = CURRENT_TIMESTAMP');
  }

  return `${base} ON CONFLICT(${quotedIdentifier(conflictTarget)}) DO UPDATE SET ${assignments.join(', ')};`;
}

function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function parseCommentBody(body: unknown): CommentBody | null {
  if (typeof body !== 'string') return null;
  try {
    const parsed = JSON.parse(body) as CommentBody;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeSqlChunks(statements: string[]) {
  await mkdir(outDir, { recursive: true });
  const files: string[] = [];

  for (let index = 0; index < statements.length; index += chunkSize) {
    const chunk = statements.slice(index, index + chunkSize);
    const filename = `${String(files.length + 1).padStart(4, '0')}.sql`;
    const filePath = join(outDir, filename);
    const content = [
      'PRAGMA foreign_keys = OFF;',
      'BEGIN TRANSACTION;',
      ...chunk,
      'COMMIT;',
    ].join('\n');
    await writeFile(filePath, `${content}\n`);
    files.push(filePath);
  }

  return files;
}

const posts = await readJson<ImportedPostRow[]>(
  preparedDir,
  'imported_posts.json',
);
const blocks = await readJson<PostBlockRow[]>(preparedDir, 'post_blocks.json');
const assets = await readJson<PostAssetRow[]>(preparedDir, 'post_assets.json');
const migrationMap = await readJson<MigrationMapRow[]>(
  preparedDir,
  'sanity_migration_map.json',
);

const legacyTables = [
  'post_tags',
  'comments',
  'guestbook',
  'newsletters',
  'subscribers',
  'project',
  'photos',
  'post',
  'tags',
  'media',
  'categories',
] as const;

const legacyRows = new Map<string, Record<string, unknown>[]>();
for (const table of legacyTables) {
  legacyRows.set(
    table,
    await readJson<Record<string, unknown>[]>(tursoExportDir, `${table}.json`),
  );
}

const postIdBySanityId = new Map(posts.map((post) => [post.sanityId, post.id]));
const blockIdsByPost = new Set(
  blocks.map((block) => `${block.postId}:${block.blockId}`),
);

const statements: string[] = [
  'DELETE FROM "comment_anchors";',
  'DELETE FROM "migration_runs";',
];

for (const table of legacyTables) {
  statements.push(`DELETE FROM ${quotedIdentifier(table)};`);
}

for (const post of posts) {
  statements.push(
    insertStatement(
      'imported_posts',
      {
        id: post.id,
        sanity_id: post.sanityId,
        sanity_rev: post.sanityRev,
        title: post.title,
        slug: post.slug,
        description: post.description,
        mood: post.mood,
        reading_time: post.readingTime,
        portable_text_json: json(post.portableTextJson),
        slate_json: json(post.slateJson),
        published_at: post.publishedAt,
      },
      'id',
    ),
  );
}

for (const block of blocks) {
  statements.push(
    insertStatement(
      'post_blocks',
      {
        id: block.id,
        post_id: block.postId,
        block_id: block.blockId,
        portable_text_key: block.portableTextKey,
        sort_index: block.sortIndex,
        type: block.type,
        portable_text_json: json(block.portableTextJson),
        slate_json: json(block.slateJson),
        plain_text: block.plainText,
      },
      'id',
    ),
  );
}

for (const asset of assets) {
  statements.push(
    insertStatement(
      'post_assets',
      {
        id: asset.id,
        sanity_asset_id: asset.sanityAssetId,
        sanity_ref: asset.sanityRef,
        source_url: asset.sourceUrl,
        r2_key: asset.r2Key,
        content_type: asset.contentType,
        size: asset.size,
        checksum: asset.checksum,
        metadata_json: json(asset.metadataJson),
      },
      'id',
    ),
  );
}

for (const item of migrationMap) {
  statements.push(
    insertStatement(
      'sanity_migration_map',
      {
        sanity_id: item.sanityId,
        sanity_rev: item.sanityRev,
        sanity_type: item.sanityType,
        d1_table: item.d1Table,
        d1_id: item.d1Id,
        status: item.status,
        error: item.error,
      },
      'sanity_id',
    ),
  );
}

for (const table of [...legacyTables].reverse()) {
  for (const row of legacyRows.get(table) ?? []) {
    statements.push(insertStatement(table, row));
  }
}

let anchorCount = 0;
for (const comment of legacyRows.get('comments') ?? []) {
  const commentId = comment.id;
  const oldPostId = comment.post_id;
  if (typeof commentId !== 'number' || typeof oldPostId !== 'string') continue;

  const importedPostId = postIdBySanityId.get(oldPostId) ?? oldPostId;
  const body = parseCommentBody(comment.body);
  const blockId = body?.blockId ?? null;
  const anchorStatus =
    blockId && blockIdsByPost.has(`${importedPostId}:${blockId}`)
      ? 'block'
      : blockId
        ? 'missing'
        : 'post_level';

  statements.push(
    insertStatement('comment_anchors', {
      id: `comment_anchor_${commentId}`,
      comment_id: commentId,
      post_id: importedPostId,
      block_id: blockId,
      quote: body?.text ?? null,
      range_json: null,
      anchor_status: anchorStatus,
    }),
  );
  anchorCount += 1;
}

statements.push(
  insertStatement('migration_runs', {
    id: `sanity_${Date.now()}`,
    source: 'sanity',
    mode: 'write',
    status: 'completed',
    summary_json: json({
      preparedDir,
      posts: posts.length,
      blocks: blocks.length,
      assets: assets.length,
      migrationMap: migrationMap.length,
    }),
    completed_at: new Date().toISOString(),
  }),
);

statements.push(
  insertStatement('migration_runs', {
    id: `turso_${Date.now()}`,
    source: 'turso',
    mode: 'write',
    status: 'completed',
    summary_json: json({
      exportDir: tursoExportDir,
      imported: Object.fromEntries(
        legacyTables.map((table) => [
          table,
          legacyRows.get(table)?.length ?? 0,
        ]),
      ),
      commentAnchors: anchorCount,
    }),
    completed_at: new Date().toISOString(),
  }),
);

const files = await writeSqlChunks(statements);
const summary = {
  generatedAt: new Date().toISOString(),
  preparedDir,
  tursoExportDir,
  outDir,
  chunkSize,
  files,
  counts: {
    statements: statements.length,
    posts: posts.length,
    blocks: blocks.length,
    assets: assets.length,
    migrationMap: migrationMap.length,
    commentAnchors: anchorCount,
    legacy: Object.fromEntries(
      legacyTables.map((table) => [table, legacyRows.get(table)?.length ?? 0]),
    ),
  },
};

await writeFile(
  join(outDir, 'summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
);

console.log(JSON.stringify(summary, null, 2));
