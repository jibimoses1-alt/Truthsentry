# feat-0011: Tech Spec — Chat messaging and composer

## Context

See [`PRODUCT.md`](./PRODUCT.md). Orchestration lives in `apps/web/components/chat-page-client.tsx`; presentation in `@truthsentry/ui/chat`.

## UI modules

| Component | Path |
|-----------|------|
| `ChatComposer` | `packages/ui/.../chat-composer.tsx` |
| `ChatMessageList` | `packages/ui/.../chat-message-list.tsx` |
| `ChatMessageRow` | `packages/ui/.../chat-message-row.tsx` |
| `ChatHomeEmpty` | `packages/ui/.../chat-home-empty.tsx` |
| `ChatTypingIndicator` | `packages/ui/.../chat-typing-indicator.tsx` |
| `ChatThreadDivider` | `packages/ui/.../chat-thread-divider.tsx` |
| `ClaimMetadataHeader` | inline in `chat-page-client.tsx` |

### Verdict styling (client)

```ts
const VERDICT_STYLES: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-800 dark:bg-green-900/30 ...',
  DEBUNKED: 'bg-red-100 ...',
  // ...
};
const VERDICT_LABELS: Record<string, string> = {
  VERIFIED: 'Verifie',
  DEBUNKED: 'Dementi',
  // ...
};
```

## tRPC procedures

Router: `packages/trpc/src/routers/claim.ts`

### `claim.create` (mutation)

| Field | Notes |
|-------|-------|
| `content` | 1–4000 chars |
| `title?` | Optional; defaults from content slice |
| `clientRequestId?` | UUID |
| `attachments?` | From upload flow |
| `metadata?` | `claimMetadataInput` — language, mediaType, source fields |

Creates `Claim` + first `ClaimMessage` (USER). Rate limit: 5/min per user.

**Gap:** Does not call `broadcastToClaimSubscribers`.

Returns `{ claimId }`.

### `claim.appendUserMessage` (mutation)

Input: `chatMessageInput` — `claimId`, `content`, `clientRequestId?`, `attachments?`.

Broadcasts `message.created` with `{ claimId, messageId }`.

### `claim.generateAssistantReply` (mutation)

| Step | Action |
|------|--------|
| 1 | Set claim `status: PROCESSING` |
| 2 | Send claim-queued email (idempotent) |
| 3 | `generateAssistantText` + optional `extractClaimMetadata` |
| 4 | Create ASSISTANT `ClaimMessage` |
| 5 | Update claim: `RESOLVED`, `factCheckText`, `factCheckStatus`, `factCheckDate` |
| 6 | Broadcast `message.created` + `claim.statusChanged` |
| 7 | Send claim-resolved email |

Verdict parse:

```ts
const VERDICT_PATTERN = /\b(verified|debunked|misleading|partially[_ ]true)\b/i;
```

### `claim.byId` (query)

Returns claim fields for metadata header + `messages[]` with refreshed attachment URLs.

## Client send flow

```text
handleSubmit
  ├─ no activeThreadId
  │    ├─ uploadPendingFiles()  [feat-0012]
  │    ├─ createClaim.mutateAsync({ content, metadata, attachments })
  │    ├─ setActiveThreadId, setStarted(true)
  │    └─ generateAssistantReply.mutateAsync({ claimId })
  └─ activeThreadId
       ├─ uploadPendingFiles(claimId)
       ├─ outbox.enqueue({ claimId, content, attachments })
       └─ outbox.flush() → appendUserMessage + generateAssistantReply
```

### Outbox hook

`apps/web/hooks/use-message-outbox.ts` — retries failed append+generate chain ([feat-0014](../feat-0014-chat-outbox/TECH.md)).

### Language detection

`apps/web/lib/language-detection.ts` — `detectLanguageFromText` on create.

## Supporting hooks (messaging-adjacent)

| Hook | File | Note |
|------|------|------|
| `useOnlineStatus` | `hooks/use-online-status.ts` | Offline composer banner |
| `useAudioRecording` | `hooks/use-audio-recording.ts` | Mic → OpenAI Whisper (client key gap) |
| `useApiToast` | `hooks/use-api-toast.ts` | Error/warning toasts |

## API context (AI)

Wired in `apps/api/src/index.ts` tRPC context:

- `generateAssistantText`
- `extractClaimMetadata` (optional)
- `sendClaimQueuedEmail`, `sendClaimResolvedEmail`

Detail: [feat-0015 TECH](../feat-0015-claims-ai/TECH.md).

## PRODUCT mapping

| UC IDs | Files |
|--------|-------|
| UC-MS01–MS03 | `ChatHomeEmpty`, `homeColumns` |
| UC-MS10–MS14 | `handleSubmit`, `claim.create` |
| UC-MS20–MS22 | `use-message-outbox.ts` |
| UC-MS30–MS34 | `ChatComposer` |
| UC-MS40–MS45 | `ChatMessageRow`, render loop |
| UC-MS50–MS52 | `ClaimMetadataHeader` |
| UC-MS60 | `checkRateLimit` in router |
| UC-MS61 | `generateAssistantReply` catch fallback |

## Known gaps

| Gap | Detail |
|-----|--------|
| No streaming | Full reply after mutation completes |
| French hard-coded | Verdict labels, home columns, divider “Aujourd'hui” |
| `create` no WS event | First user message not pushed via websocket |
| Mic / Whisper | Uses `NEXT_PUBLIC_OPENAI_API_KEY` in browser — security gap |
| Markdown | Plain text only |
| Verdict on every assistant row | Uses claim-level `factCheckStatus`, not per-message |
| Thread divider | Not date-based |
| `updateMetadata` | API exists; no UI |

## Testing and validation

```bash
pnpm --filter @truthsentry/trpc test
pnpm --filter @truthsentry/web exec tsc --noEmit
```

| Case | Expected |
|------|----------|
| First message | Claim + user msg + assistant msg in DB |
| Follow-up | Second user msg; assistant reply |
| Empty submit | Toast warning, no API call |
| Metadata extract | Fields populated after first generate when empty |

## Related

- [feat-0012 TECH](../feat-0012-chat-uploads/TECH.md)
- [feat-0013 TECH](../feat-0013-chat-realtime/TECH.md)
- [feat-0014 TECH](../feat-0014-chat-outbox/TECH.md)
- [feat-0015 TECH](../feat-0015-claims-ai/TECH.md)
- `packages/trpc/src/schemas.ts` — `chatMessageInput`, `claimMetadataInput`
