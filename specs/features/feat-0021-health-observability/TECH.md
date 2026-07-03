# feat-0021: Tech Spec — Health and observability

## Context

See [`PRODUCT.md`](./PRODUCT.md). Health and email webhook handlers live primarily in **`apps/api/src/index.ts`**; tRPC ping in **`packages/trpc`**.

## tRPC: `health.ping`

**File:** `packages/trpc/src/routers/health.ts`

```ts
ping: publicProcedure
  .output(z.object({ ok: z.literal(true) }))
  .query(() => ({ ok: true })),
```

Mounted at `appRouter.health` → HTTP path `/trpc/health.ping` (standalone adapter strips `/trpc` prefix in handler).

**Test:** `packages/trpc/src/index.test.ts` — `health.ping returns ok`.

**Limitation:** No Prisma ping; process can report ok while DB is down.

## HTTP server routing (`apps/api/src/index.ts`)

| Order | Match | Handler |
|-------|-------|---------|
| 1 | `GET /` | `buildHealthHtml(environment)` |
| 2 | `/webhooks/resend` | `handleResendWebhook` |
| 3 | `OPTIONS` | CORS preflight |
| 4 | `/trpc/*` | tRPC standalone handler |

Default port: `API_PORT` or `4000`.

### HTML health page

| Function | Role |
|----------|------|
| `getEnvironment()` | Maps `NODE_ENV` → production / staging / development |
| `buildHealthHtml()` | Inline CSS card: Healthy badge, uptime, env pill, timestamp |
| `ENV_LABELS` | Colour tokens per environment |

Does **not** run external checks; “Errors: None” is static copy.

## Resend webhook

### Configuration

| Env var | Purpose |
|---------|---------|
| `RESEND_WEBHOOK_SIGNING_SECRET` | Compared to `x-resend-signature` header (**plain equality**, not HMAC) |

### Handler flow

```text
POST /webhooks/resend
  → validate method + signature
  → read body JSON
  → eventId = payload.id || hash(body)
  → if ResendWebhookEvent exists → 200 ok
  → create ResendWebhookEvent
  → if data.email_id → update EmailDelivery by providerMessageId
  → 200 ok
```

### `mapWebhookEventToDeliveryStatus` (exported for tests)

| Event type contains | Status |
|---------------------|--------|
| `delivered` | `delivered` |
| `bounced` | `bounced` |
| `failed` | `failed` |
| `complained` | `complained` |
| else | `received` |

### Prisma models

- `ResendWebhookEvent` — dedupe (`eventId` unique)
- `EmailDelivery` — `providerMessageId` indexed for updates

## Background jobs

| Job | Interval | File |
|-----|----------|------|
| Orphan storage cleanup | 1 hour | `apps/api/src/cleanup-orphans.ts` |
| Rate limit bucket sweep | 60s | `packages/trpc/src/rate-limit.ts` |
| WS heartbeat ping | 30s | `apps/api/src/index.ts` |

Orphan cleanup logs `checked` / `deleted` counts to console when `deleted > 0`.

## WebSocket health (cross-feat)

`server.on('upgrade')` — auth via session cookie. Client `ping` → server `pong` JSON. Documented under feat-0013; not part of LB probes.

## CORS

`Access-Control-Allow-Origin`: `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`).

## Known gaps

| Gap | PRODUCT ref | Notes |
|-----|-------------|-------|
| No readiness probe | UC-D30 | Add DB + optional Supabase head |
| Webhook auth is header secret only | UC-C20 | Upgrade to signed payload |
| HTML claims “Errors: None” always | UC-B13 | Misleading during partial outages |
| No metrics export | UC-D31 | — |
| `health.ping` not used by HTML page | — | Two separate probes |
| Version hard-coded `01.00.00` in HTML | — | Should come from package.json |

## Testing and validation

```bash
pnpm --filter @truthsentry/trpc test   # health.ping
curl -s http://localhost:4000/ | head   # HTML health
curl -s -X POST http://localhost:4000/webhooks/resend \
  -H 'x-resend-signature: wrong' -d '{}'  # 401
```

Unit test export: `mapWebhookEventToDeliveryStatus` can be tested from `apps/api` if extracted test file added.

## Related

- [feat-0006 TECH](../feat-0006-email/TECH.md) — `EmailDelivery`
- [feat-0013 TECH](../feat-0013-chat-realtime/TECH.md)
- [feat-0003 TECH](../feat-0003-api-trpc/TECH.md)
- `apps/api/src/index.ts`
- `packages/trpc/src/routers/health.ts`
