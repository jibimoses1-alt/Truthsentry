# feat-0012: Tech Spec — Chat image uploads

## Context

See [`PRODUCT.md`](./PRODUCT.md). Upload splits across web validation, tRPC mutation, Supabase signed URLs, and optional orphan janitor.

## End-to-end flow

```text
ChatComposer onImageSelect
  → validateImage (web)
  → preview in pendingFiles
handleSubmit
  → uploadPendingFiles(claimId?)
       → requestUpload.mutateAsync({ claimId, filename, mimeType, sizeBytes })
       → fetch(uploadUrl, PUT, body: file)
       → collect { url: readUrl, mimeType, sizeBytes, uploadPath }
  → create / appendUserMessage with attachments
claim.byId
  → refreshMessageAttachments → createSignedReadUrl per uploadPath
```

## Web modules

| Module | Path |
|--------|------|
| `validateImage` | `apps/web/lib/image-validation.ts` |
| `inferMimeType` | same |
| `uploadPendingFiles` | `apps/web/components/chat-page-client.tsx` |
| `ChatComposer` | `packages/ui/.../chat-composer.tsx` — hidden file input, previews |

### Client limits

```ts
const IMAGE_LIMITS = {
  maxBytes: Number(process.env.NEXT_PUBLIC_CHAT_IMAGE_MAX_BYTES ?? 5_242_880),
  allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
  maxDimension: 4096,
  maxPerMessage: 4,
};
```

Tests: `apps/web/lib/image-validation.test.ts`

## tRPC: `claim.requestUpload`

File: `packages/trpc/src/routers/claim.ts`

**Input:**

```ts
{
  claimId?: string;      // cuid
  filename: string;
  mimeType: string;
  sizeBytes?: number;
}
```

**Output:** `{ uploadPath, uploadUrl, readUrl, publicUrl }` (`publicUrl` duplicates `readUrl` today).

**Guards:**

- `requireVerifiedEmail`
- Rate limit: `upload:${userId}:${claimId ?? 'general'}` — 10 / 60s
- Claim ownership when `claimId` set
- `validateUploadFile` with `ctx.chatUploadLimits`

## Server upload validation

File: `packages/trpc/src/upload-validation.ts`

| Check | Error message (FR) |
|-------|-------------------|
| `.heic` / `.heif` | HEIC non pris en charge |
| MIME not allowed | Format non pris en charge |
| Ext vs MIME mismatch | Extension incompatible |
| `sizeBytes > maxBytes` | Depasse N Mo |

Tests: `packages/trpc/src/upload-validation.test.ts`

## Supabase integration

File: `apps/api/src/index.ts`

| Constant | Default |
|----------|---------|
| `CHAT_BUCKET` | `SUPABASE_STORAGE_BUCKET_CHAT_UPLOADS` → `chat-uploads` |
| `CHAT_IMAGE_MAX_BYTES` | `5242880` (5 MB) |
| `CHAT_ALLOWED_IMAGE_MIME_TYPES` | `image/png,image/jpeg,image/webp` |

### `createSignedUploadUrl` (context)

```ts
const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
const uploadPath = `claims/${claimId}/${Date.now()}-${safeName}`;
const signed = await storage.createSignedUploadUrl(uploadPath);
const readSigned = await storage.createSignedUrl(uploadPath, 3600);
return { uploadPath, uploadUrl: signed.data.signedUrl, readUrl: readSigned.data.signedUrl };
```

When `claimId` omitted in mutation, context receives `claimId: input.claimId ?? ctx.sessionUser.id` — pre-create uploads land under **user id folder**.

### `createSignedReadUrl` (context)

Re-signs `uploadPath` for 3600s when serving `byId`.

Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (API only; never in web).

## Attachment shape (stored JSON)

```ts
type StoredAttachment = {
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadPath?: string;
};
```

## Orphan cleanup

File: `apps/api/src/cleanup-orphans.ts`

| Constant | Value |
|----------|-------|
| `ORPHAN_THRESHOLD_MS` | 1 hour |
| `BUCKET` | same as `CHAT_BUCKET` |

Algorithm:

1. List `claims/` folders (limit 500)
2. List files per folder (limit 200)
3. Parse timestamp prefix from filename (`{timestamp}-...`)
4. Skip if newer than cutoff
5. `SELECT COUNT(*) FROM ClaimMessage WHERE attachments::text LIKE '%path%'`
6. If count 0 → `storage.remove([filePath])`

Scheduled in `apps/api/src/index.ts` when main:

```ts
setInterval(cleanupOrphans, 60 * 60 * 1000);
```

**Gaps:** pagination limits may miss files; raw SQL `LIKE` is brittle; no metrics export.

## Env vars

| Variable | Where | Purpose |
|----------|-------|---------|
| `CHAT_IMAGE_MAX_BYTES` | API | Server max size |
| `NEXT_PUBLIC_CHAT_IMAGE_MAX_BYTES` | Web | Client max size |
| `CHAT_ALLOWED_IMAGE_MIME_TYPES` | API | Allow list |
| `SUPABASE_STORAGE_BUCKET_CHAT_UPLOADS` | API | Bucket name |
| `SUPABASE_URL` | API | Storage client |
| `SUPABASE_SERVICE_ROLE_KEY` | API | Signed URL + cleanup |

## PRODUCT mapping

| UC IDs | Implementation |
|--------|----------------|
| UC-UP01–UP07 | `image-validation.ts`, `ChatComposer` |
| UC-UP10–UP12 | `requestUpload`, PUT in `uploadPendingFiles` |
| UC-UP13 | `claimId ?? sessionUser.id` in router |
| UC-UP20–UP23 | `upload-validation.ts`, rate limit |
| UC-UP30–UP31 | `refreshMessageAttachments` in `byId` |
| UC-UP40–UP43 | `cleanup-orphans.ts`, API interval |

## Known gaps

| Gap | Detail |
|-----|--------|
| Pre-create path uses userId | Orphans under user folder until message saved |
| No upload progress UI | PUT is fire-and-forget |
| No client compression | Large valid images upload full size |
| Cleanup scan limits | 500 folders × 200 files cap |
| `LIKE` on JSON | False positives/negatives possible |
| Removed pending file | Storage object may already exist if upload started |
| AI image analysis | Attachment URL passed to model — see feat-0015 |
| Naming `publicUrl` vs `readUrl` | Spec docs alias; same signed read URL |

## Testing and validation

```bash
pnpm --filter @truthsentry/trpc test
pnpm --filter @truthsentry/web test
```

| Case | Expected |
|------|----------|
| Valid JPEG 1 MB | Preview + successful send |
| 6 MB file | Client rejection |
| HEIC | Client rejection |
| Server MIME spoof | `requestUpload` BAD_REQUEST |

## Related

- [feat-0011 TECH](../feat-0011-chat-messaging/TECH.md)
- [feat-0015 TECH](../feat-0015-claims-ai/TECH.md)
- [`../../AI_CHAT_IMAGE_CONTEXT.md`](../../AI_CHAT_IMAGE_CONTEXT.md)
- `docs/env/README.md`
