import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_DB_AUTH_TOKEN;
const outRoot = process.env.TURSO_EXPORT_DIR ?? 'data/turso-export';

if (!url || !authToken) {
  throw new Error('TURSO_DB_URL and TURSO_DB_AUTH_TOKEN are required');
}

const tables = [
  'subscribers',
  'newsletters',
  'comments',
  'guestbook',
  'project',
  'categories',
  'media',
  'post',
  'tags',
  'post_tags',
  'photos',
] as const;

const client = createClient({ url, authToken });
const now = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = join(outRoot, now);
await mkdir(outDir, { recursive: true });

const summary: {
  exportedAt: string;
  tables: Record<string, { rowCount: number; checksum: string; file: string }>;
} = {
  exportedAt: new Date().toISOString(),
  tables: {},
};

for (const table of tables) {
  const result = await client.execute(`select * from ${table}`);
  const rows = result.rows.map((row) => ({ ...row }));
  const json = `${JSON.stringify(rows, null, 2)}\n`;
  const checksum = createHash('sha256').update(json).digest('hex');
  const file = `${table}.json`;

  await writeFile(join(outDir, file), json);
  summary.tables[table] = {
    rowCount: rows.length,
    checksum,
    file,
  };
}

const summaryJson = `${JSON.stringify(summary, null, 2)}\n`;
const checksum = createHash('sha256').update(summaryJson).digest('hex');
await writeFile(join(outDir, 'summary.json'), summaryJson);

console.log(
  JSON.stringify(
    {
      outDir,
      checksum,
      ...summary,
    },
    null,
    2,
  ),
);
