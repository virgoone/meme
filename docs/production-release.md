# Production Release

## Hosting

- Cloudflare Worker `meme` directly owns the Custom Domain `blog.douni.one`; `wrangler.jsonc` declares the entire hostname with `custom_domain: true`.
- The same Worker serves the TanStack Start app, assets, and API using the existing `meme-prod` D1 database, `MEME_KV` namespace, and `meme-assets` R2 bucket.
- `https://meme.moss-dev.workers.dev` remains the direct diagnostic origin.
- Worker secrets remain on Cloudflare. Preserve `BETTER_AUTH_SECRET` so existing sessions remain valid. `SITE_URL` is the canonical public origin, which must remain in `TRUSTED_ORIGINS`.
- The legacy Vercel proxy build has been removed. `vercel.json` disables Git deployments; no Vercel deployment is required for production releases.

## Automatic releases from main

Every push to `main` triggers `.github/workflows/deploy-cloudflare.yml`:

1. Install the locked dependencies, lint, check types, run all tracked regression suites in separate processes, and build the web app and server.
2. Transfer that verified web build to the deployment job, upload a Worker version, verify its commit tag and message through the Worker API, and deploy that exact version to 100% of traffic. Read back the active version before reporting success.
3. Check health, server-rendered blog HTML, published posts, sitemap, and RSS on both the Worker origin and `blog.douni.one`. The public-domain checks also reject Vercel response headers. These checks only read data.

Production releases are queued instead of cancelling an in-progress upload. A failed check prevents deployment. A failed post-deployment check reports a failed release; inspect and roll back the Worker if needed.

Configure these repository **Actions secrets** in `virgoone/meme`:

- `CLOUDFLARE_ACCOUNT_ID`: the existing account ID.
- `CLOUDFLARE_API_TOKEN`: a dedicated account-owned token with Workers Editor permission scoped to `meme`. Route administration additionally needs Workers Routes Write and Zone Read scoped only to `douni.one`. DNS cleanup requires separate DNS Edit permission or the authenticated dashboard. Do not reuse the local Wrangler OAuth token or add database/storage administration permissions just to deploy existing bindings.

The normal pipeline uses `scripts/deploy-worker.mjs` and preserves existing domains, routes, and schedules. Wrangler 4.101 can upload successfully and then fail while displaying a preview URL because the account subdomain endpoint requires broader permissions. The script accepts only that exact post-upload error, verifies the returned version and commit through the Worker API, and then explicitly deploys it. Any upload, verification, or deployment failure still fails the job.

Deployment is enabled by default. Set the repository variable `CF_DEPLOY_ENABLED=false` only to pause automatic releases during an incident; delete that variable or set it to `true` to resume. Missing secrets fail explicitly instead of silently skipping deployment. To retry, rerun the failed job or dispatch **Cloudflare Deploy** on `main`.

## Domain and route changes

1. Record the existing domain bindings, routes, DNS target, and active Worker version. Domain-only changes do not require a code deployment or data migration.
2. Update `wrangler.jsonc`. For the public blog, use the Custom Domain `blog.douni.one`, not a path-specific route or a CNAME pointing to `workers.dev`.
3. If Cloudflare reports an externally managed DNS record, record its type, content, proxy status, and TTL, then remove only the conflicting `blog.douni.one` record in the DNS dashboard. Leave other hostnames and email records intact.
4. Run `bun run cf:triggers` to apply the declared domain and routes to the existing Worker. If the API preserves the obsolete `blog.douni.one/api/page-views*` route, remove that one route after the Custom Domain is verified.
5. Read back the Custom Domain association and active Worker version, then run `bun scripts/check-production.mjs`. Verify the home page, one article, assets, authentication session endpoint, and admin gating as well.

Cloudflare manages the Custom Domain DNS record and certificate. Do not recreate a Vercel DNS record for `blog.douni.one`.

## Data changes

Schema migrations and imports are explicit operator steps with a separate backup and review. Before applying them, export D1 with `wrangler d1 export meme-prod --remote --config wrangler.jsonc --output=data/release-backups/<timestamp>/d1.sql` and verify the intended changes. Normal releases never apply D1 migrations, replay imports, reset KV, rotate auth secrets, or recreate storage resources.

The original content migration checklist remains in [cloudflare-stack-migration-plan.md](cloudflare-stack-migration-plan.md).

## Rollback

- Restore the previous Cloudflare Worker version with Wrangler rollback if its code fails; keep the Custom Domain pointing to the Worker.
- For a domain-only mistake, restore the previously recorded Worker domain/route configuration. Reverting a local file alone does not revert live triggers.
- A code rollback must not restore an older database dump over newer writes. Retain old source data resources unless their deletion is separately authorized.
- The retired Vercel deployment is not an operational fallback: it returned `402 DEPLOYMENT_DISABLED` before the direct Cloudflare cutover.
