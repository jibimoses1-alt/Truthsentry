# feat-0003: API layer (tRPC + Node server)

## Summary

TruthSentry exposes a **type-safe tRPC API** from `packages/trpc` and serves it via **`apps/api`** on HTTP (`/trpc`) with **cookie-based auth context**, **`x-locale`** for email/UI locale, CORS for the Next.js web app, plus ancillary routes: **HTML health** (`GET /`), **Resend webhooks** (`POST /webhooks/resend`), and **WebSocket** upgrades for realtime (feat-0013).

**`appRouter` namespaces:** `health`, `auth`, `session`, `claim`, `admin`.

Complements [feat-0002](../feat-0002-database/PRODUCT.md) (data), [feat-0004](../feat-0004-auth/PRODUCT.md) (auth procedures), [feat-0005](../feat-0005-session/PRODUCT.md) (session in context), [feat-0007](../feat-0007-i18n/PRODUCT.md) (`x-locale`).

**Implementation status:** Core router tree and standalone handler **implemented**; admin surface minimal; AI/upload helpers wired in API context factory.

## Problem

Web and future channels need one contract for auth, claims, and health. Without a documented router map and context rules, clients mis-set headers, bypass verification gates, or call the wrong mount path (`/trpc` prefix).

## Non-goals

- REST CRUD parallel to tRPC (except health HTML and webhooks).
- GraphQL or gRPC gateways.
- Public exposure of service role keys or OpenAI keys to the browser.
- Full admin CRUD API (feat-0018).

## Actors

| Actor | Description |
|-------|-------------|
| **Web client** | `apps/web` via `@trpc/react-query`; `credentials: 'include'`. |
| **API server** | Builds `TrpcContext` per request in `apps/api/src/index.ts`. |
| **Webhook sender** | Resend POST to `/webhooks/resend`. |
| **Operator** | Hits `GET /` for human-readable health page. |

## Use case catalog

### A. Transport and discovery

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-T01** | Call tRPC procedure | Known `NEXT_PUBLIC_API_URL` | `POST/GET` `{api}/trpc/{router}.{proc}` | Typed JSON response |
| **UC-T02** | Batch requests | Web `httpBatchLink` | Multiple procedures in one HTTP round-trip | Lower latency |
| **UC-T03** | CORS preflight | Browser cross-origin | `OPTIONS` returns 204 with allowed headers | Mutations succeed from web origin |
| **UC-T04** | API health (human) | Browser or probe | `GET /` on API port | HTML status page |
| **UC-T05** | API health (machine) | Any | `health.ping` → `{ ok: true }` | feat-0021 |

### B. Context and locale

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-T10** | Pass UI locale | Web knows active locale | Request header `x-locale: ar \| en` | `ctx.uiLocale` set (default `ar`) |
| **UC-T11** | Locale drives email copy | Auth sends email | `ctx.uiLocale` passed to `sendVerifyEmail` / `sendPasswordResetEmail` | ar/en templates (feat-0006) |
| **UC-T12** | Reset link locale | Password reset | `resetUrl` includes `/{uiLocale}/reset-password?token=…` | User lands localized page |

### C. Procedure access levels

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-T20** | Public procedure | None | `publicProcedure` e.g. `auth.login` | No session required |
| **UC-T21** | Protected procedure | Valid session cookie | `protectedProcedure` | `ctx.sessionUser` required; else `AUTH_SIGN_IN_REQUIRED` |
| **UC-T22** | Verified email gate | Protected + chat/claim write | `requireVerifiedEmail(ctx)` | Else `AUTH_EMAIL_NOT_VERIFIED` |
| **UC-T23** | Admin procedure | `role === ADMIN` | `adminProcedure` | Else `AUTH_ADMIN_REQUIRED` |

### D. Router responsibilities (product)

| ID | Router | User-visible capability |
|----|--------|-------------------------|
| **UC-T30** | `health` | Liveness check |
| **UC-T31** | `auth` | Register, login, verify, reset, logout |
| **UC-T32** | `session` | Current user profile (`me`) |
| **UC-T33** | `claim` | Threads, messages, uploads, AI reply |
| **UC-T34** | `admin` | Operator metrics (partial) |

### E. Errors and rate limits

| ID | Use case | Expected behavior |
|----|----------|-------------------|
| **UC-T40** | Rate limited register | `TOO_MANY_REQUESTS` + `AUTH_RATE_LIMIT_REGISTER` |
| **UC-T41** | Rate limited login | `AUTH_RATE_LIMIT_LOGIN` |
| **UC-T42** | tRPC error message | Stable `message` code for i18n in `messages/*.json` |

## Behavior (product rules)

1. **Single router export:** `appRouter` from `@truthsentry/trpc` — web imports `AppRouter` type only.

2. **Cookie sessions:** Context reads session from `AUTH_COOKIE_NAME` (default `truthsentry_session`); no Bearer token in MVP.

3. **Locale default:** Missing or unknown `x-locale` → `ar` (Arabic-first product).

4. **Claim mutations:** `requireVerifiedEmail` on write paths that start fact-check processing (feat-0004 / feat-0011).

5. **Dependency injection:** Email send, storage, AI, and broadcast are context methods — routers stay testable with mocks (`packages/trpc/src/index.test.ts`).

## Open questions

1. **Separate `packages/ai`:** Move `generateAssistantText` out of `apps/api`? **Today:** inline in context factory.

2. **Distributed rate limiting:** In-memory limiter resets on API restart — Redis later? (feat-0016)

3. **Admin router growth:** Queue filters vs raw `claim.count`? **Today:** `queueCount` is total claims (gap).

## Related

- [feat-0001 PRODUCT](../feat-0001-platform/PRODUCT.md)
- [feat-0004 PRODUCT](../feat-0004-auth/PRODUCT.md)
- [feat-0005 PRODUCT](../feat-0005-session/PRODUCT.md)
- [feat-0007 PRODUCT](../feat-0007-i18n/PRODUCT.md)
- [feat-0016 PRODUCT](../feat-0016-rate-limiting/PRODUCT.md)
- `packages/trpc/src/index.ts`
- `apps/api/src/index.ts`
