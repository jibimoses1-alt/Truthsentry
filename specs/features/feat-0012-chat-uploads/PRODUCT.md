# feat-0012: Chat image uploads

## Summary

Users attach **image evidence** to messages via the composer paperclip. Flow: client validates locally → **`claim.requestUpload`** (tRPC) → **PUT** to **Supabase Storage** signed URL → attachment metadata stored on **`claim.create`** or **`claim.appendUserMessage`**. Allowed formats: **PNG, JPEG, WebP**; max **5 MB** per file; max **4 images** per message; max dimension **4096px**. Server validates MIME/extension in **`upload-validation`**. Orphan files in storage are removed by **`cleanup-orphans`** on an hourly schedule.

Depends on [feat-0011](../feat-0011-chat-messaging/PRODUCT.md) (send path) and [feat-0003](../feat-0003-api-trpc/PRODUCT.md) (API host + Supabase context).

## Problem

Claims often include screenshots. Uploads must bypass the API body size limit via direct-to-storage signed URLs while enforcing type/size limits consistently on client and server. Abandoned uploads should not fill the bucket indefinitely.

## Non-goals

- Video, audio, or PDF attachments (images only for MVP).
- HEIC/HEIF conversion (rejected with user message).
- Client-side image resizing/compression before upload.
- Virus scanning (future security hardening).
- Progress bar per file (binary PUT without UX progress).
- Deleting attachments from storage when user removes pending preview before send.

## Actors

| Actor | Description |
|-------|-------------|
| **Claimant** | Selects images in composer. |
| **Platform** | Issues signed URLs; stores paths in message JSON. |
| **Ops job** | `cleanupOrphans` reclaims unreferenced files. |

## Limits (product)

| Rule | Value | Config |
|------|-------|--------|
| Max file size | 5 MB | `CHAT_IMAGE_MAX_BYTES` / `NEXT_PUBLIC_CHAT_IMAGE_MAX_BYTES` |
| Allowed MIME | `image/png`, `image/jpeg`, `image/webp` | `CHAT_ALLOWED_IMAGE_MIME_TYPES` |
| Max per message | 4 | `IMAGE_LIMITS.maxPerMessage` (client) |
| Max dimensions | 4096 × 4096 px | `IMAGE_LIMITS.maxDimension` (client) |
| Upload rate | 10/min per user per claim scope | `checkRateLimit` in `requestUpload` |

## Use case catalog

### A. Client validation (before upload)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-UP01** | Select valid PNG | < 5 MB, valid dims | Paperclip → file picker | Preview thumbnail in composer |
| **UC-UP02** | Reject HEIC | `.heic` file | Select | Toast: HEIC non pris en charge |
| **UC-UP03** | Reject oversize | > 5 MB | Select | Toast: depasse 5 Mo |
| **UC-UP04** | Reject bad type | e.g. GIF | Select | Format non pris en charge |
| **UC-UP05** | Reject 5th image | 4 already pending | Select | Maximum 4 images par message |
| **UC-UP06** | Reject huge dimensions | > 4096 px | Select | Image trop grande |
| **UC-UP07** | Remove pending | Preview shown | Click X on thumbnail | Preview removed; object URL revoked |

Validation: `apps/web/lib/image-validation.ts` — `validateImage(file, currentCount)`.

### B. Signed upload flow

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-UP10** | Request upload URL | Valid file on send | `requestUpload.mutateAsync` | `{ uploadPath, uploadUrl, readUrl, publicUrl }` |
| **UC-UP11** | PUT to storage | Signed URL returned | `fetch(uploadUrl, { method: 'PUT', body: file })` | Object in bucket |
| **UC-UP12** | Attach to message | PUT success | Attachment array on create/append | `{ url, mimeType, sizeBytes, uploadPath }` |
| **UC-UP13** | New thread without claimId | First message + image | `requestUpload` with `claimId` undefined | Path uses `claims/{userId}/...` **Gap:** see TECH |
| **UC-UP14** | Follow-up with claimId | Thread active | `requestUpload({ claimId })` | Path `claims/{claimId}/...` |

### C. Server validation

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-UP20** | MIME normalize | `application/octet-stream` | `normalizeUploadMimeType` from extension | Correct image MIME |
| **UC-UP21** | Extension mismatch | `.png` with `image/jpeg` | `requestUpload` | BAD_REQUEST |
| **UC-UP22** | Rate limited | > 10 uploads/min | Mutation | `TOO_MANY_REQUESTS` |
| **UC-UP23** | Wrong claim owner | Another user's claimId | Mutation | `NOT_FOUND` |

Server: `packages/trpc/src/upload-validation.ts` — `validateUploadFile`.

### D. Read path

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-UP30** | Display in thread | Message has `uploadPath` | `claim.byId` refreshes signed read URL | Image renders in history |
| **UC-UP31** | Expired read URL | > 1h TTL | Reload thread | New signed URL via `createSignedReadUrl` |

### E. Orphan cleanup

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-UP40** | Orphan detection | File older than 1h in storage | `cleanupOrphans` | Listed under `claims/` |
| **UC-UP41** | Delete unreferenced | No `ClaimMessage.attachments` match | Remove from bucket | `deleted` count incremented |
| **UC-UP42** | Keep referenced | Path in message JSON | Skip delete | File retained |
| **UC-UP43** | Scheduled run | API main process | `setInterval` 1 hour | Logs when `deleted > 0` |

### F. Negative cases

| ID | Expected behavior |
|----|-------------------|
| **UC-UP50** | PUT failure → submit error toast; message not sent |
| **UC-UP51** | Supabase misconfig → `requestUpload` BAD_REQUEST |
| **UC-UP52** | Text-only message with images uses `(image jointe)` placeholder content |

## Behavior (product rules)

1. **Validate twice:** client before preview; server on `requestUpload`.

2. **Direct upload:** API never receives raw image bytes in tRPC body.

3. **Storage path pattern:** `claims/{claimId or userId}/{timestamp}-{safeFilename}`.

4. **Attachments JSON** stored on `ClaimMessage.attachments`; `uploadPath` enables re-signing.

5. **Cleanup** uses service role; scans `claims/` folders; SQL `LIKE` on attachments text.

6. **Image-only composer** accept attribute: `image/png,image/jpeg,image/webp`.

7. **AI image analysis:** When attachments include images, up to **2** signed URLs per AI request are sent to the vision model ([feat-0023](../feat-0023-ai-image-context/PRODUCT.md)).

## Open questions

1. Resize large images client-side before upload? **Default:** future feat.

2. Delete storage object when message deleted? **Default:** N/A until delete exists.

3. Align pre-create upload folder (`userId` vs `claimId`)? **Default:** use claim id after create only (current: userId fallback).

## Related

- [feat-0011 PRODUCT](../feat-0011-chat-messaging/PRODUCT.md)
- [feat-0023 PRODUCT](../feat-0023-ai-image-context/PRODUCT.md) — AI does not read images today
- [`../../AI_CHAT_IMAGE_CONTEXT.md`](../../AI_CHAT_IMAGE_CONTEXT.md) — target (historical)
- [`../../api.md`](../../api.md)
