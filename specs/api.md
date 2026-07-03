# Spec: API layer (tRPC)

> **Superseded for detail by:** [feat-0003](./features/feat-0003-api-trpc/PRODUCT.md)–[feat-0006](./features/feat-0006-email/PRODUCT.md), [feat-0016](./features/feat-0016-rate-limiting/PRODUCT.md), [feat-0021](./features/feat-0021-health-observability/PRODUCT.md), [feat-0024](./features/feat-0024-client-errors-toasts/PRODUCT.md). This file remains a vertical summary.

## Problem

The browser and any future clients need a **typed, versionable API** for authentication, claims, AI outcomes, and admin workflows. Business rules and authorisation must live **server-side** behind tRPC procedures, using **Prisma** for persistence and Supabase Postgres as the database.

## Goals

- Single tRPC router (or modular sub-routers) merged into one `appRouter` type export for `@truthsentry/web`.
- Clear **authorisation matrix**: who can call which procedure.
- **Input validation** on every procedure (Zod or equivalent aligned with repo rules).
- Predictable error mapping (user-safe vs log-only detail).

## Non-goals

- Public REST or GraphQL exposure in MVP (can be ADR’d later).
- Running long-running AI jobs inside HTTP request thread without timeout strategy (use async pattern if wall-clock exceeds SLO).

## Domain models (Prisma-oriented)

These are the **intended** relational shapes for MVP. Exact field names and indexes live in `packages/prisma` when implemented; keep this section in sync when the schema changes.

| Model             | Purpose                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `User`            | End-user or admin login identity: unique email, password hash (or auth-provider subject), verification flags, timestamps.                                                            |
| `UserRole`        | Optional junction table **or** `Role[]` on `User` if you prefer a single column enum array (Postgres). Supports multiple roles per user (e.g. `ADMIN` + `USER` only if ever needed). |
| `Session`         | Server-side session or refresh-token row if you use DB-backed sessions; omit if the auth library stores sessions elsewhere.                                                          |
| `Claim`           | One logical claim thread per user submission lifecycle: status enum, `locale`, `clientRequestId` (unique per user for idempotency), `createdByUserId`, optional `campaignId`.        |
| `ClaimMessage`    | Individual turns: `role` (`user` \| `assistant` \| `system`), body text, timestamps; links to `Claim`.                                                                               |
| `ClaimAiRun`      | One row per AI attempt: model id/version, confidence, decision, retrieval ids, timeout/error codes (see `claims-ai-pipeline.md`).                                                    |
| `AdminAuditLog`   | Append-only admin actions: `actorUserId`, `action`, `targetType`, `targetId`, `payload` (JSON), `createdAt`.                                                                         |
| `Campaign`        | Optional: slug, human label, active flag for `/r/{slug}` style entry (see `whatsapp-distribution.md`).                                                                               |
| `UserAttribution` | Optional: first-touch campaign / UTM snapshot tied to `userId` at signup.                                                                                                            |
| `EmailDelivery`   | Optional idempotency log: `idempotencyKey`, template key, `toUserId`, status, provider ids, for Resend retries and support.                                                          |

**Guest** is not necessarily a row: see [Identity tiers](#identity-tiers-and-rbac) below.

## Identity tiers and RBAC

### Tiers

| Tier                         | Meaning                                                                                                                                                                                                                          | `ctx.session`               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Anonymous**                | No login; only `public` procedures (and static marketing pages).                                                                                                                                                                 | Absent                      |
| **Guest (optional product)** | If you add “try before signup”, use a **short-lived device token** or server session with **no `User`** row and strict rate limits; document before implementing. MVP default: **no guest claims**—all `claim.*` require `User`. | Optional extension          |
| **User**                     | Signed-in end user (`Role.USER`).                                                                                                                                                                                                | `userId` required           |
| **Admin**                    | Signed-in staff (`Role.ADMIN`). Same `User` table, elevated roles.                                                                                                                                                               | `userId` + `ADMIN` in `ctx` |

### RBAC model

- **Roles** (enum): at minimum `USER`, `ADMIN`. Add `REVIEWER` later if reviewers are not full admins.
- **Enforcement**: tRPC **middleware** on merged `appRouter`:
    - `publicProcedure` — no session.
    - `protectedProcedure` — session with verified user (define whether email must be verified for `claim.create`).
    - `adminProcedure` — session + `ADMIN` (and optionally `REVIEWER` for a subset of `admin.*` routes via a small permission map).

**Rules**

- Never accept `userId` or `role` from the client to authorise reads; derive from session only.
- Admin list endpoints must **403** when the caller lacks role (do not return empty data as a substitute).

### Permission matrix (MVP)

| Capability                           | Anonymous         | User                     | Admin                          |
| ------------------------------------ | ----------------- | ------------------------ | ------------------------------ |
| Health / version ping                | Yes               | Yes                      | Yes                            |
| Sign up / sign in / password reset   | Yes (auth routes) | Yes                      | Yes                            |
| `session.me`                         | No                | Yes                      | Yes                            |
| Create/list/read own claims          | No                | Yes                      | No                             |
| Run AI verification for own claim    | No                | Yes (if synchronous MVP) | No                             |
| List queue / read any claim          | No                | No                       | Yes                            |
| Update claim status / add resolution | No                | No                       | Yes                            |
| Impersonate user                     | No                | No                       | No (non-goal unless specified) |

## Router layout (tRPC namespaces)

Suggested shape: **sub-routers** merged into `appRouter` for clarity and middleware reuse.

```text
appRouter
  health          -> publicProcedure
  auth            -> publicProcedure (rate-limited)
  session         -> protectedProcedure
  claim           -> protectedProcedure
  admin           -> adminProcedure
  internalAi      -> optional: not on browser client; secured worker secret or separate server
```

## Procedure catalog (APIs to create)

Procedure names are stable **contracts** for the web app; rename only with a versioned migration plan for clients.

### `health` (public)

| Procedure     | Input | Output         | Notes          |
| ------------- | ----- | -------------- | -------------- |
| `health.ping` | none  | `{ ok: true }` | Uptime checks. |

### `auth` (public, rate-limited)

| Procedure                   | Input                                                            | Output             | Notes                                                         |
| --------------------------- | ---------------------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| `auth.register`             | email, password, optional `locale`, optional attribution payload | user id or session | Sends **verification email** if enabled.                      |
| `auth.login`                | email, password                                                  | session            | Sets cookie / token per auth ADR.                             |
| `auth.logout`               | none                                                             | void               | May be duplicated on `session`; keep one canonical path.      |
| `auth.requestPasswordReset` | email                                                            | void               | Always returns void to avoid email enumeration (document UX). |
| `auth.resetPassword`        | token, newPassword                                               | void               | Single-use token table or auth-library equivalent.            |
| `auth.verifyEmail`          | token                                                            | void               | Idempotent success if already verified.                       |

### `session` (protected)

| Procedure               | Input                      | Output               | Notes                        |
| ----------------------- | -------------------------- | -------------------- | ---------------------------- |
| `session.me`            | none                       | user profile + roles | No sensitive hash fields.    |
| `session.updateProfile` | display name, locale, etc. | updated user         | Omit until product needs it. |

### `claim` (protected)

| Procedure                 | Input                                | Output                          | Notes                                                                       |
| ------------------------- | ------------------------------------ | ------------------------------- | --------------------------------------------------------------------------- |
| `claim.create`            | `body`, `locale?`, `clientRequestId` | `{ claimId }`                   | Idempotent on `clientRequestId` + user.                                     |
| `claim.listMine`          | cursor / limit                       | page of claims                  | No cross-user leakage.                                                      |
| `claim.byId`              | `claimId`                            | claim + messages                | 404 if not owner (users); admins use `admin.claim.byId`.                    |
| `claim.appendUserMessage` | `claimId`, `body`                    | message row                     | If you allow follow-up turns in-thread.                                     |
| `claim.runVerification`   | `claimId`                            | status + assistant message stub | **Optional MVP**: may be internal-only worker instead (see Open questions). |

### `admin` (adminProcedure)

| Procedure                  | Input                                  | Output                                | Notes                                            |
| -------------------------- | -------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| `admin.queue.list`         | filters (status, date range), cursor   | rows                                  | Snippet only; full text on detail.               |
| `admin.claim.byId`         | `claimId`                              | full claim + messages + `ClaimAiRun`s |                                                  |
| `admin.claim.updateStatus` | `claimId`, new status, resolution note | void                                  | Validates state machine; writes `AdminAuditLog`. |
| `admin.claim.assign`       | `claimId`, `assigneeUserId?`           | void                                  | Optional if you add assignment.                  |
| `admin.audit.list`         | filters                                | events                                | Optional MVP.                                    |

### `internalAi` (not for browser clients)

If AI runs in a worker or separate service:

| Procedure / transport                                                 | Purpose                                                   |
| --------------------------------------------------------------------- | --------------------------------------------------------- |
| HTTP route with shared secret, or `internalAi.consumeJob` behind mTLS | Pull next job, write `ClaimAiRun`, update `Claim` status. |

Document the chosen pattern in an ADR; do not expose the same entrypoint from the public tRPC client.

## Email (Resend) integration

Transactional email is **not** a separate public REST API for end users; it is **invoked from server code** inside auth and claim flows (`packages/emails`), aligned with `docs/rules/email-rules.md`.

| Trigger                           | Template / class                             | Typical caller                                             |
| --------------------------------- | -------------------------------------------- | ---------------------------------------------------------- |
| After `auth.register`             | Email verification                           | `auth.register` mutation completion                        |
| After `auth.requestPasswordReset` | Password reset                               | same procedure                                             |
| Claim queued for human            | “We received your claim” / “Under review”    | `claim.create` or AI pipeline when status → `queued_human` |
| Claim resolved by admin           | “Outcome available” (if product sends email) | `admin.claim.updateStatus`                                 |
| Security alert (optional)         | New device login                             | future                                                     |

Each send should use an **idempotency key** (e.g. `${template}:${userId}:${eventId}`) and optionally persist to `EmailDelivery` for support and retries.

## Scope (MVP procedure sketch)

The tables above supersede the earlier sketch; keep **one** canonical list here to avoid drift.

## User stories (system)

1. As the **web app**, I want to create a claim and receive a stable `claimId` so the UI can correlate messages.
2. As an **admin**, I want listing and updating to fail closed if my session is not elevated.

## Success criteria

- 100% of public procedures validate input; invalid input returns **4xx-class** tRPC errors with stable error codes for UI mapping.
- **No procedure** accepts `service_role` or raw SQL from client input.
- Admin procedures return 403 when role missing (never empty list masking auth failure unless explicitly specified).

## Functional requirements

### FR-A-1 Context

- Each request carries **session** (user id, roles). No trust of `userId` from client body for scoped reads.

### FR-A-2 Claim creation

- Input: `body` (string, max length TBD), `locale` (optional BCP-47), `clientRequestId` (UUID for idempotency).
- Behaviour: if same `clientRequestId` seen for same user within retention window, return existing claim (HTTP-level idempotency contract documented in OpenAPI-style notes here when stable).

### FR-A-3 Claim reads

- `claim.listMine`: paginated, ordered by `createdAt` desc; does not leak other users’ ids.

### FR-A-4 Admin updates

- Validates state machine transitions from `claims-ai-pipeline.md`; writes audit row or `updatedAt` + `updatedBy`.

### FR-A-5 Observability

- Structured log per procedure: `procedure`, `userId` (or anonymous), `durationMs`, `outcome`; never log full claim body in production unless explicitly approved.

## Architecture impact

- **Package**: `packages/trpc` owns router definitions; `apps/api` hosts HTTP handler; `apps/web` may use server caller or HTTP link as per ADR-0002.

## API and data impact

- Prisma models as in [Domain models](#domain-models-prisma-oriented); start with `User`, `Claim`, `ClaimMessage`, `ClaimAiRun`, `AdminAuditLog`, then add `Campaign` / `UserAttribution` / `EmailDelivery` when those flows ship.
- Migrations must be backward compatible one release when possible.
- Indexes (to add during implementation): `User.email` unique; `Claim(clientRequestId, createdByUserId)` unique for idempotency; `Claim(status, createdAt)` for admin queue; `ClaimAiRun(claimId, createdAt)`.

## Implementation plan

1. Define Zod schemas shared or mirrored between client and server for stable types.
2. Implement `appRouter` with middleware for auth and rate limiting hook (even if no-op initially).
3. Wire Prisma client (singleton) with request-scoped logging.
4. Add procedure-level tests with mocked DB where fast; integration tests against test DB for migrations.

## Risks and mitigations

- **Risk**: N+1 queries on list endpoints.
    - **Mitigation**: Prisma `select`/`include` discipline; pagination caps.
- **Risk**: AI provider timeouts stall API.
    - **Mitigation**: deadline + async job table (future amendment).

## Rollback plan

- Deploy previous API revision; feature-flag new procedures if added incrementally.

## Test plan

- **Unit**: Zod edge cases, state machine unit tests.
- **Integration**: supertest or tRPC caller against dockerised Postgres in CI (when available).

## Open questions

- Rate limits per IP vs per user for `claim.create`.
- Whether AI invocation is synchronous for MVP or queued.
