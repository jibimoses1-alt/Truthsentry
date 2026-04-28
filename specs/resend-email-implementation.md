# Spec: Resend email implementation

## Objective

Implement production transactional email delivery with Resend across auth and chat lifecycle events, with idempotency, observability, and safe failure handling.

## Scope

- Verification email after registration
- Password reset request + reset completion flow
- Claim lifecycle transactional emails:
  - queued for review
  - resolved
- Structured provider logging and webhook ingestion for delivery state

## Out of scope

- Marketing campaigns/broadcasts
- Rich user notification preference center (can be added later)
- Multi-provider failover beyond Resend in MVP

## Architecture decisions

- Provider: Resend Node SDK (`resend`)
- Email package owner: `packages/emails`
- API trigger points: `packages/trpc` procedures
- Delivery status ingestion: webhook endpoint in `apps/api`
- Template strategy: React Email templates under `packages/emails/src/templates`
- Link base URL source: `NEXT_PUBLIC_APP_URL` for web links in emails

## Locked defaults (execution contract)

- Verification policy: users can register, but `/chat` access requires verified email.
- Login policy: unverified users can authenticate but are redirected to verification flow until verified.
- User verification field: add `User.emailVerifiedAt: DateTime?` in Prisma.
- Token storage: store only hashed verification/reset tokens (never raw token).
- Token entropy and TTL:
  - verification token: 32-byte random, expires in 24h
  - reset token: 32-byte random, expires in 1h
- Token usage semantics: one-time use; consumed tokens are invalidated immediately.
- Email locale policy: choose template locale from user preference (`fr`/`en`), default to `en`.
- Webhook endpoint contract:
  - path: `POST /webhooks/resend`
  - signature verification required
  - unknown event types are logged and acknowledged (2xx) without side effects.
- Exactly-once delivery tracking: `EmailDelivery` becomes required (not optional).
- Retry policy for send failures:
  - retryable: 429/5xx/network timeout
  - max attempts: 3 total with backoff 1s, 5s, 20s
  - non-retryable: 4xx validation/auth errors
- Required webhook secret env: `RESEND_WEBHOOK_SIGNING_SECRET`.
- Rate limits:
  - `auth.requestPasswordReset`: 5 requests / 15 minutes per IP + email key
  - `auth.resendVerification`: 5 requests / 15 minutes per user
  - `auth.register`: 10 requests / 15 minutes per IP
  - `POST /webhooks/resend`: signature first, then 60 requests / minute per source IP

## Implementation plan

### 1) Build `packages/emails` delivery layer

- Replace placeholder `packages/emails/src/index.ts` with a typed service:
  - `sendVerifyEmail`
  - `sendPasswordResetEmail`
  - `sendClaimQueuedEmail`
  - `sendClaimResolvedEmail`
- Initialize `Resend` with `RESEND_API_KEY`.
- Require `from` to use `EMAIL_FROM`.
- Return structured result:
  - `{ ok: true, providerMessageId }`
  - `{ ok: false, errorCode, errorMessage }`
- Enforce `idempotencyKey` per send for retriable flows.

### 2) Add templates

- Add React Email templates:
  - `packages/emails/src/templates/verify-email.tsx`
  - `packages/emails/src/templates/password-reset.tsx`
  - `packages/emails/src/templates/claim-queued.tsx`
  - `packages/emails/src/templates/claim-resolved.tsx`
- Keep template payload minimal and avoid secret/internal diagnostics.
- Include plain text fallback content.

### 3) Add auth email flows in API procedures

- In `auth.register`:
  - create verification token
  - persist token and expiry
  - send verification email
  - do not grant `/chat` access until verification complete
- Add `auth.verifyEmail` procedure:
  - validate token + expiry
  - mark user as verified via `emailVerifiedAt`
- Add `auth.requestPasswordReset`:
  - issue reset token
  - send password reset email
  - always return generic success (avoid user enumeration)
- Add `auth.resetPassword`:
  - validate token
  - set new password hash
  - invalidate token

### 4) Add claim lifecycle sends

- Trigger `sendClaimQueuedEmail` when claim transitions to queue/review.
- Trigger `sendClaimResolvedEmail` on resolved transition.
- Use deterministic idempotency keys:
  - `${template}:${userId}:${claimId}:${eventName}`

### 5) Data model updates (Prisma)

- Add token models:
  - `EmailVerificationToken`
  - `PasswordResetToken`
- Add/confirm user verification field:
  - `User.emailVerifiedAt`
- Add required `EmailDelivery` log table with:
  - `templateKey`
  - `idempotencyKey`
  - `providerMessageId`
  - `status`
  - `userId`
  - `errorCode`
  - `attemptCount`
  - `lastAttemptAt`
- Add unique constraint on `EmailDelivery.idempotencyKey`.
- Add indexes on token, expiry, and user references.
- Create and commit migrations.

### 6) Webhook endpoint for delivery state

- Add API endpoint for Resend webhooks in `apps/api`.
- Verify webhook signature.
- Process event types idempotently (delivered, bounced, failed, complained).
- Update `EmailDelivery` status for matching provider message ids.
- Persist processed webhook event ids to prevent duplicate processing.

### 7) Environment and docs

- Ensure placeholders in:
  - `packages/emails/.env.example`
  - `apps/api/.env.example` (if API process reads email env directly)
- Required keys:
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `RESEND_WEBHOOK_SIGNING_SECRET`
- Update `docs/env/README.md` ownership and runtime notes.

### 8) Testing plan

- Unit:
  - idempotency key generation
  - token expiration validation
- Integration:
  - register -> verify flow
  - request reset -> reset flow
  - claim status change -> one send call
- Webhook tests:
  - signature verification
  - replay/idempotency behavior
- E2E:
  - verify UX and reset UX surface behavior
  - assert user cannot access `/chat` before verification
  - assert user can access `/chat` after verification
- CI strategy for email side-effects:
  - use mock transport/unit spies by default
  - use Resend test recipients only in controlled integration runs

## Operational defaults

- Use idempotency keys for all transactional sends.
- Treat Resend 429 as retryable with backoff.
- Log minimum fields:
  - `templateKey`, `userId`, `idempotencyKey`, `providerMessageId`, `status`, `errorCode`
- Avoid blocking critical user flows on email provider failure when safe to continue.
- For register/reset endpoints, return generic success UX when provider fails but persist retryable delivery records.

## Link and route contract

- Verification email route:
  - `${NEXT_PUBLIC_APP_URL}/sign-up/verify?token=<rawToken>`
- Reset email route:
  - `${NEXT_PUBLIC_APP_URL}/reset-password?token=<rawToken>`
- Raw token appears only in emailed URL; database stores only token hash.

## PR slicing

- PR-1: `packages/emails` service + templates
- PR-2: Prisma token/delivery models + migration
- PR-3: Auth procedures with verification/reset emails
- PR-4: Claim lifecycle email triggers
- PR-5: Webhook endpoint + delivery-state updates
- PR-6: Tests + env/docs finalization

## Acceptance criteria

- Register sends verification email through Resend.
- Password reset request sends reset email and token flow works.
- Claim queue/resolution events trigger transactional emails once (idempotent).
- Webhook events are verified and processed safely.
- Env docs and examples include all required email keys.
- `/chat` is blocked for unverified users and available after verification.
- Email delivery dedupe is enforced by persisted `idempotencyKey`.
