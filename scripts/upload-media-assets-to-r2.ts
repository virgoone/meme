import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

type DownloadSummary = {
  outRoot: string;
  results: DownloadedAsset[];
};

type DownloadedAsset = {
  sanityRef: string;
  sourceUrl: string;
  localPath: string;
  r2Key: string;
  size: number;
  sha1: string;
};

type UploadResult = {
  r2Key: string;
  localPath: string;
  size: number;
  sha1: string;
  contentType: string;
  uploaded: boolean;
  skipped: boolean;
  error: string | null;
};

const args = new Set(process.argv.slice(2));
const mediaRootArg = process.argv.find((arg) =>
  arg.startsWith('--media-root='),
);
const bucketArg = process.argv.find((arg) => arg.startsWith('--bucket='));
const concurrencyArg = process.argv.find((arg) =>
  arg.startsWith('--concurrency='),
);

const mediaRoot = mediaRootArg?.split('=')[1] ?? 'data/media-assets';
const bucket = bucketArg?.split('=')[1] ?? 'meme-assets';
const write = args.has('--write');
const onlyFailed = args.has('--only-failed');
const wranglerBin =
  process.env.WRANGLER_BIN ??
  'node_modules/.bun/wrangler@4.101.0+2c166caaace54588/node_modules/.bin/wrangler';
const concurrency = Math.min(
  Math.max(Number(concurrencyArg?.split('=')[1] ?? 4), 1),
  12,
);

function contentTypeFor(pathname: string): string {
  switch (extname(pathname).toLowerCase()) {
    case '.avif':
      return 'image/avif';
    case '.gif':
      return 'image/gif';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

async function verifyLocalAsset(asset: DownloadedAsset) {
  const bytes = await readFile(asset.localPath);
  const sha1 = createHash('sha1').update(bytes).digest('hex');
  if (bytes.byteLength !== asset.size) {
    throw new Error(
      `${asset.localPath} size changed: expected ${asset.size}, got ${bytes.byteLength}`,
    );
  }
  if (sha1 !== asset.sha1) {
    throw new Error(`${asset.localPath} checksum changed`);
  }
  return { bytes, sha1 };
}

async function uploadAsset(asset: DownloadedAsset): Promise<UploadResult> {
  const { bytes, sha1 } = await verifyLocalAsset(asset);
  const contentType = contentTypeFor(asset.localPath);
  const baseResult = {
    r2Key: asset.r2Key,
    localPath: asset.localPath,
    size: bytes.byteLength,
    sha1,
    contentType,
  };

  if (!write) {
    return {
      ...baseResult,
      uploaded: false,
      skipped: true,
      error: null,
    };
  }

  const proc = Bun.spawn({
    cmd: [
      wranglerBin,
      'r2',
      'object',
      'put',
      `${bucket}/${asset.r2Key}`,
      '--remote',
      '--force',
      '--file',
      asset.localPath,
      '--content-type',
      contentType,
    ],
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr, exitCode] = await readWranglerUpload(proc);

  if (exitCode !== 0 && !stdout.includes('Upload complete.')) {
    return {
      ...baseResult,
      uploaded: false,
      skipped: false,
      error: `${stderr || stdout}`.trim() || `wrangler exited ${exitCode}`,
    };
  }

  return {
    ...baseResult,
    uploaded: true,
    skipped: false,
    error: null,
  };
}

async function readWranglerUpload(
  proc: Bun.Subprocess<'pipe', 'pipe', 'inherit'>,
) {
  const decoder = new TextDecoder();
  let stdout = '';
  let stderr = '';
  let completed = false;

  async function readStream(
    stream: ReadableStream<Uint8Array>,
    append: (text: string) => void,
  ) {
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      append(text);
      if (!completed && stdout.includes('Upload complete.')) {
        completed = true;
        setTimeout(() => proc.kill('SIGINT'), 250);
      }
    }
  }

  const hardTimeout = setTimeout(() => {
    if (!completed) proc.kill('SIGTERM');
  }, 60_000);

  const exitCode = await Promise.all([
    readStream(proc.stdout, (text) => {
      stdout += text;
    }),
    readStream(proc.stderr, (text) => {
      stderr += text;
    }),
    proc.exited,
  ]).then((results) => results[2]);

  clearTimeout(hardTimeout);
  return [stdout, stderr, exitCode] as const;
}

const summary = onlyFailed
  ? ({
      outRoot: mediaRoot,
      results: (
        (await Bun.file(join(mediaRoot, 'r2-upload-summary.json')).json()) as {
          failed: DownloadedAsset[];
        }
      ).failed,
    } satisfies DownloadSummary)
  : ((await Bun.file(
      join(mediaRoot, 'summary.json'),
    ).json()) as DownloadSummary);

const results: UploadResult[] = [];
for (let index = 0; index < summary.results.length; index += concurrency) {
  const batch = summary.results.slice(index, index + concurrency);
  const uploaded = await Promise.all(batch.map((asset) => uploadAsset(asset)));
  results.push(...uploaded);
  console.log(
    `${write ? 'Uploaded' : 'Verified'} ${results.length}/${summary.results.length} media assets`,
  );
}

const failed = results.filter((result) => result.error);
const output = {
  uploadedAt: new Date().toISOString(),
  mode: write ? 'write' : 'dry_run',
  mediaRoot,
  bucket,
  assetCount: summary.results.length,
  uploadedCount: results.filter((result) => result.uploaded).length,
  skippedCount: results.filter((result) => result.skipped).length,
  failedCount: failed.length,
  failed,
  results,
};

await writeFile(
  join(mediaRoot, write ? 'r2-upload-summary.json' : 'r2-upload-dry-run.json'),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      mode: output.mode,
      bucket,
      assetCount: output.assetCount,
      uploadedCount: output.uploadedCount,
      skippedCount: output.skippedCount,
      failedCount: output.failedCount,
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exitCode = 1;
}
