import type { WorkerEnv } from '../../env';
import { AppError } from '../../middleware/errorHandler';

/**
 * MCP access tokens. Only a SHA-256 of each token is stored, in one settings
 * row (`mcp:tokens`) that the general settings API never returns. A token is
 * shown once, when it is created; afterwards only its prefix is visible.
 */
export const MCP_TOKENS_KEY = 'mcp:tokens';
export const MCP_TOKEN_PREFIX = 'meme_mcp_';
const MAX_TOKENS = 20;
/** `lastUsedAt` is written at most this often per token, to keep reads cheap. */
const LAST_USED_WRITE_INTERVAL_MS = 5 * 60_000;

export type McpScope = 'read' | 'write';

export type StoredMcpToken = {
  id: string;
  name: string;
  /** First characters of the token, for recognising it in the list. */
  prefix: string;
  hash: string;
  scopes: McpScope[];
  createdAt: string;
  lastUsedAt: string | null;
};

export type McpTokenSummary = Omit<StoredMcpToken, 'hash'>;

export async function readMcpTokens(env: WorkerEnv): Promise<StoredMcpToken[]> {
  const rows = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(MCP_TOKENS_KEY).all<{ value: string }>();
  const raw = rows.results[0]?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isStoredToken) : [];
  } catch {
    return [];
  }
}

async function writeMcpTokens(env: WorkerEnv, tokens: StoredMcpToken[]) {
  await env.DB.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).bind(MCP_TOKENS_KEY, JSON.stringify(tokens)).all();
}

export function summarizeToken(token: StoredMcpToken): McpTokenSummary {
  const { hash: _hash, ...summary } = token;
  return summary;
}

export async function listMcpTokens(env: WorkerEnv): Promise<McpTokenSummary[]> {
  return (await readMcpTokens(env)).map(summarizeToken);
}

export async function createMcpToken(env: WorkerEnv, input: { name?: unknown; scopes?: unknown }) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 60) throw AppError.badRequest('请填写 1 到 60 个字符的令牌名称');
  const scopes = normalizeScopes(input.scopes);
  const tokens = await readMcpTokens(env);
  if (tokens.length >= MAX_TOKENS) throw AppError.badRequest(`最多保留 ${MAX_TOKENS} 个令牌，请先撤销不用的令牌`);

  const secret = `${MCP_TOKEN_PREFIX}${randomBase64Url(32)}`;
  const token: StoredMcpToken = {
    id: crypto.randomUUID(),
    name,
    prefix: secret.slice(0, MCP_TOKEN_PREFIX.length + 6),
    hash: await sha256Hex(secret),
    scopes,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
  await writeMcpTokens(env, [...tokens, token]);
  return { token: secret, record: summarizeToken(token) };
}

export async function revokeMcpToken(env: WorkerEnv, id: string) {
  const tokens = await readMcpTokens(env);
  const next = tokens.filter((token) => token.id !== id);
  if (next.length === tokens.length) throw AppError.notFound('令牌不存在');
  await writeMcpTokens(env, next);
  return { revoked: true };
}

/** Resolves a bearer token to its record, or null. Constant work per stored token. */
export async function authenticateMcpToken(env: WorkerEnv, secret: string | null): Promise<StoredMcpToken | null> {
  if (!secret?.startsWith(MCP_TOKEN_PREFIX) || secret.length > 200) return null;
  const hash = await sha256Hex(secret);
  const tokens = await readMcpTokens(env);
  const token = tokens.find((entry) => timingSafeEqual(entry.hash, hash));
  if (!token) return null;
  const lastUsed = token.lastUsedAt ? Date.parse(token.lastUsedAt) : 0;
  if (!Number.isFinite(lastUsed) || Date.now() - lastUsed > LAST_USED_WRITE_INTERVAL_MS) {
    const now = new Date().toISOString();
    // Best effort: a lost race only delays the "last used" display.
    await writeMcpTokens(env, tokens.map((entry) => entry.id === token.id ? { ...entry, lastUsedAt: now } : entry)).catch(() => undefined);
    return { ...token, lastUsedAt: now };
  }
  return token;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

function normalizeScopes(value: unknown): McpScope[] {
  if (value === undefined) return ['read'];
  if (!Array.isArray(value) || value.some((scope) => scope !== 'read' && scope !== 'write')) {
    throw AppError.badRequest('权限只能是 read 或 write');
  }
  const scopes = new Set<McpScope>(['read', ...(value as McpScope[])]);
  return [...scopes];
}

function isStoredToken(value: unknown): value is StoredMcpToken {
  const token = value as Partial<StoredMcpToken> | null;
  return !!token && typeof token.id === 'string' && typeof token.hash === 'string' && Array.isArray(token.scopes);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomBase64Url(bytes: number) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = '';
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}
