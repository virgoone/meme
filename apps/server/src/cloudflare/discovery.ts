/** Root well-known documents served by Better Auth's OAuth provider (MCP). */
export function isOAuthDiscoveryPath(pathname: string) {
  return pathname.startsWith('/.well-known/oauth-authorization-server')
    || pathname.startsWith('/.well-known/oauth-protected-resource')
    || pathname.startsWith('/.well-known/openid-configuration');
}
