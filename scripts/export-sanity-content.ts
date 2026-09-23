import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type SanityDocument = {
  _id: string;
  _rev?: string;
  _type: string;
  [key: string]: unknown;
};

const projectId =
  process.env.SANITY_PROJECT_ID ?? process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset =
  process.env.SANITY_DATASET ??
  process.env.NEXT_PUBLIC_SANITY_DATASET ??
  'production';
const token = process.env.SANITY_READ_TOKEN;
const apiVersion = process.env.SANITY_API_VERSION ?? '2025-02-19';
const outRoot = process.env.SANITY_EXPORT_DIR ?? 'data/sanity-export';

if (!projectId) {
  throw new Error(
    'SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_PROJECT_ID is required',
  );
}

const query = `*[_type in ["post", "category", "settings", "sanity.imageAsset"]] | order(_type asc, _id asc)`;
const url = new URL(
  `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`,
);
url.searchParams.set('query', query);

const headers: Record<string, string> = {};
if (token) headers.Authorization = `Bearer ${token}`;

const response = await fetch(url, { headers });
if (!response.ok) {
  throw new Error(
    `Sanity export query failed: ${response.status} ${await response.text()}`,
  );
}

const payload = (await response.json()) as { result?: SanityDocument[] };
const documents = payload.result ?? [];
const now = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = join(outRoot, now);
await mkdir(outDir, { recursive: true });

const ndjson = `${documents.map((document) => JSON.stringify(document)).join('\n')}\n`;
const checksum = createHash('sha256').update(ndjson).digest('hex');
const counts = documents.reduce<Record<string, number>>((acc, document) => {
  acc[document._type] = (acc[document._type] ?? 0) + 1;
  return acc;
}, {});

const blockSummary = documents
  .filter((document) => document._type === 'post')
  .map((document) => {
    const body = Array.isArray(document.body) ? document.body : [];
    const blocks = body.map((block, index) => {
      const value = block as { _key?: string; _type?: string };
      return {
        index,
        key: value._key ?? null,
        type: value._type ?? null,
        hasStableBlockId:
          typeof value._key === 'string' && value._key.length > 0,
      };
    });
    return {
      sanityId: document._id,
      slug:
        typeof document.slug === 'object' &&
        document.slug !== null &&
        'current' in document.slug
          ? (document.slug as { current?: string }).current
          : null,
      blockCount: blocks.length,
      missingBlockIds: blocks.filter((block) => !block.hasStableBlockId).length,
      blocks,
    };
  });

const summary = {
  exportedAt: new Date().toISOString(),
  projectId,
  dataset,
  apiVersion,
  query,
  documentCount: documents.length,
  counts,
  checksum,
  files: {
    documents: 'documents.ndjson',
    summary: 'summary.json',
    blockSummary: 'post-blocks.json',
  },
};

await writeFile(join(outDir, 'documents.ndjson'), ndjson);
await writeFile(
  join(outDir, 'summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
);
await writeFile(
  join(outDir, 'post-blocks.json'),
  `${JSON.stringify(blockSummary, null, 2)}\n`,
);

console.log(JSON.stringify({ outDir, ...summary }, null, 2));
