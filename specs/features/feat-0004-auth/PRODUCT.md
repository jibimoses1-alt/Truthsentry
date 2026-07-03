# feat-0004: Authentication (register, login, verify, reset)

## Summary

End users **register** with email/password, **verify** via 6-digit OTP email, **sign in**, **reset password** via emailed link, and **sign out**. Web routes live under **`/{locale}/sign-in`**, **`sign-up`**, **`sign-up/verify`**, **`forgot-password`**, **`reset-password`**. All mutations go through **`auth.*` tRPC procedures** with stable **`AUTH_*` error codes** translated in `messages/ar.json` and `messages/en.json`.

Depends on [feat-0003](../feat-0003-api-trpc/PRODUCT.md) (API), [feat-0005](../feat-0005-session/PRODUCT.md) (cookie session created on register/login), [feat-0006](../feat-0006-email/PRODUCT.md) (OTP and reset emails), [feat-0007](../feat-0007-i18n/PRODUCT.md) (localized pages).

**Implementation status:** Backend flows **implemented**; some auth UI components still use **hardcoded French** strings (gaps).

## Problem

Campaign traffic must convert to verified accounts before chat. Auth must resist enumeration on reset, rate-limit abuse, and surface errors consistently across Arabic and English UI without leaking whether an email exists (except register conflict).

## Non-goals

- OAuth / social login (Google, Apple).
- MFA / TOTP beyond email OTP.
- Magic-link login without password.
- Separate admin login domain (same `User` table, `ADMIN` role).
- WhatsApp OTP delivery (feat-0019).

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Registers or signs in from marketing funnel. |
| **Unverified user** | Has session from register but `emailVerifiedAt` null — redirected to verify. |
| **Verified user** | Can use claim/chat mutations. |
| **Platform** | Sends OTP and reset emails; hashes passwords and tokens. |

## Web routes (locale-prefixed)

| Path | Page file | Purpose |
|------|-----------|---------|
| `/{locale}/sign-in` | `apps/web/app/[locale]/sign-in/page.tsx` | Login |
| `/{locale}/sign-up` | `apps/web/app/[locale]/sign-up/page.tsx` | Register |
| `/{locale}/sign-up/verify` | `apps/web/app/[locale]/sign-up/verify/page.tsx` | OTP entry |
| `/{locale}/forgot-password` | `apps/web/app/[locale]/forgot-password/page.tsx` | Request reset |
| `/{locale}/reset-password` | `apps/web/app/[locale]/reset-password/page.tsx` | New password + `?token=` |

Shared chrome: `AuthPageShell`, `AuthTopBackLink`, `LocaleSwitcher`, `ThemeToggle`.

## Use case catalog

### A. Registration

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Register with valid email/password | Unique email; password ≥ 8 chars (API) | `auth.register` → verify email sent → session cookie set | Redirect to verify page (web) |
| **UC-A02** | Register duplicate email | Email exists | `CONFLICT` / `AUTH_EMAIL_IN_USE` | Toast; stay on form |
| **UC-A03** | Register rate limited | >3/hour per email key | `TOO_MANY_REQUESTS` / `AUTH_RATE_LIMIT_REGISTER` | Retry later message |
| **UC-A04** | Register with weak password (web) | Client rules stricter than API | Zod in `sign-up-form` (uppercase, digit) | Field errors before API |

### B. Email verification

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A10** | Verify with OTP | 6-digit code; within 15 min | `auth.verifyEmail` | `emailVerifiedAt` set; can use chat |
| **UC-A11** | Invalid/expired OTP | Wrong code or used token | `AUTH_INVALID_VERIFICATION` | Stay on verify |
| **UC-A12** | Resend verification | Signed in; not verified | `auth.resendVerification` | New OTP email; new token row |
| **UC-A13** | Resend when already verified | `emailVerifiedAt` set | Mutation returns `{ ok: true }` no-op | — |
| **UC-A14** | Chat blocks unverified | Session without verify | Client redirect to `/sign-up/verify` | feat-0005 gate |

### C. Login and logout

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A20** | Login success | Valid credentials | `auth.login` → new session cookie | Navigate to `/chat` (or `returnTo`) |
| **UC-A21** | Login failure | Wrong password or unknown email | `AUTH_INVALID_CREDENTIALS` (same message) | No session |
| **UC-A22** | Login rate limited | >10/min per email | `AUTH_RATE_LIMIT_LOGIN` | — |
| **UC-A23** | Logout | Signed in | `auth.logout` → cookie cleared | Redirect sign-in; chat queries fail |

### D. Password reset

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A30** | Request reset (known email) | User exists | Token row + email with `/{locale}/reset-password?token=` | Always `{ ok: true }` to client |
| **UC-A31** | Request reset (unknown email) | No user | No email; still `{ ok: true }` | No enumeration |
| **UC-A32** | Reset with valid token | Within 1 hour | `auth.resetPassword` | Password updated |
| **UC-A33** | Reset invalid token | Expired/used | `AUTH_INVALID_RESET_TOKEN` | — |

### E. Post-auth navigation

| ID | Use case | Expected behavior |
|----|----------|-------------------|
| **UC-A40** | Sign-in page links | To sign-up, forgot-password (localized `Link`) |
| **UC-A41** | Verify missing email query | Form warns; resend still callable if session exists |
| **UC-A42** | Protected chat without session | `session.me` UNAUTHORIZED → `/sign-in` |

## Error codes (`AUTH_*`)

| Code | HTTP-ish tRPC | When |
|------|---------------|------|
| `AUTH_RATE_LIMIT_REGISTER` | TOO_MANY_REQUESTS | Register throttle |
| `AUTH_EMAIL_IN_USE` | CONFLICT | Duplicate register |
| `AUTH_RATE_LIMIT_LOGIN` | TOO_MANY_REQUESTS | Login throttle |
| `AUTH_INVALID_CREDENTIALS` | UNAUTHORIZED | Bad login |
| `AUTH_INVALID_VERIFICATION` | BAD_REQUEST | OTP invalid/expired |
| `AUTH_USER_NOT_FOUND` | NOT_FOUND | Resend edge case |
| `AUTH_INVALID_RESET_TOKEN` | BAD_REQUEST | Reset token bad |
| `AUTH_SIGN_IN_REQUIRED` | UNAUTHORIZED | Missing session |
| `AUTH_ADMIN_REQUIRED` | FORBIDDEN | Non-admin on admin proc |
| `AUTH_EMAIL_NOT_VERIFIED` | FORBIDDEN | Claim write without verify |

Translations: `apps/web/messages/ar.json`, `apps/web/messages/en.json` under `errors` namespace (via `useApiToast`).

## Behavior (product rules)

1. **Session on register:** User is signed in immediately after register but **chat requires verify** (UC-A14).

2. **OTP format:** 6 numeric digits (`verifyEmailSchema`).

3. **Password minimum:** API 8 chars; web sign-up may require complexity beyond API.

4. **Reset URL locale:** Built with `ctx.uiLocale` from `x-locale` header (feat-0007).

5. **No email enumeration** on `requestPasswordReset`.

6. **Logout** clears cookie; does not invalidate all server sessions for user (gap).

## Open questions

1. **Invalidate sessions on password reset?** **Default:** invalidate all `Session` rows on reset (not implemented).

2. **Sign-up form i18n:** Migrate `sign-up-form.tsx` / `verify-email-form.tsx` to `next-intl` like `sign-in-form.tsx`.

3. **returnTo query** on sign-in: support deep link back to chat thread? **Partial:** `sign-in-form` accepts `searchParams`.

## Related

- [feat-0003 PRODUCT](../feat-0003-api-trpc/PRODUCT.md)
- [feat-0005 PRODUCT](../feat-0005-session/PRODUCT.md)
- [feat-0006 PRODUCT](../feat-0006-email/PRODUCT.md)
- [feat-0007 PRODUCT](../feat-0007-i18n/PRODUCT.md)
- [feat-0010 PRODUCT](../feat-0010-chat-threads/PRODUCT.md)
- `packages/trpc/src/routers/auth.ts`
- `apps/web/components/auth/`
