/**
 * Export legacy Upstash Redis reaction counters to a Cloudflare KV bulk file.
 *
 * Usage:
 *   UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... \
 *     bun scripts/export-upstash-reactions-to-kv-bulk.ts
 *
 * Import:
 *   bunx wrangler kv bulk put data/kv/reactions-bulk.json \
 *     --binding MEME_KV --remote --config wrangler.jsonc
 */

type UpstashResponse<T> = {
  result?: T;
  error?: string;
};

const { dirname } = await import('node:path');
const { mkdir } = await import('node:fs/promises');

type KvBulkItem = {
  key: string;
  value: string;
};

const url = requiredEnv('UPSTASH_REDIS_REST_URL').replace(/\/$/, '');
const token = requiredEnv('UPSTASH_REDIS_REST_TOKEN');
const outputPath =
  process.argv
    .find((arg) => arg.startsWith('--out='))
    ?.slice('--out='.length) ?? 'data/kv/reactions-bulk.json';

const keys = await scanReactionKeys();
const items: KvBulkItem[] = [];

for (const key of keys) {
  const value = await redisCommand<unknown>(['GET', key]);
  const normalized = normalizeReactionValue(value);
  if (!normalized) {
    console.warn(`Skipping ${key}: value is not a reaction array`);
    continue;
  }
  items.push({ key, value: JSON.stringify(normalized) });
}

await mkdir(dirname(outputPath), { recursive: true });
await Bun.write(outputPath, `${JSON.stringify(items, null, 2)}\n`);

console.log(
  `Exported ${items.length} reaction keys to ${outputPath}. ` +
    'Import it with wrangler kv bulk put.',
);

async function scanReactionKeys() {
  const keys = new Set<string>();
  let cursor = '0';

  do {
    const result = await redisCommand<[string, string[]]>([
      'SCAN',
      cursor,
      'MATCH',
      'reactions:*',
      'COUNT',
      '100',
    ]);
    cursor = String(result[0]);
    for (const key of result[1] ?? []) {
      if (key.startsWith('reactions:')) keys.add(key);
    }
  } while (cursor !== '0');

  return [...keys].sort();
}

async function redisCommand<T>(command: string[]): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  const payload = (await response.json()) as UpstashResponse<T>;
  if (!response.ok || payload.error) {
    throw new Error(
      payload.error ?? `Upstash request failed: ${response.status}`,
    );
  }

  return payload.result as T;
}

function normalizeReactionValue(value: unknown) {
  const parsed =
    typeof value === 'string'
      ? safeJsonParse(value)
      : Array.isArray(value)
        ? value
        : null;

  if (
    Array.isArray(parsed) &&
    parsed.length === 4 &&
    parsed.every((item) => Number.isInteger(item) && item >= 0)
  ) {
    return parsed as number[];
  }

  return null;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
