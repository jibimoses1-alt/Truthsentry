# feat-0015: Tech Spec — Claims metadata and AI pipeline (MVP)

## Context

See [`PRODUCT.md`](./PRODUCT.md). AI and metadata logic span **tRPC router**, **API context injectors**, **Prisma `Claim` model**, and **web language detection**. Compare intentional omissions to [`../../claims-ai-pipeline.md`](../../claims-ai-pipeline.md).

## Data model (`packages/prisma/schema.prisma`)

### `Claim` (relevant fields)

| Field | Type | Default |
|-------|------|---------|
| `claimText` | `String?` | From create content / metadata |
| `claimLanguage` | `String` | `"ar"` |
| `claimDate` | `DateTime?` | — |
| `sourceName` | `String?` | — |
| `sourceType` | `SourceType?` | — |
| `sourceUrl` | `String?` | — |
| `mediaType` | `MediaType` | `TEXT` |
| `topicCategory` | `TopicCategory?` | — |
| `location` | `String?` | — |
| `platform` | `String?` | — |
| `status` | `ClaimStatus` | `OPEN` |
| `factCheckText` | `String?` | Assistant body on resolve |
| `factCheckStatus` | `FactCheckStatus` | `PENDING` |
| `factCheckDate` | `DateTime?` | Set when verdict parsed |

Migration: `packages/prisma/migrations/20260512120000_add_factcheck_fields/migration.sql`, `20260519120000_claim_language_default_ar/migration.sql`.

### Not implemented (roadmap)

- `ClaimAiRun`
- `EvidenceChunk` / vector store ids

## API: `packages/trpc/src/routers/claim.ts`

| Procedure | AI / metadata behavior |
|-----------|------------------------|
| `create` | Accepts `metadata: claimMetadataInput`; sets `claimLanguage` from input or `'ar'` |
| `updateMetadata` | Partial updates from `claimMetadataInput` |
| `generateAssistantReply` | Full pipeline: status, emails, AI, extract, verdict, assistant message |

### `claimMetadataInput` (`packages/trpc/src/schemas.ts`)

Optional: `claimText`, `claimLanguage`, `claimDate`, `sourceName`, `sourceType`, `sourceUrl`, `mediaType`, `topicCategory`, `location`, `platform`.

### Verdict parsing

```ts
const VERDICT_PATTERN =
  /\b(verified|debunked|misleading|partially[_ ]true)\b/i;
```

Maps to `factCheckStatusValues`: `VERIFIED`, `DEBUNKED`, `MISLEADING`, `PARTIALLY_TRUE`.

## API context: `apps/api/src/index.ts`

### `generateAssistantText`

| Setting | Value |
|---------|-------|
| Env | `AI_API_KEY` (required), `AI_MODEL` (default `gpt-4.1-mini`) |
| Endpoint | `POST https://api.openai.com/v1/chat/completions` |
| Timeout | 30s (`AbortController`) |
| System prompt | Fact-check assistant; African context; verdict keywords; language from metadata block |
| Thread | Last 20 messages; USER/ASSISTANT mapped to OpenAI roles |

### `extractClaimMetadata`

| Setting | Value |
|---------|-------|
| Timeout | 10s |
| Temperature | 0 |
| Output | JSON only; validated against topic/source enums |
| Truncation | `sourceName`/`location` max 200; `platform` max 100 lowercase |

Returns `ExtractedMetadata` type from `packages/trpc/src/types.ts`.

### `generateAssistantReply` sequence

```text
1. claim.status → PROCESSING
2. sendClaimQueuedEmail (idempotent upsert EmailDelivery)
3. Parallel: generateAssistantText + extractClaimMetadata (if needsMetadata)
4. Merge extracted fields into Claim
5. Create ASSISTANT ClaimMessage
6. claim.status → RESOLVED; factCheckText; optional factCheckStatus/Date
7. WS broadcast message.created + claim.statusChanged
8. sendClaimResolvedEmail
```

On AI catch: fallback string `'Je ne peux pas traiter…'` still stored and claim `RESOLVED`.

## Web: language detection

| File | Role |
|------|------|
| `apps/web/lib/language-detection.ts` | `detectLanguageFromText`, `detectUserLanguage` |
| `apps/web/lib/languages.ts` | `DEFAULT_LANGUAGE` = `ar` |
| `apps/web/components/chat-page-client.tsx` | Sets `metadata.claimLanguage` on `claim.create` |

Detection: Arabic script → `ar`; else `franc` → supported map; fallback `ar`.

## Email templates (`packages/emails`)

| Template | Trigger | Key |
|----------|---------|-----|
| `claim-queued` | Start of `generateAssistantReply` | `claim-queued` |
| `claim-resolved` | After assistant message | `claim-resolved` |

Files: `packages/emails/src/templates/claim-queued.ts`, `claim-resolved.ts`. Locale-aware subjects not yet wired for claim templates.

## Realtime

`broadcastToClaimSubscribers` on new assistant message and `claim.statusChanged` with `factCheckStatus`.

## Known gaps (vs `claims-ai-pipeline.md`)

| Gap | Severity | Notes |
|-----|----------|-------|
| No RAG / retrieval | High for accuracy | Single LLM call only |
| No `ClaimAiRun` | High for audit | Cannot answer “why this verdict” |
| No confidence score | High | No threshold gate |
| No human queue branch | High | `PROCESSING` is transient; all end `RESOLVED` |
| Queued email mislabel | Medium | Sent before sync AI, not human queue |
| AI in API monolith | Medium | No `packages/ai` |
| No PII stripping | Low | Roadmap FR-AI-3 |
| Error path still RESOLVED | Medium | Should be `FAILED` or `queued_human` per roadmap |
| `extractClaimMetadata` skipped if any metadata field set | Low | `needsMetadata` checks four fields only |

## Testing and validation

| Case | Expected |
|------|----------|
| Create with English paragraph | `claimLanguage` en |
| Assistant text contains “DEBUNKED” | `factCheckStatus = DEBUNKED` |
| Missing `AI_API_KEY` | Fallback error message in thread |
| Re-run generate | Idempotent email keys upsert |

```bash
pnpm --filter @truthsentry/trpc test
pnpm --filter @truthsentry/web exec vitest run lib/language-detection.test.ts
```

## Related

- [`../../claims-ai-pipeline.md`](../../claims-ai-pipeline.md)
- [feat-0018 TECH](../feat-0018-admin/TECH.md)
- [feat-0006 TECH](../feat-0006-email/TECH.md)
- `packages/trpc/src/routers/claim.ts`
- `apps/api/src/index.ts`
