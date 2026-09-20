import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  prepareSanityImport,
  type SanityDocument,
} from '../packages/db/src/migration/sanity-content';

const exportDir = process.argv[2];
const outRoot = process.argv[3] ?? 'data/d1-import';

if (!exportDir) {
  throw new Error(
    'Usage: bun run scripts/prepare-sanity-d1-import.ts <data/sanity-export/timestamp> [data/d1-import]',
  );
}

function parseNdjson(input: string): SanityDocument[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as SanityDocument);
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

const documentsPath = join(exportDir, 'documents.ndjson');
const documentsNdjson = await readFile(documentsPath, 'utf8');
const documents = parseNdjson(documentsNdjson);
const prepared = prepareSanityImport(documents);
const now = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = join(outRoot, now);

await mkdir(outDir, { recursive: true });

const checksum = createHash('sha256').update(documentsNdjson).digest('hex');
const summary = {
  preparedAt: new Date().toISOString(),
  sourceExportDir: exportDir,
  sourceChecksum: checksum,
  ...prepared.summary,
  files: {
    posts: 'imported_posts.json',
    blocks: 'post_blocks.json',
    assets: 'post_assets.json',
    migrationMap: 'sanity_migration_map.json',
    summary: 'summary.json',
  },
};

await writeJson(join(outDir, 'imported_posts.json'), prepared.posts);
await writeJson(join(outDir, 'post_blocks.json'), prepared.blocks);
await writeJson(join(outDir, 'post_assets.json'), prepared.assets);
await writeJson(
  join(outDir, 'sanity_migration_map.json'),
  prepared.migrationMap,
);
await writeJson(join(outDir, 'summary.json'), summary);

console.log(JSON.stringify({ outDir, ...summary }, null, 2));

if (prepared.summary.postsMissingSlugs.length > 0) {
  process.exitCode = 1;
}
