# Plan 003: Add a minimal regression test harness for mutation APIs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**:
> `git diff --stat b2bc41e..HEAD -- package.json bun.lock app/api db/dto lib/redis.ts lib/mail.ts env.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/002-restore-green-quality-gates.md
- **Category**: tests
- **Planned at**: commit `b2bc41e`, 2026-06-17

## Why this matters

The app now spans several upgraded major versions, but there are no test files
in the repo. The riskiest untested paths are mutation APIs that combine auth,
rate limiting, Zod validation, database writes, and email side effects. A small
unit/integration-style test harness around these route handlers will make the
next UI and data refactors much safer without requiring a full browser E2E
suite.

## Current state

- `rg --files | rg '(^|/)(.*\\.(test|spec)\\.(ts|tsx|js|jsx)|__tests__/)'`
  returns no matches at commit `b2bc41e`.
- `app/api/comments/[id]/route.ts:82-174` handles authenticated comment
  creation, Sanity lookup, parent decoding, optional email notification, DB
  insert, and response shaping in one route handler.
- `app/api/guestbook/route.ts:41-101` handles authenticated guestbook creation,
  rate limiting, optional email, DB insert, and response shaping.
- `app/api/s3/route.ts:20-85` restricts media creation to site owners and writes
  media rows.
- `app/api/newsletter/route.ts:26-71` validates email input and writes
  subscribers only in production after sending a confirmation email.

Representative current code:

```ts
// app/api/guestbook/route.ts:41-57
export async function POST(req: NextRequest) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { success } = await ratelimit.limit(getKey(user.id))
  if (!success) {
    return new Response('Too Many Requests', { status: 429 })
  }

  try {
    const data = await req.json()
    const { message } = SignGuestbookSchema.parse(data)
```

```ts
// app/api/s3/route.ts:20-24
const user = await currentUser()
if (!user || !user.publicMetadata.siteOwner) {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
}
```

Repo conventions to preserve:

- Route handlers are plain exported `GET`/`POST` functions using `NextRequest`
  and `NextResponse`.
- Validation uses Zod DTO/schema modules.
- The project uses Bun; use a test runner that runs cleanly under Bun.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install deps | `bun add -d vitest` | exits 0 and updates `package.json` + `bun.lock` |
| Test | `bun run test` | exits 0, all tests pass |
| Lint | `bun run lint` | exits 0 |
| Typecheck | `bun run typecheck` | exits 0 |
| Build | `bun run build` | exits 0 |

## Scope

**In scope**:

- `package.json`
- `bun.lock`
- `vitest.config.ts` or equivalent minimal test config
- `app/api/**/__tests__/*.test.ts` or colocated `*.test.ts` files for:
  - `app/api/guestbook/route.ts`
  - `app/api/comments/[id]/route.ts`
  - `app/api/s3/route.ts`
  - optionally `app/api/newsletter/route.ts` if the first three are stable
- Small helper files under `test/` if needed for mocks/request factories

**Out of scope**:

- Browser E2E tests.
- Real database, Redis, Clerk, Sanity, or Resend network calls.
- Changing route behavior except where a test exposes an obvious bug and the
  fix is local.
- Refactoring route handlers into a new framework.

## Git workflow

- Branch: keep working on `codex/refactor-plan`.
- Commit message style: use `test: add mutation route coverage`.
- Do not push or open a PR unless the operator asks.

## Steps

### Step 1: Add the test runner

Install Vitest and add scripts:

- `"test": "vitest run"`
- `"test:watch": "vitest"`

If Vitest cannot run in this repo without large config changes, STOP and
report. Do not switch to a browser E2E framework for this plan.

**Verify**: `bun run test` exits 0 with "No test files found" or equivalent
before tests are added, or exits 1 only because no tests exist.

### Step 2: Add test helpers for route handlers

Create a small helper that builds `NextRequest` objects with JSON bodies and
parses JSON responses. Mock the following modules in tests:

- `@clerk/nextjs/server` for `currentUser` and `clerkClient`.
- `~/lib/redis` or route-local `ratelimit` usage so rate limiting can return
  success/failure deterministically.
- `~/db` so `.insert().values().returning()` and `.select()` chains can be
  controlled without a real database.
- `~/sanity/lib/client` for comment post lookups.
- `~/lib/mail` for email sending.

Keep mocks local to tests unless two route test files need the exact same
factory.

**Verify**: `bun run test -- --runInBand` if supported, otherwise `bun run test`;
the command should execute the helper imports without module-resolution errors.

### Step 3: Cover unauthenticated and validation failures

Add tests for:

- `POST /api/guestbook`: unauthenticated user returns 401.
- `POST /api/guestbook`: empty message returns 400.
- `POST /api/comments/[id]`: unauthenticated user returns 401.
- `POST /api/comments/[id]`: empty text returns 400 after auth.
- `POST /api/s3`: non-owner or missing user returns 401.

Assert status codes and avoid snapshotting full error objects. If current
handlers return serialized raw errors, assert only the status and then record a
follow-up note; do not expose stack traces in tests.

**Verify**: `bun run test` exits 0.

### Step 4: Cover one happy path per critical route

Add tests for:

- Guestbook creation returns 201 and encodes the returned ID.
- Comment creation returns JSON with encoded `id`, original hashed `parentId`
  when present, and does not send reply email outside production.
- S3 media creation returns 201 for a site owner and passes parsed media fields
  to the DB insert.

Keep assertions focused on behavior that must not regress during refactors.

**Verify**: `bun run test` exits 0.

### Step 5: Add tests to the quality gate

After tests are stable, update `package.json` so `bun run check` includes tests
after lint/typecheck/format check. If plan 002 chose a different `check` order,
preserve that order and append tests before build.

**Verify**:

- `bun run test` exits 0.
- `bun run check` exits 0.
- `bun run build` exits 0.

## Test plan

The new tests are the deliverable. They must cover at least:

- 3 unauthenticated/authorization failures.
- 2 validation failures.
- 3 happy paths across guestbook, comments, and S3 media creation.

## Done criteria

- [ ] A test runner is installed and documented in `package.json`.
- [ ] `bun run test` exits 0 with the new route tests.
- [ ] `bun run check` includes tests and exits 0.
- [ ] No tests call real Clerk, Redis, Sanity, Resend, S3, or database services.
- [ ] `bun run build` exits 0.
- [ ] `plans/README.md` status row for plan 003 is updated.

## STOP conditions

Stop and report back if:

- Route handlers cannot be imported in tests without executing real env
  validation or network clients.
- Mocking the Drizzle query chains requires changing production DB modules.
- A test requires real secrets or `.env.local` values.
- The fix for a discovered bug would touch unrelated UI/admin code.

## Maintenance notes

These tests are characterization tests for current behavior. Reviewers should
check that mocks are not so broad that the tests merely assert the mocks. Once
these exist, later route refactors should update tests first, then production
code.
