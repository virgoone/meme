# Admin MCP server and Sluice covers

## MCP server

The Worker serves a Model Context Protocol endpoint at `POST /api/mcp` (Streamable HTTP, stateless, JSON responses; protocol versions `2025-06-18`, `2025-03-26`, `2024-11-05`). `GET /api/mcp` returns 405 because the server never pushes messages.

### Authorization

- Tokens are created under **Admin → MCP 接入** (`/admin/mcp`). A token is shown once; the server stores only its SHA-256 in the `settings` row `mcp:tokens`, which the general settings API never returns.
- Clients send `Authorization: Bearer meme_mcp_…`. A missing, unknown or revoked token gets 401 with `WWW-Authenticate: Bearer`. Failed attempts are rate-limited per IP (30 per 5 minutes, KV).
- Scopes: `read` (all query tools) and `write` (adds `update_post`). `tools/list` only lists what the token may call.
- Browser requests from an origin outside `SITE_URL`/`TRUSTED_ORIGINS` get 403 (DNS-rebinding protection required by the MCP spec).
- Revoking takes effect on the next request.

### Tools

| Tool | Scope | What it does |
| --- | --- | --- |
| `list_posts` | read | Articles newest first, drafts included; `status`, `query`, `limit`, `offset`; views per article |
| `get_post` | read | Metadata, full text as Markdown, and every block with its `blockId`, type, text and attributes; `includeSlate` adds each block's exact Slate JSON |
| `update_post` | write | Edits through `updateImportedPostBySlug`, the same service as the admin editor |
| `get_site_stats` | read | The dashboard numbers (`getAdminStats`); `includeDaily` adds the series |
| `get_post_stats` | read | Total / 7-day / N-day views with a daily series, reaction counts (KV) and comment count |
| `list_comments`, `list_subscribers`, `list_newsletters`, `list_projects` | read | Existing admin list services |

### Edit semantics

`update_post` changes only the fields it is given:

- `publishedAt` absent keeps the publish state; an ISO time publishes, `null` turns the article into a draft. `readingTime` absent keeps the stored value.
- Body edits are operations on block IDs from `get_post`, applied in order: `set_text` (plain text blocks; a single-leaf block keeps its marks; blocks with links or nested nodes are refused), `set_attributes` (merge, `null` deletes, e.g. image `width`/`align`/`url`), `replace_block` (keeps the block ID), `insert_after` (new ID unless one is given), `delete_block`.
- The body is rebuilt with `postToEditorBlocks` (now in `@meme/editor`, shared with the admin editor). Blocks authored in Slate are written back exactly as stored, so untouched rich text, links, image size/alignment and comment anchors (block IDs) do not change. Imported Portable Text blocks are converted the same way the editor converts them when opened.
- `expectedUpdatedAt` (from `get_post`) refuses the edit when the article was saved in the meantime.

### Connecting

```sh
claude mcp add --transport http meme-blog https://blog.douni.one/api/mcp \
  --header "Authorization: Bearer $MEME_MCP_TOKEN"
```

Clients without remote HTTP support can use `mcp-remote`:

```json
{
  "mcpServers": {
    "meme-blog": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://blog.douni.one/api/mcp", "--header", "Authorization:Bearer ${MEME_MCP_TOKEN}"],
      "env": { "MEME_MCP_TOKEN": "meme_mcp_…" }
    }
  }
}
```

Smoke test:

```sh
curl -s https://blog.douni.one/api/mcp \
  -H "Authorization: Bearer $MEME_MCP_TOKEN" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_site_stats","arguments":{}}}'
```

## Covers generated through Sluice

The editor's **生成封面** card sends a prompt and aspect ratio to `POST /api/admin/covers/generate` (admin session, 20 per 10 minutes per IP). The Worker calls Sluice's OpenAI-compatible `POST {SLUICE_API_BASE_URL}/v1/images/generations` with `{model, prompt, n: 1, size, aspect_ratio, response_format: "b64_json"}` and an `Idempotency-Key` per click, so a retried request reattaches to the same Sluice task. A `url` delivery is downloaded instead. The bytes must be PNG, JPEG or WebP; they are stored in `MEDIA_BUCKET` under `meme-uploads/admin/covers/` and served from `S3_URL_BASE` (default `/api/media/object`).

The result is only a candidate. The article's `mainImageUrl` changes when the author clicks **采用** and saves; `cover_image_url` is then derived by the existing save path. A failed, timed-out or discarded generation leaves the cover untouched. The API key never reaches the browser.

| Variable | Kind | Default | Meaning |
| --- | --- | --- | --- |
| `SLUICE_API_BASE_URL` | var | — | Sluice gateway origin, with or without `/v1` |
| `SLUICE_API_KEY` | **secret** | — | Sluice API key (`wrangler secret put SLUICE_API_KEY`) |
| `SLUICE_IMAGE_MODEL` | var | — | Image model ID the key can call (see `GET /v1/images/models`) |
| `SLUICE_IMAGE_SIZE` | var | `2K` | Resolution tier or `WxH` |
| `SLUICE_IMAGE_ASPECT_RATIO` | var | `16:9` | Default ratio; the editor offers 16:9, 3:2, 4:3, 1:1, 21:9 (the model must support the chosen one) |
| `SLUICE_TIMEOUT_MS` | var | `120000` | Request timeout |

Without the first three, the card shows a "not configured" note and no request is made. Generated images that are never adopted stay in the bucket; clean `meme-uploads/admin/covers/` with a lifecycle rule if needed.
