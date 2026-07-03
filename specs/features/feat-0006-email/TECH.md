# feat-0006: Tech Spec — Transactional email (Resend)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Package `@truthsentry/emails` wraps Resend SDK; callers in `packages/trpc` and context wiring in `apps/api/src/index.ts`.

## Package layout

| Path | Role |
|------|------|
| `packages/emails/src/index.ts` | `sendVerifyEmail`, `sendPasswordResetEmail`, `sendClaimQueuedEmail`, `sendClaimResolvedEmail`, `getEmailProvider` |
| `packages/emails/src/locale.ts` | `resolveEmailLocale` → `ar` \| `en` |
| `packages/emails/src/templates/verify-email.ts` | ar/en subject, html, text |
| `packages/emails/src/templates/password-reset.ts` | ar/en + RTL |
| `packages/emails/src/templates/claim-queued.ts` | **French only** |
| `packages/emails/src/templates/claim-resolved.ts` | **French only** |

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | yes | Resend client |
| `EMAIL_FROM` | yes | From header |
| `RESEND_WEBHOOK_SIGNING_SECRET` | prod | Webhook auth (`apps/api`) |

See `packages/emails/.env.example`, `apps/api/.env.example`.

## Send API

```ts
// packages/emails/src/index.ts
type SendEmailResult =
    | { ok: true; providerMessageId: string }
    | { ok: false; errorCode: string; errorMessage: string };

await resend.emails.send({ from, to, subject, html, text }, { idempotencyKey });
```

Failure code: `RESEND_SEND_FAILED`.

## Template matrix

| Function | Subject helper | Locale param | RTL |
|----------|----------------|--------------|-----|
| `sendVerifyEmail` | `verifyEmailSubject(locale?)` | yes | ar |
| `sendPasswordResetEmail` | `passwordResetSubject(locale?)` | yes | ar |
| `sendClaimQueuedEmail` | `claimQueuedSubject()` | **no** | no |
| `sendClaimResolvedEmail` | `claimResolvedSubject()` | **no** | no |

## Call sites and idempotency keys

| Caller | Template | Idempotency key |
|--------|----------|-----------------|
| `auth.register` | verify-email | `verify:{userId}:{tokenHash}` |
| `auth.resendVerification` | verify-email | `verify-resend:{userId}:{tokenHash}` |
| `auth.requestPasswordReset` | password-reset | `password-reset:{userId}:{tokenHash}` |
| `claim.generateAssistantReply` (start) | claim-queued | `claim-queued:{userId}:{claimId}:processing` |
| `claim.generateAssistantReply` (end) | claim-resolved | `claim-resolved:{userId}:{claimId}:resolved` |

Auth flows use `prisma.emailDelivery.create`; claim flows use **`upsert`** on `idempotencyKey` with `attemptCount` increment.

## EmailDelivery logging

| Field | Typical value |
|-------|---------------|
| `templateKey` | `verify-email`, `password-reset`, `claim-queued`, `claim-resolved` |
| `status` | `sent`, `failed`, later `delivered`, `bounced`, … from webhook |
| `providerMessageId` | Resend message id |
| `errorCode` | e.g. `RESEND_SEND_FAILED` |
| `claimId` | Set for claim templates |

## Webhook handler

Route: `POST /webhooks/resend` in `apps/api/src/index.ts`.

```text
1. Validate x-resend-signature === RESEND_WEBHOOK_SIGNING_SECRET
2. Parse JSON body
3. eventId = payload.id (or hash fallback)
4. If ResendWebhookEvent exists → 200 ok
5. Insert ResendWebhookEvent
6. If data.email_id → updateMany EmailDelivery where providerMessageId
7. status = mapWebhookEventToDeliveryStatus(eventType)
```

`mapWebhookEventToDeliveryStatus`:

| Event substring | Status |
|-----------------|--------|
| `delivered` | `delivered` |
| `bounced` | `bounced` |
| `failed` | `failed` |
| `complained` | `complained` |
| else | `received` |

## TrpcContext injection

```ts
// apps/api/src/index.ts
sendVerifyEmail,
sendPasswordResetEmail,
sendClaimQueuedEmail,
sendClaimResolvedEmail,
```

Routers call `ctx.send*` — tests mock in `packages/trpc/src/index.test.ts`.

## Known gaps (audit)

| Gap | Severity | Notes |
|-----|----------|-------|
| Claim templates not ar/en | High | Product mismatch with feat-0007 |
| Webhook not cryptographic verify | Medium | Header equals secret string |
| No retry worker for failed rows | Medium | Manual resend only |
| `claim-queued` sent even when AI succeeds quickly | Low | Still emails queue + resolved in one flow |
| Register creates session even if email fails | Low | `status: failed` logged but user signed in |

## Testing and validation

```bash
pnpm --filter @truthsentry/emails typecheck
```

| Case | Method | Expected |
|------|--------|----------|
| Missing RESEND_API_KEY | send | Throws at client creation |
| Mock send in trpc test | health.ping caller | Mocks don't throw |
| Webhook replay | POST twice same id | Second 200 no duplicate event |
| Delivery update | webhook with email_id | EmailDelivery.status updated |

Manual staging: register with Resend test mode; confirm ar/en subjects via browser locale switch + network `x-locale`.

## Related

- [feat-0004 TECH](../feat-0004-auth/TECH.md)
- [feat-0002 TECH](../feat-0002-database/TECH.md)
- [feat-0007 TECH](../feat-0007-i18n/TECH.md)
- [feat-0021 TECH](../feat-0021-health-observability/TECH.md)
- `packages/emails/src/index.ts`
- `apps/api/src/index.ts` (`handleResendWebhook`)
