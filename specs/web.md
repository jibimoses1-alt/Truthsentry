# Spec: Web application (authenticated product)

> **Superseded for detail by:** [feat-0010](./features/feat-0010-chat-threads/PRODUCT.md)–[feat-0014](./features/feat-0014-chat-outbox/PRODUCT.md), [feat-0007](./features/feat-0007-i18n/PRODUCT.md), [feat-0022](./features/feat-0022-ui-design-system/PRODUCT.md), [feat-0024](./features/feat-0024-client-errors-toasts/PRODUCT.md). This file remains a vertical summary.

## Problem

Signed-in users need a **reliable web chat** to submit claims (including **Fula / Peul**), read AI-assisted replies or clear status when the system cannot verify, and see history. **Admins** need a separate surface to work the **human review queue**. All flows must remain understandable on **small screens** and in **low-connectivity** conditions.

## Goals

- Email + password auth for end users; session handling consistent with security ADRs.
- Distinct **admin** area (path prefix or subdomain strategy to be chosen in implementation; default suggestion: `/admin` behind role guard).
- Chat-style claim submission with **message list**, **input**, **send**, and **system messages** for state changes.
- Accessible components (keyboard, focus, ARIA) using `packages/ui` patterns.
- Respect `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_URL` from `docs/env/README.md`.

## Non-goals

- Full-featured customer support ticketing for the general public (only claim review for this product).
- Offline-first PWA (optional later).

## Scope (MVP)

- Routes: sign-up, sign-in, password reset request (if Resend templates ready), chat home, claim detail/history (exact IA to refine), admin queue list and detail.
- Locale: FR/EN for UI chrome; claim input accepts any Unicode script; optional user preference stored on profile.

## User stories

1. As a **user**, I want to sign in and start a new conversation so I can submit a claim in my language.
2. As a **user**, I want to see whether my claim was answered by AI, queued for humans, or rejected with a reason.
3. As an **admin**, I want to filter the queue by date and status and open a claim to add a resolution note.

## Success criteria

- WCAG 2.2 AA target for auth and chat surfaces (document exceptions if any third-party widget blocks full compliance).
- No client bundle includes **service role** or **database** credentials.
- Claim submission shows optimistic UI only if server confirms idempotency contract (see `api.md`).

## Functional requirements

### FR-W-1 Authentication UI

- Forms with validation (email format, password policy displayed before submit).
- Clear error messages for wrong password, unverified email (if used), rate limit.

### FR-W-2 Chat UI

- Scrollable thread; newest at bottom; “load older” if pagination added.
- Input: multiline, character limit aligned with API; show remaining count near limit.
- Display **AI** vs **system** vs **human** message types with distinct styling (not relying on colour alone).

### FR-W-3 Admin UI

- Table or list with columns: id, created at, status, locale, snippet of claim text.
- Detail view: full text, AI metadata (if any), actions: assign, resolve, add internal note (permissions in `api.md`).

### FR-W-4 Internationalisation

- Resource files for FR/EN chrome strings.
- No automatic translation of user-authored claim text unless a later spec adds it.

## Architecture impact

- **App**: `apps/web` App Router; server components for shell where possible; tRPC React Query client for mutations/queries.
- **Packages**: `@truthsentry/ui`, `@truthsentry/trpc` types once routers exist.

## API and data impact

- Consumes procedures defined in `api.md`; no duplicate business rules in client beyond presentation.

## Implementation plan

1. Auth pages + session provider wired to API/cookies strategy chosen in ADR.
2. Chat layout and empty state; connect `claim.create` and `claim.list` (names illustrative).
3. Admin routes behind role check from session.
4. i18n provider and string extraction.

## Risks and mitigations

- **Risk**: Double submit creates duplicate claims.
    - **Mitigation**: client idempotency key + server unique constraint (see `api.md`).
- **Risk**: RTL or mixed-script layout breaks.
    - **Mitigation**: CSS logical properties; test with sample Peul/Fula strings.

## Rollout plan

- Feature flags optional: `NEXT_PUBLIC_ENABLE_ADMIN` for staging-only admin until stable.

## Rollback plan

- Disable admin routes via flag; revert API deployment if claim contract changes.

## Test plan

- **Unit**: form validators, small pure helpers.
- **Integration**: tRPC mocks for thread rendering.
- **E2E** (when Playwright configured): sign-in smoke, submit claim happy path.

## Open questions

- Subdomain vs path for admin.
- Whether end users see human-written resolution text or only status enum.
