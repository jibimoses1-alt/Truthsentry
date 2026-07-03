# feat-0014: Client message outbox (offline retry)

## Summary

Follow-up chat messages in an **existing claim thread** are queued in a **browser localStorage outbox** when the network is unavailable or the send fails. The client retries automatically when the user comes back **online**, on a **periodic flush interval**, and on **manual retry** after permanent failure. **First claim creation** (new thread) does **not** use the outbox today — it fails inline with a toast.

Complements [feat-0011](../feat-0011-chat-messaging/PRODUCT.md) (messaging), [feat-0013](../feat-0013-chat-realtime/PRODUCT.md) (live updates after successful send).

## Problem

Users on unstable mobile networks (common for WhatsApp-origin traffic) lose follow-up messages when `appendUserMessage` or `generateAssistantReply` fails mid-flight. Without durable client-side queueing, the user must retype content and may not know whether the server received the message.

## Non-goals

- Server-side message queue or idempotent worker (outbox is **client-only**).
- Outbox for **new claim** creation or image upload bytes (uploads run before enqueue; failed uploads block enqueue).
- Cross-device sync of pending messages.
- Encrypting outbox payloads at rest (localStorage is plaintext).

## Actors

| Actor | Description |
|-------|-------------|
| **Claimant** | Signed-in user sending follow-up messages in an active thread. |
| **Browser** | Persists outbox, listens for `online` / `offline`. |
| **Platform** | tRPC mutations consumed when flush succeeds. |

## Scope

| In scope | Out of scope |
|----------|--------------|
| Follow-up user messages + attachments metadata in outbox | First message on new thread |
| Auto-retry on reconnect and interval | Retry of assistant generation alone |
| Failed-state banner + manual retry | Admin visibility into client outbox |

## Use case catalog

### A. Enqueue and send

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Send follow-up while online | Active `claimId`; text and/or images uploaded | User submits → `outbox.enqueue` → `flush` → `appendUserMessage` → `generateAssistantReply` | Message on server; thread refreshed |
| **UC-A02** | Send follow-up while offline | Active thread; `navigator.onLine === false` | Submit → enqueue → flush skipped (no online) | Entry `queued` in localStorage; composer cleared |
| **UC-A03** | New thread first message | No `activeThreadId` | `claim.create` + `generateAssistantReply` directly | **No outbox**; errors surface via toast |
| **UC-A04** | Enqueue with image attachments | Images passed upload step | Attachments stored in outbox entry (`url`, `mimeType`, `sizeBytes`, `uploadPath`) | Flush resends attachment refs to API |

### B. Retry and recovery

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Auto-flush on reconnect | Queued entries exist | `window` `online` event → `flush` | Pending entries sent or re-queued |
| **UC-B11** | Periodic flush | Queued entries; user online | Every 3s interval checks pending + online → `flush` | Stuck `queued` entries retried |
| **UC-B12** | Transient failure retry | API error during flush | `markFailed` → `attempts++`; status stays `queued` if attempts &lt; 5 | Up to 5 attempts |
| **UC-B13** | Permanent failure | 5 failed attempts | Status → `failed` | Red banner shown in chat |
| **UC-B14** | Manual retry all failed | `failedCount > 0` | User taps **Reessayer** → `retry(id)` resets attempts → flush | Failed entries re-queued |
| **UC-B15** | Stale entry purge | Entry older than 24h | On load, filtered out of outbox | Prevents unbounded growth |

### C. UI and status

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Offline composer hint | `!isOnline` | `ChatComposer` shows `offlineMessage` | User knows sends may queue |
| **UC-C21** | Failed messages banner | `outbox.failedCount > 0` | Banner above composer with count + retry | User can recover |
| **UC-C22** | Disable composer while sending | Pending mutations | `disabled` when create/append/generate pending | Prevents double-submit |

### D. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-D30** | localStorage full or blocked → persist silently no-ops; in-memory state still works for session |
| **UC-D31** | Duplicate `clientRequestId` (`entry.id`) → server unique constraint on `(claimId, clientReqId)` prevents duplicate messages on successful retry |
| **UC-D32** | User switches thread while flush in progress → flush uses snapshot `entries` at callback creation; may complete for prior thread |
| **UC-D33** | Logout with queued messages → outbox not cleared; may flush on next login if same browser |
| **UC-D34** | Assistant reply fails after user message saved → entry marked failed even though user message exists (product gap) |

## Behavior (product rules)

1. **Outbox applies only** when `activeThreadId` is set (follow-up path in `handleSubmit`).
2. **Storage key:** `truthsentry_message_outbox` (browser localStorage).
3. **Max retries:** 5 attempts per entry before `failed`.
4. **Flush guard:** No flush when offline (`navigator.onLine`); `useOnlineStatus` drives composer offline UX.
5. **Successful flush** invalidates `claim.listMine` and `claim.byId` for the thread.
6. **Idempotency:** Outbox entry `id` is sent as `clientRequestId` to the API.

## Open questions

1. Should **first claim** also use outbox for parity with follow-ups? **Default:** yes in a follow-up feat.
2. Should failed banner copy be i18n (`messages/*.json`)? **Today:** hard-coded French in `chat-page-client.tsx`.
3. Clear outbox on logout? **Default:** optional enhancement.

## Related

- [feat-0011 PRODUCT](../feat-0011-chat-messaging/PRODUCT.md) — composer and submit flow
- [feat-0013 PRODUCT](../feat-0013-chat-realtime/PRODUCT.md) — post-send invalidation
- `apps/web/hooks/use-message-outbox.ts`
- `apps/web/hooks/use-online-status.ts`
- `apps/web/components/chat-page-client.tsx`
