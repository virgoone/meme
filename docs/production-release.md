# Production Release

## Hosting

- The existing Vercel project `larks-projects-aafa7a73/meme` owns `blog.douni.one`.
- Vercel uses `scripts/build-vercel-proxy.mjs` and the Build Output API to forward all paths to `CLOUDFLARE_ORIGIN`. It does not run Next.js or access the databases.
- Cloudflare Worker `meme` serves the TanStack Start app, assets, and API with the existing `meme-prod` D1 database, `MEME_KV` namespace, and `meme-assets` R2 bucket.
- `CLOUDFLARE_ORIGIN=https://meme.moss-dev.workers.dev` is the only Vercel-specific runtime routing configuration. Set it for Production and Preview. Keep the legacy environment variables until the rollback window closes.
- Worker secrets remain on Cloudflare. Preserve `BETTER_AUTH_SECRET` so existing Worker sessions remain valid. Set `SITE_URL` and `BETTER_AUTH_URL` to the canonical public origin and include the public origins in `TRUSTED_ORIGINS` before switching traffic.

## Release Gate

1. Export the live D1 database to a gitignored path using `wrangler d1 export meme-prod --remote --config wrangler.jsonc --output=data/release-backups/<timestamp>/d1.sql`.
2. Compare live legacy Turso records and Sanity revisions with the imported snapshot. Check D1 row counts, post IDs, block IDs, comment anchors, and KV reaction totals. Stop if source data is missing at the destination.
3. Run `bun install --frozen-lockfile`, `bun run lint`, `bun run check-types`, `bun test packages/editor/src/block-id.test.ts packages/db/src/migration/sanity-content.test.ts apps/server/src/modules/projects/index.test.ts apps/server/src/modules/reactions/service.test.ts`, and `bun run build`.
4. Build and inspect a Vercel preview. Test only read paths when it forwards to the production Worker.
5. Deploy the verified Worker with `bun run cf:deploy` using the existing bindings. Code deployment must not import SQL, reset KV, rotate auth secrets, or recreate storage resources.
6. Verify the Worker, merge the prepared PR into `main`, and verify the Vercel production deployment and domain alias. Test home, blog, article navigation, CSS, images, auth session, admin gating, sitemap, and feed.
7. Compare protected data again after release. Keep local development processes stopped.

Schema migrations are an explicit operator step with a separate backup and review. The normal GitHub deployment workflow does not apply D1 migrations or replay imports.

## Rollback

- Restore the previous Vercel deployment using `vercel rollback <deployment-url> --scope larks-projects-aafa7a73` if the public domain cutover fails.
- Restore the previous Cloudflare Worker version with Wrangler rollback if its code fails.
- A code rollback must not restore an older database dump over newer writes. Retain the old Turso, Sanity, and Upstash resources; do not delete them as part of release.
- The pre-cutover Vercel deployment is `meme-lql3zdo5n-larks-projects-aafa7a73.vercel.app` at commit `ad23abed410aa2357bfe6cba300c9a218be55640`.
