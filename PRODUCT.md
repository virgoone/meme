# Product

## Register

product

## Users

This project serves two related users: readers visiting a personal technical blog, and the site owner maintaining content, comments, newsletters, media, and projects through the admin surface. The current refactor focuses on the admin/tool workflow, where the user needs a calm, predictable interface for repeated operational tasks.

## Product Purpose

Meme is a Next.js content site with an authenticated admin workspace. It publishes posts, projects, newsletters, guestbook activity, comments, and media-backed content. Success means the public site stays fast and expressive while the admin area remains easy to scan, safe to operate, and straightforward to maintain after the Bun, Tailwind v4, and Kumo migration.

## Brand Personality

Precise, personal, and work-focused. The public site can retain a personal editorial voice, but admin UI should feel restrained and utilitarian: familiar controls, dense information where useful, and no decorative complexity that slows down routine tasks.

## Anti-references

Do not let the UI become a mixed component museum. Avoid screens that combine Ant Design, Radix wrappers, custom shadcn-era primitives, and Kumo controls in the same workflow. Avoid marketing-style hero composition inside admin pages, oversized cards for operational data, and placeholder command-palette actions that do not navigate or act.

## Design Principles

1. Keep one component vocabulary for product UI: Kumo is the default UI system.
2. Make admin workflows scannable before expressive: tables, forms, dialogs, and navigation should optimize repeated use.
3. Preserve public-site personality without leaking bespoke visual primitives into admin tooling.
4. Treat build, typecheck, lint, and local smoke tests as part of the design system; a component boundary is only real when it verifies cleanly.
5. Prefer explicit boundaries over half-migrations: if a dependency remains, it must have a named reason and a follow-up path.

## Accessibility & Inclusion

Target practical WCAG AA behavior for interactive product UI: visible focus states, semantic controls, keyboard-accessible dialogs and command surfaces, adequate text contrast, and no motion that blocks task completion. Keep reduced-motion users in mind for animated public-site affordances.
