import { createAuth, type Auth } from '@meme/auth/server';

import { getCloudflareRuntimeEnv } from './cloudflare/runtime';

let cached: Auth | null = null;

/** Better Auth instance for the current Worker runtime (built once, cached). */
export function getAuth(): Auth {
  if (!cached) {
    cached = createAuth(getCloudflareRuntimeEnv());
  }
  return cached;
}
