# Admin MCP server and Sluice covers

## MCP server

The Worker serves a Model Context Protocol endpoint at `POST /api/mcp` (Streamable HTTP, stateless, JSON responses). `GET` and `DELETE` return 405 because the server never pushes messages.

### Authorization: Better Auth MCP (OAuth 2.1)

Authorization is Better Auth's official MCP integration, `@better-auth/mcp` 1.7.27 (with `@better-auth/oauth-provider` and the `jwt` plugin, `better-auth` 1.7.27), configured in `packages/auth/src/server.ts`. There is no Meme-specific token, token table or token UI.

- **Discovery.** An unauthenticated call gets `401` with `WWW-Authenticate: Bearer resource_metadata="{origin}/.well-known/oauth-protected-resource/api/mcp", scope="meme:read"`. That RFC 9728 document names the authorization server `{origin}/api/auth`, whose RFC 8414 metadata is at `{origin}/.well-known/oauth-authorization-server/api/auth` (both root `/.well-known/*` paths are routed to Better Auth by the Worker).
- **Registration.** MCP clients register with RFC 7591 dynamic client registration (`allowDynamicClientRegistration` + `allowUnauthenticatedClientRegistration`), because the Workers runtime has no DNS-pinning transport for CIMD documents. Registering alone grants nothing: tokens still require the steps below. Allowed client scopes are limited to `openid profile email offline_access meme:read meme:write`; the default is read-only.
- **Sign-in and consent.** `/oauth2/authorize` (PKCE S256) sends the browser to `/login` with a signed query; the existing email-OTP sign-in carries it (`oauthProviderClient`) and Better Auth resumes the authorization. The consent page `/oauth/consent` lists the requested scopes and posts the decision to `/oauth2/consent`, which records it in `ba_oauth_consent`.
- **Tokens.** Access tokens are JWTs (signed with the `jwt` plugin's key in `ba_jwks`), audience-bound to `{origin}/api/mcp`, valid 15 minutes. With `offline_access` a refresh token (30 days, rotated; Better Auth's MCP default replay window of 30 s for lost responses) is stored in `ba_oauth_refresh_token`.
- **Resource checks.** `requireMcpAuth` verifies signature (in-process JWKS), issuer, audience, expiry and `azp`, and requires `meme:read` in the token. Meme then derives the effective permissions on every call from Better Auth's current state: `sub` must still be a user with `role = admin`; the token's audience must be `{origin}/api/mcp`; and the effective scopes are the token's scopes **intersected with** the scopes of the owner's current consent for that client and resource (consents recording other resources do not count). A token is therefore never widened by a later consent, and an older token cannot regain scopes the current consent no longer grants. `update_post` needs `meme:write` in the effective scopes; otherwise the call is answered `403` with an RFC 6750 `insufficient_scope` challenge (step-up).
- **Revocation semantics.** Disconnecting a client in **Admin → MCP 接入** deletes its consent through Better Auth's `/oauth2/delete-consent`: Meme refuses its next call immediately even though the JWT itself has not expired. If the client is then authorized again with fewer scopes (for example read-only), a still-valid older token that carried `meme:write` is reduced to the new grant. `/oauth2/revoke` (RFC 7009) revokes refresh tokens, so the client cannot renew; an already issued access JWT is not stored and stays cryptographically valid until it expires (at most 15 minutes) unless the consent is also deleted. Demoting the user from admin also takes effect on the next call.
- **Schema.** `packages/db/drizzle/0007_mcp_oauth.sql` adds the provider tables (`ba_jwks`, `ba_oauth_client`, `ba_oauth_resource`, `ba_oauth_client_resource`, `ba_oauth_refresh_token`, `ba_oauth_access_token`, `ba_oauth_consent`, `ba_oauth_client_assertion`), generated from Better Auth's `getAuthTables()`. It must be applied before deploying; this PR does not run it in production.

### Tools

| Tool | Scope | What it does |
| --- | --- | --- |
| `list_posts` | `meme:read` | Articles newest first, drafts included; `status`, `query`, `limit`, `offset`; views per article |
| `get_post` | `meme:read` | Metadata, full text as Markdown, and every block with its `blockId`, type, text and attributes; `includeSlate` adds each block's exact Slate JSON |
| `update_post` | `meme:write` | Edits through `updateImportedPostBySlug`, the same service as the admin editor |
| `get_site_stats` | `meme:read` | The dashboard numbers (`getAdminStats`); `includeDaily` adds the series |
| `get_post_stats` | `meme:read` | Total / 7-day / N-day views with a daily series, reaction counts (KV) and comment count |
| `list_comments`, `list_subscribers`, `list_newsletters`, `list_projects` | `meme:read` | Existing admin list services |

### Edit semantics and client contract

`update_post` changes only the fields it is given:

- `publishedAt` absent keeps the publish state; an ISO time publishes, `null` turns the article into a draft. `readingTime` absent keeps the stored value.
- Body edits are operations on block IDs from `get_post`, applied in order: `set_text` (plain text blocks; a single-leaf block keeps its marks; blocks with links or nested nodes are refused), `set_attributes` (merge, `null` deletes, e.g. image `width`/`align`/`url`), `replace_block` (keeps the block ID), `insert_after`, `delete_block`.
- The body is rebuilt with `postToEditorBlocks` (shared with the admin editor). Blocks authored in Slate are written back exactly as stored; rows whose Slate JSON lacks an internal ID inherit their persisted `block_id`, so comment anchors survive any edit.
- **Concurrency.** Pass `expectedUpdatedAt` from `get_post`. The check is repeated inside the same batch transaction as the article, block and replay-record writes (a guard statement re-inserts the article's primary key when the stored version differs, which aborts the whole batch), so a conflict changes nothing. Versions are strictly increasing per article.
- **Retries.** Pass a new `requestId` (8–64 chars) per intended edit and reuse it only to retry that edit. The result is recorded in the same transaction as the edit (`settings` row `mcp:op:{user}:{client}:{requestId}`). A retry after a lost response returns the original result with `replayed: true` instead of applying again; reusing a `requestId` for different arguments is refused. Inserted blocks get IDs derived from the `requestId`. Without a `requestId`, a client that lost a response should `get_post` and compare `updatedAt` before retrying; with only `expectedUpdatedAt`, a blind retry is rejected as a conflict and changes nothing.

### Connecting

```sh
claude mcp add --transport http meme-blog https://blog.douni.one/api/mcp
# then /mcp in Claude Code and authenticate meme-blog in the browser
```

Clients with remote MCP support use `{ "url": "https://blog.douni.one/api/mcp" }`; others can bridge with `npx -y mcp-remote https://blog.douni.one/api/mcp`.

## Covers generated through Sluice

The editor's **生成封面** card sends a prompt and aspect ratio to `POST /api/admin/covers/generate` (admin session, 20 per 10 minutes per IP). The Worker calls Sluice's OpenAI-compatible `POST {SLUICE_API_BASE_URL}/v1/images/generations` with `{model, prompt, n: 1, size, aspect_ratio, response_format: "b64_json"}` and an `Idempotency-Key` per click, so a retried request reattaches to the same Sluice task. A `url` delivery is downloaded instead. The bytes must be PNG, JPEG or WebP; production uses the same upload client and bucket as editor uploads (the `meme` R2 bucket) and returns its custom domain from `S3_URL_BASE`. Covers use `meme-uploads/admin/covers/`. Local development without a public upload origin uses `MEDIA_BUCKET` and `/api/media/object`.

The result is only a candidate. The article's `mainImageUrl` changes when the author clicks **采用** and saves; `cover_image_url` is then derived by the existing save path. A failed, timed-out or discarded generation leaves the cover untouched. The API key never reaches the browser.

| Variable | Kind | Default | Meaning |
| --- | --- | --- | --- |
| `SLUICE_API_BASE_URL` | var | — | Sluice gateway origin, with or without `/v1` |
| `SLUICE_API_KEY` | **secret** | — | Sluice API key (`wrangler secret put SLUICE_API_KEY`) |
| `SLUICE_IMAGE_MODEL` | var | — | Image model ID the key can call (see `GET /v1/images/models`) |
| `SLUICE_IMAGE_OUTPUT_FORMAT` | var | provider default | Production requests WebP at quality 82. Leave unset for models without WebP support. |
| `SLUICE_IMAGE_SIZE` | var | `2K` | Resolution tier or `WxH` |
| `SLUICE_IMAGE_ASPECT_RATIO` | var | `16:9` | Default ratio; the editor offers 16:9, 3:2, 4:3, 1:1, 21:9 (the model must support the chosen one) |
| `SLUICE_TIMEOUT_MS` | var | `120000` | Request timeout |

Without the first three, the card shows a "not configured" note and no request is made. Generated images that are never adopted stay in the bucket; clean `meme-uploads/admin/covers/` with a lifecycle rule if needed.
