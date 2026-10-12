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

## Production

Pushes to `main` run validation and deploy through [Cloudflare Deploy](.github/workflows/deploy-cloudflare.yml). Domain and route changes are applied separately with `bun run cf:triggers`. See [the release guide](docs/production-release.md) for checks and rollback.

`vercel.json` only disables legacy Vercel Git deployments. Production traffic does not use a Vercel proxy.
