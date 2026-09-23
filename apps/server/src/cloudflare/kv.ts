export type KvRateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
  resetAt: string;
};

export async function incrementKvWindow(
  kv: KVNamespace,
  key: string,
  options: { limit: number; windowSeconds: number },
): Promise<KvRateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / (options.windowSeconds * 1000));
  const windowKey = `rate:${key}:${windowStart}`;
  const current = Number.parseInt((await kv.get(windowKey)) ?? '0', 10);
  const next = current + 1;

  await kv.put(windowKey, String(next), {
    expirationTtl: options.windowSeconds + 5,
  });

  return {
    allowed: next <= options.limit,
    count: next,
    limit: options.limit,
    resetAt: new Date(
      (windowStart + 1) * options.windowSeconds * 1000,
    ).toISOString(),
  };
}
