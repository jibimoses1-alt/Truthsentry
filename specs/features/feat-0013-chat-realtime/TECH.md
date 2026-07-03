# feat-0013: Tech Spec — Chat realtime (WebSocket)

## Context

See [`PRODUCT.md`](./PRODUCT.md). WebSocket server lives in `apps/api/src/index.ts`; client hook in `apps/web/hooks/use-realtime.ts`.

## Architecture

```text
Browser (chat-page-client)
  useRealtime({ claimId, enabled, onMessage, onStatusChange, onGapDetected })
       │  wss://NEXT_PUBLIC_API_URL/ws  (+ session cookie)
       ▼
apps/api HTTP server upgrade
  validate SESSION_COOKIE → prisma.session
  wsClients: Map<userId, { ws, subscribedClaimIds }>
       ▲
claim router mutations → ctx.broadcastToClaimSubscribers(claimId, { type, payload })
```

## WebSocket URL

`apps/web/hooks/use-realtime.ts`:

```ts
function getWsUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const parsed = new URL(apiUrl);
  const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${parsed.host}/ws`;
}
```

Default dev: `ws://localhost:4000/ws`

## Server implementation

File: `apps/api/src/index.ts` (section WebSocket server)

### Upgrade handler

1. Parse `SESSION_COOKIE` from `Cookie` header
2. Hash token → `prisma.session.findFirst` with `expiresAt > now`
3. 401 if missing/invalid
4. `wss.handleUpgrade` → register `WSClient`

### Client map

```ts
interface WSClient {
  ws: WebSocket;
  userId: string;
  subscribedClaimIds: Set<string>;
}
const wsClients = new Map<string, WSClient>(); // key: userId — one socket per user
```

### Inbound message types

| type | Handler |
|------|---------|
| `subscribe` | Add each `payload.claimIds[]` to set |
| `unsubscribe` | Remove claim ids from set |
| `ping` | Reply `{ type: 'pong', payload: {}, ts }` |

**Gap:** No verification that user owns subscribed claim ids.

### Outbound broadcast

```ts
function broadcastToClaimSubscribers(claimId: string, msg: Omit<WSMessage, 'ts' | 'seq'>): void {
  globalSeq += 1;
  const frame = JSON.stringify({ ...msg, ts: Date.now(), seq: globalSeq });
  for (const client of wsClients.values()) {
    if (client.subscribedClaimIds.has(claimId) && client.ws.readyState === 1) {
      client.ws.send(frame);
    }
  }
}
```

Exported and injected into tRPC context as `broadcastToClaimSubscribers`.

### Heartbeat

```ts
setInterval(() => {
  for (const client of wsClients.values()) {
    if (client.ws.readyState === 1) client.ws.ping();
  }
}, 30_000);
```

## Emitters (claim router)

File: `packages/trpc/src/routers/claim.ts`

| Procedure | Events |
|-----------|--------|
| `appendUserMessage` | `message.created` `{ claimId, messageId }` |
| `generateAssistantReply` | `message.created` + `claim.statusChanged` `{ claimId, factCheckStatus }` |
| `create` | **none** |

## Client hook

File: `apps/web/hooks/use-realtime.ts`

### Options

```ts
interface UseRealtimeOptions {
  claimId: string | null;
  enabled: boolean;
  onMessage?: (payload: Record<string, unknown>) => void;
  onStatusChange?: (payload: Record<string, unknown>) => void;
  onTypingChange?: (isTyping: boolean) => void;
  onGapDetected?: () => void;
}
```

### Reconnect config

| Param | Value |
|-------|-------|
| `baseDelay` | 1000 ms |
| `maxDelay` | 30000 ms |
| `backoffMultiplier` | 2 |
| Jitter | ±20% |

### Seq gap detection

```ts
if (lastSeqRef.current > 0 && msg.seq > lastSeqRef.current + 1) {
  onGapDetected?.();
}
```

### Subscription timing

- On `ws.onopen`: subscribe if `claimId` set
- `useEffect([claimId])`: subscribe when socket OPEN and claim changes

**Gap:** Does not `unsubscribe` previous claim ids.

## Chat page wiring

`apps/web/components/chat-page-client.tsx`:

```ts
useRealtime({
  claimId: activeThreadId,
  enabled: Boolean(activeThreadId),
  onMessage: () => trpcUtils.claim.byId.invalidate({ claimId: activeThreadId }),
  onStatusChange: () => {
    trpcUtils.claim.byId.invalidate({ claimId: activeThreadId });
    trpcUtils.claim.listMine.invalidate();
  },
  onGapDetected: () => trpcUtils.claim.byId.invalidate({ claimId: activeThreadId }),
  onTypingChange: () => { /* unused — isPending drives UI */ },
});
```

## tRPC context type

`packages/trpc/src/types.ts` — optional `broadcastToClaimSubscribers` on context.

## PRODUCT mapping

| UC IDs | Implementation |
|--------|----------------|
| UC-RT01–RT05 | `use-realtime.ts` connect/cleanup |
| UC-RT02 | `server.on('upgrade')` session check |
| UC-RT03–RT04 | subscribe messages |
| UC-RT10–RT13 | `onmessage` switch |
| UC-RT20–RT22 | `scheduleReconnect` |
| UC-RT30–RT31 | claim router broadcasts |
| UC-RT32 | create omission |
| UC-RT40 | `wsClients` keyed by userId |
| UC-RT41 | no ownership on subscribe |

## Known gaps

| Gap | Detail | Severity |
|-----|--------|----------|
| No subscribe authz | Any authenticated user could subscribe to guessed cuid | Medium |
| No unsubscribe on switch | Stale claim ids remain in set | Low |
| `create` silent | First message not pushed | Low |
| Typing events unused | Server never emits `typing.*` | — |
| One connection per user | Second tab overwrites first in map | Medium |
| `enabled` vs connect | Hook connects when `enabled` false only skips subscribe path partially — connect gated by `enabled` in `connect()` | Review |
| Cookie domain | Web and API on different hosts need cookie `Domain` / proxy alignment | Ops |
| No E2E WS test | Manual only | — |

## Testing and validation

```bash
pnpm --filter @truthsentry/api dev   # :4000
pnpm --filter @truthsentry/web dev   # chat page
```

| Case | Steps | Expected |
|------|-------|----------|
| Happy path | Send follow-up in thread | Assistant message appears without manual refresh |
| Invalid session | Upgrade without cookie | Connection rejected |
| Reconnect | Kill API briefly | Client reconnects; events resume after resubscribe |
| Seq gap | Simulate skipped seq | `onGapDetected` invalidates |

## Related

- [feat-0011 TECH](../feat-0011-chat-messaging/TECH.md) — broadcast call sites
- [feat-0005 TECH](../feat-0005-session/TECH.md) — session cookie
- [`../../AI_CHATBOT_SPEC.md`](../../AI_CHATBOT_SPEC.md)
- `apps/api/src/index.ts` — upgrade + broadcast
