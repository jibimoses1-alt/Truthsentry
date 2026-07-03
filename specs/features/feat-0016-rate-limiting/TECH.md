# feat-0016: Tech Spec — Rate limiting

## Context

See [`PRODUCT.md`](./PRODUCT.md). Minimal **process-local** rate limiter used at the start of selected tRPC mutations.

## Implementation

### Core (`packages/trpc/src/rate-limit.ts`)

```ts
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean;
```

| Behavior | Detail |
|----------|--------|
| New / expired bucket | `count = 1`, `resetAt = now + windowMs`, return `true` |
| Under max | Increment count, return `true` |
| At or over max | Return `false` |
| Cleanup | `setInterval` 60s removes keys where `now > resetAt` |

**Not exported:** bucket map (cannot introspect remaining quota).

## Call sites

### `packages/trpc/src/routers/auth.ts`

| Procedure | Key | max | windowMs |
|-----------|-----|-----|----------|
| `register` | `` `register:${input.email}` `` | 3 | 3_600_000 |
| `login` | `` `login:${input.email}` `` | 10 | 60_000 |

Throws: `TRPCError` code `TOO_MANY_REQUESTS`, messages `AUTH_RATE_LIMIT_REGISTER` / `AUTH_RATE_LIMIT_LOGIN`.

### `packages/trpc/src/routers/claim.ts`

| Procedure | Key | max | windowMs |
|-----------|-----|-----|----------|
| `create` | `` `claim-create:${ctx.sessionUser.id}` `` | 5 | 60_000 |
| `requestUpload` | `` `upload:${ctx.sessionUser.id}:${input.claimId ?? 'general'}` `` | 10 | 60_000 |

Throws: `CLAIM_RATE_LIMIT`.

## Procedures without rate limits

| Router | Procedure |
|--------|-----------|
| `auth` | `verifyEmail`, `requestPasswordReset`, `resetPassword`, `logout` |
| `claim` | `listMine`, `byId`, `updateMetadata`, `appendUserMessage`, `generateAssistantReply` |
| `session` | all |
| `admin` | all |
| `health` | `ping` |

## Client handling

Web maps tRPC errors via `apps/web/lib/api-error.ts` and `use-api-toast.ts` — no special retry backoff for 429 today.

## Deployment implications

| Concern | Impact |
|---------|--------|
| Multiple `apps/api` instances | Limits are per-instance, not global |
| Serverless cold start | Counters reset frequently |
| Memory | One entry per active key; cleanup limits growth |

## Known gaps

| Gap | PRODUCT ref | Recommendation |
|-----|-------------|----------------|
| No password-reset limit | UC-C20 | 3/hour per email |
| No AI generation limit | UC-C22 | Per-user daily cap |
| No IP-based keys | — | Add behind proxy trust |
| No Redis backend | UC-D30 | Required for multi-replica prod |
| Login limit counts failures | UC-A04 | Intentional anti-bruteforce |
| Shared `CLAIM_RATE_LIMIT` message | — | Split codes for create vs upload |

## Testing and validation

Unit tests can mock time by injecting a testable limiter (not implemented — direct Map today).

Manual:

1. Call `auth.login` 11 times in one minute → 429.
2. Create 6 claims in one minute → 429.

```bash
pnpm --filter @truthsentry/trpc typecheck
```

## Related

- [feat-0003 TECH](../feat-0003-api-trpc/TECH.md)
- [feat-0015 TECH](../feat-0015-claims-ai/TECH.md) — unbounded `generateAssistantReply`
- `packages/trpc/src/rate-limit.ts`
