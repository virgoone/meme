# Cloudflare Stack Migration Plan

This plan moves the project from the current single-package Next.js + Sanity + Turso + Upstash shape to a Better-T-Stack-style Bun/Turbo monorepo with TanStack Start, Cloudflare Workers, D1, KV, R2, Drizzle, and a Slate/Plate editor model compatible with the block-id comment flow used in `../fluxship`.

The migration is data-first. No public cutover is allowed until the Sanity export, media copy, D1 import, block ids, and comment anchors are verified against production data.

## Current Evidence

- The app is currently a single package with `next`, `next-sanity`, `sanity`, `@libsql/client`, Turso env vars, and Upstash Redis in the root `package.json`.
- Runtime data access uses `db/index.ts` with `drizzle-orm/libsql` and `TURSO_DB_URL` / `TURSO_DB_AUTH_TOKEN`. Migration must switch this to `drizzle-orm/d1` (Worker) plus a local SQLite driver for `bun run dev`.
- Sanity content lives in `sanity/schemas/post.ts`, `sanity/schemas/blockContent.ts`, `sanity/queries.ts`, and the embedded studio route under `app/studio`.
- Current post body content is Sanity Portable Text. Every Portable Text block already has a stable `_key`; this must become the canonical imported `blockId`.
- `../shortdrama-studio` uses the target repo shape: `apps/web`, `apps/server`, `packages/db`, `packages/auth`, `packages/shared`, root `turbo.json`, root `wrangler.jsonc`, and a Worker routing `/api/*`.
- `../fluxship` current branch has the desired editor semantics: AI comment prompts serialize content as `<block id="...">...</block>` via `getMarkdown(editor, { type: "blockWithBlockId" })`.
- Better-T-Stack documents the same monorepo layout with `apps/*`, `packages/*`, `bts.jsonc`, optional `packages/infra`, and Turborepo scripts.

## Target Architecture

Root:

- `apps/web`: TanStack Start app. Public site, admin UI, editor UI, and route-level data loading.
- `apps/server`: Cloudflare Worker API, preferably Elysia or Hono. Match `shortdrama-studio` patterns unless TanStack Start server functions are intentionally selected for a route.
- `packages/db`: Drizzle schema, migrations, D1 client helpers, D1 import/export utilities.
- `packages/editor`: Slate/Plate editor, Portable Text migration bridge, block-id serializer, comment-anchor helpers.
- `packages/shared`: DTOs, API schemas, constants, URL helpers, ids.
- `packages/ui`: shared UI primitives and styles.
- `packages/config`: TypeScript, Biome, Tailwind, and runtime config.
- `packages/emails`: existing React Email templates moved out of the web app.
- `wrangler.jsonc`: Worker, Workers Assets, D1, KV, and R2 bindings.
- `bts.jsonc`: Better-T-Stack metadata for the chosen shape: TanStack Start, Workers, D1, Drizzle, Turborepo, Cloudflare.
- `.github/workflows/deploy-cloudflare.yml`: CI check, D1 migration, web build, Worker deploy.

Runtime:

- Web deploy: Cloudflare Workers Assets served by the same Worker.
- API deploy: Cloudflare Worker handling `/api/*`.
- DB: Cloudflare D1 only in production and preview. Local dev uses D1 local/miniflare or a checked-in local SQLite file generated from D1 migrations.
- Cache/rate limit/session scratch data: Cloudflare KV. Do not keep Upstash Redis after cutover.
- Object storage: Cloudflare R2. Existing S3-compatible upload code can be adapted first, then simplified to R2 bindings for Worker runtime.
- Auth: keep Clerk only if product requirements demand it; otherwise plan a separate Better Auth migration after data cutover. Avoid coupling auth migration to content/database migration.

## Phase 0: Freeze And Backup

1. Freeze writes in Sanity Studio and admin mutation routes during export.
2. Export Sanity dataset:
   - `sanity dataset export <dataset> ./data/sanity-export/<timestamp>.tar.gz --project <projectId>`
   - Store the export artifact outside the repo and in R2 cold backup.
3. Export current Turso/libSQL tables:
   - `turso db shell ... ".dump" > ./data/turso-export/<timestamp>.sql`
   - Or run an app-level export script if direct shell access is unavailable.
4. Export current object storage inventory:
   - List S3/R2-compatible bucket objects and store key, size, etag/md5, content type, and URL.
5. Record row/document counts:
   - Sanity: `post`, `category`, `settings`, image assets.
   - Turso: comments, guestbook, subscribers, newsletters, media, categories, project, photos, tags, post_tags.
6. Save the current deployment URL and build hash for rollback.

Exit criteria:

- Raw Sanity export exists and is checksummed.
- Raw Turso export exists and is checksummed.
- Asset inventory exists and is checksummed.
- Writes are still frozen or a delta capture mechanism is active.

## Phase 1: Cloudflare Resources

Create production resources:

```bash
wrangler d1 create meme-prod
wrangler d1 create meme-preview
wrangler kv namespace create MEME_KV
wrangler kv namespace create MEME_KV --preview
wrangler r2 bucket create meme-assets
wrangler r2 bucket create meme-assets-preview
```

The two `wrangler kv namespace create MEME_KV` calls return one production id and one preview id for the same logical binding. Record them in the same `kv_namespaces` entry as `id` and `preview_id`, not as two separate bindings.

Record the returned ids in `wrangler.jsonc`:

- `DB`: production D1 database id.
- `MEME_KV`: production KV namespace id and preview id.
- `MEDIA_BUCKET`: R2 bucket binding.

Secrets needed by the Worker at runtime:

```bash
wrangler secret put CLERK_SECRET_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put HASHID_SALT
wrangler secret put MIGRATION_SECRET
```

`SANITY_READ_TOKEN` is only consumed by the local migration scripts (`scripts/export-sanity-content.ts`). Keep it in `.env` for local runs and as a GitHub Actions secret for any CI-driven export — do not load it into the Worker.

Do not put secrets in GitHub Actions YAML. Use repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Exit criteria:

- `wrangler d1 list`, `wrangler kv namespace list`, and `wrangler r2 bucket list` show the expected resources.
- Local `wrangler dev` starts with bindings.
- Preview and production bindings are distinct.

## Phase 2: Monorepo Skeleton

1. Add root workspaces:
   - `apps/*`
   - `packages/*`
2. Move existing code in small steps:
   - root `app`, `components`, `hooks`, `assets`, `public`, `tailwind.config.ts`, `postcss.config.cjs` into `apps/web` only when the TanStack Start shell exists.
   - root `db` into `packages/db` (already started — `imported_posts`, `post_blocks`, `post_assets`, `comment_anchors`, `sanity_migration_map`, `migration_runs` live there). Move legacy tables next.
   - root `emails` into `packages/emails`.
   - root `lib` split into `packages/shared`, `packages/db`, `apps/server`, or app-local code based on runtime usage.
   - new packages introduced as needed: `packages/editor` (Phase 5), `packages/ui`, `packages/config`.
3. Keep compatibility aliases during migration so imports can move gradually.
4. Add per-package `tsconfig.json` and `package.json`.
5. Update Turbo tasks:
   - `build`
   - `dev`
   - `check-types`
   - `test`
   - `db:generate`
   - `db:migrate:local`
   - `db:migrate:prod`
   - `deploy:cf`

Exit criteria:

- `bun install` resolves workspaces.
- `bun run check-types` can be introduced package by package.
- The current app remains runnable until the TanStack Start cutover branch is ready.

## Phase 3: D1 Schema And Drizzle

1. Verify `drizzle-orm` and `drizzle-kit` versions are D1-compatible (currently `drizzle-orm@^0.45.2`, `drizzle-kit@^0.31.10`). Bump only if D1 features need it.
2. Switch the runtime driver:
   - Worker code uses `drizzle(env.DB)` from `drizzle-orm/d1`, replacing `drizzle-orm/libsql` + `@libsql/client`.
   - Local dev uses D1 local (`wrangler dev` Miniflare D1) or `better-sqlite3` against a checked-in local SQLite file generated from D1 migrations. Pick one and document it.
   - Drop `@libsql/client`, `TURSO_DB_URL`, and `TURSO_DB_AUTH_TOKEN` from `env.mjs` once nothing imports them.
3. Convert `drizzle.config.ts` to D1-aware config:
   - local SQLite/D1 migrations for development.
   - `wrangler d1 migrations apply` for preview and production.
4. Preserve existing tables (already defined in root `db/schema.ts`):
   - subscribers
   - newsletters
   - comments
   - guestbook
   - project
   - categories
   - media
   - post (legacy DB row, kept for reconciliation; not the canonical content row after import)
   - tags
   - post_tags
   - photos
5. Content/editor tables (already started in `packages/db/src/schema/content.schema.ts`):
   - `imported_posts`: imported Sanity documents. Distinct from the legacy `post` table — reconciliation happens after import is verified, not during.
   - `post_blocks`: one row per top-level editor block with `block_id`, `post_id`, `sort_index`, `type`, `portable_text_key`, `slate_json`, `portable_text_json`, `plain_text`.
   - `post_assets`: Sanity image asset ref to R2 key mapping.
   - `comment_anchors`: comment id, post id, block id, text quote, range metadata, status.
   - `sanity_migration_map`: Sanity `_id` / `_rev` / `_type` to D1 ids and import status.
   - `migration_runs`: every import run with checksums, counts, and failure details.
6. Use text ids for imported content where existing Sanity ids are meaningful. Do not coerce Sanity ids into numeric ids.
7. Required unique indexes (most are present in `content.schema.ts`; verify on each migration regen):
   - `imported_posts.slug`
   - `imported_posts.sanity_id`
   - `post_blocks(post_id, block_id)`
   - `sanity_migration_map(sanity_id)` (primary key)
   - `post_assets.sanity_asset_id`

Exit criteria:

- D1 local migration creates all tables from scratch.
- Import can be run repeatedly without duplicating records.
- Generated Drizzle types are consumed by API routes.

## Phase 4: Sanity And Media Migration

1. Parse Sanity export NDJSON.
2. Import categories/settings first.
3. Import media:
   - Download Sanity image assets.
   - Upload to R2 using deterministic keys like `sanity/images/<assetId>.<ext>`.
   - Store old URL, R2 key, content hash, size, and metadata in `media` or `post_assets`.
4. Import posts:
   - Preserve Sanity `_id`, `_rev`, `slug.current`, `publishedAt`, `title`, `description`, `mood`, `readingTime`, `mainImage` (resolved through `post_assets` to an R2 key), `categories`.
   - Store original Portable Text JSON intact.
   - Convert every top-level Portable Text item into a Slate/Plate node.
   - Set `blockId = portableTextBlock._key` for every Sanity block.
   - For non-block objects such as images, tweets, code blocks, and tables, use their existing `_key`; generate a deterministic fallback only if missing.
5. Keep a reversible mapping:
   - `sanity._id -> posts.id`
   - `portableText._key -> post_blocks.block_id`
   - `sanity asset _ref -> R2 key`
6. Run a validation report:
   - document counts match.
   - all posts have slugs.
   - all top-level blocks have block ids.
   - all old Sanity asset refs either map to R2 or are marked external.
   - rendered plain text length is within expected tolerance.

Exit criteria:

- A dry run produces no destructive mutations.
- A real import can be repeated idempotently.
- No post loses Portable Text JSON.
- No block loses its original `_key`.

## Phase 5: Editor And Comment Anchors

1. Build `packages/editor` from the `fluxship` Plate/Slate implementation, not from Sanity Studio.
2. Add a block id invariant:
   - Every top-level block node has `id` or `blockId`.
   - Newly inserted blocks receive ids via `nanoid` or `cuid2`.
   - Normalization repairs missing ids.
   - Split/merge behavior is explicit:
     - split creates a new id for the new block.
     - merge keeps the surviving first block id and records changed anchors if needed.
3. Add serializer compatibility with `fluxship`:
   - `getMarkdown(editor, { type: "blockWithBlockId" })`
   - output shape: `<block id="...">...</block>`
4. Store comment anchors by `blockId` plus quote/range metadata, never by array index alone.
5. Add migration for old comments:
   - existing comments by `postId` stay attached to the post.
   - inline comments get `comment_anchors.block_id` if old metadata exists.
   - otherwise mark `anchor_status = "post_level"` for manual review.
6. Add tests:
   - imported Sanity `_key` remains stable after load/save.
   - AI comment prompt includes expected `<block id="...">`.
   - splitting a block does not reuse ids.
   - comments spanning multiple blocks use the first block id, matching `fluxship`.

Exit criteria:

- Editor can open imported posts.
- Saving a post does not rewrite all block ids.
- Inline comments survive reload.

## Phase 6: API Refactor

1. Replace Next route handlers with Worker routes under `apps/server`.
2. Use the same module style as `shortdrama-studio`:
   - `src/app.ts` composes routes.
   - `src/cloudflare/worker.ts` exposes bindings and handles `/api/*`.
   - `src/modules/<domain>/index.ts` owns route definitions.
   - `src/modules/<domain>/service.ts` owns DB/KV/R2 logic.
   - `src/openapi` describes public API schemas if Elysia/OpenAPI is retained.
3. Route domains:
   - posts
   - categories
   - tags
   - comments
   - guestbook
   - media/uploads
   - newsletters
   - reactions/activity
   - link previews
   - admin/stats
4. Replace Redis rate limits with KV-backed counters:
   - small atomic windows can use Durable Object if KV eventual consistency is not acceptable.
   - otherwise KV is acceptable for coarse public mutation throttles.
5. Replace S3 upload endpoints with R2 signed upload or Worker-mediated uploads.

Exit criteria:

- Every old `app/api/**/route.ts` has a corresponding Worker API route.
- API smoke tests cover read and mutation paths.
- No route imports `next/server`.

## Phase 7: TanStack Start Frontend

1. Create `apps/web` as TanStack Start.
2. Port public routes:
   - `/`
   - `/blog`
   - `/blog/$slug`
   - `/guestbook`
   - `/projects`
   - `/newsletters/$id`
   - `/feed.xml`
   - `/sitemap.xml`
3. Port admin routes:
   - `/admin`
   - `/admin/comments`
   - `/admin/content/project`
   - `/admin/newsletters`
   - `/admin/subscribers`
   - new editor route for posts.
4. Replace Next-specific APIs:
   - `next/link` -> TanStack Router `Link`
   - `next/image` -> standard image/R2 image component
   - `next/navigation` -> TanStack router/search APIs
   - `next/script` -> app-level script tags or Cloudflare Zaraz if chosen
   - `next/cache` -> explicit API caching/KV
5. Replace `next-sanity` rendering with imported D1 content rendering.
6. Keep visual parity first; polish after behavior is stable.

Exit criteria:

- No `next` or `next-sanity` dependency remains.
- `bun run build:web` produces a Cloudflare-deployable build.
- Browser smoke covers key public and admin pages.

## Phase 8: CI/CD

GitHub Actions (current `deploy-cloudflare.yml` runs `lint` + `build`; the rest are introduced as their packages land):

1. Install Bun.
2. `bun install --frozen-lockfile`.
3. `bun run lint` (Biome, already wired).
4. `bun run check-types` (add once per-package `tsconfig.json` files exist in Phase 2).
5. `bun run test` (add once test runner is chosen — Bun test or Vitest).
6. `bun run build`.
7. Apply D1 migrations:
   - preview on non-main branches if desired.
   - production only on `main`.
8. Deploy Worker:
   - `wrangler deploy`.

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `SANITY_READ_TOKEN` (only for jobs that run the Sanity export script)

Exit criteria:

- PR checks do not require production secrets.
- Main deploy applies migrations before Worker deploy.
- Failed migrations stop deploy.

## Phase 9: Cutover

Phase 0 already produced the first frozen export. This phase runs a final delta against the still-frozen source and flips traffic.

1. Re-run Sanity export against the frozen source and diff against the Phase 0 artifact.
2. Re-run Turso export and diff.
3. Re-run media sync (only objects whose etag/size changed).
4. Import deltas into D1/R2.
5. Compare counts and checksums against the previous run.
6. Run production preview smoke:
   - public post list and detail.
   - comments.
   - guestbook.
   - admin list pages.
   - editor load/save on a cloned post.
   - media upload.
   - newsletter read/send dry run.
7. Switch DNS/route to Cloudflare Worker.
8. Keep Sanity/Turso read-only for the rollback window.

Rollback:

- Restore previous deployment route.
- Re-enable old Sanity/Turso reads.
- Do not write migrated D1 data back to Sanity unless a dedicated reverse migration is written.

## First Implementation Slice

The first safe slice should not move public runtime code yet. It should add:

1. `bts.jsonc` with target Better-T-Stack metadata.
2. `wrangler.jsonc` with placeholder D1/KV/R2 bindings.
3. `.github/workflows/deploy-cloudflare.yml` with CI/deploy gates.
4. `packages/db` schema skeleton for imported content/editor tables.
5. `scripts/export-sanity-content.ts` dry-run exporter.
6. `scripts/verify-migration-counts.ts` placeholder verifier.

This creates the migration control plane while keeping the current Next.js production app untouched until data export and import are proven.
