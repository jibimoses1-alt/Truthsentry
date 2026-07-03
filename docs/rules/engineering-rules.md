# Engineering Rules

## General

- Use TypeScript for all application and package code.
- Prefer named exports and small, focused modules.
- Keep changes package-scoped and avoid cross-boundary coupling.
- Validate all external input at boundaries.
- Treat all workspace packages as private/internal unless explicitly re-scoped later.

## Next.js and React

- Prefer server-first rendering patterns.
- Keep client components minimal and purpose-specific.
- Handle loading, error, and empty states explicitly.

## tRPC

- Validate procedure input with Zod.
- Keep procedures orchestration-focused; move heavy logic into services.
- Return consistent, user-safe error shapes.

## Prisma and Supabase

- Prefer explicit field selection over broad queries.
- Keep migration changes additive where possible.
- Do not expose raw database/provider errors to end users.

## Shared UI

- Use `@truthsentry/ui` for shared components.
- Keep app-specific UI in app-local folders, not shared package internals.

## Quality

- Run `pnpm lint` and `pnpm typecheck` before merging significant changes.
- Add or update tests for behavior changes and bug fixes.
