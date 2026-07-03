# feat-0011: Chat messaging and composer

## Summary

Signed-in users **compose and send messages** on `/{locale}/chat`: multiline **composer** (`ChatComposer`), **first message** via `claim.create`, **follow-ups** via `claim.appendUserMessage` + **`claim.generateAssistantReply`**. The UI shows a **home empty state** (`ChatHomeEmpty`) with example lines, **message rows** for USER/ASSISTANT/SYSTEM roles, **verdict badges** derived from `factCheckStatus`, **typing indicator** while AI runs, and a **metadata header** (source, platform, topic, location, language). Depends on [feat-0010](../feat-0010-chat-threads/PRODUCT.md) (thread shell) and [feat-0015](../feat-0015-claims-ai/PRODUCT.md) (AI pipeline behind `generateAssistantReply`).

Image attachments: [feat-0012](../feat-0012-chat-uploads/PRODUCT.md). Realtime refresh: [feat-0013](../feat-0013-chat-realtime/PRODUCT.md). Offline retries: [feat-0014](../feat-0014-chat-outbox/PRODUCT.md).

## Problem

Users need a familiar chat pattern to submit claims and read outcomes. The product must distinguish user vs assistant content, surface fact-check verdicts clearly, and show claim context (source, language) without exposing internal pipeline jargon.

## Non-goals

- Streaming token-by-token assistant text (single mutation returns full reply).
- Rich markdown rendering beyond `whitespace-pre-wrap` paragraphs.
- Editing or deleting sent messages.
- Human reviewer replies in-thread ([feat-0018](../feat-0018-admin/PRODUCT.md)).
- Voice input production path ([feat-0020](../feat-0020-audio-input/PRODUCT.md) — mic calls OpenAI from browser today with env key gap).

## Actors

| Actor | Description |
|-------|-------------|
| **Claimant** | Sends text/images; reads assistant responses. |
| **Platform** | Persists messages, runs AI, updates `factCheckStatus`. |

## Use case catalog

### A. Home empty state

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-MS01** | View welcome | `started=false` | Open chat / new chat | `ChatHomeEmpty` with three columns |
| **UC-MS02** | Example line click | On home | Click example line | Text copied into composer |
| **UC-MS03** | Column purposes | On home | Read Examples / Capabilities / Limitations | Sets expectations |

Home columns are defined in `chat-page-client.tsx` (`homeColumns`) — partly hard-coded French today.

### B. First message (new thread)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-MS10** | Send text claim | No `activeThreadId` | Submit composer | `claim.create` + user message row |
| **UC-MS11** | AI reply | After create | `generateAssistantReply` | Assistant message; claim `status=RESOLVED` |
| **UC-MS12** | Language detection | Text present | `detectLanguageFromText` | `metadata.claimLanguage` on create |
| **UC-MS13** | Empty submit | Blank composer, no files | Submit | Warning toast “Rien a envoyer” |
| **UC-MS14** | Title from content | Create | `title` or slice(0,60) | Sidebar shows title |

### C. Follow-up messages

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-MS20** | Send follow-up | `activeThreadId` set | Submit | `appendUserMessage` via outbox |
| **UC-MS21** | AI on follow-up | After append | `generateAssistantReply` | New assistant row |
| **UC-MS22** | Outbox retry | Network failure | Failed banner → Reessayer | Retries enqueue ([feat-0014](../feat-0014-chat-outbox/PRODUCT.md)) |

### D. Composer UX

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-MS30** | Multiline input | Composer focused | Shift+Enter | New line |
| **UC-MS31** | Send shortcut | Content present | Enter | `handleSubmit` |
| **UC-MS32** | Disabled while busy | Mutation pending | UI | Composer disabled |
| **UC-MS33** | Offline banner | `!isOnline` | Composer shows strip | `chat.offline` message |
| **UC-MS34** | Image attach UI | Click paperclip | Select file | Validates via feat-0012 before preview |

### E. Message display

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-MS40** | User bubble | Thread loaded | USER rows | Right-aligned styling |
| **UC-MS41** | Assistant bubble | ASSISTANT rows | Content + optional verdict badge |
| **UC-MS42** | Verdict badge | `factCheckStatus !== PENDING` | Badge on assistant messages | French labels: Verifie, Dementi, etc. |
| **UC-MS43** | Typing indicator | `generateAssistantReply.isPending` | `ChatTypingIndicator` | Shown below messages |
| **UC-MS44** | Image in history | Message has attachments | Thumbnail link | Opens signed URL in new tab |
| **UC-MS45** | Thread divider | Thread started | “Aujourd'hui” label | Visual separator (not date-aware) |

### F. Metadata header

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-MS50** | Show tags | `started` + claim loaded | `ClaimMetadataHeader` | Source, platform, topic, location, language |
| **UC-MS51** | Verdict in header | Resolved verdict | Tag row includes badge | Same styles as message badge |
| **UC-MS52** | Hidden when empty | No metadata fields | Header not rendered | `null` |

Metadata may be enriched by AI `extractClaimMetadata` on first reply ([feat-0015](../feat-0015-claims-ai/PRODUCT.md)).

### G. Verdict model (product)

| Status | User-facing label (current UI) |
|--------|-------------------------------|
| `VERIFIED` | Verifie |
| `DEBUNKED` | Dementi |
| `MISLEADING` | Trompeur |
| `PARTIALLY_TRUE` | Partiellement vrai |
| `PENDING` | En attente (badge hidden) |

### H. Negative cases

| ID | Expected behavior |
|----|-------------------|
| **UC-MS60** | Rate limit on create → `TOO_MANY_REQUESTS` toast |
| **UC-MS61** | AI failure → fallback assistant text in French |
| **UC-MS62** | Verdict labels hard-coded French (i18n gap) |
| **UC-MS63** | `create` does not broadcast WS; first assistant message relies on mutation return + invalidate |

## Behavior (product rules)

1. **Two send paths:** no `activeThreadId` → synchronous `create` + `generateAssistantReply`; with thread → outbox enqueue for append + generate.

2. **Claim lifecycle on reply:** `generateAssistantReply` sets `status` PROCESSING then RESOLVED; parses verdict from assistant text regex.

3. **Emails:** queued and resolved templates sent on generate (feat-0006); failures logged, not blocking.

4. **Content limit:** 4000 chars on create/append (API schema).

5. **Idempotency:** `clientRequestId` UUID on create and outbox entries.

6. **Home vs thread:** `started` flag controls empty state vs message list.

7. **Metadata header** only when thread started and `claim.byId` loaded.

## Open questions

1. Move verdict labels and home columns to i18n? **Default:** yes.

2. Show verdict per message vs only latest claim status? **Default:** claim-level badge on all assistant rows today.

3. Date-aware thread dividers? **Default:** later.

## Related

- [feat-0010 PRODUCT](../feat-0010-chat-threads/PRODUCT.md)
- [feat-0012 PRODUCT](../feat-0012-chat-uploads/PRODUCT.md)
- [feat-0013 PRODUCT](../feat-0013-chat-realtime/PRODUCT.md)
- [feat-0015 PRODUCT](../feat-0015-claims-ai/PRODUCT.md)
- [`../../AI_CHATBOT_SPEC.md`](../../AI_CHATBOT_SPEC.md)
