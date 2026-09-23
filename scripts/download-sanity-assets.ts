import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

type PreparedAsset = {
  sanityAssetId: string;
  sanityRef: string;
  sourceUrl: string;
  r2Key: string;
  size: number | null;
  checksum: string | null;
};

const preparedDir = process.argv[2];
const outRoot = process.argv[3] ?? 'data/media-assets';

if (!preparedDir) {
  throw new Error(
    'Usage: bun run scripts/download-sanity-assets.ts <data/d1-import/timestamp> [data/media-assets]',
  );
}

const assets = (await Bun.file(
  join(preparedDir, 'post_assets.json'),
).json()) as PreparedAsset[];
const results: {
  sanityRef: string;
  sourceUrl: string;
  localPath: string;
  r2Key: string;
  size: number;
  sha1: string;
  sizeMatches: boolean | null;
  checksumMatches: boolean | null;
  warning: string | null;
}[] = [];

async function downloadAsset(asset: PreparedAsset) {
  const localPath = join(outRoot, asset.r2Key);
  let bytes: Uint8Array;

  try {
    bytes = await readFile(localPath);
  } catch {
    const response = await fetch(asset.sourceUrl, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to download ${asset.sourceUrl}: ${response.status} ${response.statusText}`,
      );
    }

    bytes = new Uint8Array(await response.arrayBuffer());
    await mkdir(dirname(localPath), { recursive: true });
    await writeFile(localPath, bytes);
  }

  const sha1 = createHash('sha1').update(bytes).digest('hex');
  const sizeMatches =
    asset.size === null ? null : asset.size === bytes.byteLength;
  const checksumMatches =
    asset.checksum === null ? null : asset.checksum === sha1;
  const warning =
    sizeMatches === false || checksumMatches === false
      ? 'Downloaded CDN bytes differ from Sanity metadata; keeping downloaded bytes and preserving original metadata for R2 sync.'
      : null;

  return {
    sanityRef: asset.sanityRef,
    sourceUrl: asset.sourceUrl,
    localPath,
    r2Key: asset.r2Key,
    size: bytes.byteLength,
    sha1,
    sizeMatches,
    checksumMatches,
    warning,
  };
}

const concurrency = 8;
for (let index = 0; index < assets.length; index += concurrency) {
  const batch = assets.slice(index, index + concurrency);
  const downloaded = await Promise.all(
    batch.map((asset) => downloadAsset(asset)),
  );
  results.push(...downloaded);
  console.log(`Downloaded ${results.length}/${assets.length} Sanity assets`);
}

const failed = results.filter((result) => result.size <= 0);
const warnings = results.filter((result) => result.warning);
const summary = {
  downloadedAt: new Date().toISOString(),
  preparedDir,
  outRoot,
  assetCount: assets.length,
  downloadedCount: results.length,
  failedCount: failed.length,
  warningCount: warnings.length,
  failed,
  warnings,
  results,
};

await mkdir(outRoot, { recursive: true });
await writeFile(
  join(outRoot, 'summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      outRoot,
      assetCount: assets.length,
      downloadedCount: results.length,
      failedCount: failed.length,
      warningCount: warnings.length,
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exitCode = 1;
}
