import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const chunkDir = process.argv[2] ?? 'data/d1-sql-import/latest-small';
const database = process.argv[3] ?? 'DB';
const remote = process.argv.includes('--remote');
const preview = process.argv.includes('--preview');
const configArg =
  process.argv.find((arg) => arg.startsWith('--config=')) ??
  '--config=wrangler.jsonc';
const wranglerBin =
  process.env.WRANGLER_BIN ??
  'node_modules/.bun/wrangler@4.101.0+2c166caaace54588/node_modules/.bin/wrangler';
const tempDir = await mkdtemp('/tmp/meme-d1-import-');

const files = (await readdir(chunkDir))
  .filter((filename) => filename.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  throw new Error(`No .sql chunks found in ${chunkDir}`);
}

async function executeChunk(file: string, index: number) {
  const filePath = remote
    ? await remoteSafeChunkFile(join(chunkDir, file), file)
    : join(chunkDir, file);
  const args = [
    'd1',
    'execute',
    database,
    configArg,
    '--file',
    filePath,
    ...(remote ? ['--remote'] : []),
    ...(preview ? ['--preview'] : []),
  ];

  const proc = Bun.spawn({
    cmd: [wranglerBin, ...args],
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdoutReader = proc.stdout.getReader();
  const stderrReader = proc.stderr.getReader();
  const decoder = new TextDecoder();
  let stdout = '';
  let stderr = '';
  let finished = false;

  const timeout = setTimeout(() => {
    if (!finished && isSuccessfulOutput(stdout)) {
      proc.kill('SIGINT');
    }
  }, 2500);

  const hardTimeout = setTimeout(() => {
    if (!finished) proc.kill('SIGTERM');
  }, 60_000);

  async function readStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    append: (text: string) => void,
  ) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      append(decoder.decode(value));
      if (isSuccessfulOutput(stdout) && !finished) {
        setTimeout(() => proc.kill('SIGINT'), 250);
      }
    }
  }

  await Promise.all([
    readStream(stdoutReader, (text) => {
      stdout += text;
    }),
    readStream(stderrReader, (text) => {
      stderr += text;
    }),
    proc.exited,
  ]);

  finished = true;
  clearTimeout(timeout);
  clearTimeout(hardTimeout);

  if (!isSuccessfulOutput(stdout)) {
    throw new Error(
      `Failed to import ${filePath}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
    );
  }

  console.log(`Imported ${index + 1}/${files.length}: ${file}`);
}

async function remoteSafeChunkFile(sourcePath: string, filename: string) {
  const source = await readFile(sourcePath, 'utf8');
  const stripped = source
    .split('\n')
    .filter((line) => {
      const normalized = line.trim().toUpperCase();
      return (
        normalized !== 'PRAGMA FOREIGN_KEYS = OFF;' &&
        normalized !== 'BEGIN TRANSACTION;' &&
        normalized !== 'COMMIT;'
      );
    })
    .join('\n');
  const tempPath = join(tempDir, filename);
  await writeFile(tempPath, `${stripped.trim()}\n`);
  return tempPath;
}

function isSuccessfulOutput(output: string): boolean {
  return output.includes('"success": true') || output.includes('Executed ');
}

for (const [index, file] of files.entries()) {
  await executeChunk(file, index);
}
