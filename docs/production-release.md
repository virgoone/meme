# Production Release

## Hosting

- The existing Vercel project `larks-projects-aafa7a73/meme` owns `blog.douni.one`.
- Vercel uses `scripts/build-vercel-proxy.mjs` and the Build Output API to forward all paths to `CLOUDFLARE_ORIGIN`. It does not run Next.js or access the databases.
- Cloudflare Worker `meme` serves the TanStack Start app, assets, and API with the existing `meme-prod` D1 database, `MEME_KV` namespace, and `meme-assets` R2 bucket.
- `CLOUDFLARE_ORIGIN=https://meme.moss-dev.workers.dev` is the only Vercel-specific runtime routing configuration. Set it for Production and Preview. Keep the legacy environment variables until the rollback window closes.
- Worker secrets remain on Cloudflare. Preserve `BETTER_AUTH_SECRET` so existing Worker sessions remain valid. Set `SITE_URL` and `BETTER_AUTH_URL` to the canonical public origin and include the public origins in `TRUSTED_ORIGINS` before switching traffic.

## Automatic releases from main

Every push to `main` triggers `.github/workflows/deploy-cloudflare.yml`:

1. Install the locked dependencies, lint, check types, run all tracked regression suites in separate processes, and build the web app and server.
2. Transfer that verified web build to the deployment job, upload a Worker version, verify its commit tag and message through the Worker API, and deploy that exact version to 100% of traffic. Read back the active version before reporting success.
3. Check health, server-rendered blog HTML, published posts, sitemap, and RSS on both the Worker origin and `blog.douni.one`. These checks only read data.

Production releases are queued instead of cancelling an in-progress upload. A failed check prevents deployment. A failed post-deployment check reports a failed release; inspect and roll back the Worker if needed.

Configure these repository **Actions secrets** in `virgoone/meme`:

- `CLOUDFLARE_ACCOUNT_ID`: the existing account ID.
- `CLOUDFLARE_API_TOKEN`: a dedicated account-owned token with Workers Editor permission scoped to `meme`. Route administration additionally needs Workers Routes Write and Zone Read scoped only to `douni.one`. Do not reuse the local Wrangler OAuth token or add database/storage administration permissions just to deploy existing bindings.

The normal pipeline uses `scripts/deploy-worker.mjs` and preserves existing domains, routes, and schedules. Apply intentional trigger changes separately with `wrangler triggers deploy`; do not change the account-wide subdomain during a code release. Wrangler 4.101 can upload successfully and then fail while displaying a preview URL because the account subdomain endpoint requires broader permissions. The script accepts only that exact post-upload error, verifies the returned version and commit through the Worker API, and then explicitly deploys it. Any upload, verification, or deployment failure still fails the job.

Deployment is enabled by default. Set the repository variable `CF_DEPLOY_ENABLED=false` only to pause automatic releases during an incident; delete that variable or set it to `true` to resume. Missing secrets fail explicitly instead of silently skipping deployment. To retry, rerun the failed job or dispatch **Cloudflare Deploy** on `main`.

Vercel may separately rebuild the proxy from Git. The Cloudflare workflow is what publishes the application code. Existing Worker secrets and D1/KV/R2 bindings are retained. Normal code releases do not run schema migrations or content imports.

## Migration and cutover gate

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
