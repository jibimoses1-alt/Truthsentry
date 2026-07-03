# feat-0015: Claims metadata and AI fact-check pipeline (MVP)

## Summary

When a user submits or continues a claim thread, the platform stores **structured claim metadata** (language, source, topic, platform, media type), optionally **extracts metadata via AI** from the first user message, and generates an **assistant fact-check reply** via **OpenAI chat completions**. A **verdict** is parsed from assistant text (`VERIFIED`, `DEBUNKED`, `MISLEADING`, `PARTIALLY_TRUE`) and persisted on the claim. Users receive **transactional emails** when processing starts (“queued”) and when a reply is stored (“resolved”).

**MVP differs from** [`../../claims-ai-pipeline.md`](../../claims-ai-pipeline.md): **no RAG/retrieval**, **no `ClaimAiRun` audit table**, **no confidence threshold gate**, **no human review queue path** — every successful run ends in `RESOLVED` with assistant text.

Complements [feat-0011](../feat-0011-chat-messaging/PRODUCT.md), [feat-0006](../feat-0006-email/PRODUCT.md).

## Problem

Users submit free-form claims in Arabic or English. Reviewers and analytics need structured fields (topic, source, platform). Users expect a clear assistant response and optional email when their dossier is handled. Without documented MVP boundaries, stakeholders may assume RAG and human queue from the roadmap spec are already shipped.

## Non-goals (MVP vs roadmap)

| Roadmap (`claims-ai-pipeline.md`) | MVP (this feat) |
|-----------------------------------|-----------------|
| Vector retrieval / evidence chunks | Single-shot LLM prompt with claim metadata context |
| `ClaimAiRun` persistence | Only `Claim` + `ClaimMessage` rows |
| Confidence thresholds → human queue | Always `RESOLVED` after generation (unless hard error) |
| Citation enforcement from retrieval set | Model asked to cite reasoning; not validated |
| Async worker / job table | Synchronous mutation `generateAssistantReply` |
| `packages/ai` abstraction | Inline `fetch` in `apps/api/src/index.ts` |

## Actors

| Actor | Description |
|-------|-------------|
| **Claimant** | Submits claim text/images; receives assistant reply in thread. |
| **Platform (AI)** | OpenAI chat for reply + metadata extraction. |
| **Email (Resend)** | Queued + resolved notifications. |

## Claim metadata (product fields)

| Field | Purpose | Typical source |
|-------|---------|----------------|
| `claimText` | Normalised claim body | User message or metadata |
| `claimLanguage` | `ar` or `en` | Client detection ([feat-0007](../feat-0007-i18n/PRODUCT.md)); default `ar` |
| `claimDate` | When claim was made (optional) | User / future form |
| `sourceName` | Who said it | AI extract or user |
| `sourceType` | POLITICIAN, MEDIA, etc. | AI extract |
| `sourceUrl` | Link to original | User |
| `mediaType` | TEXT, TEXT_IMAGE, … | Client from attachments |
| `topicCategory` | POLITICS, HEALTH, … | AI extract |
| `location` | Region/country | AI extract |
| `platform` | whatsapp, twitter, … | AI extract |
| `factCheckStatus` | Verdict enum | Parsed from assistant text |
| `factCheckText` | Full assistant reply | Stored on resolve |

## Use case catalog

### A. Claim creation and language

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Create claim with detected language | Verified email | User sends first message → `detectLanguageFromText` → `metadata.claimLanguage` | Claim row default/overrides `ar` or `en` |
| **UC-A02** | Default language Arabic | Short or ambiguous text | Detection returns default | `claimLanguage = 'ar'` (DB default) |
| **UC-A03** | Arabic script forces Arabic | Text contains Arabic Unicode | `hasArabicScript` → `ar` | `claimLanguage = 'ar'` |
| **UC-A04** | English detection | Latin text, franc → en | `claimLanguage = 'en'` | Assistant prompted for English response |

### B. Metadata extraction

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Auto-extract on first AI run | Claim missing topic, source, location, platform | `extractClaimMetadata(firstUserMessage)` parallel with reply | Non-empty fields merged into `Claim` |
| **UC-B11** | Skip extract when metadata present | Any of topic/source/location/platform set | Extract not called | Existing metadata kept |
| **UC-B12** | Extract failure | AI timeout / invalid JSON | Empty object; claim still gets reply | No metadata update |
| **UC-B13** | Manual metadata update | User edits (future UI) | `claim.updateMetadata` | Partial field updates |

### C. Assistant generation and verdict

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Generate assistant reply | User message exists | `generateAssistantReply` → OpenAI chat | `ASSISTANT` message created |
| **UC-C21** | Claim context in system prompt | Metadata on claim | Source, platform, topic, language, date in prompt | Culturally aware MSA/English instruction |
| **UC-C22** | Parse verdict from text | Assistant mentions verdict keyword | `parseVerdict` regex | `factCheckStatus` updated if matched |
| **UC-C23** | No verdict in text | Model omits keyword | `factCheckStatus` unchanged (`PENDING`) | `factCheckDate` not set |
| **UC-C24** | AI hard failure | Missing key, timeout, HTTP error | Fallback French error string | Still `RESOLVED` with error copy (gap vs human queue) |
| **UC-C25** | Status lifecycle | — | `OPEN` → `PROCESSING` → `RESOLVED` | No `FAILED` path in happy/error MVP |

### D. Email notifications

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Queued email on processing start | `generateAssistantReply` invoked | `sendClaimQueuedEmail` + `EmailDelivery` upsert | User emailed “file d’attente” (wording implies human queue) |
| **UC-D31** | Resolved email on completion | Assistant message saved | `sendClaimResolvedEmail` + delivery record | User emailed resolution notice |
| **UC-D32** | Email idempotency | Same claim re-run | Keys `claim-queued:…` / `claim-resolved:…` | Upsert prevents duplicate rows per key |
| **UC-D33** | Email send failure | Resend error | Logged; claim flow continues | Delivery status `failed` |

### E. Gaps vs full pipeline spec

| ID | Roadmap expectation | MVP actual |
|----|---------------------|------------|
| **UC-E40** | Below-threshold → human queue | Always AI text in thread |
| **UC-E41** | `ClaimAiRun` audit row | Not implemented |
| **UC-E42** | Retrieval context ids | Not implemented |
| **UC-E43** | Admin “why queued?” | No run diagnostics |

## Behavior (product rules)

1. **`claimLanguage`** defaults to **`ar`** at DB and API (`claim.create` metadata fallback).
2. Client sets `claimLanguage` on create via `detectLanguageFromText` in `chat-page-client.tsx`.
3. **Metadata extraction** runs only when `topicCategory`, `sourceName`, `location`, and `platform` are all empty.
4. **Verdict parsing** is case-insensitive; accepts `partially true` / `partially_true`.
5. **Emails** fire on every `generateAssistantReply`, not only true human-queue cases (copy mismatch — see gaps).
6. Assistant should respond in **MSA or English** based on `claimLanguage` (prompt instruction; not enforced by code).

7. **Image attachments** with `uploadPath` are re-signed and included in the OpenAI request (max **2** images per call) when MIME type is `image/*` ([feat-0023](../feat-0023-ai-image-context/PRODUCT.md)).

## Open questions

1. Align **queued email** copy with synchronous AI MVP? **Default:** rename template when human queue ships.
2. When to set `ClaimStatus.FAILED`? **Default:** define in feat-0018 human review.
3. Move AI to `packages/ai` + env `AI_PROVIDER`? **Default:** follow roadmap ADR.

## Related

- [feat-0023 PRODUCT](../feat-0023-ai-image-context/PRODUCT.md) — **target** multimodal AI (not shipped; images display-only for AI today)
- [`../../claims-ai-pipeline.md`](../../claims-ai-pipeline.md) — target architecture
- [feat-0011 PRODUCT](../feat-0011-chat-messaging/PRODUCT.md)
- [feat-0006 PRODUCT](../feat-0006-email/PRODUCT.md)
- [feat-0018 PRODUCT](../feat-0018-admin/PRODUCT.md) — human queue (future)
- `packages/trpc/src/routers/claim.ts`
- `apps/api/src/index.ts` — `generateAssistantText`, `extractClaimMetadata`
