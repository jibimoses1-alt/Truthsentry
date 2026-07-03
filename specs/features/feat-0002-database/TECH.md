# feat-0002: Tech Spec — Database and persistence

## Context

See [`PRODUCT.md`](./PRODUCT.md). Single Prisma schema at `packages/prisma/schema.prisma`; client exported from `packages/prisma/src/index.ts`. Migrations under `packages/prisma/migrations/`.

## Schema location

| Path | Role |
|------|------|
| `packages/prisma/schema.prisma` | Models, enums, indexes |
| `packages/prisma/migrations/*/migration.sql` | Applied DDL |
| `packages/prisma/src/index.ts` | `PrismaClient` singleton for `apps/api` |

## Enums

| Enum | Values | Usage |
|------|--------|-------|
| `UserRole` | `USER`, `ADMIN` | `protectedProcedure` / `adminProcedure` |
| `ClaimStatus` | `OPEN`, `PROCESSING`, `RESOLVED`, `FAILED` | Thread lifecycle |
| `FactCheckStatus` | `PENDING`, `VERIFIED`, `DEBUNKED`, `MISLEADING`, `PARTIALLY_TRUE` | Verdict badge |
| `SourceType` | `POLITICIAN`, `MEDIA`, `SOCIAL_MEDIA`, `BLOG`, `NGO`, `CITIZEN` | Claim metadata |
| `MediaType` | `TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, `TEXT_*` combos | Claim media class |
| `TopicCategory` | `POLITICS`, `HEALTH`, `FINANCE`, `TECH`, `SECURITY`, `EDUCATION`, `ENVIRONMENT` | Filters / AI |
| `MessageRole` | `USER`, `ASSISTANT`, `SYSTEM` | `ClaimMessage.role` |

## Models

| Model | Key fields | Relations / indexes |
|-------|------------|---------------------|
| `User` | `id` cuid, `email` unique, `passwordHash`, `role`, `emailVerifiedAt?` | → sessions, claims, tokens, emailDeliveries |
| `Session` | `tokenHash` unique, `userId`, `expiresAt` | `@@index([userId, expiresAt])`; cascade delete |
| `Claim` | `title?`, `status`, `claimText?`, `claimLanguage` default `ar`, fact-check fields, source metadata | → user, messages, emailDeliveries; indexes on `factCheckStatus`, `topicCategory`, `platform` |
| `ClaimMessage` | `claimId`, `role`, `content`, `attachments?` Json, `clientReqId?` | `@@unique([claimId, clientReqId])`; `@@index([claimId, createdAt])` |
| `EmailVerificationToken` | `tokenHash` unique, `expiresAt`, `usedAt?` | `@@index([userId, expiresAt])` |
| `PasswordResetToken` | same shape as verification | same |
| `EmailDelivery` | `templateKey`, `idempotencyKey` unique, `providerMessageId?`, `status`, `attemptCount` | optional `claimId`; indexes on user/claim + `createdAt` |
| `ResendWebhookEvent` | `eventId` unique, `eventType`, `payloadHash` | `@@index([eventType, receivedAt])` |

## Migrations (in repo)

| Migration | Purpose |
|-----------|---------|
| `20260428120500_add_resend_email_models` | `emailVerifiedAt`, token tables, `EmailDelivery`, `ResendWebhookEvent` |
| `20260512120000_add_factcheck_fields` | Fact-check enums + `Claim` columns; indexes |
| `20260519120000_claim_language_default_ar` | `claimLanguage` default `ar` |

**Gap:** No migration file creates base `User`, `Session`, `Claim`, `ClaimMessage` tables — assume created earlier via `db push` or missing from VCS.

## Consumers (read/write)

| Package / app | Models touched |
|---------------|----------------|
| `packages/trpc/src/routers/auth.ts` | User, Session, tokens, EmailDelivery |
| `packages/trpc/src/routers/session.ts` | User |
| `packages/trpc/src/routers/claim.ts` | Claim, ClaimMessage, EmailDelivery |
| `packages/trpc/src/routers/admin.ts` | Claim (count) |
| `apps/api/src/index.ts` | Session (context), ResendWebhookEvent, EmailDelivery |
| `apps/api/src/cleanup-orphans.ts` | Raw query on `ClaimMessage.attachments` |

## Token hashing (application layer)

Not stored in schema rules — implemented in `apps/api/src/index.ts`:

```ts
hashToken(token) => sha256 hex
passwordHash => scrypt(salt:derived) string
```

## Attachment JSON shape (convention)

Stored on `ClaimMessage.attachments` (array):

```ts
{ url: string; mimeType: string; sizeBytes: number; uploadPath?: string }
```

## Known gaps (audit)

| Gap | Severity | Notes |
|-----|----------|-------|
| Missing baseline migration | High | Reproducible fresh DB needs initial migration |
| `sourceNa me` typo in schema | High | Line ~100 `schema.prisma` — breaks `prisma validate` if literal |
| `claimLanguage` migration had `fr` default | Low | Fixed to `ar` in follow-up migration |
| Logout does not delete `Session` | Medium | Orphan session rows until expiry |
| No DB-level check on `EmailDelivery.status` | Low | Free-text status strings |
| `AUTH_SECRET` in `.env.example` | Low | Not used; scrypt per-password salt instead |

## Testing and validation

```bash
pnpm --filter @truthsentry/prisma exec prisma validate
pnpm --filter @truthsentry/prisma exec prisma migrate status
pnpm --filter @truthsentry/trpc test   # uses mocked prisma
```

| Case | Expected |
|------|----------|
| Register | `User` + `EmailVerificationToken` + `Session` rows |
| `appendUserMessage` duplicate `clientReqId` | Prisma unique violation → API error |
| User delete | Cascades per `@relation(onDelete: Cascade)` |
| Webhook replay | `ResendWebhookEvent.eventId` unique → 200 no-op |

## Related

- [feat-0003 TECH](../feat-0003-api-trpc/TECH.md)
- [feat-0006 TECH](../feat-0006-email/TECH.md)
- `packages/prisma/schema.prisma`
- [Prisma migration best practices](https://www.prisma.io/docs/guides/migrate)
