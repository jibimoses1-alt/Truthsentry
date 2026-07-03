# feat-0021: Health checks and observability (partial)

## Summary

Operators and load balancers can verify API liveness through **`health.ping`** (tRPC), a **human-readable HTML page** at the **API root** (`GET /`), and **Resend webhook** ingestion at **`POST /webhooks/resend`** to update email delivery status. This is **minimal observability** — no metrics backend, APM, or structured logging standard yet.

Complements [feat-0003](../feat-0003-api-trpc/PRODUCT.md) (API server), [feat-0006](../feat-0006-email/PRODUCT.md) (email delivery).

## Problem

Deployments need a cheap health signal. Email operations need bounce/delivery feedback loop. Without documented endpoints, infra may probe wrong paths or miss webhook configuration.

## Non-goals

- Prometheus / OpenTelemetry exporters.
- Uptime SaaS integration in code.
- Public status page product.
- Webhook signature verification beyond shared secret header (no HMAC body verify today).

## Actors

| Actor | Description |
|-------|-------------|
| **Load balancer / ops** | Hits `GET /` or `health.ping`. |
| **Resend** | POSTs delivery events. |
| **Developer** | Reads console logs for errors. |

## Surfaces catalogue

| Surface | URL / procedure | Auth | Purpose |
|---------|-----------------|------|---------|
| tRPC health | `health.ping` | Public | `{ ok: true }` JSON |
| API root HTML | `GET /` on API host | Public | Styled health card |
| Resend webhook | `POST /webhooks/resend` | `x-resend-signature` header | Update `EmailDelivery` |
| WebSocket ping | WS message `type: ping` | Session cookie | `pong` (feat-0013) |

## Use case catalog

### A. Health ping (tRPC)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Probe via tRPC | API up | `health.ping` query | `{ ok: true }` |
| **UC-A02** | No database check | — | Ping does not query Prisma | **Liveness only**, not readiness |
| **UC-A03** | Unauthenticated | — | `publicProcedure` | No session required |

### B. API root HTML

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Browser or LB hits API root | `GET /` | Returns HTML health card | 200 `text/html` |
| **UC-B11** | Environment label | `NODE_ENV` | Shows PRODUCTION / STAGING / DEVELOPMENT pill | Visual env discrimination |
| **UC-B12** | Uptime display | Process running | `process.uptime()` formatted | Shown on card |
| **UC-B13** | No DB dependency | — | Static “Healthy” / “Errors: None” | Does not detect Postgres outage |

### C. Resend webhook

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Valid webhook | `RESEND_WEBHOOK_SIGNING_SECRET` set; header matches | Parse JSON → dedupe by `eventId` | 200 `ok` |
| **UC-C21** | Duplicate event | Same `eventId` exists | Skip insert; 200 | Idempotent |
| **UC-C22** | Map delivery status | `data.email_id` present | `emailDelivery.updateMany` by `providerMessageId` | Status `delivered` / `bounced` / etc. |
| **UC-C23** | Invalid signature | Wrong/missing header | 401 | No DB change |
| **UC-C24** | Invalid JSON | Malformed body | 400 | No DB change |

### D. Operational gaps

| ID | Use case | Status today |
|----|----------|--------------|
| **UC-D30** | Readiness checks DB + storage | **Not implemented** |
| **UC-D31** | Structured request logging | Console.error ad hoc |
| **UC-D32** | Orphan upload cleanup metrics | Log line only (`cleanup-orphans.ts`) |
| **UC-D33** | Alert on email bounce rate | **Not implemented** |

## Behavior (product rules)

1. **`health.ping`** must stay lightweight and unauthenticated for LB use.
2. **HTML root** is for humans; do not expose secrets or env values beyond `NODE_ENV` classification.
3. **Webhook** stores `ResendWebhookEvent` with `eventId`, `eventType`, `payloadHash` for deduplication audit.
4. `mapWebhookEventToDeliveryStatus` maps event type substring to delivery status string.

## Open questions

1. Add `health.ready` with Prisma `SELECT 1`? **Default:** yes for Kubernetes.
2. Verify Resend HMAC body signature? **Default:** follow Resend docs upgrade.
3. Expose version git sha on HTML card? **Default:** build-time inject.

## Related

- [feat-0003 PRODUCT](../feat-0003-api-trpc/PRODUCT.md)
- [feat-0006 PRODUCT](../feat-0006-email/PRODUCT.md)
- [feat-0013 PRODUCT](../feat-0013-chat-realtime/PRODUCT.md) — WS ping
- `apps/api/src/index.ts`
- `packages/trpc/src/routers/health.ts`
- `apps/api/src/cleanup-orphans.ts`
