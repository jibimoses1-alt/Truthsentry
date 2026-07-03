# feat-0023: AI image and evidence context (target)

## Summary

Users can **attach images** to claims ([feat-0012](../feat-0012-chat-uploads/PRODUCT.md)). Images **render in thread history** and are **included in AI fact-check requests** via signed Supabase URLs (max **2** images per OpenAI call). Transcription uses **server-side Whisper** through `claim.transcribeAudio` ([feat-0020](../feat-0020-audio-input/PRODUCT.md)).

**Product rule:** uploaded image evidence is analyzed by the vision-capable model when `uploadPath` is present; failed sign/fetch falls back to text-only for that image.

Complements [feat-0012](../feat-0012-chat-uploads/PRODUCT.md), [feat-0015](../feat-0015-claims-ai/PRODUCT.md). Supersedes misleading sections in [`../../AI_CHAT_IMAGE_CONTEXT.md`](../../AI_CHAT_IMAGE_CONTEXT.md) for **implementation status**.

## Problem

Screenshot claims are common in African misinformation campaigns. Users assume the assistant “sees” attached images. Today it does not, which can produce verdicts that ignore visual evidence and erode trust.

## Non-goals (phase 1 target)

- Video/audio analysis in model context (upload types remain image-only in feat-0012).
- OCR as a separate microservice before native vision.
- Storing raw image bytes in Postgres (URLs/paths only).
- Client-side direct OpenAI vision calls (same security rule as feat-0020).

## Actors

| Actor | Description |
|-------|-------------|
| **Claimant** | Attaches screenshots; expects them considered in fact-check. |
| **Platform** | Server fetches or signs image URLs; builds multimodal prompt. |
| **Reviewer** | May rely on images when AI abstains (feat-0018 future). |

## Current vs target

| Capability | Today (MVP) | Target (this feat) |
|------------|-------------|-------------------|
| Image in chat UI | Yes | Yes |
| Image in `generateAssistantText` | **No** | Yes (vision-capable model) |
| `mediaType` TEXT_IMAGE | Set on claim | Drives multimodal branch |
| User messaging when images ignored | **Not shown** | Explicit copy or badge |
| Server-side only API key | Yes for text AI | Yes for vision |

## Use case catalog

### A. User expectations (today)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Attach screenshot + text | Valid image | Send message | Image visible in bubble |
| **UC-A02** | AI reply without seeing image | Image attached | `generateAssistantReply` | Verdict from **text only** — **documented gap** |
| **UC-A03** | User informed (target) | Image attached | UI shows “AI analyzed text; image on file for review” | No false certainty |

### B. Target multimodal flow

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Vision request | Message has image attachments | API loads signed URL server-side | Image in OpenAI `image_url` content part |
| **UC-B11** | Text-only message | No attachments | Existing text path | No regression |
| **UC-B12** | Multiple images | Up to 4 per message | Cap parts in prompt | All images considered or truncated with notice |
| **UC-B13** | Unsupported model | `AI_MODEL` not vision-capable | Fallback to text-only + user notice | No silent drop |
| **UC-B14** | Fetch failure | Expired URL | Retry sign; else text-only + log | Claim still gets reply |

### C. Safety and policy

| ID | Use case | Expected |
|----|----------|----------|
| **UC-C20** | No public bucket URLs in prompt | Private signed URLs only |
| **UC-C21** | PII in screenshots | Provider policy + optional blur (future) |
| **UC-C22** | Size limits | Reuse feat-0012 limits before model call |

### D. Data

| ID | Use case | Expected |
|----|----------|----------|
| **UC-D30** | Audit which images sent to model | Log attachment ids, not bytes |
| **UC-D31** | `ClaimAiRun` optional | feat-0015 roadmap |

## Behavior (product rules)

1. **Until UC-B10 ships:** feat-0012 and feat-0015 PRODUCT specs state images are **display-only for AI**.
2. **Vision calls only from `apps/api`** — never browser.
3. Prefer **same thread message** attachment list as source of truth.
4. When vision unavailable, **do not** claim image was analyzed.
5. Align `mediaType` `TEXT_IMAGE` with actual multimodal invocation.

## Open questions

1. Max images per AI call (4 vs 1)? **Default:** 2 for cost control in v1.
2. Use OpenAI Responses API vs chat completions? **Default:** follow feat-0015 provider choice.
3. Show “image not analyzed” badge in assistant footer? **Default:** yes until vision ships.

## Related

- [feat-0012 PRODUCT](../feat-0012-chat-uploads/PRODUCT.md)
- [feat-0015 PRODUCT](../feat-0015-claims-ai/PRODUCT.md)
- [`../../AI_CHAT_IMAGE_CONTEXT.md`](../../AI_CHAT_IMAGE_CONTEXT.md) — historical; check this feat for status
- `apps/api/src/index.ts` — `generateAssistantText` (text-only today)
