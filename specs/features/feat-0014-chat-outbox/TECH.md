# feat-0014: Tech Spec — Client message outbox

## Context

See [`PRODUCT.md`](./PRODUCT.md). Client-side durability for **follow-up** claim messages. Implemented as React hooks consumed by the chat page; no server outbox table.

## Module map

| File | Role |
|------|------|
| `apps/web/hooks/use-message-outbox.ts` | Outbox state, localStorage, flush/retry |
| `apps/web/hooks/use-online-status.ts` | `navigator.onLine` + `online`/`offline` listeners |
| `apps/web/components/chat-page-client.tsx` | Wires outbox to tRPC; offline UI; failed banner |

## Outbox configuration

```ts
// apps/web/hooks/use-message-outbox.ts
const OUTBOX_CONFIG = {
  maxRetries: 5,
  storageKey: 'truthsentry_message_outbox',
  flushInterval: 3_000,
  staleThreshold: 86_400_000, // 24h
} as const;
```

## Data shape (`OutboxEntry`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID; sent as `clientRequestId` |
| `claimId` | `string` | Target thread |
| `content` | `string` | Message body |
| `attachments` | array | Post-upload refs (`url`, `mimeType`, `sizeBytes`, `uploadPath?`) |
| `status` | `queued \| sending \| sent \| failed` | Lifecycle |
| `attempts` | `number` | Incremented on flush error |
| `createdAt` | `number` | Epoch ms; stale filter on load |
| `lastAttemptAt?` | `number` | Set on failure |

## Flush pipeline

```text
enqueue → (online?) → flush → for each queued:
  status=sending → sendFn(entry) → markSent | markFailed
```

`sendFn` in `chat-page-client.tsx`:

1. `trpc.claim.appendUserMessage.mutateAsync`
2. `trpc.claim.generateAssistantReply.mutateAsync`
3. Invalidate `claim.listMine` + `claim.byId`

## Online status

`useOnlineStatus` initialises from `navigator.onLine`, subscribes to `window` `online`/`offline`. Outbox additionally listens to `online` for immediate flush (duplicate concern with interval — both are intentional).

## Integration points (`chat-page-client.tsx`)

| Location | Behavior |
|----------|----------|
| `handleSubmit` — no `activeThreadId` | Direct `createClaim` + `generateAssistantReply` |
| `handleSubmit` — has `activeThreadId` | `outbox.enqueue` + `void outbox.flush()` |
| Composer | `isOffline={!isOnline}` |
| Below message list | Failed banner when `outbox.failedCount > 0` |

## Server idempotency

`ClaimMessage` unique `@@unique([claimId, clientReqId])` in `packages/prisma/schema.prisma` — safe retry of same outbox `id`.

## Known gaps

| Gap | PRODUCT ref | Notes |
|-----|-------------|-------|
| First message not in outbox | UC-A03 | Network loss on create shows toast only |
| Partial success (user msg saved, AI fails) | UC-D34 | Whole entry fails; user may see duplicate if they retry manually without idempotency awareness |
| French hard-coded retry banner | UC-C21 | Not in `messages/ar.json` / `en.json` |
| Outbox survives logout | UC-D33 | No cleanup hook |
| `flush` closure over `entries` | UC-D32 | Stale snapshot during rapid edits |
| No optimistic UI for queued messages | — | Queued entries not shown in thread list |

## Testing and validation

| Case | Expected |
|------|----------|
| Enqueue offline | `localStorage` contains entry; status `queued` |
| Go online | Entry sent; status `sent` |
| 5 API failures | Status `failed`; banner visible |
| Retry button | `attempts` reset; flush succeeds |
| Entry &gt; 24h old | Dropped on page load |

Manual: DevTools → Network offline → send follow-up → online → message appears.

```bash
pnpm --filter @truthsentry/web typecheck
```

## Related

- [feat-0011 TECH](../feat-0011-chat-messaging/TECH.md)
- [feat-0013 TECH](../feat-0013-chat-realtime/TECH.md)
- `packages/prisma/schema.prisma` — `ClaimMessage.clientReqId`
