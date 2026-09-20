import { Database } from 'bun:sqlite';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const exportDir = process.argv[2];
const sqlitePath = process.argv[3] ?? 'data/local/meme-d1.sqlite';

if (!exportDir) {
  throw new Error(
    'Usage: bun run scripts/import-turso-export-to-sqlite.ts <data/turso-export/timestamp> [data/local/meme-d1.sqlite]',
  );
}

const tables = [
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

type CommentRow = {
  id: number;
  post_id?: string;
  body?: string;
};

type CommentBody = {
  blockId?: string;
  text?: string;
};

async function readRows(table: string): Promise<Record<string, unknown>[]> {
  return JSON.parse(
    await readFile(join(exportDir, `${table}.json`), 'utf8'),
  ) as Record<string, unknown>[];
}

function insertRows(
  db: Database,
  table: string,
  rows: Record<string, unknown>[],
): number {
  if (rows.length === 0) return 0;

  const columns = Object.keys(rows[0] ?? {});
  if (columns.length === 0) return 0;

  const quotedColumns = columns.map((column) => `\`${column}\``).join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const statement = db.prepare(
    `insert into \`${table}\` (${quotedColumns}) values (${placeholders})`,
  );

  for (const row of rows) {
    statement.run(...columns.map((column) => row[column] ?? null));
  }

  return rows.length;
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

const db = new Database(sqlitePath, { create: true });
const imported: Record<string, number> = {};
const rowsByTable = new Map<string, Record<string, unknown>[]>();

for (const table of tables) {
  rowsByTable.set(table, await readRows(table));
}

db.transaction(() => {
  db.exec('PRAGMA foreign_keys = OFF');

  for (const table of tables) {
    db.prepare(`delete from \`${table}\``).run();
  }

  for (const table of [...tables].reverse()) {
    const rows = rowsByTable.get(table) ?? [];
    imported[table] = insertRows(db, table, rows);
  }

  db.prepare('delete from comment_anchors').run();
  const comments = (rowsByTable.get('comments') ?? []) as CommentRow[];
  const insertCommentAnchor = db.prepare(`
    INSERT INTO comment_anchors (
      id,
      comment_id,
      post_id,
      block_id,
      quote,
      range_json,
      anchor_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let commentAnchors = 0;
  for (const comment of comments) {
    if (!comment.id || !comment.post_id) continue;

    const post = db
      .query('select id from imported_posts where sanity_id = ? limit 1')
      .get(comment.post_id) as { id: string } | null;
    const body = parseCommentBody(comment.body);
    const blockId = body?.blockId ?? null;
    const block =
      post && blockId
        ? (db
            .query(
              'select block_id from post_blocks where post_id = ? and block_id = ? limit 1',
            )
            .get(post.id, blockId) as { block_id: string } | null)
        : null;
    const anchorStatus = block ? 'block' : blockId ? 'missing' : 'post_level';

    insertCommentAnchor.run(
      `comment_anchor_${comment.id}`,
      comment.id,
      post?.id ?? comment.post_id,
      blockId,
      body?.text ?? null,
      null,
      anchorStatus,
    );
    commentAnchors += 1;
  }
  imported.comment_anchors = commentAnchors;

  db.prepare(`
    INSERT INTO migration_runs (
      id,
      source,
      mode,
      status,
      summary_json,
      completed_at
    )
    VALUES (?, 'turso', 'write', 'completed', ?, CURRENT_TIMESTAMP)
  `).run(
    `turso_${Date.now()}`,
    JSON.stringify({
      exportDir,
      imported,
    }),
  );

  db.exec('PRAGMA foreign_keys = ON');
})();

console.log(
  JSON.stringify(
    {
      sqlitePath,
      imported,
    },
    null,
    2,
  ),
);
