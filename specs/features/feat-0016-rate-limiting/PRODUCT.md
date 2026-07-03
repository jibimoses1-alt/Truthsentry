# feat-0016: API rate limiting

## Summary

Public and protected tRPC mutations are throttled by an **in-memory sliding window** counter (`checkRateLimit`) to reduce abuse (credential stuffing, claim spam, upload flooding). Exceeded limits return **`TOO_MANY_REQUESTS`** with stable error codes for client toasts.

Complements [feat-0003](../feat-0003-api-trpc/PRODUCT.md) (API layer), [feat-0004](../feat-0004-auth/PRODUCT.md) (auth endpoints).

## Problem

Without per-endpoint limits, attackers can brute-force logins, register throwaway accounts, or exhaust storage/AI budgets via rapid claim and upload requests.

## Non-goals

- Distributed rate limiting (Redis, edge) — single Node process only today.
- Per-IP limits (keys are email or user id).
- User-visible quota dashboards.
- Rate limits on read queries (`listMine`, `byId`, `health.ping`).

## Actors

| Actor | Description |
|-------|-------------|
| **End user** | May hit limits during legitimate bursts; sees error toast. |
| **Abuser** | Throttled by keyed counters. |
| **Operator** | Must know limits are not shared across API replicas. |

## Limits catalogue (implemented)

| Endpoint | Key pattern | Max | Window | Error code |
|----------|-------------|-----|--------|------------|
| `auth.register` | `register:{email}` | 3 | 1 hour | `AUTH_RATE_LIMIT_REGISTER` |
| `auth.login` | `login:{email}` | 10 | 1 minute | `AUTH_RATE_LIMIT_LOGIN` |
| `claim.create` | `claim-create:{userId}` | 5 | 1 minute | `CLAIM_RATE_LIMIT` |
| `claim.requestUpload` | `upload:{userId}:{claimId\|general}` | 10 | 1 minute | `CLAIM_RATE_LIMIT` |

## Use case catalog

### A. Auth limits

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Register within quota | New email | ≤3 registers/hour/email | Account created |
| **UC-A02** | Register over quota | Same email 4th time in hour | Mutation rejected | `TOO_MANY_REQUESTS`; no duplicate user |
| **UC-A03** | Login within quota | Valid credentials | ≤10 logins/min/email | Session created |
| **UC-A04** | Login brute-force throttle | Wrong password repeated | 11th attempt in minute blocked | `AUTH_RATE_LIMIT_LOGIN` even if credentials wrong |

### B. Claim limits

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Create claims normally | Verified user | ≤5 new claims/min | Threads created |
| **UC-B11** | Claim spam blocked | 6th create in minute | Error | User sees rate limit toast |
| **UC-B12** | Upload URLs per thread | Active claim | ≤10 `requestUpload`/min per user+claim | Signed URLs issued |
| **UC-B13** | General upload bucket | No `claimId` on upload | Key uses `general` segment | Same 10/min |

### C. Unprotected endpoints (gaps)

| ID | Use case | Expected today |
|----|----------|----------------|
| **UC-C20** | `auth.requestPasswordReset` | **No rate limit** — enumeration/spam risk |
| **UC-C21** | `auth.resetPassword` | **No rate limit** |
| **UC-C22** | `claim.generateAssistantReply` | **No rate limit** — AI cost risk |
| **UC-C23** | `claim.appendUserMessage` | **No rate limit** |

### D. Operational

| ID | Use case | Expected behavior |
|----|----------|-------------------|
| **UC-D30** | API horizontal scale | Each instance has separate counters — effective limit multiplied |
| **UC-D31** | Process restart | Counters reset |
| **UC-D32** | Window expiry | Bucket deleted after `resetAt` or 60s cleanup sweep |

## Behavior (product rules)

1. Limits are **checked before** business logic in each mutation.
2. **Same error family** `CLAIM_RATE_LIMIT` for create and upload (client may show generic message).
3. Failed requests **still consume** a slot once admitted to the bucket (login failures count toward login limit).
4. No `Retry-After` header on tRPC responses today.

## Open questions

1. Add **IP + email** composite keys for login? **Default:** yes before production hardening.
2. Centralise limit constants in config? **Default:** `packages/trpc/src/rate-limit-config.ts`.
3. Rate-limit `generateAssistantReply` per user/day? **Default:** align with roadmap cost controls.

## Related

- [feat-0003 PRODUCT](../feat-0003-api-trpc/PRODUCT.md)
- [feat-0004 PRODUCT](../feat-0004-auth/PRODUCT.md)
- `packages/trpc/src/rate-limit.ts`
- `packages/trpc/src/routers/auth.ts`
- `packages/trpc/src/routers/claim.ts`
