# Plan 001: Upgrade all dependencies to current latest and verify with Vercel env

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**:
> `git diff --stat ad23abe..HEAD -- package.json pnpm-lock.yaml .env.example env.mjs next.config.mjs .eslintrc.cjs tsconfig.json vercel.json app components config db emails hooks lib middleware.ts sanity sanity.config.ts sanity.cli.ts drizzle.config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `ad23abe`, 2026-06-17

## Why this matters

The project is still pinned around the Next 14 / React 18 ecosystem while many
runtime dependencies now have newer major versions. A direct "upgrade
everything" pass crosses several major-version boundaries at once: Next 14 to
16, React 18 to 19, Clerk 5 to 7, Sanity 3 to 6, React Email 2 to 6, Ant Design
5 to 6, Zod 3 to 4, and multiple UI/runtime helpers. This plan makes that
upgrade executable by doing it in small migration clusters, validating the
required Vercel environment locally, and preserving rollback points.

## Current state

- `package.json` uses pnpm, but it does not declare a `packageManager` field.
- `pnpm-lock.yaml` is present, so keep pnpm as the package manager.
- `package.json:6-15` scripts:

```json
"scripts": {
  "build": "next build",
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "dev": "next dev",
  "dev:email": "email dev -p 3333",
  "dev:turbo": "next dev --turbo",
  "lint": "next lint",
  "start": "next start",
  "prettier": "prettier --write **/*.{js,ts,tsx}"
}
```

- `package.json:17-115` contains the runtime dependencies. High-risk major
  upgrade targets observed via `npm outdated --json --package-lock=false` on
  2026-06-17 include:

| Package cluster | Current manifest range | Latest observed |
|-----------------|------------------------|-----------------|
| `next`, `@next/third-parties` | `^14.2.3` | `16.2.9` |
| `react`, `react-dom` | `^18.3.1` | `19.2.7` |
| `@clerk/nextjs` | `^5.1.3` | `7.5.3` |
| `@clerk/localizations` | `^2.4.3` | `4.8.2` |
| `sanity`, `@sanity/vision` | `^3.44.0` | `6.1.0` |
| `next-sanity` | `^9.3.10` | `13.1.0` |
| `@sanity/code-input` | `^4.1.4` | `7.1.3` |
| `@sanity/table` | `^1.1.2` | `3.1.1` |
| `@sanity/ui` | `^2.1.14` | `3.2.0` |
| `react-email` | `^2.1.4` | `6.6.3` |
| `@react-email/tailwind` | `^0.0.18` | `2.0.7` |
| `antd` | `^5.18.0` | `6.4.4` |
| `zod` | `^3.23.8` | `4.4.3` |
| `@hookform/resolvers` | `^3.4.2` | `5.4.0` |
| `framer-motion` | `^11.2.10` | `12.40.0` |
| `lucide-react` | `^0.383.0` | `1.20.0` |
| `sonner` | `^1.4.41` | `2.0.7` |
| `resend` | `^3.2.0` | `6.12.4` |
| `@vercel/analytics` | `^1.3.1` | `2.0.1` |
| `@upstash/ratelimit` | `^1.1.3` | `2.0.8` |
| `@neondatabase/serverless` | `^0.9.3` | `1.1.0` |
| `@libsql/client` | `0.15.3` | `0.17.4` |
| `cheerio` | `1.0.0-rc.12` | `1.2.0` |

- `npm outdated` did not report devDependencies in this environment even with
  `--include=dev`; the executor must run a fresh latest-version check before
  editing.
- `pnpm outdated --format json` failed in local pnpm 10.33.0 with
  `Cannot read properties of undefined (reading 'optionalDependencies')`; do
  not rely on that command as the only dependency inventory.
- `env.mjs:6-27` defines required server env vars, including database, Resend,
  Upstash, Turso, and S3 variables.
- `env.mjs:29-36` defines required public client env vars.
- `.env.example:1-21` documents only Clerk, database, Sanity, email, and
  Upstash variables. It is missing several variables required by `env.mjs`,
  including Turso, S3, `NEXT_PUBLIC_HASHID_SALT`, and optional link-preview
  fields.
- `.gitignore:28-33` ignores `.env*.local`, `.env`, and `.vercel`; keep all
  pulled Vercel environment files inside ignored paths and never commit them.
- Execute review on 2026-06-17 found that `vercel` is not installed on `PATH`
  in the current environment; `vercel whoami` returned `command not found`, and
  `pnpm exec vercel whoami` also failed because no repo-local Vercel CLI is
  available.
- `next.config.mjs:1-5` imports `env.mjs` unless `SKIP_ENV_VALIDATION` is set.
- `next.config.mjs:25-27` enables `experimental.taint`, which may require
  review during the Next 16 migration.
- `vercel.json:2` sets the deployment build command to `pnpm turbo build`, while
  `package.json:7` has `build: next build`. Confirm whether Vercel currently
  succeeds with this mismatch after dependency upgrades.
- `.eslintrc.cjs:4-51` uses legacy ESLint config with `next/core-web-vitals`.
  Next 16 and current ESLint may require an ESLint flat-config migration or a
  revised lint command.
- `tsconfig.json:5-7` has `allowJs: true`, `skipLibCheck: true`, and
  `strict: false`; type checking may not catch all migration regressions.

Important usage hotspots from repository search:

- Clerk: `middleware.ts`, `app/layout.tsx`, `app/admin/layout.tsx`,
  `app/api/comments/[id]/route.ts`, `app/(main)/Header.tsx`,
  `components/Commentable.tsx`, auth pages.
- Sanity: `sanity.config.ts`, `sanity/*`, `app/studio/[[...index]]/*`,
  `sanity/lib/client.ts`, `sanity/queries.ts`.
- React Email: `emails/_components.ts`, `emails/index.tsx`, templates in
  `emails/*.tsx`.
- Ant Design: `components/data-table/index.tsx`, admin pages and dialogs,
  `components/theme/theme-provider.tsx`, `components/theme/config.tsx`.
- Zod: `env.mjs`, DTO files under `db/dto`, API route validation, newsletter
  and admin form validations.
- Drizzle/libSQL: `db/index.ts`, `db/schema.ts`, `db/queries/*`,
  `drizzle.config.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Latest inventory | `npm outdated --json --package-lock=false --include=dev` | exits 1 when outdated packages exist; JSON output is valid |
| Alternative latest inventory | `pnpm dlx npm-check-updates --target latest --jsonUpgraded` | exits 0 and prints package-to-version JSON |
| Install after edits | `pnpm install` | exits 0 and updates `pnpm-lock.yaml` |
| Typecheck | `pnpm exec tsc --noEmit --incremental false` | exits 0, no TypeScript errors |
| Lint | `pnpm lint` | exits 0, or fails only with an ESLint/Next lint deprecation that is handled in this plan |
| Build | `pnpm build` | exits 0 and produces `.next/` |
| Local dev smoke | `pnpm dev` | starts Next dev server without env validation errors |
| Install Vercel CLI if absent | `pnpm add -D vercel` or `npm install -g vercel` | exits 0 and `vercel --version` prints a version |
| Vercel env pull | `vercel env pull .env.local --environment=development` | exits 0 and writes ignored `.env.local` |
| Vercel build parity | `vercel build` | exits 0 using linked project settings |

## Scope

**In scope**:

- `package.json`
- `pnpm-lock.yaml`
- `.env.example`
- `env.mjs`
- `next.config.mjs`
- `.eslintrc.cjs` or a replacement ESLint config if required by Next/ESLint
- `tsconfig.json`
- `vercel.json`
- Source files only when needed to satisfy breaking changes from upgraded
  dependencies: `app/**`, `components/**`, `config/**`, `db/**`, `emails/**`,
  `hooks/**`, `lib/**`, `middleware.ts`, `sanity/**`, `sanity.config.ts`,
  `sanity.cli.ts`, `drizzle.config.ts`

**Out of scope**:

- Do not commit `.env`, `.env.local`, `.vercel/`, or any secret-bearing file.
- Do not paste Vercel environment variable values into code, commit messages,
  issues, plan updates, or PR descriptions.
- Do not run `db:push` against production-like databases during this dependency
  upgrade unless the operator explicitly asks for a database migration.
- Do not rewrite application features or redesign UI beyond what dependency
  migration requires.
- Do not weaken `env.mjs` validation to make local boot pass; fix or document
  required env inputs instead.

## Git workflow

- Branch: `codex/upgrade-dependencies-latest`
- Commit message style in recent history is simple `fix: ...`; use clear
  messages such as `fix: upgrade core runtime dependencies`.
- Prefer multiple commits by migration cluster so regressions can be bisected:
  environment/docs, core Next/React/tooling, auth/data/CMS, UI/email utilities,
  cleanup.
- Do not push or open a PR unless the operator instructs it.

## Steps

### Step 1: Pull Vercel environment into ignored local files

1. Confirm the Vercel CLI is available:
   `vercel --version`
   If this fails, install the CLI first using one of the commands in
   "Commands you will need". Prefer `pnpm add -D vercel` if the repo should pin
   the CLI for repeatable local usage; otherwise use a global install only with
   operator approval.
2. Confirm Vercel CLI is authenticated:
   `vercel whoami`
3. Link the local checkout to the Vercel project if needed:
   `vercel link`
   Use the existing Vercel project shown by the operator:
   `larks-projects-aafa7a73/meme`. If the CLI asks whether to link to an
   existing project, choose the existing `meme` project.
4. Pull development env values:
   `vercel env pull .env.local --environment=development`
5. Confirm `.env.local` is ignored:
   `git check-ignore .env.local`
6. Compare variable names only, not values:
   `node -e "import('fs').then(fs=>{const env=fs.readFileSync('.env.local','utf8').split(/\\n/).filter(Boolean).map(l=>l.split('=')[0]).sort(); console.log(env.join('\\n'))})"`

**Verify**: `vercel --version` prints a version; `git check-ignore .env.local`
prints `.env.local`; `pnpm dev` starts without `Invalid environment variables`
errors after dependencies are installed. If Vercel has only preview/production
values, repeat with `--environment=preview` only with operator approval.

### Step 2: Align documented env names before changing dependencies

Update `.env.example` so it lists every variable required by `env.mjs` without
real values. Include placeholders for:

- `NODE_ENV`
- `DATABASE_URL`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_HASHID_SALT`
- `VERCEL_ENV`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `LINK_PREVIEW_API_BASE_URL`
- `SITE_NOTIFICATION_EMAIL_TO`
- `TURSO_DB_URL`
- `TURSO_DB_AUTH_TOKEN`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_URL_BASE`
- `S3_BUCKET`
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_USE_CDN`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SITE_EMAIL_FROM`
- `NEXT_PUBLIC_SITE_LINK_PREVIEW_ENABLED`
- Clerk variables used by the app but not validated by `env.mjs`:
  `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

Do not add secret values from Vercel.

**Verify**: `git diff -- .env.example env.mjs` shows variable names and
placeholders only, with no real tokens, keys, URLs containing credentials, or
private database endpoints.

### Step 3: Create a fresh upgrade inventory and pin target versions

Run:

```bash
npm outdated --json --package-lock=false --include=dev > /tmp/meme-outdated.json || true
pnpm dlx npm-check-updates --target latest --jsonUpgraded > /tmp/meme-ncu.json
```

Use `/tmp/meme-ncu.json` as the source of truth if `npm outdated` still omits
devDependencies. Update `package.json` to the latest stable versions from that
fresh inventory. Keep pnpm and update `pnpm-lock.yaml` with `pnpm install`.

When editing `package.json`, also add a `packageManager` field matching the
pnpm major available in the execution environment, for example:

```json
"packageManager": "pnpm@10.33.0"
```

Only use the exact local pnpm version if `pnpm --version` confirms it.

**Verify**: `pnpm install` exits 0, `git diff -- package.json pnpm-lock.yaml`
shows only dependency metadata and lockfile changes, and `pnpm list --depth 0`
exits 0.

### Step 4: Migrate the core framework/tooling cluster

Focus first on the packages that determine build behavior:

- `next`
- `react`
- `react-dom`
- `@next/third-parties`
- `eslint`
- `eslint-config-next`
- TypeScript and React/Node type packages
- Tailwind/PostCSS/autoprefixer/prettier tooling
- `turbo`

Read the official migration notes for the exact versions installed by Step 3.
Then update project configuration as needed:

- If `next lint` is no longer supported, replace `package.json:13` with the
  current supported lint command and migrate `.eslintrc.cjs` to the required
  config shape. Preserve the existing rules from `.eslintrc.cjs:35-48`.
- Re-check `next.config.mjs:25-27` and either keep `experimental.taint` if still
  supported or update it according to the current Next config API.
- Keep `SKIP_ENV_VALIDATION` behavior from `next.config.mjs:1-5`.

**Verify**:

```bash
pnpm exec tsc --noEmit --incremental false
pnpm lint
pnpm build
```

All three must exit 0 before moving on.

### Step 5: Migrate auth, data, CMS, and API-adjacent packages

Update and fix breaking changes for:

- Clerk: `@clerk/nextjs`, `@clerk/localizations`
- Sanity: `sanity`, `next-sanity`, `@sanity/*`, `sanity-plugin-media`
- Data: `drizzle-orm`, `drizzle-kit`, `@libsql/client`,
  `@neondatabase/serverless`
- Validation and forms: `zod`, `@hookform/resolvers`, `react-hook-form`
- Runtime services: `@upstash/redis`, `@upstash/ratelimit`, `resend`,
  `@vercel/analytics`, `@vercel/edge-config`, AWS SDK S3 packages

Touch only the source files that import these packages. Use the hotspots listed
in "Current state" as the search map.

Special checks:

- Clerk API changes can affect server helpers in `app/admin/layout.tsx`,
  `middleware.ts`, and API routes using `currentUser` or `clerkClient`.
- Zod 4 can affect `z.AnyZodObject` usage in `hooks/use-form.ts`.
- Sanity major upgrades can affect imports from `sanity/desk`,
  `next-sanity/studio`, schema APIs, and plugin compatibility.
- Drizzle/libSQL upgrades can affect `drizzle-orm/libsql` imports and generated
  migration metadata.

**Verify**:

```bash
pnpm exec tsc --noEmit --incremental false
pnpm lint
pnpm build
```

All three must exit 0.

### Step 6: Migrate UI, email, and smaller runtime packages

Update and fix breaking changes for:

- Ant Design and theme/provider usage
- React Email package exports and `react-email` CLI behavior
- Framer Motion, Sonner, Lucide, React Day Picker, React Dropzone
- Markdown/syntax packages
- Utility packages such as `tailwind-merge`, `query-string`, `sitemap`,
  `cheerio`, `valtio`, `@portabletext/react`, `@splinetool/react-spline`

Use repository imports to keep the changes scoped. Do not replace components or
change UI behavior unless a package API requires it.

**Verify**:

```bash
pnpm exec tsc --noEmit --incremental false
pnpm lint
pnpm build
```

All three must exit 0.

### Step 7: Run local and Vercel-parity smoke checks

1. Start local dev:
   `pnpm dev`
2. Visit the local app in a browser and smoke-check:
   home page, auth entry points, an admin route, a blog page, Sanity Studio,
   one API-backed interaction if safe with the pulled development env.
3. Stop the dev server.
4. Run Vercel parity build:
   `vercel build`

If `vercel build` uses `vercel.json:2` and fails because `pnpm turbo build`
does not match this single-package project, either update `vercel.json` to
`"buildCommand": "pnpm build"` or add the required turbo pipeline wiring. Prefer
the smallest change that matches the actual project shape.

**Verify**: local dev starts without env errors; smoke paths render; `vercel
build` exits 0.

### Step 8: Final dependency and security checks

Run:

```bash
pnpm audit --audit-level high
npm outdated --json --package-lock=false --include=dev
git status --short
```

Expected results:

- `pnpm audit --audit-level high` exits 0, or every remaining high/critical
  advisory is documented with why it is unreachable or blocked.
- `npm outdated` prints `{}` or only packages intentionally deferred because the
  latest version is incompatible; each deferred package must be named in the PR
  summary and in `plans/README.md`.
- `git status --short` includes only intended source/config/lockfile changes
  plus the plan status update. It must not include `.env.local` or `.vercel/`.

## Test plan

There is no existing test script in `package.json`. Use build, typecheck, lint,
local dev, and Vercel build as the verification baseline for this migration.
If package-specific breakage requires code changes in API routes or data
helpers, add narrowly scoped tests only if the repo already has test
infrastructure by the time the executor runs. Otherwise, do not introduce a
new test framework inside this dependency-only plan; document the missing test
baseline as follow-up.

## Done criteria

All must hold:

- [ ] `package.json` and `pnpm-lock.yaml` are updated to latest stable package
      versions from a fresh registry query.
- [ ] `.env.example` contains every variable name required by `env.mjs`, with
      placeholders only and no real secret values.
- [ ] Vercel env was pulled into ignored `.env.local` or the operator approved
      an equivalent local secret source.
- [ ] `pnpm install` exits 0.
- [ ] `pnpm exec tsc --noEmit --incremental false` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm build` exits 0.
- [ ] `pnpm dev` starts locally with the pulled environment.
- [ ] `vercel build` exits 0.
- [ ] `pnpm audit --audit-level high` exits 0 or any remaining high/critical
      advisory is explicitly documented.
- [ ] `git status --short` shows no `.env*`, `.vercel/`, generated secret files,
      or unrelated changes.
- [ ] `plans/README.md` status row for this plan is updated.

## STOP conditions

Stop and report back if:

- The Vercel account cannot access `larks-projects-aafa7a73/meme`.
- Pulling env values would require exposing secret values in a committed file
  or chat transcript.
- `npm-check-updates` or registry output shows a latest major version with an
  incompatible peer dependency against the desired Next/React pair.
- Next 16 requires a Node.js version newer than the deployment or local runtime
  available to the operator.
- A package's migration guide requires product decisions rather than mechanical
  API changes, such as changing auth flows, Sanity content model semantics, or
  database schema behavior.
- Fixing build errors requires broad feature rewrites outside the in-scope
  files.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

- This plan intentionally upgrades to latest stable versions, so it has a large
  blast radius. Reviewers should inspect every source hunk and confirm it traces
  to a package breaking change.
- Keep `.env.example` synchronized with `env.mjs` in future env changes.
- Consider adding a dedicated `typecheck` script and a real test baseline after
  this lands; right now migration safety depends heavily on build/lint/dev smoke
  checks.
- Revisit `vercel.json` after the upgrade. A single-package Next app likely
  should not use `pnpm turbo build` unless the repository intentionally uses
  Turbo pipeline configuration for Vercel.
