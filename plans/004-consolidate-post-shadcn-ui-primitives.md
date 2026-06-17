# Plan 004: Consolidate the post-shadcn UI primitive layer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**:
> `git diff --stat b2bc41e..HEAD -- app components package.json bun.lock app/globals.css tailwind.config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans/002-restore-green-quality-gates.md
- **Category**: tech-debt
- **Planned at**: commit `b2bc41e`, 2026-06-17

## Why this matters

The shadcn files were removed, but the UI layer is still mixed: Kumo is used in
the new admin sidebar/search path, custom `components/oui` primitives power the
public site, Ant Design still owns admin tables/forms/modals, and Radix still
backs some wrappers. That can be fine if each layer has a clear boundary, but
right now the boundary is implicit. This plan makes the boundary explicit,
removes dead primitive code where Kumo can replace it safely, and creates a
reviewable migration map for larger Ant Design screens.

## Current state

- `app/globals.css:1-2` imports Kumo's Tailwind v4 integration:

```css
@source "../node_modules/@cloudflare/kumo/dist/**/*.{js,jsx,ts,tsx}";
@import "@cloudflare/kumo/styles/tailwind";
```

- `app/admin/Sidebar.tsx:9` imports Kumo `Button`, and
  `components/CommandSearch.tsx:5` imports Kumo `CommandPalette`.
- `components/oui/Button.tsx:1-37` is a custom button/link wrapper with an
  eslint-disable comment and `props as any` casts.
- `components/oui/Tooltip.tsx:5-64` wraps Radix Tooltip and adds a custom
  `ElegantTooltip` animation.
- `components/data-table/index.tsx:6-8` mixes Radix icons with Ant Design table,
  modal, and button primitives.
- Admin CRUD forms still import Ant Design directly, for example:
  - `app/admin/content/project/_mods/create-dialog.tsx`
  - `app/admin/content/project/_mods/update-dialog.tsx`
  - `app/admin/newsletters/new/page.tsx`
- Public site pages import `~/components/oui/Button`, `Container`, `Tooltip`,
  and `Card` across `app/(main)/**` and `components/portable-text/**`.

Important boundary decision for this plan:

- Public site visual primitives may stay in `components/oui` if they are
  product-specific and typed cleanly.
- New admin shell primitives should prefer Kumo.
- Ant Design table/form screens should not be rewritten in this plan unless
  Kumo has a direct component with equivalent behavior and the change stays
  local.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| UI import inventory | `rg -n "@cloudflare/kumo|antd|@radix-ui|~/components/oui|~/components/ui" app components hooks lib --glob '!**/*.d.ts'` | prints current UI usage |
| Lint | `bun run lint` | exits 0 |
| Typecheck | `bun run typecheck` | exits 0 |
| Build | `bun run build` | exits 0 |
| Dev smoke | `bun run dev` | starts Next dev server |

## Scope

**In scope**:

- `components/oui/Button.tsx`
- `components/oui/Tooltip.tsx`
- `components/oui/Dialog.tsx`
- `components/oui/HoverCard.tsx`
- `components/oui/Card.tsx`
- `components/CommandSearch.tsx`
- `app/admin/Sidebar.tsx`
- Import updates in direct callers under `app/(main)/**`, `app/admin/**`, and
  `components/**`
- `docs/ui-migration.md` or `plans/ui-migration-notes.md` if a migration map is
  needed

**Out of scope**:

- Full Ant Design table/form replacement.
- Visual redesign of the public site.
- Changing route/data behavior.
- Replacing Sonner toast calls.
- Adding new UI libraries beyond Kumo.

## Git workflow

- Branch: keep working on `codex/refactor-plan`.
- Commit message style: use `refactor: consolidate ui primitives`.
- Do not push or open a PR unless the operator asks.

## Steps

### Step 1: Write the UI ownership map

Create a short markdown file, preferably `docs/ui-migration.md` if `docs/`
exists or `plans/ui-migration-notes.md` if not. Document:

- Kumo owns new admin shell primitives and command/search surfaces.
- `components/oui` owns public-site product-specific presentation primitives
  that Kumo does not replace cleanly.
- Ant Design remains temporarily for admin data-heavy tables/forms.
- Radix remains only as an implementation detail behind wrappers, not as a
  direct import in new app pages.

Include the current import inventory command and its output summary. Do not
paste huge command output.

**Verify**: the markdown file exists and mentions Kumo, `components/oui`, Ant
Design, and Radix boundaries.

### Step 2: Type custom public-site primitives

Remove `any` casts and disable comments from public-site primitives where
possible:

- In `components/oui/Button.tsx`, make the link/button union explicit. A safe
  shape is a discriminated union where `href: string` selects `Link` props and
  absence of `href` selects native button props.
- In `components/oui/Card.tsx`, remove `props as any` by typing the component's
  polymorphic surface or narrowing it to the actual usages.
- Keep class names and visual output stable.

**Verify**:

- `rg -n "as any|eslint-disable" components/oui` returns no matches, or only
  documented exceptions in files untouched by this step.
- `bun run typecheck` exits 0.

### Step 3: Normalize Kumo admin usage

Audit `app/admin/Sidebar.tsx` and `components/CommandSearch.tsx`:

- Replace placeholder command items in `components/CommandSearch.tsx:26-43`
  with real admin destinations from `menus` where practical. Each command item
  should navigate or perform a real action; no "Calculator/Billing" placeholders.
- Keep the Kumo `CommandPalette` integration.
- Type `MenuType.icon` without `any`.
- Avoid hook calls in non-component helpers if refactoring `renderMenu`; if it
  remains a component-like function, rename it to `RenderMenu` and render it as
  JSX so React hook rules are clear.

**Verify**:

- `bun run lint` exits 0.
- Search for placeholder labels:
  `rg -n "Calculator|Billing|Search Emoji|Suggestions" components/CommandSearch.tsx`
  returns no matches.

### Step 4: Reduce direct Radix imports in app-facing code

Keep Radix inside wrappers only. Direct Radix imports currently remain in:

- `components/oui/Dialog.tsx`
- `components/oui/HoverCard.tsx`
- `components/oui/Tooltip.tsx`
- `components/portable-text/PortableTextImage.tsx`

If `PortableTextImage` can use `components/oui/Dialog.tsx` without changing
behavior, migrate it. If not, document why it stays direct in the migration map.

**Verify**:
`rg -n "@radix-ui" app components --glob '!components/oui/**' --glob '!**/*.d.ts'`
returns no matches, or only documented exceptions.

### Step 5: Leave Ant Design screens intentionally bounded

Do not rewrite the admin data table/forms yet. Instead:

- Ensure every remaining direct Ant Design import is under `app/admin/**`,
  `components/data-table/**`, `components/theme/**`, `components/StatisticsCard.tsx`,
  or `hooks/use-form.ts`.
- Add a note to the migration map listing the Ant Design surfaces left for a
  later table/form migration.

**Verify**:
`rg -n "from ['\\\"]antd|antd/" app components hooks lib --glob '!**/*.d.ts'`
shows only admin/data-table/theme/form helper locations.

## Test plan

This plan is mostly UI structure. Use existing gates plus a manual smoke:

- `bun run lint` exits 0.
- `bun run typecheck` exits 0.
- `bun run build` exits 0.
- Start `bun run dev`, open `/`, `/blog`, `/admin`, and `/admin/content/project`
  with a valid local session. Confirm no obvious layout break in header, command
  palette, sidebar, project table, and public-site buttons/tooltips.

## Done criteria

- [ ] UI ownership/migration map exists and documents Kumo/oui/AntD/Radix
  boundaries.
- [ ] `components/oui` has no avoidable `any` casts or lint-disable comments.
- [ ] Admin command palette items are real app actions/destinations.
- [ ] Direct Radix imports outside wrappers are gone or explicitly documented.
- [ ] Remaining Ant Design imports are bounded to admin/table/theme/form helper
  surfaces.
- [ ] `bun run lint`, `bun run typecheck`, and `bun run build` exit 0.
- [ ] `plans/README.md` status row for plan 004 is updated.

## STOP conditions

Stop and report back if:

- Kumo lacks a component needed to replace a primitive without visible behavior
  loss.
- Typing `components/oui/Button.tsx` requires changing more than five callers.
- Removing a direct Radix import changes image preview/dialog accessibility.
- Ant Design replacement starts touching table pagination, form validation, or
  modal workflows broadly.

## Maintenance notes

This is a boundary-setting refactor, not a full redesign. Reviewers should
check import direction and component ownership more than pixel changes. After
this lands, a later plan can safely target one admin table/form flow at a time.
