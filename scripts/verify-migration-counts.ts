import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const exportDir = process.argv[2];

if (!exportDir) {
  throw new Error(
    'Usage: bun run scripts/verify-migration-counts.ts <data/sanity-export/timestamp>',
  );
}

const summaryPath = join(exportDir, 'summary.json');
const documentsPath = join(exportDir, 'documents.ndjson');
const blocksPath = join(exportDir, 'post-blocks.json');

const summary = JSON.parse(await readFile(summaryPath, 'utf8')) as {
  checksum: string;
  documentCount: number;
  counts: Record<string, number>;
};
const ndjson = await readFile(documentsPath, 'utf8');
const blockSummary = JSON.parse(await readFile(blocksPath, 'utf8')) as {
  sanityId: string;
  missingBlockIds: number;
}[];

const checksum = createHash('sha256').update(ndjson).digest('hex');
const documentCount = ndjson
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean).length;
const postsMissingBlockIds = blockSummary.filter(
  (post) => post.missingBlockIds > 0,
);

const errors: string[] = [];
if (checksum !== summary.checksum) {
  errors.push(
    `Checksum mismatch: expected ${summary.checksum}, got ${checksum}`,
  );
}
if (documentCount !== summary.documentCount) {
  errors.push(
    `Document count mismatch: expected ${summary.documentCount}, got ${documentCount}`,
  );
}
if (postsMissingBlockIds.length > 0) {
  errors.push(
    `Posts with missing Portable Text _key values: ${postsMissingBlockIds
      .map((post) => `${post.sanityId}(${post.missingBlockIds})`)
      .join(', ')}`,
  );
}

const report = {
  ok: errors.length === 0,
  documentCount,
  counts: summary.counts,
  checksum,
  postsMissingBlockIds: postsMissingBlockIds.length,
  errors,
};

console.log(JSON.stringify(report, null, 2));

if (errors.length > 0) {
  process.exitCode = 1;
}
