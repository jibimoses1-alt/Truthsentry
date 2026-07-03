# feat-0023: Tech Spec — AI image context

## Context

See [`PRODUCT.md`](./PRODUCT.md). **Status: implemented** — images with `uploadPath` are re-signed server-side and included in OpenAI vision requests (max 2 per call).

## Current implementation (audit)

File: `apps/api/src/index.ts` — `generateAssistantText`:

```text
thread.map((m) => ({ role, content: m.content }))  // text only
```

No `image_url`, no base64, no attachment fetch.

Attachments shape (from claim router):

```json
{ "url", "mimeType", "sizeBytes", "uploadPath" }
```

Signed read URLs: `createSignedReadUrl(uploadPath)` in API context (feat-0012).

## Target architecture

```text
generateAssistantReply (claim router)
  → generateAssistantText({ claim, thread, attachments? })
      → for each USER message with attachments:
            fetch signed URL (server)
            build OpenAI content: [ { type: 'text' }, { type: 'image_url', ... } ]
      → chat/completions with vision model
```

## Module touchpoints

| Module | Change |
|--------|--------|
| `apps/api/src/index.ts` | Multimodal message builder |
| `packages/trpc/src/routers/claim.ts` | Pass attachments into `generateAssistantText` |
| `apps/web/components/chat-page-client.tsx` | Optional UX badge |
| `packages/emails` | No change |

## Environment

| Variable | Purpose |
|----------|---------|
| `AI_API_KEY` | Server only |
| `AI_MODEL` | Must support vision (e.g. gpt-4.1-mini vision or documented equivalent) |
| `CHAT_IMAGE_MAX_BYTES` | Re-validate before fetch |

## Security

| Rule | Implementation |
|------|----------------|
| No client vision | Block `NEXT_PUBLIC_OPENAI_API_KEY` for images (feat-0020) |
| SSRF | Only fetch `uploadPath` from own Supabase bucket |
| TTL | Refresh signed URL before fetch if expired |

## Known gaps (pre-implementation)

| Gap | Blocks |
|-----|--------|
| Text-only AI | UC-A02 |
| No user-facing disclaimer | UC-A03 |
| `AI_CHAT_IMAGE_CONTEXT.md` describes target as current | Doc hygiene |
| Video/audio `mediaType` enums | feat-0012 non-goals |

## Testing and validation (when implemented)

| Test | Expectation |
|------|-------------|
| Text-only claim | Same output as today |
| Screenshot + “is this true?” | Model receives image part |
| Invalid uploadPath | Graceful fallback + log |
| Integration | Mock OpenAI; assert request body shape |

## Related

- [feat-0012 TECH](../feat-0012-chat-uploads/TECH.md)
- [feat-0015 TECH](../feat-0015-claims-ai/TECH.md)
