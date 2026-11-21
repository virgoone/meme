/**
 * Puts the pinned editor widget build (virgoone/editor-widget `dist/`) into
 * `public/editor-widget/<commit>/`, so Vite ships it with the site and the admin
 * editor loads it from the same origin instead of a CDN.
 *
 * The commit and a digest of the extracted files live in editor-widget.lock.json.
 * The digest covers every `dist/` path and file hash (not the archive bytes,
 * which GitHub does not keep stable), so a changed or tampered build fails the
 * build. A matching copy already in place is reused without network access.
 *
 * To update: set `commit`, run with UPDATE_EDITOR_WIDGET_LOCK=1, review the diff.
 */
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const root = join(import.meta.dir, '..');
const lockPath = join(root, 'editor-widget.lock.json');
const lock = JSON.parse(await readFile(lockPath, 'utf8')) as { repository: string; commit: string; distSha256: string };
const target = join(root, 'public', 'editor-widget', lock.commit.slice(0, 12));
const marker = join(target, '.dist-sha256');
const update = process.env.UPDATE_EDITOR_WIDGET_LOCK === '1';

async function files(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await files(path));
    else if (entry.name !== '.dist-sha256') out.push(path);
  }
  return out;
}

async function digest(dir: string) {
  const lines = [];
  for (const path of (await files(dir)).sort()) {
    const hash = createHash('sha256').update(await readFile(path)).digest('hex');
    lines.push(`${relative(dir, path).split('\\').join('/')}\t${hash}\n`);
  }
  return createHash('sha256').update(lines.join('')).digest('hex');
}

if (!update) {
  const present = await readFile(marker, 'utf8').catch(() => '');
  if (present.trim() === lock.distSha256 && (await digest(target)) === lock.distSha256) {
    console.log(`editor widget ${lock.commit.slice(0, 12)} already in place`);
    process.exit(0);
  }
}

const work = await mkdtemp(join(tmpdir(), 'editor-widget-'));
try {
  const url = `https://codeload.github.com/${lock.repository}/tar.gz/${lock.commit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed: ${response.status} ${url}`);
  const archive = join(work, 'widget.tar.gz');
  await writeFile(archive, new Uint8Array(await response.arrayBuffer()));
  const tar = Bun.spawnSync(['tar', '-xzf', archive, '-C', work]);
  if (tar.exitCode !== 0) throw new Error(`tar failed: ${tar.stderr.toString()}`);
  const extracted = (await readdir(work, { withFileTypes: true })).find((entry) => entry.isDirectory());
  if (!extracted) throw new Error('archive has no top-level directory');
  const dist = join(work, extracted.name, 'dist');
  await stat(join(dist, 'web-component.js'));
  const actual = await digest(dist);
  if (update) {
    await writeFile(lockPath, `${JSON.stringify({ ...lock, distSha256: actual }, null, 2)}\n`);
    console.log(`editor-widget.lock.json updated: ${actual}`);
  } else if (actual !== lock.distSha256) {
    throw new Error(`editor widget dist digest mismatch: expected ${lock.distSha256}, got ${actual}`);
  }
  await rm(join(root, 'public', 'editor-widget'), { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(dist, target, { recursive: true });
  await writeFile(marker, `${actual}\n`);
  console.log(`editor widget ${lock.commit.slice(0, 12)} copied to public/editor-widget`);
} finally {
  await rm(work, { recursive: true, force: true });
}
