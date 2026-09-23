/**
 * Origin / CORS helpers shared between the Better Auth config (trustedOrigins)
 * and the Worker CORS middleware. Migrated from the fluxship/shortdrama
 * `shared` package, trimmed to what meme needs.
 */

export const DEFAULT_SITE_URL = 'http://localhost:3000';

export type OriginEnv = {
  APP_ENV?: string;
  SITE_URL?: string;
  BETTER_AUTH_URL?: string;
  TRUSTED_ORIGINS?: string;
};

export function getOrigin(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function parseOriginList(value?: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/** Glob match (`*` wildcard), used for patterns like `https://*.example.com`. */
export function matchesPattern(sample: string, pattern: string): boolean {
  if (!pattern.includes('*')) return sample === pattern;
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(sample);
}

function isDevelopment(env: OriginEnv): boolean {
  return env.APP_ENV === 'development';
}

/** Static list of explicitly trusted origins (site + auth base + TRUSTED_ORIGINS). */
export function trustedOriginList(env: OriginEnv): string[] {
  const site = getOrigin(env.SITE_URL) ?? DEFAULT_SITE_URL;
  const authBase = getOrigin(env.BETTER_AUTH_URL ?? env.SITE_URL) ?? site;
  return Array.from(
    new Set([site, authBase, ...parseOriginList(env.TRUSTED_ORIGINS)]),
  );
}

/**
 * Better Auth `trustedOrigins`: static list in prod; in dev, also accept any
 * localhost / 127.0.0.1 origin (any port) from the request.
 */
export function resolveTrustedOrigins(
  env: OriginEnv,
): string[] | ((request?: Request) => string[]) {
  const list = trustedOriginList(env);
  if (!isDevelopment(env)) return list;
  return (request?: Request) => {
    const origin = request?.headers?.get('origin') ?? '';
    return origin && isLocalhostOrigin(origin) ? [...list, origin] : list;
  };
}

/** Whether an Origin header should be allowed by CORS. */
export function isAllowedOrigin(
  origin: string | undefined | null,
  env: OriginEnv,
): boolean {
  if (!origin) return false;
  if (isDevelopment(env) && isLocalhostOrigin(origin)) return true;
  const list = trustedOriginList(env);
  return list.some(
    (allowed) => allowed === origin || matchesPattern(origin, allowed),
  );
}
