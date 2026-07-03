# feat-0005: Sessions and access control

## Summary

Authenticated users receive an **HttpOnly session cookie** (`truthsentry_session` by default) backed by a **`Session` row** (hashed token, 7-day expiry). **`session.me`** returns the current user profile. **`protectedProcedure`** requires a valid session; **`requireVerifiedEmail`** blocks claim/chat writes until OTP verification completes.

Complements [feat-0004](../feat-0004-auth/PRODUCT.md) (login/register set cookie), [feat-0003](../feat-0003-api-trpc/PRODUCT.md) (context), [feat-0002](../feat-0002-database/PRODUCT.md) (`Session` model).

**Implementation status:** Cookie auth and guards **implemented**; logout and session cleanup **partial**.

## Problem

Chat and claim data must not be readable without login. The product also needs a clear rule: **signed in but unverified** users may hit `session.me` and resend verification, but cannot start fact-check threads.

## Non-goals

- JWT access tokens in `localStorage`.
- Refresh token rotation / sliding expiration (fixed `Max-Age` 7 days).
- Device management UI (“log out everywhere”).
- OAuth session federation.

## Actors

| Actor | Description |
|-------|-------------|
| **Browser** | Stores HttpOnly cookie; sends on tRPC and WebSocket upgrade. |
| **API** | Validates `tokenHash` against Postgres on each request. |
| **Verified claimant** | Passes `requireVerifiedEmail` on claim mutations. |

## Use case catalog

### A. Session lifecycle

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-S01** | Establish session | Successful register or login | Set-Cookie with random token | `Session` row created |
| **UC-S02** | Use session on tRPC | Cookie present | `createContext` loads user | `ctx.sessionUser` populated |
| **UC-S03** | Expired session | `expiresAt` passed | Lookup miss | `sessionUser` null; protected calls fail |
| **UC-S04** | Missing cookie | Anonymous | `sessionUser` null | `AUTH_SIGN_IN_REQUIRED` on protected |
| **UC-S05** | Logout | Signed in | `clearSessionCookie` | Browser cookie cleared; **DB row may remain** |

### B. session.me

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-S10** | Load profile | Valid session | `session.me` query | `id`, `email`, `role`, `emailVerifiedAt` |
| **UC-S11** | User deleted mid-session | Stale session | `SESSION_USER_MISSING` | Client should sign out |
| **UC-S12** | Chat boot | Chat page mount | `session.me` with `retry: false` | Drives redirect logic |

### C. Access control layers

| ID | Use case | Gate | Error code |
|----|----------|------|------------|
| **UC-S20** | Public health/auth | none | — |
| **UC-S21** | Protected read (threads list) | `protectedProcedure` | `AUTH_SIGN_IN_REQUIRED` |
| **UC-S22** | Claim write / AI | `protectedProcedure` + `requireVerifiedEmail` | `AUTH_EMAIL_NOT_VERIFIED` |
| **UC-S23** | Admin metrics | `adminProcedure` | `AUTH_ADMIN_REQUIRED` |

### D. WebSocket (feat-0013)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-S30** | WS connect | Valid session cookie on upgrade | Same hash lookup as HTTP | Connection accepted |
| **UC-S31** | WS without cookie | — | 401 on upgrade | No subscription |

### E. Negative cases

| ID | Expected behavior |
|----|-------------------|
| **UC-S40** | Tampered cookie → no session → unauthorized |
| **UC-S41** | Multiple tabs share cookie until logout/expiry |
| **UC-S42** | `Secure` flag when `AUTH_COOKIE_SECURE=true` (production) |

## Behavior (product rules)

1. **Cookie attributes:** `HttpOnly; SameSite=Lax; Path=/`; `Secure` optional via env.

2. **No JS access** to raw session token — XSS cannot exfiltrate token (still vulnerable to CSRF on mutations — mitigated by SameSite).

3. **Role default:** New users `USER`; admin assigned in DB only (no self-serve promote).

4. **Verification gate** applies to `claim.create`, `appendUserMessage`, `requestUpload`, `generateAssistantReply` — not to `listMine` / `byId`.

5. **WebSocket** reuses cookie auth — no separate WS token.

## Open questions

1. **Delete session on logout?** Recommended for security.

2. **Session limit per user?** Cap concurrent sessions?

3. **Sliding expiration?** Extend `expiresAt` on activity?

## Related

- [feat-0004 PRODUCT](../feat-0004-auth/PRODUCT.md)
- [feat-0003 PRODUCT](../feat-0003-api-trpc/PRODUCT.md)
- [feat-0013 PRODUCT](../feat-0013-chat-realtime/PRODUCT.md)
- `packages/trpc/src/core.ts`
- `packages/trpc/src/guards.ts`
- `apps/api/src/index.ts`
