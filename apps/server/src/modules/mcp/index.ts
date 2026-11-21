import { isAllowedOrigin } from '@meme/shared';
import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import type { WorkerEnv } from '../../env';
import { AuthPlugin } from '../../plugins/auth';
import { rateLimit } from '../shared';
import { authenticateMcpToken, bearerToken, createMcpToken, listMcpTokens, revokeMcpToken, type StoredMcpToken } from './tokens';
import { MCP_TOOLS, ToolInputError } from './tools';

/**
 * Model Context Protocol server over Streamable HTTP (stateless, JSON replies).
 * Clients POST JSON-RPC to /api/mcp with `Authorization: Bearer meme_mcp_…`.
 * No server-initiated messages exist, so GET (the SSE stream) is 405.
 */
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'] as const;
const SERVER_INFO = { name: 'meme-blog', title: 'Meme blog admin', version: '1.0.0' };
const INSTRUCTIONS = [
  'Tools for the owner of the Meme blog (blog.douni.one).',
  'Read with list_posts / get_post; edit with update_post using block operations on the blockIds returned by get_post, and pass expectedUpdatedAt.',
  'Unnamed blocks and the publish status are kept as they are. Statistics come from get_site_stats and get_post_stats.',
].join(' ');

type JsonRpcId = string | number | null;
type JsonRpcRequest = { jsonrpc?: unknown; id?: JsonRpcId; method?: unknown; params?: unknown };

const rpcError = (id: JsonRpcId, code: number, message: string, data?: unknown) => ({ jsonrpc: '2.0' as const, id, error: { code, message, ...(data === undefined ? {} : { data }) } });
const rpcResult = (id: JsonRpcId, result: unknown) => ({ jsonrpc: '2.0' as const, id, result });

export async function handleMcpRequest(request: Request, env: WorkerEnv, bodyText?: unknown): Promise<Response> {
  const headers = { 'cache-control': 'no-store' };
  const origin = request.headers.get('origin');
  // Streamable HTTP servers must reject foreign browser origins (DNS rebinding).
  if (origin && !isAllowedOrigin(origin, env)) {
    return Response.json(rpcError(null, -32000, 'Origin not allowed'), { status: 403, headers });
  }
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { ...headers, allow: 'POST' } });
  }

  const token = await authenticateMcpToken(env, bearerToken(request));
  if (!token) {
    const limited = await rateLimit(request, 'mcp-auth-failure', { limit: 30, windowSeconds: 300 });
    if (limited) return limited;
    return Response.json(rpcError(null, -32001, 'Unauthorized: send Authorization: Bearer <MCP token> created under Admin → Settings → MCP'), {
      status: 401,
      headers: { ...headers, 'www-authenticate': 'Bearer realm="meme-mcp"' },
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(typeof bodyText === 'string' ? bodyText : await request.text());
  } catch {
    return Response.json(rpcError(null, -32700, 'Parse error'), { status: 400, headers });
  }

  const messages = Array.isArray(payload) ? payload : [payload];
  if (messages.length === 0 || messages.length > 20) {
    return Response.json(rpcError(null, -32600, 'Invalid Request'), { status: 400, headers });
  }
  const replies = [];
  for (const message of messages) {
    const reply = await handleMessage(message as JsonRpcRequest, env, token);
    if (reply) replies.push(reply);
  }
  // Notifications and responses only: accepted, nothing to say.
  if (replies.length === 0) return new Response(null, { status: 202, headers });
  return Response.json(Array.isArray(payload) ? replies : replies[0], { headers });
}

async function handleMessage(message: JsonRpcRequest, env: WorkerEnv, token: StoredMcpToken) {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') return rpcError(null, -32600, 'Invalid Request');
  const isNotification = !('id' in message) || message.id === undefined;
  // A client's reply to a server request; this server never sends any.
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
        tools: MCP_TOOLS.filter((tool) => token.scopes.includes(tool.scope)).map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })),
      });
    case 'tools/call': {
      const tool = MCP_TOOLS.find((entry) => entry.name === params.name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${String(params.name)}`);
      if (!token.scopes.includes(tool.scope)) {
        return rpcResult(id, toolError(`This token has no "${tool.scope}" permission. Create a token with write access in Admin → Settings → MCP.`));
      }
      const args = params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments) ? params.arguments as Record<string, unknown> : {};
      try {
        const result = await tool.run(env, args);
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
  .use(AuthPlugin)
  .post('/mcp', ({ request, body }) => handleMcpRequest(request, getCloudflareRuntimeEnv(), body), { parse: 'text' })
  .get('/mcp', ({ request }) => handleMcpRequest(request, getCloudflareRuntimeEnv()))
  .delete('/mcp', ({ request }) => handleMcpRequest(request, getCloudflareRuntimeEnv()))
  .get('/admin/mcp/tokens', ({ set }) => {
    set.headers['cache-control'] = 'private, no-store';
    return listMcpTokens(getCloudflareRuntimeEnv());
  }, { admin: true })
  .post('/admin/mcp/tokens', async ({ body, set }) => {
    set.headers['cache-control'] = 'private, no-store';
    set.status = 201;
    return createMcpToken(getCloudflareRuntimeEnv(), (body ?? {}) as { name?: unknown; scopes?: unknown });
  }, { admin: true })
  .delete('/admin/mcp/tokens/:id', ({ params }) => revokeMcpToken(getCloudflareRuntimeEnv(), params.id), { admin: true });
