# feat-0004: Tech Spec — Authentication

## Context

See [`PRODUCT.md`](./PRODUCT.md). Router: `packages/trpc/src/routers/auth.ts`. Schemas: `packages/trpc/src/schemas.ts`.

## tRPC procedures

| Procedure | Input schema | Output | Side effects |
|-----------|--------------|--------|--------------|
| `auth.register` | `signUpSchema` `{ email, password min 8 }` | `{ userId }` | User, EmailVerificationToken, EmailDelivery, Session, Set-Cookie, verify email |
| `auth.login` | `signInSchema` | `{ userId, email }` | Session, Set-Cookie |
| `auth.verifyEmail` | `verifyEmailSchema` `{ email, otpCode 6 digits }` | `{ ok: true }` | User.emailVerifiedAt, token usedAt |
| `auth.resendVerification` | — | `{ ok: true }` | New token, email, EmailDelivery |
| `auth.requestPasswordReset` | `requestPasswordResetSchema` | `{ ok: true }` | Optional token + email |
| `auth.resetPassword` | `resetPasswordSchema` `{ token min 32, newPassword }` | `{ ok: true }` | passwordHash, token usedAt |
| `auth.logout` | — | `{ ok: true }` | Clear-Cookie |

## Token helpers

| Helper | Location | Purpose |
|--------|----------|---------|
| `createOtpCode()` | `packages/trpc/src/schemas.ts` | 6-digit OTP |
| `createRawToken()` | `packages/trpc/src/schemas.ts` | URL-safe reset token |
| `hashToken` | API context | SHA-256 hex before DB store |

## Rate limits

| Key | Max | Window | Procedure |
|-----|-----|--------|-----------|
| `register:{email}` | 3 | 1 hour | register |
| `login:{email}` | 10 | 1 minute | login |

Implementation: `packages/trpc/src/rate-limit.ts` (in-process Map).

## Web route map

| URL | Component | tRPC |
|-----|-----------|------|
| `/[locale]/sign-in` | `SignInForm` | `auth.login` |
| `/[locale]/sign-up` | `SignUpForm` | `auth.register` |
| `/[locale]/sign-up/verify` | `VerifyEmailForm` | `auth.verifyEmail`, `auth.resendVerification` |
| `/[locale]/forgot-password` | `RequestPasswordResetForm` | `auth.requestPasswordReset` |
| `/[locale]/reset-password` | `ResetPasswordForm` | `auth.resetPassword` |

### Auth components

| File | Notes |
|------|-------|
| `apps/web/components/auth/sign-in-form.tsx` | **i18n** via `useTranslations` |
| `apps/web/components/auth/sign-up-form.tsx` | **French hardcoded** — gap |
| `apps/web/components/auth/verify-email-form.tsx` | **French hardcoded**; uses `next/navigation` not `@/i18n/navigation` |
| `apps/web/components/auth/request-password-reset-form.tsx` | Partial i18n |
| `apps/web/components/auth/reset-password-form.tsx` | Partial i18n |
| `apps/web/components/auth/password-input-with-toggle.tsx` | Shared control |

## Session integration (feat-0005)

Register and login both:

```ts
const token = randomUUID();
const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
await ctx.prisma.session.create({ data: { userId, tokenHash: ctx.hashToken(token), expiresAt } });
ctx.setSessionCookie(token, expiresAt);
```

Logout:

```ts
ctx.clearSessionCookie(); // no prisma.session.delete
```

## Email integration (feat-0006)

| Event | Template | Idempotency key pattern |
|-------|----------|-------------------------|
| Register | `verify-email` | `verify:{userId}:{tokenHash}` |
| Resend | `verify-email` | `verify-resend:{userId}:{tokenHash}` |
| Reset request | `password-reset` | `password-reset:{userId}:{tokenHash}` |

Reset URL construction:

```ts
`${ctx.appUrl}/${ctx.uiLocale}/reset-password?token=${encodeURIComponent(rawToken)}`
```

## Client error handling

| Module | Role |
|--------|------|
| `apps/web/hooks/use-api-toast.ts` | Maps tRPC `message` to `errors.*` translations |
| `apps/web/lib/api-error.ts` | Parse TRPCClientError |
| `apps/web/lib/api-toast.ts` | Legacy `notifyApiError` (some forms) |

## Chat gate

`apps/web/components/chat-page-client.tsx`:

```ts
trpc.session.me.useQuery(undefined, { retry: false });
// UNAUTHORIZED → router.replace('/sign-in')
// !emailVerifiedAt → router.replace('/sign-up/verify')
```

Uses `@/i18n/navigation` — locale prefix preserved.

## Known gaps (audit)

| Gap | File / area |
|-----|-------------|
| Logout does not delete `Session` row | `auth.ts` logout |
| `sign-up-form` not on next-intl | Hardcoded French validation |
| `verify-email-form` pushes `/chat` without locale helper | May rely on middleware default |
| `AUTH_SECRET` unused | env example only |
| No session rotation on login | New session row each login; old rows linger |
| Web password rules ≠ API | sign-up zod stricter than `signUpSchema` |

## Testing and validation

```bash
pnpm --filter @truthsentry/trpc typecheck
pnpm --filter @truthsentry/web typecheck
```

| Case | Steps | Expected |
|------|-------|----------|
| Register | POST register | 200, Set-Cookie, EmailDelivery row |
| Duplicate | Same email | AUTH_EMAIL_IN_USE |
| Verify | Valid OTP | emailVerifiedAt non-null |
| Reset flow | request + reset | New password works on login |
| Unknown email reset | request | 200 ok, no leak |
| Logout | logout mutation | Cookie Max-Age=0 |

Manual: full funnel `ar` and `en` — confirm email subject language matches `x-locale`.

## Related

- [feat-0005 TECH](../feat-0005-session/TECH.md)
- [feat-0006 TECH](../feat-0006-email/TECH.md)
- [feat-0007 TECH](../feat-0007-i18n/TECH.md)
- `packages/trpc/src/routers/auth.ts`
- `packages/trpc/src/schemas.ts`
