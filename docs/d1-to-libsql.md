# D1 to libSQL migration

Production Worker `meme` uses the `meme` database in the Turso `moss` organization. `wrangler.jsonc` specifies `DATABASE_PROVIDER=libsql` and the database URL, with **no D1 binding**. `TURSO_DB_AUTH_TOKEN` is a Worker secret. KV, R2, hostname and `BETTER_AUTH_SECRET` stay intact.

The libSQL HTTP transport implements the application's existing prepared-statement and atomic batch interface. Drizzle's SQLite/D1 mapping is retained for query compatibility; it does not send requests to Cloudflare D1 in production. Unsupported standalone transaction statements fail explicitly. Local development still uses the local D1 emulator via `wrangler.dev.jsonc`.

## Cover images

`imported_posts.cover_image_url` contains the resolved cover URL. Article creation and updates compute it from the explicit main image or first usable image in the saved content. Clearing or replacing images updates this field in the same atomic write as the article and blocks. Public lists read the article field only; they never query `post_blocks`. Article detail still reads blocks to display the actual article.

Migration `0006_stored_post_covers.sql` adds the column and publication-order index. `scripts/migrate-d1-to-libsql.ts` backfills all existing covers using the previous resolution rules, before inserting data into Turso. Apply the migration to the local emulator before development; existing local articles need the same backfill if their covers are to be preserved.

## Export, import and verify

Private artifacts belong under ignored `data/release-backups/`, never in Git. The archived source binding remains in `wrangler.d1-archive.jsonc` for explicit export only.

1. Export D1 with `apps/server/node_modules/.bin/wrangler d1 export meme-prod --remote --config wrangler.d1-archive.jsonc --output=<backup>/d1.sql`.
2. Run `bun --env-file=.env.local scripts/migrate-d1-to-libsql.ts <backup>/d1.sql <backup> --check`. This loads the dump locally, backfills covers, validates integrity/foreign keys and produces table counts/checksums without connecting to Turso.
3. With the source application's writes paused, take the final D1 export. Both Worker hostnames must be serving the maintenance version before this export. `DATABASE_MIGRATION_READ_ONLY=1` returns 503 with `Retry-After` for every path except `/api/health`.
4. Run the same import command with `--replace-target`. **This replaces every application table in the configured Turso target.** It first saves the existing target schema and complete data to a unique backup. Table replacement, all inserts, indexes and a foreign-key assertion run in a single server-side transaction. The script then reads every target row back and compares per-table SHA-256 hashes, plus integrity and foreign-key checks. Cloudflare-specific bookkeeping is excluded.
5. Deploy the prepared libSQL Worker version at 100%, without the maintenance variable or D1 binding. Check health (`database=libsql`), lists, covers, article content, comments, site statistics, auth session response, admin gating, RSS and sitemap on both hostnames.

The secret is written independently via Wrangler secret bulk; never place tokens in config, logs or Git. Normal release workflows do not reimport data.

## Rollback

Before cutover, the D1 source is unchanged and the prior D1 Worker can be restored if migration fails. After new writes reach Turso, **do not restore a D1-backed Worker or replay the old dump**. Roll back only to a libSQL-capable code version; a database rollback requires an explicit reverse migration of newer writes. Retain both source and target backups until separately authorized to delete them.

## 2026-11-06 cutover evidence

- Cloudflare UTC 2026-11-05: `meme-prod` scanned 5,454,510 rows. As of approximately 14:20 Asia/Shanghai on November 6, UTC November 6 showed 159,261 rows. The observed data supports a November 5 quota exceedance, not two independently confirmed UTC daily exceedances. Cloudflare resets daily allowances at midnight UTC.
- Seven-day Query Insights: 7,594,610 total rows in the retrieved query groups; 7,147,448 (94.1%) came from list-cover block queries. The 54-article variant ran 1,171 times and scanned 6,620,085 rows, averaging 5,653 per run. These are query-level aggregate statistics, not an attribution to a specific visitor or bot.
- Root cause: `listImportedPosts` fetched every block for every listed post, even though the response only needed one cover URL. There was no server cache around this query. SSR and public API requests could repeat the work; the old full-list query was the dominant variant.
- Fix: persisted covers plus the publication-order index. Verified query plan uses `imported_posts_published_idx` and the settings primary-key index, with no temporary sort and no block-table read.
- Migrated 24 application tables / 3,513 rows, including 54 posts and 2,894 blocks. Backfilled 24 nonempty covers; other posts have no usable cover. All source columns were preserved, with the new derived cover column added. Every target row/column was compared via per-table SHA-256 checksums; foreign keys and integrity passed. Two final D1 exports matched across all 25 source tables (including its migration journal).
- Production version `c4d94aa5-411d-4657-929e-91d35b95aaf5` received 100% traffic, with no D1 binding. Existing auth secret, KV and R2 bindings were preserved.
- Validation: 208 regression tests plus 2 libSQL transaction tests, type checks, lint (existing warnings), production build, and 12 HTTP checks each on the public domain and Worker origin. Direct access to workers.dev timed out locally; validation used the reachable Cloudflare edge via curl `--connect-to`, retaining the original hostname/TLS verification.
- Private backups, source-freeze comparison, destination checksums, query statistics and deployment metadata: `data/release-backups/d1-to-libsql-20261106/` (ignored by Git).

Official references: [D1 billing and daily limits](https://developers.cloudflare.com/d1/platform/pricing/), [query insights](https://developers.cloudflare.com/d1/observability/metrics-analytics/), [libSQL transaction semantics](https://tursodatabase.github.io/libsql-client-ts/interfaces/Transaction.html).
