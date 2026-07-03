# feat-0006: Transactional email (Resend)

## Summary

TruthSentry sends **transactional email** through **Resend** (`packages/emails`) for **verify-email** and **password-reset** in **Arabic and English**, plus **claim-queued** and **claim-resolved** notifications when the AI pipeline moves a dossier through processing. Each send is logged in **`EmailDelivery`** with an **idempotency key**; **Resend webhooks** update delivery status and **`ResendWebhookEvent`** prevents replay.

Depends on [feat-0002](../feat-0002-database/PRODUCT.md) (tables), [feat-0003](../feat-0003-api-trpc/PRODUCT.md) (context injection), [feat-0004](../feat-0004-auth/PRODUCT.md) (auth triggers), [feat-0015](../feat-0015-claims-ai/PRODUCT.md) (claim emails).

**Implementation status:** Resend integration and auth templates **implemented**; claim templates **French only** (gap); webhook auth is simplified header check.

## Problem

Users must verify accounts and reset passwords reliably in their language. Claimants need asynchronous notice when human review starts and when a verdict is ready. Operations need audit trails and protection against duplicate sends/webhook replay.

## Non-goals

- Marketing newsletters or campaign blast emails.
- Inbound email parsing.
- User-editable email templates in admin UI.
- Multi-provider failover (SendGrid backup).
- SMS OTP.

## Actors

| Actor | Description |
|-------|-------------|
| **User** | Receives OTP, reset link, claim status emails. |
| **Auth flows** | Trigger verify/reset via `auth.*` router. |
| **Claim pipeline** | Triggers queue/resolved via `claim.generateAssistantReply`. |
| **Resend** | Delivers mail; callbacks to `/webhooks/resend`. |
| **Operator** | Inspects `EmailDelivery` for support. |

## Templates (product)

| templateKey | Trigger | Locales | User-facing purpose |
|-------------|---------|---------|---------------------|
| `verify-email` | Register, resend | **ar, en** | 6-digit OTP, 15 min expiry |
| `password-reset` | Request reset | **ar, en** | Button + link to `/{locale}/reset-password` |
| `claim-queued` | Claim → PROCESSING | **fr only today** | Human review queue notice |
| `claim-resolved` | Claim → RESOLVED | **fr only today** | Verdict available notice |

## Use case catalog

### A. Verify email

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-E01** | Send on register | New user | `sendVerifyEmail` with `locale: ctx.uiLocale` | EmailDelivery `sent` or `failed` |
| **UC-E02** | Resend OTP | Protected, unverified | New token + `verify-resend:…` idempotency | User receives fresh code |
| **UC-E03** | Locale ar | `x-locale: ar` | RTL HTML, Arabic subject | MSA copy in template |
| **UC-E04** | Locale en | `x-locale: en` | LTR English copy | — |
| **UC-E05** | Resend API failure | Resend down | `status: failed`, `errorCode` stored | User may retry resend |

### B. Password reset

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-E10** | Send reset link | User exists | `sendPasswordResetEmail` with localized URL | Email logged |
| **UC-E11** | Unknown email | No user | No send (auth still returns ok) | No EmailDelivery row |

### C. Claim notifications

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-E20** | Queued email | `generateAssistantReply` starts | `claim-queued` idempotency `claim-queued:{userId}:{claimId}:processing` | Upsert EmailDelivery |
| **UC-E21** | Resolved email | After assistant message | `claim-resolved` idempotency `claim-resolved:…:resolved` | Upsert EmailDelivery |
| **UC-E22** | Email failure non-blocking | Resend error | Logged; claim processing continues | Console error only |

### D. Idempotency

| ID | Use case | Expected behavior |
|----|----------|-------------------|
| **UC-E30** | Same idempotency key to Resend | Provider dedupes send |
| **UC-E31** | Same key in EmailDelivery | Unique constraint — upsert on claim emails |
| **UC-E32** | Retry register email | New token hash → new idempotency key |

### E. Webhooks

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-E40** | Valid webhook | Matching `x-resend-signature` | Insert `ResendWebhookEvent`; update `EmailDelivery` by `providerMessageId` | Status `delivered` / `bounced` / etc. |
| **UC-E41** | Replay same event | Duplicate `eventId` | 200 ok, no double update | Idempotent |
| **UC-E42** | Invalid signature | Wrong secret | 401 | No DB change |

## Behavior (product rules)

1. **From address:** `EMAIL_FROM` env — must be verified domain in Resend.

2. **Provider idempotency:** Passed to Resend SDK `idempotencyKey` option on send.

3. **Locale resolution:** `resolveEmailLocale` in `packages/emails/src/locale.ts` — unknown → `ar`.

4. **Claim emails ignore UI locale today** — French copy hardcoded (product gap for ar/en).

5. **Webhook status mapping:** `mapWebhookEventToDeliveryStatus` in API — substring match on event type.

6. **No PII in webhook table** — only `eventId`, `eventType`, `payloadHash`.

## Open questions

1. **Localize claim-queued / claim-resolved** to ar/en like auth templates?

2. **Proper Resend signature verification** (HMAC) vs shared secret header?

3. **Retry job** for `EmailDelivery.status === failed`?

## Related

- [feat-0004 PRODUCT](../feat-0004-auth/PRODUCT.md)
- [feat-0002 PRODUCT](../feat-0002-database/PRODUCT.md)
- [feat-0015 PRODUCT](../feat-0015-claims-ai/PRODUCT.md)
- [feat-0021 PRODUCT](../feat-0021-health-observability/PRODUCT.md)
- `packages/emails/`
- `specs/resend-email-implementation.md` (legacy detail)
