# Plan 002: Restore green quality gates after the Bun/Biome migration

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**:
> `git diff --stat b2bc41e..HEAD -- package.json biome.json tsconfig.json README.md app components hooks lib next.config.mjs tailwind.config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-upgrade-dependencies-and-verify-vercel-env.md
- **Category**: dx
- **Planned at**: commit `b2bc41e`, 2026-06-17

## Why this matters

The migration to Bun, Biome, Next 16, React 19, and Tailwind v4 now builds, but
the new lint command is not a usable gate yet. `bun run lint` fails with real
diagnostics, so future refactors can quietly add more debt. This plan makes the
basic developer contract explicit: lint, typecheck, and build should all be
one-command checks, and README setup instructions should describe the actual
project instead of the old Tailwind v3 example.

## Current state

- `package.json` uses Bun and Biome, but only exposes `lint` and `build`; there
  is no `typecheck`, `format:check`, or combined `check` script.
- `README.md:1-18` is still the stock Next/Tailwind v3 example and mentions
  `npx create-next-app` / Yarn rather than this project's Bun workflow.
- `bun run lint` at commit `b2bc41e` exits 1 with 19 errors, 136 warnings, and
  33 infos.
- `app/admin/layout.tsx:18-30` contains commented-out auth code, a swallowed
  catch path, and a `console.log`:

```tsx
// app/admin/layout.tsx:18-30
// const { userId } = auth()
try {
  const user = await currentUser()
  if (!user || !user.publicMetadata.siteOwner) {
    redirect('/')
  }
} catch (error) {
  console.log('error-->', error)
}
```

- `hooks/use-form.ts:24-35` has implicit `any` in `mapErrorFromZodIssue` and
  generic constraints of `Record<string, any>`.
- `hooks/use-form.ts:94-95` logs validation fields and casts to `any[]`.
- `components/data-table/index.tsx:11-12` defaults generic table data to `any`.
- `components/data-table/index.tsx:28-55` logs selected rows and cancel events.
- Biome's first diagnostics also cite unused imports/variables in
  `app/(main)/(blog)/BlogPostPage.tsx`, `app/(main)/Resume.tsx`,
  `app/(main)/page.tsx`, `app/admin/Header.tsx`,
  `app/admin/comments/page.tsx`, and
  `app/admin/content/project/_lib/queries.ts`.

Repo conventions to preserve:

- Use Bun commands; do not reintroduce pnpm or npm lockfiles.
- Keep source formatting compatible with `biome.json`: single quotes, trailing
  commas, space indentation.
- Keep `bunx tsc --noEmit --incremental false` as the typecheck verifier; this
  command passed before this plan was written.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Lint | `bun run lint` | exits 0, no Biome errors |
| Typecheck | `bun run typecheck` | exits 0, no TypeScript errors |
| Format check | `bun run format:check` | exits 0, no formatting diffs required |
| Build | `bun run build` | exits 0 and prints the Next route table |
| Combined check | `bun run check` | exits 0 after lint, typecheck, and format check |

## Scope

**In scope**:

- `package.json`
- `biome.json`
- `README.md`
- Files with diagnostics from `bun run lint`
- Narrow type fixes needed by those diagnostics

**Out of scope**:

- Adding a test runner or tests; that is plan 003.
- Large UI library migrations; that is plan 004.
- Database schema changes or `db:push`.
- Secret-bearing files such as `.env`, `.env.local`, and `.vercel/`.

## Git workflow

- Branch: keep working on `codex/refactor-plan`.
- Commit message style: current history uses short conventional-style messages;
  use `fix: restore green quality gates` or similar.
- Do not push or open a PR unless the operator asks.

## Steps

### Step 1: Add explicit quality scripts

Update `package.json` scripts:

- Add `"typecheck": "tsc --noEmit --incremental false"`.
- Add `"format:check": "biome format . --diagnostic-level=error"`.
- Add `"check": "bun run lint && bun run typecheck && bun run format:check"`.
- Keep `"lint": "biome lint ."` and `"build": "next build"`.

**Verify**: `bun run typecheck` exits 0.

### Step 2: Fix Biome correctness errors first

Run `bun run lint -- --max-diagnostics=300` and fix all diagnostics in
correctness/complexity categories before style cleanup. Prefer deleting unused
imports/variables over prefixing with `_` unless the value is intentionally
reserved for a callback signature.

Known files from the initial run include:

- `app/(main)/(blog)/BlogPostPage.tsx`
- `app/(main)/Footer.tsx`
- `app/(main)/Headline.tsx`
- `app/(main)/Resume.tsx`
- `app/(main)/page.tsx`
- `app/admin/Header.tsx`
- `app/admin/comments/page.tsx`
- `app/admin/content/project/_lib/queries.ts`
- `app/admin/layout.tsx`

For `app/admin/layout.tsx`, remove the unused `auth` import and replace the
swallowed catch with a deterministic redirect or rethrow pattern. Do not leave
debug logging in a protected layout.

**Verify**: `bun run lint -- --max-diagnostics=300` reports fewer diagnostics
than the initial 188 total and no `lint/correctness/*` errors.

### Step 3: Remove debug logs from application code

Remove or replace migration/debug logs in user-facing and server code. Known
locations include:

- `hooks/use-form.ts:94`
- `components/data-table/index.tsx:29`, `:44`, `:55`
- `lib/middleware/geo.middleware.ts:17`, `:41`
- `app/(main)/(blog)/BlogPosts.tsx:10`
- `app/api/media/route.ts:72`, `:137`, `:144`
- `app/api/s3/[key]/sts/route.ts:67`

Use `console.error` only for actionable error paths where the message includes
context and does not expose request bodies, tokens, or secrets. Otherwise remove
the log.

**Verify**:
`rg -n "console\\.log" app components hooks lib --glob '!**/*.d.ts'` returns no
matches except intentional comments, if any.

### Step 4: Tighten obvious `any` boundaries touched by lint

Do not attempt a full strict-mode migration. Replace the obvious local `any`
uses where the type is available:

- `app/admin/Sidebar.tsx:28`: type `icon` as a React component accepting
  `className?: string`.
- `components/data-table/index.tsx:11`: default `TData` to `Record<string, unknown>`
  or a better row constraint that still works with Ant Design table rows.
- `hooks/use-form.ts`: type Zod issues with `z.ZodIssue[]` and use Ant Design's
  field-data types instead of `any[]`.

If a type fix expands beyond these local files, STOP and report; this plan is
not a strict-mode rewrite.

**Verify**: `bun run typecheck` exits 0.

### Step 5: Replace the README with current setup docs

Rewrite `README.md` to describe this project, not the stock Tailwind example.
Include:

- Bun as the package manager.
- Required local commands: `bun install`, `bun run dev`, `bun run check`,
  `bun run build`.
- Vercel env pull guidance without secret values.
- High-level stack: Next 16, React 19, Tailwind v4, Kumo, Biome, Drizzle,
  Sanity, Clerk.
- A short note that `.env`, `.env.local`, and `.vercel/` must stay uncommitted.

**Verify**: `rg -n "Tailwind CSS Example|create-next-app|Yarn|Tailwind CSS v3" README.md`
returns no matches.

## Test plan

This plan does not add tests. Its verification is the tooling baseline:

- `bun run lint` exits 0.
- `bun run typecheck` exits 0.
- `bun run format:check` exits 0.
- `bun run build` exits 0.
- `bun run check` exits 0.

## Done criteria

- [ ] `package.json` has `typecheck`, `format:check`, and `check`.
- [ ] `bun run lint` exits 0.
- [ ] `bun run typecheck` exits 0.
- [ ] `bun run format:check` exits 0.
- [ ] `bun run build` exits 0.
- [ ] `README.md` documents the real Bun/Next/Tailwind/Kumo workflow.
- [ ] `plans/README.md` status row for plan 002 is updated.

## STOP conditions

Stop and report back if:

- Biome reports more than 300 diagnostics after the first cleanup pass.
- Fixing lint requires changing route behavior, database schema, or auth policy.
- The type fixes require enabling `strict` or touching generated/CMS schema
  files broadly.
- `bun run build` fails for an environment-variable issue that is not present
  in `.env.example`.

## Maintenance notes

After this lands, future refactors should run `bun run check` before `bun run
build`. Reviewers should be suspicious of any new `console.log`, `any`, or
disabled Biome rule unless the PR explains why it is temporary.
