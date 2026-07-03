# feat-0013: Chat realtime (WebSocket)

## Summary

The chat client subscribes to a **WebSocket** on the API host (`/ws`) for live updates while a thread is open. Server pushes **`message.created`** when messages persist and **`claim.statusChanged`** when fact-check status updates. The hook **`use-realtime.ts`** reconnects with exponential backoff, tracks **sequence gaps**, and triggers **tRPC cache invalidation** so UI stays in sync without polling. Depends on [feat-0011](../feat-0011-chat-messaging/PRODUCT.md) (events emitted from claim router) and [feat-0005](../feat-0005-session/PRODUCT.md) (session cookie on upgrade).

## Problem

After sending a message, users expect assistant replies and verdict updates to appear promptly. Polling `claim.byId` wastes bandwidth; multiple tabs should receive the same events when subscribed to the same claim.

## Non-goals

- Full message payload in WS frames (client refetches via tRPC).
- Typing indicators from server during AI generation (client uses `generateAssistantReply.isPending` instead).
- WebSocket for sidebar list when no thread selected (subscribe only active `claimId`).
- SSE or Supabase Realtime as alternate transport.
- Mobile background push notifications.

## Actors

| Actor | Description |
|-------|-------------|
| **Claimant** | Open thread; receives pushes for that claim. |
| **API server** | Authenticates upgrade; fans out events to subscribers. |

## Event catalog

| Event | Direction | Payload (current) | Client action |
|-------|-----------|-------------------|---------------|
| `subscribe` | client → server | `{ claimIds: string[] }` | Join claim rooms |
| `unsubscribe` | client → server | `{ claimIds: string[] }` | Leave rooms |
| `ping` | client → server | `{}` | Server `pong` |
| `message.created` | server → client | `{ claimId, messageId }` | Invalidate `claim.byId` |
| `claim.statusChanged` | server → client | `{ claimId, factCheckStatus }` | Invalidate `byId` + `listMine` |
| `typing.start` / `typing.stop` | server → client | — | **Not emitted today**; hook handles but unused |

Every server frame includes `ts` and monotonic `seq`.

## Use case catalog

### A. Connection lifecycle

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-RT01** | Connect | User on chat page | `useRealtime` enabled | WS to `wss://{API}/ws` |
| **UC-RT02** | Auth on upgrade | Valid session cookie | HTTP upgrade | 401 if missing/invalid session |
| **UC-RT03** | Subscribe to thread | `activeThreadId` set | Send `subscribe` with claim id | Server adds id to client set |
| **UC-RT04** | Switch thread | User selects another row | New `subscribe` message | Prior id may remain subscribed **Gap** |
| **UC-RT05** | Disconnect on leave | Unmount chat | WS closed | Cleanup timers |

### B. Event handling

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-RT10** | New message push | Assistant/user message saved | `message.created` | `claim.byId` refetch |
| **UC-RT11** | Status push | Verdict updated | `claim.statusChanged` | `byId` + `listMine` refetch |
| **UC-RT12** | Gap detection | `seq` skip > 1 | `onGapDetected` | Force `byId` invalidate |
| **UC-RT13** | Malformed frame | Invalid JSON | — | Ignored (no crash) |

### C. Reconnection

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-RT20** | Transient drop | Network blip | `onclose` → backoff reconnect | New socket; resubscribe on open |
| **UC-RT21** | Backoff cap | Repeated failures | Delay capped at 30s + jitter | Continues retry while enabled |
| **UC-RT22** | Successful reconnect | Server available | `reconnectAttempt` reset to 0 | Subscription resent |

### D. Server broadcast rules

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-RT30** | Append user message | `appendUserMessage` | Broadcast `message.created` | Subscribers refresh |
| **UC-RT31** | Assistant reply | `generateAssistantReply` | `message.created` + `claim.statusChanged` | Verdict visible after invalidate |
| **UC-RT32** | First create | `claim.create` only | — | **Gap:** no broadcast on create |

### E. Negative cases

| ID | Expected behavior |
|----|-------------------|
| **UC-RT40** | One WS client per user id — new connection replaces map entry |
| **UC-RT41** | Subscribe without ownership check — relies on claim id secrecy + session **Gap** |
| **UC-RT42** | `enabled=false` when no thread — connection still opens but no subscribe until claimId |
| **UC-RT43** | Cross-origin: API CORS does not apply to WS; cookie must be sent to API domain |

## Behavior (product rules)

1. **Refetch over push:** Payload carries ids only; full message bodies from `claim.byId`.

2. **Subscribe on open and on claimId change** when socket already OPEN.

3. **Heartbeat:** Server pings clients every 30s.

4. **Invalidation targets:** active thread query + sidebar list on status change.

5. **Typing UI** driven by mutation pending state, not WS typing events.

6. **Session cookie** (`SESSION_COOKIE`) required for upgrade — same as tRPC HTTP.

## Open questions

1. Unsubscribe old claim when switching threads? **Default:** send `unsubscribe` (not implemented client-side).

2. Authorize subscribe server-side against claim ownership? **Default:** yes (security hardening).

3. Broadcast on `claim.create`? **Default:** optional for multi-tab new-thread sync.

## Related

- [feat-0011 PRODUCT](../feat-0011-chat-messaging/PRODUCT.md)
- [feat-0010 PRODUCT](../feat-0010-chat-threads/PRODUCT.md)
- [`../../AI_CHATBOT_SPEC.md`](../../AI_CHATBOT_SPEC.md) — realtime section
