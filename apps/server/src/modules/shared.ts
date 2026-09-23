import { incrementKvWindow } from '../cloudflare/kv';
import { getCloudflareRuntimeEnv } from '../cloudflare/runtime';

function clientKey(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for') ??
    'unknown'
  );
}

export function clampLimit(
  value: string | number | undefined,
  fallback: number,
) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function rateLimit(
  request: Request,
  key: string,
  options: { limit: number; windowSeconds: number },
) {
  const env = getCloudflareRuntimeEnv();
  const result = await incrementKvWindow(
    env.MEME_KV,
    `${key}:${clientKey(request)}`,
    options,
  );
  if (!result.allowed) {
    return Response.json(
      { error: 'rate_limited', rateLimit: result },
      { status: 429 },
    );
  }
  return null;
}
