import { isAllowedOrigin } from '@meme/shared';
import { createInsufficientScopeError, MCP_RESOURCE_PATH, MCP_SCOPES, requireMcpAuth } from '@meme/auth/server';
import { Elysia } from 'elysia';

import { getAuth } from '../../auth';
import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import type { WorkerEnv } from '../../env';
import { MCP_TOOLS, type McpTool, ToolInputError } from './tools';

/**
 * Model Context Protocol server over Streamable HTTP (stateless, JSON replies).
 *
 * Authorization is Better Auth's MCP plugin (@better-auth/mcp, an OAuth 2.1
 * provider): clients discover it through RFC 9728/8414 metadata, register,
 * sign the owner in with the site's email-OTP login, ask for consent and receive
 * an audience-bound JWT access token. `requireMcpAuth` verifies that token
 * (signature against the in-process JWKS, issuer, audience = this endpoint,
 * expiry, `azp`) and answers unauthenticated calls with the RFC 9728 challenge.
 *
 * The business layer then maps the token to a person: `sub` must still be an
 * admin, the (user, client) consent must still exist (deleting it is an immediate
 * disconnect), and each tool needs its scope: `meme:read` for queries,
 * `meme:write` for edits (missing write scope -> 403 insufficient_scope).
 */
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'] as const;
const SERVER_INFO = { name: 'meme-blog', title: 'Meme blog admin', version: '2.0.0' };
const INSTRUCTIONS = [
  'Tools for the owner of the Meme blog (blog.douni.one).',
  'Read with list_posts / get_post; edit with update_post using block operations on the blockIds returned by get_post. Pass expectedUpdatedAt and a requestId for safe retries.',
  'Unnamed blocks and the publish status are kept as they are. Statistics come from get_site_stats and get_post_stats.',
].join(' ');

type JsonRpcId = string | number | null;
type JsonRpcRequest = { jsonrpc?: unknown; id?: JsonRpcId; method?: unknown; params?: unknown };

/** The authenticated caller, resolved from verified token claims. */
export type McpPrincipal = { userId: string; clientId: string; scopes: ReadonlySet<string> };

const rpcError = (id: JsonRpcId, code: number, message: string, data?: unknown) => ({ jsonrpc: '2.0' as const, id, error: { code, message, ...(data === undefined ? {} : { data }) } });
const rpcResult = (id: JsonRpcId, result: unknown) => ({ jsonrpc: '2.0' as const, id, result });

/** The canonical MCP resource URL, the audience of every access token. */
export function mcpResource(env: WorkerEnv) {
  const base = (env.BETTER_AUTH_URL?.trim() || env.SITE_URL?.trim() || 'http://127.0.0.1:3000').replace(/\/+$/, '');
  return `${new URL(base).origin}${MCP_RESOURCE_PATH}`;
}

/** Entry point: origin check, Better Auth token verification, then JSON-RPC. */
export async function handleMcpHttp(request: Request, env: WorkerEnv, bodyText?: string): Promise<Response> {
  const origin = request.headers.get('origin');
  // Streamable HTTP servers must reject foreign browser origins (DNS rebinding).
  if (origin && !isAllowedOrigin(origin, env)) {
    return Response.json(rpcError(null, -32000, 'Origin not allowed'), { status: 403, headers: { 'cache-control': 'no-store' } });
  }
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST', 'cache-control': 'no-store' } });
  const replay = new Request(request.url, { method: 'POST', headers: request.headers, body: bodyText ?? await request.text() });
  const protectedHandler = requireMcpAuth(getAuth(), async (verified, claims) => {
    const principal = await resolvePrincipal(env, claims as Record<string, unknown>);
    if (principal instanceof Response) return principal;
    return handleMcpRequest(await verified.text(), env, principal);
  }, { resource: mcpResource(env), requiredScopes: [MCP_SCOPES.read] });
  return protectedHandler(replay);
}

/** Better Auth stores string arrays as JSON text on SQLite; accept that or a space/comma list. */
function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string' || !value.trim()) return [];
  const text = value.trim();
  if (text.startsWith('[')) {
    try { return parseList(JSON.parse(text)); } catch { return []; }
  }
  return text.split(/[\s,]+/).filter(Boolean);
}

/**
 * Turns verified token claims into the caller's effective permissions. The
 * token alone is not enough: its scopes are intersected with what the owner has
 * currently granted this client for this resource (Better Auth's consent rows).
 * So after a disconnect and a new read-only authorization, an older still-valid
 * token that carried meme:write is reduced to read access, and a token whose
 * audience or consent does not cover this MCP resource is refused.
 */
export async function resolvePrincipal(env: WorkerEnv, claims: Record<string, unknown>): Promise<McpPrincipal | Response> {
  const resource = mcpResource(env);
  const userId = typeof claims.sub === 'string' ? claims.sub : '';
  const clientId = typeof claims.azp === 'string' ? claims.azp : typeof claims.client_id === 'string' ? claims.client_id : '';
  const tokenScopes = new Set(parseList(claims.scope));
  const audiences = parseList(claims.aud);
  const deny = (status: number, message: string, challenge?: string) => Response.json(rpcError(null, -32001, message), {
    status,
    headers: { 'cache-control': 'no-store', ...(challenge ? { 'www-authenticate': challenge, 'access-control-expose-headers': 'WWW-Authenticate' } : {}) },
  });
  if (!userId || !clientId) return deny(401, 'Unauthorized: the token has no subject or client');
  if (audiences.length && !audiences.includes(resource)) return deny(401, 'Unauthorized: the token was not issued for this MCP resource');

  const rows = await env.DB.prepare(`
    SELECT u.role AS role, c.id AS consent_id, c.scopes AS scopes, c.resources AS resources
    FROM ba_user u LEFT JOIN ba_oauth_consent c ON c.user_id = u.id AND c.client_id = ?
    WHERE u.id = ?`).bind(clientId, userId).all<{ role: string | null; consent_id: string | null; scopes: unknown; resources: unknown }>();
  const user = rows.results[0];
  if (!user) return deny(401, 'Unauthorized: the account behind this token no longer exists');
  if (user.role !== 'admin') return deny(403, 'Forbidden: MCP access requires a Meme admin account');

  // A consent applies when it names this resource, or names none (granted before
  // resources were recorded).
  const granted = new Set<string>();
  let applicable = 0;
  for (const row of rows.results) {
    if (!row.consent_id) continue;
    const resources = parseList(row.resources);
    if (resources.length && !resources.includes(resource)) continue;
    applicable += 1;
    for (const scope of parseList(row.scopes)) granted.add(scope);
  }
  if (applicable === 0) return deny(401, 'Unauthorized: this client was disconnected; authorize again');

  const scopes = new Set([...tokenScopes].filter((scope) => granted.has(scope)));
  if (!scopes.has(MCP_SCOPES.read)) {
    return deny(403, 'Forbidden: the current authorization does not include meme:read', `Bearer error="insufficient_scope", scope="${MCP_SCOPES.read}"`);
  }
  return { userId, clientId, scopes };
}

export async function handleMcpRequest(bodyText: string, env: WorkerEnv, principal: McpPrincipal): Promise<Response> {
  const headers = { 'cache-control': 'no-store' };
  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return Response.json(rpcError(null, -32700, 'Parse error'), { status: 400, headers });
  }
  const messages = Array.isArray(payload) ? payload : [payload];
  if (messages.length === 0 || messages.length > 20) return Response.json(rpcError(null, -32600, 'Invalid Request'), { status: 400, headers });
  const replies = [];
  for (const message of messages) {
    const reply = await handleMessage(message as JsonRpcRequest, env, principal);
    if (reply) replies.push(reply);
  }
  if (replies.length === 0) return new Response(null, { status: 202, headers });
  return Response.json(Array.isArray(payload) ? replies : replies[0], { headers });
}

const toolScope = (tool: McpTool) => (tool.scope === 'write' ? MCP_SCOPES.write : MCP_SCOPES.read);

async function handleMessage(message: JsonRpcRequest, env: WorkerEnv, principal: McpPrincipal) {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') return rpcError(null, -32600, 'Invalid Request');
  const isNotification = !('id' in message) || message.id === undefined;
  if (typeof message.method !== 'string') return isNotification ? null : rpcError(message.id ?? null, -32600, 'Invalid Request');
  if (isNotification) return null;
  const id = message.id ?? null;
  const params = (message.params && typeof message.params === 'object' ? message.params : {}) as Record<string, unknown>;

  switch (message.method) {
    case 'initialize': {
      const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
      const protocolVersion = (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0];
      return rpcResult(id, { protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS });
    }
    case 'ping':
      return rpcResult(id, {});
    case 'tools/list':
      return rpcResult(id, {
        tools: MCP_TOOLS.filter((tool) => principal.scopes.has(toolScope(tool))).map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })),
      });
    case 'tools/call': {
      const tool = MCP_TOOLS.find((entry) => entry.name === params.name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${String(params.name)}`);
      // A tool outside the granted scopes is an OAuth step-up: requireMcpAuth turns
      // this into 403 + WWW-Authenticate insufficient_scope naming the scope.
      if (!principal.scopes.has(toolScope(tool))) throw createInsufficientScopeError([toolScope(tool)]);
      const args = params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments) ? params.arguments as Record<string, unknown> : {};
      try {
        const result = await tool.run(env, args, { actor: `${principal.userId}:${principal.clientId}` });
        const structured = Array.isArray(result) ? { items: result } : result as Record<string, unknown>;
        return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }], structuredContent: structured });
      } catch (error) {
        if (error instanceof ToolInputError) return rpcResult(id, toolError(error.message));
        console.error('mcp tool failed', tool.name, error);
        return rpcResult(id, toolError('The tool failed on the server. Try again later.'));
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${message.method}`);
  }
}

function toolError(text: string) {
  return { content: [{ type: 'text', text }], isError: true };
}

export const mcpModule = new Elysia()
  .post('/mcp', ({ request, body }) => handleMcpHttp(request, getCloudflareRuntimeEnv(), typeof body === 'string' ? body : undefined), { parse: 'text' })
  .get('/mcp', ({ request }) => handleMcpHttp(request, getCloudflareRuntimeEnv()))
  .delete('/mcp', ({ request }) => handleMcpHttp(request, getCloudflareRuntimeEnv()));
