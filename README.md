# Meme blog

Personal blog at https://blog.douni.one, deployed entirely on Cloudflare.

## Architecture

- `apps/web`: TanStack Start frontend and server-rendered pages.
- `apps/server`: Cloudflare Worker `meme`, serving the frontend, assets, and API.
- `packages/db`: Drizzle schema and Cloudflare D1 access.
- Cloudflare KV provides cache and rate limits; R2 stores media.
- `blog.douni.one` is a Worker Custom Domain configured in `wrangler.jsonc`.

## Development

```sh
bun install --frozen-lockfile
bun run dev:server
bun run dev:web
```

## Analytics

Evumi uses `@evumi/tracker@0.1.15` with the TanStack Router adapter mounted once in the root layout. Public visits on `https://blog.douni.one` are sent to `https://evumi.bunship.site/api/event` in cookieless mode. Local development and preview origins do not send events. Existing GA4 and the site's own view counters remain independent.

Admin, login, confirmation, and newsletter preview routes are excluded. Public article slugs remain distinct, and only campaign parameters plus archive `page` are included in page URLs; hashes and other query parameters are omitted. Automatic outbound-link, download, and form tracking are disabled. The SDK respects `localStorage.plausible_ignore === 'true'`.

After deployment, verify one pageview per completed navigation (including back navigation), inspect collector responses for dropped events, and confirm persisted counts in Evumi. A `202` response alone is not proof of persistence. If a Content Security Policy is added, allow `https://evumi.bunship.site` in `connect-src`.

## Production

Pushes to `main` run validation and deploy through [Cloudflare Deploy](.github/workflows/deploy-cloudflare.yml). Domain and route changes are applied separately with `bun run cf:triggers`. See [the release guide](docs/production-release.md) for checks and rollback.

`vercel.json` only disables legacy Vercel Git deployments. Production traffic does not use a Vercel proxy.
