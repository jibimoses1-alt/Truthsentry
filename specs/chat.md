# Spec: `/chat` production functionality

> **Superseded for detail by:** [feat-0010](./features/feat-0010-chat-threads/PRODUCT.md)–[feat-0015](./features/feat-0015-claims-ai/PRODUCT.md), [feat-0020](./features/feat-0020-audio-input/PRODUCT.md), [feat-0023](./features/feat-0023-ai-image-context/PRODUCT.md). Route is now `/[locale]/chat`. Streaming is **not** implemented (see feat-0011 gaps).

## Problem

Current `/chat` is a preview UI with seeded sample threads and hardcoded assistant content. We need a real, authenticated chat experience backed by API + database, with no dummy conversation data in production flow.

## Goals

- Ship a fully functional `/chat` route for signed-in users.
- Support end-to-end chat turns:
  - New chat
  - User message submission
  - AI assistant response
  - Image upload as chat input context
- Support logout from chat UI.
- Keep all secrets in environment variables only (provided outside source control).

## Non-goals

- Building admin moderation/review UI in this spec (covered elsewhere).
- Designing multi-model routing strategy.
- Voice input, OCR enhancement pipeline, or image generation output.

## Scope (MVP)

- Route: `apps/web/app/chat/page.tsx` must render production chat client behavior.
- Replace demo-only behavior in `apps/web/components/chat-page-client.tsx` with real API-driven state.
- Use authenticated procedures from API spec (`auth`, `session`, `claim`) and add missing procedures if required.
- Persist chat threads/messages in database.
- Upload image files to storage and attach metadata to a user message.
- Provide logout action in chat sidebar/footer.

## Functional requirements

### FR-C-1 Auth + route access

- `/chat` requires authenticated user session.
- Anonymous users are redirected to sign-in.
- `session.me` data is loaded on chat bootstrap for user identity.

### FR-C-2 New chat

- Clicking "New chat" creates a new empty thread server-side (or initializes a pending thread id that is persisted on first send).
- UI clears composer + message list and sets active thread.
- Thread list updates immediately and persists on refresh.

### FR-C-3 User chat message

- Composer sends user text to API (`claim.create` or `claim.appendUserMessage`, depending on thread state).
- Empty/whitespace-only messages are rejected client-side and server-side.
- User message appears in chat only after successful API acknowledgement (or optimistic update with rollback).

### FR-C-4 AI assistant response

- After a user message is accepted, backend invokes AI provider and stores assistant response.
- Assistant response is returned via one of:
  - streaming transport (preferred), or
  - polling/fetch completion endpoint.
- UI shows typing/loading state while waiting.
- On provider failure/timeout, user sees a system-safe fallback message and retry option.
- No seeded assistant text is shown in production behavior.

### FR-C-5 Image upload

- User can attach an image from composer (png/jpg/webp supported; configurable max size).
- Upload flow:
  1. Request upload target (signed URL or server upload endpoint).
  2. Upload binary to storage.
  3. Submit chat message with attachment metadata (`fileUrl`, `mimeType`, `sizeBytes`).
- Server validates file type/size before message acceptance.
- Uploaded image is rendered in message history for both sender and subsequent context requests.

### FR-C-6 Logout

- "Log out" triggers `auth.logout` (or canonical equivalent) and clears session.
- User is redirected to sign-in or marketing home.
- Protected chat data is no longer accessible after logout.

### FR-C-7 No dummy conversation content

- Remove seeded `initialThreads` and static assistant content from production path.
- Empty state can show guidance text but must not fabricate thread history.
- Any development/demo fixtures must be behind explicit dev flag and disabled by default.

## API contract requirements

- Reuse and finalize procedures described in `specs/api.md`:
  - `session.me`
  - `auth.logout`
  - `claim.create`
  - `claim.listMine`
  - `claim.byId`
  - `claim.appendUserMessage` (if multi-turn in existing claim)
- Add/confirm attachment support:
  - `claim.requestUpload` (or equivalent signed-upload endpoint)
  - message schema supports attachments array
- Add/confirm AI response flow:
  - `claim.runVerification` or `claim.generateAssistantReply`
  - define timeout and retry semantics.

## Data model requirements

- `Claim` + `ClaimMessage` remain source of truth.
- `ClaimMessage` must support:
  - `role`: `user | assistant | system`
  - `content`: text
  - `attachments` (JSON column or related table)
- Add indexes for thread fetch performance (`claimId`, `createdAt`).
- Enforce ownership checks on all user-accessed claim/message reads.

## Environment variables

Reference names from `docs/env/README.md` and extend there if needed:

- Existing:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_API_URL`
  - `DATABASE_URL`
  - `AI_PROVIDER`
  - `AI_MODEL`
  - `AI_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Add (if storage separation needed):
  - `SUPABASE_STORAGE_BUCKET_CHAT_UPLOADS`
  - `CHAT_IMAGE_MAX_BYTES`
  - `CHAT_ALLOWED_IMAGE_MIME_TYPES`

No API keys or secrets are committed in repo; values are injected via private environment.

## Architecture impact

- **Web app (`apps/web`)**
  - Convert chat client from local state demo to API/stateful implementation.
  - Add authenticated guards and proper loading/error states.
- **API (`apps/api`, `packages/trpc`)**
  - Finalize chat and logout procedures.
  - Add attachment upload signing + validation.
  - Add AI completion/streaming endpoint behavior.
- **Data (`packages/prisma`)**
  - Extend message schema for attachments if missing.
- **UI package (`packages/ui`)**
  - Reuse existing chat primitives; add attachment trigger/presentation primitives if needed.

## Implementation plan

1. Remove demo-only seeded chat behavior from `chat-page-client`.
2. Wire authenticated chat bootstrap:
   - session check
   - list threads
   - load selected thread messages
3. Implement new chat creation and thread switching.
4. Implement send-message flow with server persistence.
5. Implement AI response flow (stream or non-stream) with typing/error states.
6. Implement image upload + attachment rendering.
7. Implement logout action tied to auth mutation + redirect.
8. Update env docs and add tests.

## Risks and mitigations

- **Risk:** Duplicate messages from retries/network drops.
  - **Mitigation:** Client request id + server idempotency constraints.
- **Risk:** Large or invalid image uploads increase costs/abuse.
  - **Mitigation:** strict mime/size validation and rate limits.
- **Risk:** AI latency causes poor UX.
  - **Mitigation:** streaming responses and visible pending states.
- **Risk:** Unauthorized access to other user chats.
  - **Mitigation:** server-side ownership checks only from session context.

## Rollout plan

- Deploy behind optional feature flag: `NEXT_PUBLIC_CHAT_PRODUCTION_ENABLED`.
- Enable in staging first with real provider keys.
- Validate telemetry:
  - send success/failure rate
  - AI response latency
  - upload failure reasons
- Enable in production after staging acceptance passes.

## Rollback plan

- Disable production chat via feature flag.
- Revert to safe maintenance state (no fabricated conversations).
- Keep persisted user messages intact; avoid destructive schema rollback unless required.

## Test plan

- **Unit**
  - Composer validation
  - attachment validation helpers
  - chat reducer/state transitions
- **Integration**
  - tRPC procedures for create/list/read/send/logout
  - upload signing and ownership checks
- **E2E**
  - sign in -> open `/chat` -> new chat -> send text -> receive AI reply
  - attach image and confirm render
  - logout and verify `/chat` is protected
- **Manual checks**
  - refresh persistence
  - mobile viewport behavior
  - dark/light mode regressions

## Acceptance criteria

- `/chat` no longer displays seeded demo threads or static assistant replies.
- User can start a new chat, send text, and receive a persisted AI response.
- User can upload an image and see it in thread history.
- Logout from chat clears session and blocks further chat access until re-auth.
- All required env vars are documented by name only, without secret values.

## Open questions

- Should AI replies be streamed token-by-token or delivered as completed messages in MVP?
- Should each new chat create a thread immediately or on first user message?
- Are uploaded images passed directly to multimodal model now, or only stored and linked for later processing?
