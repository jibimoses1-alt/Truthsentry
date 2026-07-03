# feat-0002: Database and persistence (Postgres / Prisma)

## Summary

TruthSentry persists all product state in **PostgreSQL** via **Prisma** (`packages/prisma/schema.prisma`). Core entities support **accounts**, **sessions**, **claim threads** (fact-check dossiers), **chat messages**, **auth tokens**, **transactional email delivery logs**, and **Resend webhook deduplication**.

This feature is the data foundation for [feat-0003](../feat-0003-api-trpc/PRODUCT.md) (tRPC), [feat-0004](../feat-0004-auth/PRODUCT.md) (auth tokens), [feat-0005](../feat-0005-session/PRODUCT.md) (sessions), [feat-0006](../feat-0006-email/PRODUCT.md) (email logs), and [feat-0015](../feat-0015-claims-ai/PRODUCT.md) (claims + AI metadata).

**Implementation status:** Schema and three incremental migrations exist; core `User` / `Session` / `Claim` baseline DDL is not checked into `migrations/` (see TECH gaps).

## Problem

Without a single persistence spec, engineers cannot tell which fields are user-visible vs internal, which enums drive UI verdicts, or how claim metadata relates to AI output. Token and email tables must be documented for security review (hashed secrets, idempotency, cascade rules).

## Non-goals

- Supabase Storage object schema (upload paths live in `ClaimMessage.attachments` JSON; bucket policy in feat-0012).
- Read replicas, partitioning, or multi-region Postgres.
- Full program.md claim lifecycle enum (e.g. separate `QUEUED` product state) — code uses `ClaimStatus` + `FactCheckStatus`.
- Analytics warehouse or event streaming tables.

## Actors

| Actor | Description |
|-------|-------------|
| **Claimant** | Owns `Claim` rows via `createdByUserId`; messages in `ClaimMessage`. |
| **Platform** | Creates sessions, tokens, email delivery rows; updates claim status from AI pipeline. |
| **Operator** | Queries Postgres for support; Resend webhooks update `EmailDelivery.status`. |

## Domain model (product view)

| Entity | Product meaning |
|--------|-----------------|
| **User** | Registered account; `emailVerifiedAt` gates chat. |
| **Session** | Server-side login; bound to HttpOnly cookie (feat-0005). |
| **Claim** | One fact-check thread / dossier with metadata and verdict fields. |
| **ClaimMessage** | User or assistant turn in a claim thread; optional image attachments JSON. |
| **EmailVerificationToken** | One-time OTP for verify-email (hashed at rest). |
| **PasswordResetToken** | Single-use reset link token (hashed at rest). |
| **EmailDelivery** | Audit log per outbound email (template, idempotency, provider id, status). |
| **ResendWebhookEvent** | Idempotent record of inbound Resend events. |

## Use case catalog

### A. User and account

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D01** | Register account | Unique email | `User` created with `passwordHash`, `role: USER` | Row in `User`; verification token row optional |
| **UC-D02** | Verify email | Valid OTP | `User.emailVerifiedAt` set; token `usedAt` set | User can pass `requireVerifiedEmail` (feat-0005) |
| **UC-D03** | Reset password | Valid reset token | `passwordHash` updated; token `usedAt` set | Old sessions may still work until expiry (gap) |
| **UC-D04** | Admin role | `User.role === ADMIN` | Admin procedures allowed | feat-0018 |

### B. Sessions

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D10** | Create session on login/register | Valid credentials or new user | `Session` row: `tokenHash`, `expiresAt` (+7d) | Cookie set (feat-0005) |
| **UC-D11** | Resolve session on request | Valid cookie, unexpired `Session` | Lookup by `tokenHash` | `sessionUser` in tRPC context |
| **UC-D12** | Session expiry | `expiresAt <= now()` | Lookup fails | User treated as signed out |

### C. Claims and messages

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D20** | Create claim thread | Authenticated, verified email | `Claim` with defaults: `status OPEN`, `factCheckStatus PENDING`, `claimLanguage` default `ar` | Thread id for chat |
| **UC-D21** | Append user message | Owns claim | `ClaimMessage` `role USER`; optional `clientReqId` for idempotency | Message ordered by `createdAt` |
| **UC-D22** | Store assistant reply | AI or human resolution | `ClaimMessage` `role ASSISTANT`; claim `factCheckText`, `factCheckStatus`, `status` updated | Verdict visible in UI |
| **UC-D23** | Attach image evidence | Upload completed | `attachments` JSON on message | Signed URL refresh via API (feat-0012) |
| **UC-D24** | List my claims | Authenticated | Filter by `createdByUserId`; optional search / filters | Sidebar threads (feat-0010) |

### D. Claim metadata (fact-check dossier)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Detect claim language | User message text | `claimLanguage` on `Claim` (default `ar`) | AI responds in MSA or English |
| **UC-D31** | AI extract metadata | First message | `topicCategory`, `sourceType`, `sourceName`, `location`, `platform` optional | Enriched dossier header |
| **UC-D32** | Record verdict | AI response parsed | `factCheckStatus` in `FactCheckStatus` enum; `factCheckDate` when verdict known | Badge in chat UI |
| **UC-D33** | Human queue path | Low confidence | `status` → `PROCESSING`; email `claim-queued` (feat-0006) | User notified |

### E. Email audit

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D40** | Log verify email send | Register / resend | `EmailDelivery` `templateKey: verify-email`, unique `idempotencyKey` | Traceable send / fail |
| **UC-D41** | Log password reset send | Request reset | `templateKey: password-reset` | Same |
| **UC-D42** | Log claim emails | Queue / resolve transitions | `claimId` set; `claim-queued` / `claim-resolved` | Linked to claim |
| **UC-D43** | Webhook status update | Resend event | Match `providerMessageId`; update `status` | Delivery state reflects provider |

### F. Negative and integrity

| ID | Expected behavior |
|----|-------------------|
| **UC-D50** | Duplicate `clientReqId` on same claim rejected (`@@unique([claimId, clientReqId])`). |
| **UC-D51** | Deleting user cascades sessions, tokens, claims, messages, email deliveries. |
| **UC-D52** | Deleting claim cascades messages; `EmailDelivery.claimId` set null. |
| **UC-D53** | Raw OTP / reset token never stored — only `tokenHash` (SHA-256). |

## Behavior (product rules)

1. **Email uniqueness:** `User.email` is unique; registration conflicts surface `AUTH_EMAIL_IN_USE` (feat-0004).

2. **Arabic-first claims:** `claimLanguage` defaults to `ar` (migration `20260519120000_claim_language_default_ar`).

3. **Verdict enum:** Product-facing verdicts map to `FactCheckStatus`: `PENDING`, `VERIFIED`, `DEBUNKED`, `MISLEADING`, `PARTIALLY_TRUE`.

4. **Claim workflow status:** `ClaimStatus`: `OPEN`, `PROCESSING`, `RESOLVED`, `FAILED` — distinct from verdict.

5. **Message roles:** `USER`, `ASSISTANT`, `SYSTEM` — chat UI shows user vs assistant rows.

6. **Token expiry:** Verification OTP ~15 minutes; password reset ~1 hour (enforced in auth router, not DB).

7. **Email idempotency:** `EmailDelivery.idempotencyKey` unique — retries must not duplicate sends at provider when key reused.

## Open questions

1. **Session revocation on logout:** Should `logout` delete `Session` row? **Today:** cookie cleared only (feat-0005 gap).

2. **Baseline migration:** Should initial `User`/`Session`/`Claim` DDL be added to repo? **Default:** yes for reproducible deploys.

3. **`sourceName` field:** Schema must match DB column name (fix typo if present in `schema.prisma`).

4. **Retention:** Token and webhook event purge policy? **Default:** periodic job TBD.

## Related

- [feat-0001 PRODUCT](../feat-0001-platform/PRODUCT.md)
- [feat-0003 PRODUCT](../feat-0003-api-trpc/PRODUCT.md)
- [feat-0004 PRODUCT](../feat-0004-auth/PRODUCT.md)
- [feat-0005 PRODUCT](../feat-0005-session/PRODUCT.md)
- [feat-0006 PRODUCT](../feat-0006-email/PRODUCT.md)
- `packages/prisma/schema.prisma`
- `packages/prisma/migrations/`
