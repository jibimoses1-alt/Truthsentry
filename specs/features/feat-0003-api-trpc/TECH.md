# feat-0003: Tech Spec — API layer (tRPC + Node server)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Shared logic in `packages/trpc`; HTTP adapter and heavy IO in `apps/api`.

## Package layout

| Path | Role |
|------|------|
| `packages/trpc/src/index.ts` | `appRouter` export, types |
| `packages/trpc/src/core.ts` | `publicProcedure`, `protectedProcedure`, `adminProcedure` |
| `packages/trpc/src/guards.ts` | `requireVerifiedEmail` |
| `packages/trpc/src/types.ts` | `TrpcContext`, `SessionUser`, `UiLocale` |
| `packages/trpc/src/schemas.ts` | Zod inputs shared by routers |
| `packages/trpc/src/rate-limit.ts` | In-memory `checkRateLimit` |
| `packages/trpc/src/routers/*.ts` | Domain routers |
| `apps/api/src/index.ts` | `createContext`, HTTP server, WS, webhooks |

## appRouter map

```ts
// packages/trpc/src/index.ts
export const appRouter = createTRPCRouter({
    health: healthRouter,
    auth: authRouter,
    session: sessionRouter,
    claim: claimRouter,
    admin: adminRouter,
});
```

### health

| Procedure | Type | Auth | Output |
|-----------|------|------|--------|
| `health.ping` | query | public | `{ ok: true }` |

File: `packages/trpc/src/routers/health.ts`

### auth

| Procedure | Type | Auth | Notes |
|-----------|------|------|-------|
| `auth.register` | mutation | public | Rate limit; creates user, OTP, session, cookie |
| `auth.login` | mutation | public | Rate limit; new session |
| `auth.verifyEmail` | mutation | public | Sets `emailVerifiedAt` |
| `auth.resendVerification` | mutation | protected | Idempotent if already verified |
| `auth.requestPasswordReset` | mutation | public | Always `{ ok: true }` (no enumeration) |
| `auth.resetPassword` | mutation | public | Token + new password |
| `auth.logout` | mutation | protected | Clears cookie only |

File: `packages/trpc/src/routers/auth.ts`

### session

| Procedure | Type | Auth | Output |
|-----------|------|------|--------|
| `session.me` | query | protected | `id`, `email`, `role`, `emailVerifiedAt` |

File: `packages/trpc/src/routers/session.ts`

### claim (summary)

| Procedure | Type | Auth | Verified email |
|-----------|------|------|----------------|
| `claim.listMine` | query | protected | no |
| `claim.create` | mutation | protected | yes |
| `claim.byId` | query | protected | no |
| `claim.appendUserMessage` | mutation | protected | yes |
| `claim.requestUpload` | mutation | protected | yes |
| `claim.generateAssistantReply` | mutation | protected | yes |

File: `packages/trpc/src/routers/claim.ts` (detail: feat-0011 / feat-0015)

### admin

| Procedure | Type | Auth | Output |
|-----------|------|------|--------|
| `admin.queueCount` | query | admin | `{ total: number }` — **all** claims today |

File: `packages/trpc/src/routers/admin.ts`

## HTTP server routes (`apps/api`)

| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/` | HTML health page (`buildHealthHtml`) |
| `POST` | `/webhooks/resend` | `handleResendWebhook` |
| `OPTIONS` | `*` | CORS preflight |
| `*` | `/trpc/*` | `createHTTPHandler` — strips `/trpc` prefix before delegate |

Default port: `API_PORT` ?? `4000`.

## TrpcContext (injected in API)

| Field | Source |
|-------|--------|
| `prisma` | `@truthsentry/prisma` |
| `uiLocale` | `x-locale` header via `parseUiLocale` |
| `sessionUser` | Cookie → `Session` lookup |
| `appUrl` | `NEXT_PUBLIC_APP_URL` |
| `setSessionCookie` / `clearSessionCookie` | `Set-Cookie` helpers |
| `hashPassword`, `verifyPassword`, `hashToken` | Node crypto |
| `sendVerifyEmail`, `sendPasswordResetEmail`, `sendClaimQueuedEmail`, `sendClaimResolvedEmail` | `@truthsentry/emails` |
| `createSignedUploadUrl`, `createSignedReadUrl` | Supabase storage |
| `generateAssistantText`, `extractClaimMetadata` | OpenAI fetch in API |
| `broadcastToClaimSubscribers` | WebSocket fan-out |
| `chatUploadLimits` | Env-driven mime/size caps |

```ts
// apps/api/src/index.ts — locale parsing
function parseUiLocale(header: string | string[] | undefined): TrpcContext['uiLocale'] {
    const raw = Array.isArray(header) ? header[0] : header;
    return raw === 'en' ? 'en' : 'ar';
}
```

## Web client wiring

| Module | Behavior |
|--------|----------|
| `apps/web/components/trpc-provider.tsx` | `httpBatchLink` → `{NEXT_PUBLIC_API_URL}/trpc`, `credentials: 'include'`, header `x-locale` |
| `apps/web/lib/trpc.ts` | `createTRPCReact<AppRouter>()` |
| `apps/web/lib/fetch-with-retry.ts` | Retry wrapper on fetch |

## Procedure middleware chain

```text
publicProcedure → handler

protectedProcedure → assert sessionUser → handler

adminProcedure → protected → assert role ADMIN → handler

requireVerifiedEmail(ctx) → called inside handler for claim writes
```

## CORS

`Access-Control-Allow-Origin`: `NEXT_PUBLIC_APP_URL`  
`Access-Control-Allow-Credentials`: `true`  
Allowed headers include `content-type`, `x-trpc-source` (not `x-locale` in Allow-Headers — works for simple requests; preflight may need extension if browsers block).

## Known gaps (audit)

| Gap | Area | Notes |
|-----|------|-------|
| `admin.queueCount` counts all claims | admin router | Not human-queue filter |
| In-memory rate limit | `rate-limit.ts` | Not shared across API instances |
| AI + storage in API monolith | `apps/api/src/index.ts` | Large context factory |
| `x-locale` not in CORS Allow-Headers | API | May affect custom clients |
| French error strings in claim router | claim | e.g. upload errors — not i18n codes |
| No `packages/ai` | monorepo | feat-0001 gap |
| Webhook auth | Resend | Compares header to `RESEND_WEBHOOK_SIGNING_SECRET` literally — not HMAC verify |

## Testing and validation

```bash
pnpm --filter @truthsentry/trpc test
pnpm --filter @truthsentry/api typecheck
pnpm --filter @truthsentry/trpc typecheck
```

| Case | Procedure | Expected |
|------|-----------|----------|
| No cookie | `session.me` | `UNAUTHORIZED` / `AUTH_SIGN_IN_REQUIRED` |
| Valid cookie | `session.me` | User row |
| `health.ping` | public | `{ ok: true }` |
| Wrong locale header | any + email | Defaults `ar` templates |
| Non-admin | `admin.queueCount` | `AUTH_ADMIN_REQUIRED` |

Manual: `curl -s http://localhost:4000/` returns HTML; `curl -s 'http://localhost:4000/trpc/health.ping'`.

## Related

- [feat-0004 TECH](../feat-0004-auth/TECH.md)
- [feat-0005 TECH](../feat-0005-session/TECH.md)
- [feat-0006 TECH](../feat-0006-email/TECH.md)
- [feat-0007 TECH](../feat-0007-i18n/TECH.md)
- [feat-0021 TECH](../feat-0021-health-observability/TECH.md)
- `packages/trpc/src/index.ts`
- `apps/api/src/index.ts`
