import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient, type InStatement, type InValue } from '@libsql/client';
import { resolvePostCover } from '../packages/db/src/cover';

const [sourcePath, backupDir, mode] = process.argv.slice(2);
if (!sourcePath || !backupDir || !['--check', '--replace-target'].includes(mode)) {
  throw new Error('Usage: bun --env-file=.env.local scripts/migrate-d1-to-libsql.ts <d1.sql> <backup-directory> <--check|--replace-target>');
}
const url = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_DB_AUTH_TOKEN;
if (!url || !authToken) throw new Error('TURSO_DB_URL and TURSO_DB_AUTH_TOKEN are required');

const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
const source = new Database(':memory:');
source.exec(await readFile(sourcePath, 'utf8'));
if (!(source.query('PRAGMA table_info(imported_posts)').all() as { name: string }[]).some(column => column.name === 'cover_image_url')) {
  source.exec(await readFile(new URL('../packages/db/drizzle/0006_stored_post_covers.sql', import.meta.url), 'utf8'));
}
const posts = source.query('SELECT id, main_image_url FROM imported_posts').all() as { id: string; main_image_url: string | null }[];
for (const post of posts) {
  const blocks = source.query('SELECT portable_text_json FROM post_blocks WHERE post_id = ? ORDER BY sort_index').all(post.id) as { portable_text_json: string }[];
  const cover = resolvePostCover(post.main_image_url, blocks.map(block => JSON.parse(block.portable_text_json)));
  source.query('UPDATE imported_posts SET cover_image_url = ? WHERE id = ?').run(cover, post.id);
}
if (source.query('PRAGMA foreign_key_check').all().length) throw new Error('Source foreign keys are inconsistent');
if ((source.query('PRAGMA integrity_check').get() as { integrity_check: string }).integrity_check !== 'ok') throw new Error('Source integrity check failed');

type SchemaRow = { type: string; name: string; tbl_name: string; sql: string };
const schemaQuery = `SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations' ORDER BY type = 'table' DESC, name`;
const schema = source.query(schemaQuery).all() as SchemaRow[];
const tables = schema.filter(row => row.type === 'table');
const data = new Map(tables.map(table => [table.name, source.query(`SELECT * FROM ${quote(table.name)}`).all() as Record<string, InValue>[]]));
function checksum(rows: Record<string, unknown>[]) {
  return createHash('sha256').update(JSON.stringify(rows.map(row => JSON.stringify(Object.keys(row).sort().map(key => [key, row[key]]))).sort())).digest('hex');
}
const manifest = Object.fromEntries([...data].map(([name, rows]) => [name, { rows: rows.length, sha256: checksum(rows) }]));
await mkdir(backupDir, { recursive: true });
await writeFile(join(backupDir, 'source-manifest.json'), JSON.stringify({ sourcePath, target: url, tables: manifest }, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ target: url, tables: tables.length, rows: [...data.values()].reduce((total, rows) => total + rows.length, 0), covers: source.query('SELECT count(*) AS count FROM imported_posts WHERE cover_image_url IS NOT NULL').get(), mode }));
if (mode === '--check') {
  source.close();
  process.exit(0);
}

const client = createClient({ url, authToken, intMode: 'number' });
try {
  const oldSchema = (await client.execute(schemaQuery)).rows as unknown as SchemaRow[];
  const oldTables = oldSchema.filter(row => row.type === 'table');
  const oldResults = oldTables.length ? await client.batch(oldTables.map(table => `SELECT * FROM ${quote(table.name)}`), 'read') : [];
  const backup = { target: url, exportedAt: new Date().toISOString(), schema: oldSchema, tables: Object.fromEntries(oldTables.map((table, index) => [table.name, oldResults[index].rows.map(row => ({ ...row }))])) };
  // Unique file per replacement; never overwrite the original Turso backup.
  const backupPath = join(backupDir, `turso-before-${Date.now()}.json`);
  await writeFile(backupPath, JSON.stringify(backup), { mode: 0o600, flag: 'wx' });
  console.log(`Target backup saved: ${backupPath}`);

  const statements: InStatement[] = [
    ...oldSchema.filter(row => row.type === 'view' || row.type === 'trigger').map(row => `DROP ${row.type.toUpperCase()} ${quote(row.name)}`),
    ...oldTables.map(table => `DROP TABLE ${quote(table.name)}`),
    ...tables.map(table => table.sql),
  ];
  for (const table of tables) {
    const rows = data.get(table.name) ?? [];
    for (const row of rows) {
      const columns = Object.keys(row);
      statements.push({ sql: `INSERT INTO ${quote(table.name)} (${columns.map(quote).join(',')}) VALUES (${columns.map(() => '?').join(',')})`, args: columns.map(column => row[column]) });
    }
  }
  statements.push(...schema.filter(row => row.type !== 'table').map(row => row.sql));
  statements.push('CREATE TEMP TABLE migration_fk_check (violations INTEGER CHECK(violations = 0))',
    'INSERT INTO migration_fk_check SELECT count(*) FROM pragma_foreign_key_check',
    'DROP TABLE migration_fk_check');
  // One server-side transaction: a failed import leaves the old target intact.
  // migrate() disables foreign keys for table replacement and restores them.
  await client.migrate(statements);
  console.log(`Imported ${statements.length} statements atomically`);

  const results = await client.batch(tables.map(table => `SELECT * FROM ${quote(table.name)}`), 'read');
  const verified = Object.fromEntries(tables.map((table, index) => {
    const rows = results[index].rows.map(row => ({ ...row }));
    const actual = { rows: rows.length, sha256: checksum(rows) };
    if (JSON.stringify(actual) !== JSON.stringify(manifest[table.name])) throw new Error(`Data verification failed for ${table.name}`);
    return [table.name, actual];
  }));
  const foreignKeys = await client.execute('PRAGMA foreign_key_check');
  const integrity = await client.execute('PRAGMA integrity_check');
  if (foreignKeys.rows.length || integrity.rows[0]?.integrity_check !== 'ok') throw new Error('Target integrity check failed');
  await writeFile(join(backupDir, 'verified-target.json'), JSON.stringify({ target: url, verifiedAt: new Date().toISOString(), tables: verified, integrity: 'ok', foreignKeys: 'ok' }, null, 2), { mode: 0o600 });
  console.log(`Verified every row and column in ${tables.length} tables; integrity and foreign keys OK`);
} finally {
  source.close();
  client.close();
}
