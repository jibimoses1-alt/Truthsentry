# TruthSentry AI Chatbot - Full Implementation Specification

> **Status:** Partially **stale**. Use [features/README.md](./features/README.md) for authoritative behaviour — especially [feat-0010](./features/feat-0010-chat-threads/PRODUCT.md)–[feat-0015](./features/feat-0015-claims-ai/PRODUCT.md), [feat-0007](./features/feat-0007-i18n/PRODUCT.md) (ar/en, not French/Fula), and [feat-0023](./features/feat-0023-ai-image-context/PRODUCT.md) (images not in AI prompt today). This document is retained as a historical implementation guide.

**Version:** 1.0  
**Date:** May 2026  
**Purpose:** Complete specification and implementation guide for the TruthSentry AI claim verification chat system

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [System Components](#system-components)
4. [Technology Stack](#technology-stack)
5. [Core Features](#core-features)
6. [Attachment and Media Handling](#attachment-and-media-handling)
7. [Reliability and Real-Time](#reliability-and-real-time)
8. [Implementation Plan](#implementation-plan)
9. [API Integration](#api-integration)
10. [Component Implementation](#component-implementation)
11. [Language Support](#language-support)
12. [Claim Lifecycle](#claim-lifecycle)
13. [Deployment Guide](#deployment-guide)
14. [Code Snippets](#code-snippets)
15. [Current vs Target State](#current-vs-target-state)
16. [Legacy Code (Cleanup Required)](#legacy-code-cleanup-required)
17. [Test Files](#test-files)

---

## Executive Summary

The TruthSentry AI Chatbot is a multilingual fact-checking and claim verification system built on a pnpm/Turborepo monorepo with a Next.js 15 frontend and a standalone Node.js tRPC API server. It uses OpenAI's `gpt-4.1-mini` model to help users validate claims circulating across African media and social platforms. Key features:

- **Structured fact-checking pipeline** with rich claim metadata (source, platform, topic, location, language)
- **Real-time messaging** with a ChatGPT-style full-page chat interface
- **Granular verification statuses**: pending, verified, debunked, misleading, partially true
- **Multi-media support**: text, image, video, audio claims (and combinations)
- **Multilingual support** (French, Fula/Peul, English) with per-claim language tracking
- **Source attribution**: tracks who made the claim, where it originated, and on which platform
- **Human review queue** for uncertain or complex claims
- **Transactional email** notifications (Resend) for claim status changes
- **Token-based session auth** with email verification

---

## Architecture Overview

```
+-----------------------------------------------------------+
|                    Client (apps/web)                       |
|  +-----------------------------------------------------+  |
|  |  ChatPageClient (chat-page-client.tsx)               |  |
|  |  - Thread management (list, create, switch)          |  |
|  |  - Message composition and display                   |  |
|  |  - Image upload via signed URLs                      |  |
|  |  - Typing indicator and streaming display            |  |
|  +-----------------------------------------------------+  |
|  +-----------------------------------------------------+  |
|  |  Chat UI Kit (packages/ui/src/components/chat/)      |  |
|  |  - ChatAppShell (two-column sidebar + main)          |  |
|  |  - ChatSidebar (thread list, search, new chat)       |  |
|  |  - ChatComposer (textarea, mic, image, send)         |  |
|  |  - ChatMessageBubble (user/assistant/system)         |  |
|  |  - ChatWelcome (prompt cards)                        |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
                          |
                     tRPC (HTTP)
                          |
+-----------------------------------------------------------+
|              API Server (apps/api)                         |
|  +-----------------------------------------------------+  |
|  |  Standalone Node.js HTTP + tRPC                      |  |
|  |  Routers: auth, session, claim, admin, health        |  |
|  +-----------------------------------------------------+  |
|  +-----------------------------------------------------+  |
|  |  Fact-Check Pipeline                                 |  |
|  |  - claim.create -> PENDING (with metadata)           |  |
|  |  - claim.generateAssistantReply -> AI analysis       |  |
|  |  - AI verdict -> VERIFIED / DEBUNKED / MISLEADING    |  |
|  |  -              / PARTIALLY_TRUE                      |  |
|  |  - AI failure -> stays PENDING (human review queue)  |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
                          |
+-----------------------------------------------------------+
|           External Services                               |
|  +-----------------------------------------------------+  |
|  |  OpenAI API                                          |  |
|  |  - gpt-4.1-mini for claim verification               |  |
|  |  - Direct fetch to /v1/chat/completions              |  |
|  +-----------------------------------------------------+  |
|  +-----------------------------------------------------+  |
|  |  Supabase                                            |  |
|  |  - PostgreSQL (via Prisma ORM)                       |  |
|  |  - Storage (signed upload URLs for attachments)      |  |
|  +-----------------------------------------------------+  |
|  +-----------------------------------------------------+  |
|  |  Resend                                              |  |
|  |  - verify-email, password-reset                      |  |
|  |  - claim-queued, claim-resolved                      |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
```

---

## System Components

### 1. Frontend Components (apps/web)

#### Chat Page (`app/chat/page.tsx`)
- Server component with metadata
- Description: "Assistant de verification des dossiers TruthSentry"
- Renders `ChatPageClient`

#### `ChatPageClient` (`components/chat-page-client.tsx`)
- Main client component orchestrating the chat experience
- Manages thread list, active thread, message state
- Calls tRPC mutations for creating claims, appending messages, generating AI replies
- Handles image upload via `requestUpload` -> Supabase signed URL
- Displays typing indicator during AI generation

#### Chat UI Kit (`packages/ui/src/components/chat/`)

| Component | Purpose |
|-----------|---------|
| `ChatAppShell` | Two-column layout (sidebar + main content area) |
| `ChatKitRoot` | Root wrapper with `data-ui-kit="chatgpt"` attribute |
| `ChatSidebar` | Thread list, new chat button, search, collapse toggle |
| `ChatTopBar` | Header with TruthSentry logo, title, subtitle |
| `ChatComposer` | Textarea with microphone, image upload, and send buttons |
| `ChatMessageList` | Scrollable message column with auto-scroll |
| `ChatMessageRow` | Row wrapper per message (handles alignment) |
| `ChatMessageBubble` | Styled bubble with user/assistant/system variants |
| `ChatMessageActions` | Copy, regenerate, thumbs up/down actions |
| `ChatTypingIndicator` | Three-dot pulse animation for loading state |
| `ChatThreadDivider` | Date separator between message groups |
| `ChatCodeSnippet` | Code block with language header and copy button |
| `ChatWelcome` | Welcome screen with prompt suggestion cards |
| `ChatHomeEmpty` | Three-column layout: examples, capabilities, limitations |

### 2. Backend (apps/api)

#### Standalone Node.js HTTP Server (`src/index.ts`)
- Creates HTTP server with CORS support
- Mounts tRPC handler at `/trpc/*`
- Handles Resend webhook events at `/webhooks/resend`
- Session resolution from cookies
- Provides `TrpcContext` with all service dependencies

##### CORS Configuration
- `Access-Control-Allow-Origin`: set from `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`)
- `Access-Control-Allow-Credentials`: `true` (required for cookie-based sessions)
- `Access-Control-Allow-Headers`: `content-type, x-trpc-source`
- `Access-Control-Allow-Methods`: `GET, POST, OPTIONS`
- Preflight `OPTIONS` requests return `204 No Content`

##### Session / Auth Mechanics
- Cookie name: `AUTH_COOKIE_NAME` env (default: `truthsentry_session`)
- Session max age: 7 days (`60 * 60 * 24 * 7` seconds)
- Password hashing: `scrypt` with 16-byte random salt, 64-byte derived key, stored as `salt:hex`
- Token hashing: `sha256` (raw token in cookie, hash in database)
- Password comparison: constant-time via `timingSafeEqual`
- Cookie flags: `HttpOnly; SameSite=Lax; Path=/` + `Secure` when `AUTH_COOKIE_SECURE=true`
- Session lookup: `prisma.session.findFirst({ where: { tokenHash, expiresAt: { gt: new Date() } } })`

##### Resend Webhook Handler (`/webhooks/resend`)
- Validates `x-resend-signature` header against `RESEND_WEBHOOK_SIGNING_SECRET`
- Parses incoming JSON payload
- Deduplicates via `ResendWebhookEvent.eventId` unique constraint
- Maps event types to delivery statuses: `email.delivered` -> `delivered`, `email.bounced` -> `bounced`, `email.failed` -> `failed`, `email.complained` -> `complained`, others -> `received`
- Updates `EmailDelivery.status` by `providerMessageId`

##### Upload Path Convention
- Actual file path in Supabase Storage: `claims/{claimId}/{timestamp}-{safeName}`
- `safeName`: original filename with non-alphanumeric chars replaced by `_`
- Timestamp prefix prevents filename collisions
- `createSignedUploadUrl` returns `{ uploadPath, uploadUrl }` (not `signedUrl, publicUrl` -- see Current vs Target State)

#### tRPC Routers (`packages/trpc/src/routers/`)

| Router | Procedures |
|--------|------------|
| `auth` | register, login, verifyEmail, resendVerification, requestPasswordReset, resetPassword, logout |
| `session` | me (returns current user info) |
| `claim` | listMine, byId, create (with metadata), appendUserMessage, requestUpload, generateAssistantReply, updateMetadata |
| `admin` | queueCount (admin-only) |
| `health` | ping |

### 3. Frontend Infrastructure (apps/web)

#### Site Configuration (`lib/site.ts`)
- `siteName`: "TruthSentry"
- `siteThemeColor`: `#9B1B30`
- `siteDefaultDescription`: French description about submitting claims in Fula/Peul
- `siteKeywords`: verification des faits, Fula, Peul, verification par IA, multilingue
- `siteIconPath`: `/truthsentry-icon.png`
- `siteLogoPath` / `siteLogoDarkPath`: light and dark mode logos
- `siteHeroImagePath`: `/truthsentry-hero.png`
- `getMetadataBase()`: resolves from `NEXT_PUBLIC_APP_URL` or falls back to `localhost:3000`
- `shouldAllowIndexing()`: only true when `VERCEL_ENV === 'production'`
- `buildJsonLd()`: generates WebApplication schema.org JSON-LD

#### Brand Assets (`public/`)
- `truthsentry-logo.png` -- light mode logo
- `truthsentry-logo-dark.png` -- dark mode logo
- `truthsentry-icon.png` -- square icon (used for favicon, PWA, OG)
- `truthsentry-hero.png` -- landing page hero image

#### SEO and PWA
- `app/robots.ts` -- dynamic robots.txt (disallows all in non-production)
- `app/sitemap.ts` -- XML sitemap (home, privacy, terms)
- `app/manifest.ts` -- PWA manifest (standalone display, maskable icon)
- `app/icon.tsx` -- dynamic 32x32 favicon (dark background, white "A")
- `app/apple-icon.tsx` -- dynamic 180x180 Apple touch icon
- `app/opengraph-image.tsx` -- dynamic 1200x630 OG image
- `app/twitter-image.tsx` -- dynamic 1200x630 Twitter card image

#### Error Handling
- `app/error.tsx` -- route-level error boundary with "Try again" button
- `app/global-error.tsx` -- root error boundary (self-contained HTML, no external CSS)
- `app/not-found.tsx` -- 404 page with link back to home

#### Landing / Marketing Page (`app/(marketing)/page.tsx`)
- Full marketing landing page with sections:
  - `LandingSiteHeader` with brand logo and navigation
  - `LandingHero` with headline and CTA
  - `LandingFeatures` -- four feature cards: Multilingual Input, Explicit Trust, Transparent Boundaries, Human Oversight
  - `LandingSteps` -- "How it works" step-by-step guide
  - `LandingBullets` -- "Why TruthSentry" value propositions
  - `LandingFaq` -- frequently asked questions
  - `LandingSiteFooter` with legal links
- Layout: `app/(marketing)/layout.tsx` (passthrough, no additional chrome)

#### Legal Pages
- `/legal/privacy` -- privacy policy placeholder (noindex, follow)
- `/legal/terms` -- terms of use placeholder (noindex, follow)

#### Auth Pages and Forms
- `/sign-in` -- `SignInForm` with email + password, Zod validation, redirect to `/chat` on success
- `/sign-up` -- `SignUpForm` with email + password (min 8 chars, uppercase, digit), redirect to `/sign-up/verify`
- `/sign-up/verify` -- `VerifyEmailForm` with 6-digit OTP input (`InputOTP` from `@truthsentry/ui`), resend support, redirect to `/chat`
- `/forgot-password` -- `RequestPasswordResetForm` with email field, success toast
- `/reset-password` -- `ResetPasswordForm` with password field + token from URL, redirect to `/sign-in`
- `PasswordInputWithToggle` -- shared input with eye/eye-off visibility toggle

#### Theme System
- `ThemeProvider` -- wraps app with `next-themes` (attribute: class, defaultTheme: system, enableSystem)
- `ThemeToggle` -- Sun/Moon icon button switching light/dark mode

#### Toast Notification System
- `AppToastProviders` -- root-level wrapper combining `ToastProvider` and `AnchoredToastProvider` from `@truthsentry/ui`
- `api-toast.ts` -- helper functions: `notifyApiSuccess()`, `notifyApiError()`, `notifyApiInfo()`, `notifyApiWarning()`, `notifyApiException()`, `getApiErrorMessage()`

#### tRPC Client (`components/trpc-provider.tsx`)
- `TrpcProvider` -- creates tRPC client with `httpBatchLink` to `NEXT_PUBLIC_API_URL/trpc`
- Sends requests with `credentials: 'include'` for cookie-based sessions
- Wraps children in `QueryClientProvider` (React Query)

#### Utility Hooks
- `use-auto-scroll.ts` -- auto-scrolls container to bottom unless user deliberately scrolls up
- `use-autosize-textarea.ts` -- auto-resizes textarea between original height and configurable max
- `use-copy-to-clipboard.ts` -- copies text via `navigator.clipboard`, shows toast confirmation
- `use-audio-recording.ts` -- browser MediaRecorder integration with transcription callback (implemented, not planned)

#### Implemented Libraries (in `lib/`)
- `language-detection.ts` -- `franc`-based language detection with `detectLanguageFromText()`, `getBrowserLanguage()`, `detectUserLanguage()` (implemented, not planned)
- `audio-utils.ts` -- `recordAudio()` utility wrapping MediaRecorder (audio/webm;codecs=opus)
- `ai-provider.ts` -- Vercel AI SDK OpenAI wrapper (currently unused; actual AI calls go through `apps/api`)

### 4. Shared Packages

#### `@truthsentry/prisma`
- Prisma 7 ORM with `@prisma/adapter-pg`
- PostgreSQL on Supabase
- Core models: User, Session, Claim (with full fact-checking metadata), ClaimMessage, EmailVerificationToken, PasswordResetToken, EmailDelivery, ResendWebhookEvent
- Enums: FactCheckStatus, SourceType, MediaType, TopicCategory, MessageRole, UserRole

#### `@truthsentry/emails`
- Resend SDK integration with idempotency key support
- Templates are plain HTML strings (not React Email components) with French text
- Template functions export `subject()`, `html()`, and `text()` variants
- Templates: verify-email (OTP code), password-reset (link with #9B1B30 branded button), claim-queued, claim-resolved
- Shared types: `SendEmailResult` (ok/error union), `CommonSendArgs` (to, idempotencyKey)

#### `@truthsentry/ai`
- Empty scaffold package (only `package.json`, no `src/` directory)
- Reserved for future extraction of AI logic from `apps/api`

#### `@truthsentry/ui`
- Headless UI primitives built on Base UI (`@base-ui/react`)
- CVA (class-variance-authority) for variant styling
- 40+ components including full chat kit

#### `@truthsentry/trpc`
- tRPC 11 routers, context types, input schemas
- Guards: `requireVerifiedEmail`

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js | 15.4 |
| | React | 19 |
| | TypeScript | 5.9 |
| | Tailwind CSS | 4 |
| **API** | Node.js HTTP (standalone) | - |
| | tRPC | 11 |
| **AI/LLM** | OpenAI (direct fetch) | gpt-4.1-mini |
| **Database** | PostgreSQL (Supabase) | - |
| | Prisma ORM | 7 |
| **Storage** | Supabase Storage | - |
| **Email** | Resend (plain HTML templates) | 6.2.1 |
| **Data Fetching** | @tanstack/react-query | 5.87 |
| | @trpc/react-query | 11.7 |
| **Theme** | next-themes | 0.4 |
| **UI Primitives** | Base UI (@base-ui/react) | - |
| | CVA | - |
| | Lucide Icons | 1.7 |
| **Build** | pnpm workspaces | 10 |
| | Turborepo | - |
| **Testing** | Vitest + Playwright | - |

---

## Core Features

### 1. ChatGPT-Style Chat Interface
- **Full-page layout** with collapsible sidebar and main chat area
- **Thread management**: create, list, switch, search threads
- **Auto-scrolling** message list with date dividers
- **Welcome screen** with prompt suggestion cards
- **Dark/light theme** support (ChatGPT palette: #212121 canvas, #171717 sidebar)

### 2. Fact-Checking Data Model

Each claim captures structured metadata for the full fact-checking lifecycle:

| Field | Description | Examples |
|-------|-------------|----------|
| `claimText` | The exact statement being fact-checked | "Le nouveau barrage de Souapiti produit 450 MW" |
| `claimLanguage` | Language of the claim | `fr`, `ff`, `en` |
| `claimDate` | When the claim was originally made | 2026-05-10 |
| `sourceName` | Who made the claim (person, org, account) | "Ministre de la Sante", "@infos_guinee" |
| `sourceType` | Category of the source | politician, media, social_media, blog, ngo, citizen |
| `sourceUrl` | Link to the original claim | https://twitter.com/... |
| `mediaType` | Format of the claim evidence | text, image, video, audio (or combinations like text_image) |
| `factCheckText` | The AI or reviewer's verification output | Detailed analysis text |
| `factCheckStatus` | Verification verdict | pending, verified, debunked, misleading, partially_true |
| `factCheckDate` | When the verification was completed | 2026-05-11 |
| `topicCategory` | Subject domain | politics, health, finance, tech, security, education, environment |
| `location` | Country or region relevant to the claim | Guinea, West Africa, Conakry |
| `platform` | Where the claim originated | twitter, whatsapp, facebook, tv, radio, newspaper, tiktok |

### 3. Claim Verification Pipeline
- **User submits a claim** with structured metadata (source, platform, topic, location)
- **AI analyzes** the claim using OpenAI's gpt-4.1-mini with enriched context
- **Granular verdicts**: verified, debunked, misleading, partially_true
- **Uncertain claims** stay as pending and are queued for human review
- **Email notifications** at each status transition

### 4. Multi-Media Support
- **Media types**: text, image, video, audio, and combinations (e.g., text + image)
- **Upload flow**: client requests a signed URL via `claim.requestUpload`, uploads directly to Supabase Storage, then references the URL in the message
- **Supported image formats**: PNG, JPEG, WebP
- **Size limit**: 5 MB per file (configurable via `CHAT_IMAGE_MAX_BYTES`)
- **Attachments stored** as JSON on `ClaimMessage.attachments`

### 5. Multilingual Support

| Language | Code | Status |
|----------|------|--------|
| French | `fr` | Primary (UI and system prompts) |
| Fula / Peul | `ff` | Target user language |
| English | `en` | Alternate |

### 6. Authentication and Authorization
- **Email + password** registration with OTP email verification
- **Token-based sessions** (7-day expiry, cookie-based)
- **Protected routes** require verified email
- **Admin role** for human review queue access

### 7. Transactional Email
- **verify-email**: OTP code after registration
- **password-reset**: Reset link
- **claim-queued**: Notification when a claim enters PROCESSING
- **claim-resolved**: Notification when a claim gets a response

---

## Attachment and Media Handling

### 1. File Attachment Handling

File attachments follow a two-phase flow: the client obtains a signed upload URL from the API, uploads the file directly to Supabase Storage, then references the resulting public URL in the message payload.

#### Upload Flow (Sequence)

```
Client                       API (tRPC)                  Supabase Storage
  |                             |                              |
  |-- claim.requestUpload ----->|                              |
  |   { claimId, filename,      |                              |
  |     mimeType }              |                              |
  |                             |-- createSignedUploadUrl ---->|
  |                             |<--- { signedUrl, token } ----|
  |<-- { signedUrl, publicUrl } |                              |
  |                             |                              |
  |-- PUT signedUrl (binary) --------------------------------->|
  |<-- 200 OK ------------------------------------------------|
  |                             |                              |
  |-- appendUserMessage ------->|                              |
  |   { content, attachments:   |                              |
  |     [{ url, type, name }] } |                              |
```

#### Attachment Schema

Each attachment is stored as a JSON object on `ClaimMessage.attachments`:

```typescript
interface MessageAttachment {
  url: string;       // Supabase Storage public URL
  type: string;      // MIME type (image/jpeg, audio/webm, etc.)
  name: string;      // Original filename
  size?: number;     // File size in bytes (optional, for display)
}
```

#### Supported File Types

| Category | MIME Types | Max Size |
|----------|-----------|----------|
| Image | `image/png`, `image/jpeg`, `image/webp` | 5 MB |
| Audio | `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg` | 10 MB |
| Video | `video/mp4`, `video/webm` | 25 MB |
| Document | `application/pdf` | 10 MB |

#### Server-Side Controls

- **Signed URLs expire** after 60 seconds to prevent link reuse
- **Bucket-level MIME enforcement** via Supabase Storage policies
- **File path convention**: `chat-uploads/{claimId}/{messageId}/{filename}` to scope files per claim and message
- **Orphan cleanup**: a scheduled job removes files whose signed URL was generated but never referenced in a `ClaimMessage` (older than 1 hour)

#### Client-Side Responsibilities

- Validate file type and size before requesting a signed URL (fail fast with user-visible error)
- Show upload progress indicator during the PUT request
- Handle upload failures gracefully (retry or surface error to user)
- Attach the returned `publicUrl` to the message payload only after a successful upload

### 2. Image Upload Validation

Image validation runs at two layers: client-side (immediate feedback) and server-side (security enforcement).

#### Client-Side Validation

Runs before requesting a signed URL. If any check fails, the upload is blocked and the user sees an inline error.

| Check | Rule | Error Message |
|-------|------|---------------|
| File type | Must match `CHAT_ALLOWED_IMAGE_MIME_TYPES` | "Format non pris en charge. Utilisez PNG, JPEG ou WebP." |
| File size | Must be <= `CHAT_IMAGE_MAX_BYTES` (5 MB) | "L'image depasse la taille maximale de 5 Mo." |
| Dimensions | Width and height <= 4096 px | "L'image est trop grande. Maximum 4096x4096 pixels." |
| File count | Max 4 images per message | "Maximum 4 images par message." |

```typescript
const IMAGE_LIMITS = {
  maxBytes: Number(process.env.NEXT_PUBLIC_CHAT_IMAGE_MAX_BYTES ?? 5_242_880),
  allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
  maxDimension: 4096,
  maxPerMessage: 4,
} as const;

function validateImage(file: File): { valid: boolean; error?: string } {
  if (!IMAGE_LIMITS.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Format non pris en charge. Utilisez PNG, JPEG ou WebP.' };
  }
  if (file.size > IMAGE_LIMITS.maxBytes) {
    return { valid: false, error: "L'image depasse la taille maximale de 5 Mo." };
  }
  return { valid: true };
}

async function validateImageDimensions(file: File): Promise<{ valid: boolean; error?: string }> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  return new Promise((resolve) => {
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width > IMAGE_LIMITS.maxDimension || img.height > IMAGE_LIMITS.maxDimension) {
        resolve({ valid: false, error: 'L\'image est trop grande. Maximum 4096x4096 pixels.' });
      }
      resolve({ valid: true });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: 'Impossible de lire l\'image.' });
    };
    img.src = url;
  });
}
```

#### Server-Side Validation (requestUpload procedure)

Runs inside the `claim.requestUpload` tRPC mutation before generating a signed URL.

| Check | Rule | On Failure |
|-------|------|------------|
| MIME type | Allowlisted types only | `BAD_REQUEST` with "Unsupported file type" |
| File extension | Must match claimed MIME type | `BAD_REQUEST` with "Extension mismatch" |
| Rate limit | Max 10 upload requests per claim per minute | `TOO_MANY_REQUESTS` |
| Claim ownership | Requesting user must own the claim | `FORBIDDEN` |

#### Supabase Storage Policies

- Bucket `chat-uploads` restricts uploads to signed URLs only (no anonymous writes)
- Bucket-level size limit: 25 MB (covers all file types; per-type limits are enforced in application code)
- Read access: authenticated users who own the parent claim (enforced via RLS on a join to `Claim.createdByUserId`)

### 3. Audio Chunk Streaming

Audio recording uses the browser MediaRecorder API to capture voice input. Chunks are buffered client-side and uploaded as a single file after recording completes. For long recordings (> 30 seconds), progressive upload is used to avoid memory pressure and upload timeouts.

#### Recording Flow

```
User taps mic             MediaRecorder starts
     |                         |
     |                    onDataAvailable (every 1s)
     |                         |
     |                    chunks[] accumulates in memory
     |                         |
User taps stop            MediaRecorder stops
     |                         |
     |                    Final chunk appended
     |                         |
     +--- short (<= 30s) ---> Blob assembled, single PUT upload
     |
     +--- long (> 30s) -----> Progressive upload (chunked PUT)
```

#### Client-Side Implementation

```typescript
interface AudioRecordingState {
  status: 'idle' | 'recording' | 'uploading' | 'error';
  duration: number;           // seconds elapsed
  chunks: Blob[];             // buffered audio data
  mimeType: string;           // negotiated MIME type
}

const AUDIO_CONFIG = {
  preferredMimeType: 'audio/webm;codecs=opus',
  fallbackMimeTypes: ['audio/ogg;codecs=opus', 'audio/mp4'],
  chunkInterval: 1000,        // ms between onDataAvailable events
  maxDuration: 120,           // seconds (hard cap, auto-stop)
  progressiveThreshold: 30,   // seconds before switching to chunked upload
} as const;

function negotiateMimeType(): string {
  for (const type of [AUDIO_CONFIG.preferredMimeType, ...AUDIO_CONFIG.fallbackMimeTypes]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  throw new Error('No supported audio MIME type found');
}
```

#### Progressive Upload (Long Recordings)

For recordings exceeding `progressiveThreshold`, chunks are uploaded incrementally using a multipart-style flow:

1. Client requests a signed URL at recording start
2. Every `chunkInterval` ms, the accumulated chunk is appended via a PUT request with `Content-Range` header
3. On stop, a finalization request marks the upload complete
4. If the connection drops mid-upload, the client retries from the last acknowledged byte offset

#### Server-Side Processing

After upload completes, the API can optionally send the audio to the Whisper API for transcription:

```typescript
async function transcribeAudio(audioUrl: string): Promise<string> {
  const audioResponse = await fetch(audioUrl);
  const audioBlob = await audioResponse.blob();
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'fr');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: formData,
  });

  const data = await response.json();
  return data.text;
}
```

#### Audio Constraints

| Parameter | Value |
|-----------|-------|
| Max recording duration | 120 seconds |
| Max file size | 10 MB |
| Preferred codec | Opus (WebM container) |
| Fallback codecs | Ogg/Opus, MP4/AAC |
| Chunk interval | 1 second |
| Sample rate | Browser default (typically 48 kHz) |

---

## Reliability and Real-Time

### 4. Message Recovery

Message recovery ensures that user messages are never silently lost due to network failures, app crashes, or server errors. The strategy combines optimistic local state, idempotent server writes, and a reconciliation step on reconnect.

#### Idempotent Writes via clientRequestId

Every user message includes a `clientRequestId` (UUID v4) generated before submission. The database enforces a unique constraint on `(claimId, clientReqId)`, so duplicate submissions from retries are safely ignored.

```typescript
const clientRequestId = crypto.randomUUID();

await appendMessage.mutateAsync({
  claimId: activeClaimId,
  content: messageText,
  clientRequestId,
  attachments,
});
```

If the network request fails but the server already persisted the message, a retry with the same `clientRequestId` returns the existing message instead of creating a duplicate.

#### Outbox Pattern (Client-Side Queue)

Unsent messages are stored in an in-memory outbox with periodic persistence to `localStorage`. This handles:

- Network drops during submission
- Tab/browser crashes before the server acknowledges receipt
- Slow connections where the user sends multiple messages before the first one resolves

```typescript
interface OutboxEntry {
  id: string;                  // clientRequestId
  claimId: string;
  content: string;
  attachments: MessageAttachment[];
  status: 'queued' | 'sending' | 'sent' | 'failed';
  attempts: number;
  createdAt: number;           // Date.now()
  lastAttemptAt?: number;
}

const OUTBOX_CONFIG = {
  maxRetries: 5,
  storageKey: 'truthsentry_message_outbox',
  flushInterval: 3000,        // ms between outbox drain attempts
  staleThreshold: 86_400_000, // 24 hours -- discard entries older than this
} as const;
```

#### Recovery on Reconnect

When the client detects a restored connection (via `navigator.onLine` or a successful health check), it:

1. Loads the outbox from `localStorage`
2. Filters out stale entries (older than 24 hours)
3. Re-submits entries with status `queued` or `failed` (up to `maxRetries`)
4. Reconciles local state with the server by refetching the thread via `claim.byId`

#### UI Indicators

| State | Visual Treatment |
|-------|-----------------|
| Message queued (offline) | Dimmed bubble with clock icon |
| Message sending | Dimmed bubble with spinner |
| Message sent | Normal bubble |
| Message failed (max retries) | Red border with "Renvoyer" (Retry) button |

### 5. Connection Retry Logic

All tRPC requests (queries and mutations) use a retry strategy with exponential backoff to handle transient network failures and server errors.

#### Retry Configuration

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,            // ms
  maxDelay: 15_000,           // ms
  backoffMultiplier: 2,
  jitter: true,               // adds +/- 20% random jitter to prevent thundering herd
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
} as const;

function calculateDelay(attempt: number): number {
  const exponential = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
    RETRY_CONFIG.maxDelay,
  );
  if (!RETRY_CONFIG.jitter) return exponential;
  const jitterRange = exponential * 0.2;
  return exponential + (Math.random() * 2 - 1) * jitterRange;
}
```

#### tRPC Client Integration

```typescript
import { httpBatchLink } from '@trpc/client';

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
      fetch: fetchWithRetry,
    }),
  ],
});
```

#### Retry Behavior by Request Type

| Request Type | Retries | Rationale |
|-------------|---------|-----------|
| Queries (`useQuery`) | 3 | Safe to retry; idempotent reads |
| Mutations (with `clientRequestId`) | 3 | Safe to retry; server deduplicates via unique constraint |
| Mutations (without `clientRequestId`) | 0 | Not safe to retry; could cause side effects |
| File uploads (PUT to signed URL) | 2 | Safe to retry; PUT is idempotent by nature |

#### Online/Offline Detection

The client monitors connectivity and pauses/resumes request processing accordingly:

```typescript
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

When offline:
- New queries are paused (React Query `enabled: false` when offline)
- New mutations are added to the outbox (see Message Recovery)
- A banner displays: "Vous etes hors ligne. Les messages seront envoyes automatiquement a la reconnexion."

When back online:
- Paused queries resume automatically
- The outbox drains queued messages
- A brief "Reconnecte" toast confirms restoration

### 6. WebSocket Support (Real-Time Updates)

The system uses WebSockets for pushing real-time updates from the server to connected clients. This eliminates polling and provides instant feedback for claim status changes, new messages, and typing indicators.

#### Transport Layer

WebSocket connections are established alongside the existing HTTP tRPC transport. The API server runs a WebSocket server on the same port using the `ws` library, with an upgrade handler on the existing HTTP server.

```
Client (apps/web)                    API Server (apps/api)
       |                                      |
       |--- HTTP GET /trpc (queries) -------->|
       |--- HTTP POST /trpc (mutations) ----->|
       |                                      |
       |--- WS  /ws (upgrade) -------------->|
       |<-- 101 Switching Protocols ----------|
       |                                      |
       |<-- push: message.created ------------|
       |<-- push: claim.statusChanged --------|
       |<-- push: typing.start ---------------|
       |<-- push: typing.stop ----------------|
```

#### Server-Side Setup

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';

interface WSClient {
  ws: WebSocket;
  userId: string;
  subscribedClaimIds: Set<string>;
}

const wss = new WebSocketServer({ noServer: true });
const clients = new Map<string, WSClient>();

server.on('upgrade', async (req: IncomingMessage, socket, head) => {
  const session = await resolveSessionFromCookie(req);
  if (!session) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    const client: WSClient = {
      ws,
      userId: session.userId,
      subscribedClaimIds: new Set(),
    };
    clients.set(session.userId, client);

    ws.on('message', (raw) => handleClientMessage(client, raw));
    ws.on('close', () => clients.delete(session.userId));
  });
});
```

#### Event Types

| Event | Direction | Payload | Trigger |
|-------|-----------|---------|---------|
| `subscribe` | client -> server | `{ claimIds: string[] }` | Client opens a claim thread |
| `unsubscribe` | client -> server | `{ claimIds: string[] }` | Client leaves a claim thread |
| `message.created` | server -> client | `{ claimId, message: ClaimMessage }` | New message persisted (user or assistant) |
| `claim.statusChanged` | server -> client | `{ claimId, status: FactCheckStatus, factCheckDate }` | Claim verdict updated |
| `typing.start` | server -> client | `{ claimId }` | AI generation begins |
| `typing.stop` | server -> client | `{ claimId }` | AI generation completes or fails |

#### Wire Protocol

All messages use JSON framing:

```typescript
interface WSMessage {
  type: string;                // event type
  payload: Record<string, unknown>;
  ts: number;                  // server timestamp (ms since epoch)
  seq?: number;                // monotonic sequence number per connection
}
```

The `seq` field supports gap detection. If the client sees `seq` jump by more than 1, it knows it missed events and triggers a full refetch of the affected claim threads.

#### Client-Side Hook

```typescript
import { useEffect, useRef, useCallback } from 'react';

interface UseRealtimeOptions {
  claimId: string | null;
  onMessage: (message: ClaimMessage) => void;
  onStatusChange: (status: FactCheckStatus) => void;
  onTypingChange: (isTyping: boolean) => void;
}

function useRealtime({ claimId, onMessage, onStatusChange, onTypingChange }: UseRealtimeOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const lastSeqRef = useRef<number>(0);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${process.env.NEXT_PUBLIC_API_HOST}/ws`);

    ws.onopen = () => {
      if (claimId) {
        ws.send(JSON.stringify({ type: 'subscribe', payload: { claimIds: [claimId] } }));
      }
    };

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);

      if (msg.seq !== undefined && msg.seq > lastSeqRef.current + 1) {
        // Gap detected -- refetch thread state
        refetchClaim();
      }
      if (msg.seq !== undefined) lastSeqRef.current = msg.seq;

      switch (msg.type) {
        case 'message.created':
          onMessage(msg.payload.message as ClaimMessage);
          break;
        case 'claim.statusChanged':
          onStatusChange(msg.payload.status as FactCheckStatus);
          break;
        case 'typing.start':
          onTypingChange(true);
          break;
        case 'typing.stop':
          onTypingChange(false);
          break;
      }
    };

    ws.onclose = () => {
      // Reconnect with backoff (see Connection Retry Logic)
      scheduleReconnect();
    };

    wsRef.current = ws;
  }, [claimId]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);
}
```

#### Reconnection Strategy

WebSocket reconnection follows the same exponential backoff as HTTP retries (see Connection Retry Logic), with these additions:

| Parameter | Value |
|-----------|-------|
| Initial reconnect delay | 1 second |
| Max reconnect delay | 30 seconds |
| Max reconnect attempts | unlimited (keeps trying while tab is open) |
| Heartbeat interval | 30 seconds (client sends ping) |
| Server pong timeout | 10 seconds (triggers reconnect if exceeded) |

On reconnect, the client re-subscribes to all active claim IDs and refetches the latest thread state to fill any gaps from the disconnection window.

#### Scalability Considerations

- **Single-server**: the in-memory `clients` map works for low-to-medium traffic
- **Multi-server**: introduce Redis Pub/Sub as a broadcast layer. The API server publishes events to a Redis channel keyed by `claimId`; each server instance subscribes and forwards to its local WebSocket clients
- **Connection limits**: enforce a max of 5 concurrent WebSocket connections per user to prevent resource exhaustion

---

## Implementation Plan

### Phase 1: Foundation (Complete)
1. Monorepo setup (pnpm + Turborepo)
2. Prisma schema and database migrations
3. tRPC server with auth routers
4. Next.js frontend with auth pages
5. Resend email integration

### Phase 2: Chat Interface (Complete)
1. Chat UI kit components (packages/ui)
2. ChatPageClient with thread management
3. tRPC claim routers (create, list, append, upload)
4. Image upload via Supabase Storage signed URLs

### Phase 3: AI Integration (In Progress)
1. OpenAI direct API call for claim verification
2. System prompt tuning for factual verification
3. Claim lifecycle pipeline (status transitions + emails)
4. Fallback handling for AI failures

### Phase 4: Multilingual and Voice
1. French/Fula system prompts and UI localization
2. Voice input with transcription (Whisper API)
3. Language detection from text and audio
4. Language-aware prompt selection

### Phase 5: Human Review and Admin
1. Admin dashboard for claim queue
2. Human reviewer workflow
3. Confidence scoring and routing
4. Analytics and monitoring

---

## API Integration

### Environment Variables

```bash
# .env
AI_API_KEY=sk-...                                  # OpenAI API key
AI_MODEL=gpt-4.1-mini                              # OpenAI model (configurable)
DATABASE_URL=postgresql://...                       # Supabase PostgreSQL
NEXT_PUBLIC_APP_URL=https://truthsentry.org
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET_CHAT_UPLOADS=chat-uploads
CHAT_IMAGE_MAX_BYTES=5242880                        # 5 MB
CHAT_ALLOWED_IMAGE_MIME_TYPES=image/png,image/jpeg,image/webp
AUTH_COOKIE_NAME=truthsentry_session
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SIGNING_SECRET=whsec_...
EMAIL_FROM=noreply@truthsentry.org
```

### tRPC Client Setup (apps/web)

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@truthsentry/trpc';

export const trpc = createTRPCReact<AppRouter>();
```

### Claim Procedures

```typescript
// Create a new claim with fact-checking metadata
const createClaim = trpc.claim.create.useMutation();
await createClaim.mutateAsync({
  content: 'Le nouveau barrage de Souapiti produit 450 MW',
  claimLanguage: 'fr',
  sourceName: '@infos_guinee',
  sourceType: 'social_media',
  sourceUrl: 'https://twitter.com/infos_guinee/status/123',
  mediaType: 'text',
  topicCategory: 'politics',
  location: 'Guinea',
  platform: 'twitter',
  clientRequestId: crypto.randomUUID(),
});

// Append a user message to an existing claim thread
const appendMessage = trpc.claim.appendUserMessage.useMutation();
await appendMessage.mutateAsync({
  claimId: 'claim_id',
  content: 'Can you also check the capacity figure?',
  clientRequestId: crypto.randomUUID(),
});

// Generate AI fact-check reply
const generateReply = trpc.claim.generateAssistantReply.useMutation();
await generateReply.mutateAsync({ claimId: 'claim_id' });

// Request a signed upload URL for evidence (image, video, audio)
const requestUpload = trpc.claim.requestUpload.useMutation();
const { signedUrl, publicUrl } = await requestUpload.mutateAsync({
  claimId: 'claim_id',
  filename: 'screenshot-tweet.jpg',
  mimeType: 'image/jpeg',
});

// Update claim metadata after creation
const updateMetadata = trpc.claim.updateMetadata.useMutation();
await updateMetadata.mutateAsync({
  claimId: 'claim_id',
  topicCategory: 'health',
  location: 'Conakry',
});
```

---

## Component Implementation

### Chat Page Client

```typescript
// apps/web/components/chat-page-client.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import {
  ChatAppShell,
  ChatSidebar,
  ChatTopBar,
  ChatComposer,
  ChatMessageList,
  ChatMessageBubble,
  ChatTypingIndicator,
  ChatWelcome,
} from '@truthsentry/ui';

export function ChatPageClient() {
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const claimsQuery = trpc.claim.listMine.useQuery();
  const claimQuery = trpc.claim.byId.useQuery(
    { claimId: activeClaimId! },
    { enabled: Boolean(activeClaimId) },
  );
  const createClaim = trpc.claim.create.useMutation();
  const appendMessage = trpc.claim.appendUserMessage.useMutation();
  const generateReply = trpc.claim.generateAssistantReply.useMutation();
  const requestUpload = trpc.claim.requestUpload.useMutation();

  async function handleSend(
    content: string,
    attachments?: string[],
    metadata?: {
      claimLanguage?: string;
      sourceName?: string;
      sourceType?: string;
      sourceUrl?: string;
      mediaType?: string;
      topicCategory?: string;
      location?: string;
      platform?: string;
    },
  ) {
    if (!activeClaimId) {
      const claim = await createClaim.mutateAsync({
        content,
        clientRequestId: crypto.randomUUID(),
        attachments: attachments ?? [],
        claimLanguage: metadata?.claimLanguage ?? 'fr',
        sourceName: metadata?.sourceName,
        sourceType: metadata?.sourceType,
        sourceUrl: metadata?.sourceUrl,
        mediaType: metadata?.mediaType ?? 'text',
        topicCategory: metadata?.topicCategory,
        location: metadata?.location,
        platform: metadata?.platform,
      });
      setActiveClaimId(claim.id);
      setIsGenerating(true);
      await generateReply.mutateAsync({ claimId: claim.id });
      setIsGenerating(false);
    } else {
      await appendMessage.mutateAsync({
        claimId: activeClaimId,
        content,
        clientRequestId: crypto.randomUUID(),
        attachments: attachments ?? [],
      });
      setIsGenerating(true);
      await generateReply.mutateAsync({ claimId: activeClaimId });
      setIsGenerating(false);
    }
    claimQuery.refetch();
    claimsQuery.refetch();
  }

  async function handleImageUpload(file: File) {
    if (!activeClaimId) return null;
    const { signedUrl, publicUrl } = await requestUpload.mutateAsync({
      claimId: activeClaimId,
      filename: file.name,
      mimeType: file.type,
    });
    await fetch(signedUrl, { method: 'PUT', body: file });
    return publicUrl;
  }

  const messages = claimQuery.data?.messages ?? [];

  return (
    <ChatAppShell>
      <ChatSidebar
        threads={claimsQuery.data ?? []}
        activeId={activeClaimId}
        onSelect={setActiveClaimId}
        onNewChat={() => setActiveClaimId(null)}
      />
      <div className="flex flex-col flex-1 min-h-0">
        <ChatTopBar title="TruthSentry" subtitle="Verification des faits" />
        {messages.length === 0 && !activeClaimId ? (
          <ChatWelcome onSuggestionClick={(text) => handleSend(text)} />
        ) : (
          <ChatMessageList>
            {messages.map((msg) => (
              <ChatMessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                attachments={msg.attachments}
                createdAt={msg.createdAt}
              />
            ))}
            {isGenerating && <ChatTypingIndicator />}
          </ChatMessageList>
        )}
        <ChatComposer
          onSend={handleSend}
          onImageUpload={handleImageUpload}
          disabled={isGenerating}
        />
      </div>
    </ChatAppShell>
  );
}
```

### AI Generation (Server-Side)

```typescript
// apps/api/src/index.ts - generateAssistantText in context
generateAssistantText: async ({ claim, thread }) => {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('AI_API_KEY is missing');
  const model = process.env.AI_MODEL ?? 'gpt-4.1-mini';

  const claimContext = [
    claim.sourceName && `Source: ${claim.sourceName} (${claim.sourceType ?? 'unknown'})`,
    claim.platform && `Platform: ${claim.platform}`,
    claim.sourceUrl && `Original URL: ${claim.sourceUrl}`,
    claim.topicCategory && `Topic: ${claim.topicCategory}`,
    claim.location && `Location: ${claim.location}`,
    claim.claimLanguage && `Claim language: ${claim.claimLanguage}`,
    claim.claimDate && `Claim date: ${claim.claimDate.toISOString().split('T')[0]}`,
    claim.mediaType && `Media type: ${claim.mediaType}`,
  ]
    .filter(Boolean)
    .join('\n');

  const systemPrompt = `You are a fact-checking assistant for TruthSentry, helping users in Africa verify claims and combat misinformation. Your role:

1. Analyze claims against known facts, context, and logical reasoning.
2. Provide a clear verdict: verified, debunked, misleading, or partially_true. If uncertain, say so explicitly.
3. Cite reasoning and suggest where users can find authoritative sources.
4. Be culturally aware of the African context (local politics, health campaigns, regional events).
5. Respond in the same language as the claim when possible (French, Fula, or English).

Claim metadata:
${claimContext || 'No metadata provided.'}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...thread.map((m) => ({
          role: m.role === 'ASSISTANT' ? 'assistant' : 'user',
          content: m.content,
        })),
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
},
```

### Claim Router (generateAssistantReply)

```typescript
// packages/trpc/src/routers/claim.ts
generateAssistantReply: protectedProcedure
  .input(z.object({ claimId: z.string().cuid() }))
  .mutation(async ({ ctx, input }) => {
    requireVerifiedEmail(ctx);

    const claim = await ctx.prisma.claim.findUnique({
      where: { id: input.claimId, createdByUserId: ctx.sessionUser!.id },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });

    if (!claim) throw new TRPCError({ code: 'NOT_FOUND' });

    // Send "claim queued" email
    await ctx.sendClaimQueuedEmail({
      userId: ctx.sessionUser!.id,
      claimId: claim.id,
    });

    try {
      // Pass full claim metadata + thread to the AI for enriched context
      const assistantText = await ctx.generateAssistantText({
        claim,
        thread: claim.messages,
      });

      // Determine verdict from AI response (parsed or heuristic)
      const verdict = parseFactCheckVerdict(assistantText);

      // Save the fact-check output
      await ctx.prisma.claimMessage.create({
        data: {
          claimId: claim.id,
          role: 'ASSISTANT',
          content: assistantText,
        },
      });

      // Update claim with verdict and fact-check metadata
      await ctx.prisma.claim.update({
        where: { id: claim.id },
        data: {
          factCheckStatus: verdict,
          factCheckText: assistantText,
          factCheckDate: new Date(),
        },
      });

      // Send "claim resolved" email
      await ctx.sendClaimResolvedEmail({
        userId: ctx.sessionUser!.id,
        claimId: claim.id,
      });
    } catch (err) {
      // Save fallback message; claim stays PENDING for human review
      await ctx.prisma.claimMessage.create({
        data: {
          claimId: claim.id,
          role: 'SYSTEM',
          content:
            "Desolee, nous n'avons pas pu verifier cette affirmation pour le moment. Un reviseur humain y jettera un oeil.",
        },
      });
    }
  }),
```

---

## Language Support

### Current Configuration

The primary UI language is French. The AI system prompt is currently in English and lives in the API server. Future work will add full Fula/Peul support.

| Language | Code | Status | Use |
|----------|------|--------|-----|
| French | `fr` | Active | UI text, page metadata, email templates |
| English | `en` | Active | AI system prompt, developer docs |
| Fula / Peul | `ff` | Planned | User-facing prompts, voice input |

### System Prompt (Current)

The system prompt is dynamically constructed per claim, injecting claim metadata (source, platform, topic, location, language) into the context. The base prompt:

```
You are a fact-checking assistant for TruthSentry, helping users in Africa verify claims
and combat misinformation. Your role:

1. Analyze claims against known facts, context, and logical reasoning.
2. Provide a clear verdict: verified, debunked, misleading, or partially_true.
   If uncertain, say so explicitly.
3. Cite reasoning and suggest where users can find authoritative sources.
4. Be culturally aware of the African context (local politics, health campaigns,
   regional events).
5. Respond in the same language as the claim when possible (French, Fula, or English).

Claim metadata:
Source: @infos_guinee (social_media)
Platform: twitter
Topic: politics
Location: Guinea
Claim language: fr
```

### Planned Multilingual Prompts

```typescript
export type SupportedLanguage = 'fr' | 'en' | 'ff';

export const LANGUAGE_SYSTEM_PROMPTS: Record<SupportedLanguage, string> = {
  fr: "Vous etes un assistant de verification des faits pour TruthSentry. Analysez les affirmations, fournissez un verdict clair (verifie, dementi, trompeur, partiellement vrai), et citez vos sources. Soyez explicite quand vous n'etes pas certain.",
  en: 'You are a fact-checking assistant for TruthSentry. Analyze claims, provide a clear verdict (verified, debunked, misleading, partially true), and cite your reasoning. Be explicit when uncertain.',
  ff: 'A on wallitooɗo ƴeewndogol goonga TruthSentry. Ƴeewnu haalaaji, hokku saakitaare laaɓnde (goongaɗinaa, waɗɗinaa, feewndinaa, heen fof goonga). Wonu ceniido so a anndaa.',
};
```

### Language Detection (Partially Implemented)

The following are already implemented in `apps/web/lib/language-detection.ts`:

1. **Text-based detection** using the `franc` library -- `detectLanguageFromText()`
2. **Browser language** fallback -- `getBrowserLanguage()` reads `navigator.language`
3. **Hierarchical detection** -- `detectUserLanguage()` with priority: audio > text > browser > default
4. **Default**: English (en) -- needs to be changed to French (fr) for TruthSentry

Not yet implemented:
- Audio language detection from Whisper API response
- `franc` language mapping currently maps to Igbo/Hausa/Yoruba (Ahioma legacy) -- needs remapping to French/Fula/English

---

## Claim Lifecycle

### Fact-Check Status (FactCheckStatus)

| Status | Description |
|--------|-------------|
| `PENDING` | Claim submitted, awaiting AI or human verification |
| `VERIFIED` | The claim has been confirmed as true/accurate |
| `DEBUNKED` | The claim has been proven false |
| `MISLEADING` | The claim is technically true but presented in a deceptive way |
| `PARTIALLY_TRUE` | Part of the claim is accurate, but key details are wrong or missing |

### State Machine

```
PENDING ──(generateAssistantReply)──> AI analysis
                                         |
               +----------+---------+----+----+-----------+
               |          |         |         |           |
           high conf  high conf  ambiguous  ambiguous  AI failure
           (true)     (false)    (mixed)    (deceptive)    |
               |          |         |         |           |
           VERIFIED   DEBUNKED  PARTIALLY  MISLEADING  stays PENDING
                                  _TRUE                (human queue)

Human reviewer can override any status at any time.
```

### Source Types (SourceType)

| Type | Description |
|------|-------------|
| `politician` | Government official, elected representative |
| `media` | News outlet, journalist |
| `social_media` | Social media account, influencer |
| `blog` | Blog post, opinion site |
| `ngo` | Non-governmental organization |
| `citizen` | Ordinary citizen, community member |

### Topic Categories (TopicCategory)

| Category | Examples |
|----------|----------|
| `politics` | Elections, governance, policy announcements |
| `health` | Disease outbreaks, vaccination, medical claims |
| `finance` | Economic data, currency, banking |
| `tech` | Technology announcements, digital services |
| `security` | Conflict, military, crime |
| `education` | School policies, exam results |
| `environment` | Climate, natural disasters, agriculture |

### Platform Origins

| Platform | Description |
|----------|-------------|
| `twitter` | Twitter/X posts |
| `whatsapp` | WhatsApp messages and forwards |
| `facebook` | Facebook posts and groups |
| `tv` | Television broadcasts |
| `radio` | Radio broadcasts |
| `newspaper` | Print and online newspapers |
| `tiktok` | TikTok videos |

### Email Notifications

| Event | Template | Content |
|-------|----------|---------|
| Claim submitted | `claim-queued` | "Your claim is being analyzed" |
| Claim fact-checked | `claim-resolved` | "Your claim has been verified" (includes verdict) |

---

## Deployment Guide

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL database (Supabase)
- OpenAI API key
- Resend API key
- Supabase project with Storage bucket

### Step 1: Clone and Install

```bash
git clone <repo-url>
cd truthsentry
pnpm install
```

### Step 2: Configure Environment

Create `.env` files in `apps/api/` and `apps/web/`:

```bash
# apps/api/.env
AI_API_KEY=sk-...
AI_MODEL=gpt-4.1-mini
DATABASE_URL=postgresql://...
AUTH_COOKIE_NAME=truthsentry_session
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SIGNING_SECRET=whsec_...
EMAIL_FROM=noreply@truthsentry.org
NEXT_PUBLIC_APP_URL=https://truthsentry.org
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET_CHAT_UPLOADS=chat-uploads
```

```bash
# apps/web/.env.local
NEXT_PUBLIC_APP_URL=https://truthsentry.org
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Step 3: Set Up Database

```bash
pnpm --filter @truthsentry/prisma db:push
```

### Step 4: Create Supabase Storage Bucket

In Supabase Dashboard, create a `chat-uploads` bucket with:
- Public access: disabled (use signed URLs)
- File size limit: 5 MB
- Allowed MIME types: image/png, image/jpeg, image/webp

### Step 5: Run Development

```bash
pnpm dev
```

This starts both `apps/web` (Next.js on port 3000) and `apps/api` (HTTP server on port 4000) via Turborepo.

### Step 6: Build for Production

```bash
pnpm build
```

### Step 7: Deploy

- **Frontend (apps/web)**: Deploy to Vercel
- **API (apps/api)**: Deploy to a Node.js host (Railway, Fly.io, etc.)
- **Database**: Supabase managed PostgreSQL

---

## Code Snippets

### Database Schema (Key Models)

```prisma
enum FactCheckStatus {
  PENDING
  VERIFIED
  DEBUNKED
  MISLEADING
  PARTIALLY_TRUE
}

enum SourceType {
  POLITICIAN
  MEDIA
  SOCIAL_MEDIA
  BLOG
  NGO
  CITIZEN
}

enum MediaType {
  TEXT
  IMAGE
  VIDEO
  AUDIO
  TEXT_IMAGE
  TEXT_VIDEO
  TEXT_AUDIO
}

enum TopicCategory {
  POLITICS
  HEALTH
  FINANCE
  TECH
  SECURITY
  EDUCATION
  ENVIRONMENT
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

model Claim {
  id              String           @id @default(cuid())

  // Core claim data
  claimText       String           // The exact statement being fact-checked
  claimLanguage   String           @default("fr") // Language of the claim (fr, ff, en)
  claimDate       DateTime?        // When the claim was originally made

  // Source attribution
  sourceName      String?          // Who made the claim (person, org, account)
  sourceType      SourceType?      // politician, media, social_media, blog, ngo, citizen
  sourceUrl       String?          // Link to the original claim

  // Media and context
  mediaType       MediaType        @default(TEXT) // text, image, video, audio, combinations
  topicCategory   TopicCategory?   // politics, health, finance, tech, etc.
  location        String?          // Country or region (e.g., Guinea, West Africa)
  platform        String?          // twitter, whatsapp, facebook, tv, radio, etc.

  // Fact-check output
  factCheckText   String?          // The verification analysis text
  factCheckStatus FactCheckStatus  @default(PENDING)
  factCheckDate   DateTime?        // When the verification was completed

  // Ownership and timestamps
  createdByUserId String
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  user            User             @relation(fields: [createdByUserId], references: [id], onDelete: Cascade)
  messages        ClaimMessage[]
  emailDeliveries EmailDelivery[]

  @@index([createdByUserId, updatedAt])
  @@index([factCheckStatus, createdAt])
  @@index([topicCategory, createdAt])
  @@index([platform, createdAt])
}

model ClaimMessage {
  id          String      @id @default(cuid())
  claimId     String
  role        MessageRole
  content     String
  attachments Json?       // Array of { url, type, name } for uploaded evidence
  clientReqId String?
  createdAt   DateTime    @default(now())
  claim       Claim       @relation(fields: [claimId], references: [id], onDelete: Cascade)

  @@index([claimId, createdAt])
  @@unique([claimId, clientReqId])
}
```

### Adding a New tRPC Procedure

```typescript
// packages/trpc/src/routers/claim.ts
myNewProcedure: protectedProcedure
  .input(z.object({ claimId: z.string().cuid() }))
  .mutation(async ({ ctx, input }) => {
    requireVerifiedEmail(ctx);
    // Your logic here
  }),
```

### Adding a New Email Template

```typescript
// packages/emails/src/templates/my-template.tsx
import { Body, Head, Html, Text } from '@react-email/components';

export function MyTemplate({ name }: { name: string }) {
  return (
    <Html>
      <Head />
      <Body>
        <Text>Hello {name}</Text>
      </Body>
    </Html>
  );
}
```

---

## Monitoring and Analytics

### Error Tracking
- AI failures are caught and logged, with a FAILED status and system fallback message
- tRPC errors propagate as structured `TRPCError` instances
- Resend webhook events are stored for email delivery tracking

### Performance Considerations
- AI requests have a 20-second timeout
- Thread context is limited to the last 20 messages
- Image uploads are capped at 5 MB

### Key Metrics to Track
- Verdict distribution (verified vs debunked vs misleading vs partially_true vs pending)
- Average AI response time
- Claims queued for human review (stuck in PENDING)
- User language distribution (fr, ff, en)
- Source type breakdown (politician, media, social_media, etc.)
- Platform distribution (twitter, whatsapp, facebook, etc.)
- Topic category trends (health, politics, etc.)
- Location heat map
- Image/media attachment usage

---

## Current vs Target State

This spec documents both the current implementation and the target architecture. Where they diverge, the current state is what's deployed; the target state is what the spec prescribes for upcoming work.

### Prisma Schema

| Aspect | Current (schema.prisma) | Target (this spec) |
|--------|------------------------|-------------------|
| Claim status enum | `ClaimStatus`: OPEN, PROCESSING, RESOLVED, FAILED | `FactCheckStatus`: PENDING, VERIFIED, DEBUNKED, MISLEADING, PARTIALLY_TRUE |
| Claim fields | `title`, `status` only | Full metadata: claimText, claimLanguage, sourceName, sourceType, sourceUrl, mediaType, factCheckText, factCheckStatus, factCheckDate, topicCategory, location, platform |
| `generateAssistantText` signature | `{ thread }` (text context only) | `{ claim, thread }` (claim metadata + text context) |

### tRPC Types

| Aspect | Current (types.ts) | Target (this spec) |
|--------|-------------------|-------------------|
| `createSignedUploadUrl` returns | `{ uploadPath, uploadUrl }` | `{ signedUrl, publicUrl }` (rename pending) |
| Attachment schema (chatMessageInput) | `{ url, mimeType, sizeBytes }` | `{ url, type, name, size? }` (rename pending) |
| `sendClaimQueuedEmail` args | `{ to, claimId, idempotencyKey }` | Same (matches current) |

### Language Configuration

| Aspect | Current (languages.ts) | Target (this spec) |
|--------|----------------------|-------------------|
| Supported languages | English, Igbo, Hausa, Yoruba | French, Fula/Peul, English |
| System prompts | "Ahioma marketplace" shopping assistant | TruthSentry fact-checking assistant |
| Default language | English (en) | French (fr) |

### Auth Protection

| Aspect | Current | Target |
|--------|---------|--------|
| Route protection | Client-side redirect in `chat-page-client.tsx` (checks `session.me`, redirects to `/sign-in` or `/sign-up/verify`) | Same approach; no Next.js middleware exists |

---

## Legacy Code (Cleanup Required)

The following files were carried over from the Ahioma e-commerce project and reference modules or schemas that do not exist in TruthSentry. They should be removed or rewritten.

| File | Issue | Action |
|------|-------|--------|
| `apps/web/lib/languages.ts` | Defines Igbo/Hausa/Yoruba with "Ahioma marketplace" system prompts | Rewrite for French/Fula/English with TruthSentry fact-checking prompts |
| `apps/web/lib/ai/embedding.ts` | Imports `../db/schema/embeddings` and `../db` (Drizzle ORM) which do not exist | Remove or rewrite for Prisma-based embeddings |
| `apps/web/lib/ai/product-emebedding.ts` | Orphaned Ahioma embedding helper (typo in filename) | Remove |
| `apps/web/lib/ai/search.ts` | Hybrid search over products, orders, notifications, customers Supabase tables | Remove or rewrite for claims/messages search |
| `apps/web/lib/actions/resources.ts` | Server action referencing `@/lib/db/schema/resources` and `@/lib/db` | Remove |
| `apps/web/hooks/use-paystack.ts` | Full Paystack payment hook referencing non-existent `@/lib/paystack-service`, `@/lib/paystack`, `@/lib/payment-utils` | Remove |
| `apps/web/lib/ai-provider.ts` | Vercel AI SDK wrapper (`@ai-sdk/openai`) -- `@ai-sdk/openai` is not in the web app's `package.json` dependencies | Remove or add dependency if AI SDK will be used client-side |

---

## Test Files

The following test files exist in the codebase:

| File | Coverage |
|------|----------|
| `apps/api/src/index.test.ts` | Chat upload limits defaults, webhook status mapper |
| `packages/trpc/src/index.test.ts` | `health.ping` returns ok (full context mock) |
| `packages/emails/src/index.test.ts` | Email provider reports resend, verify template includes OTP |
| `apps/web/lib/site.test.ts` | `getMetadataBase` falls back to localhost |

All tests use Node.js built-in test runner (`node:test`) via `tsx --test`.

---

## Conclusion

This specification describes the TruthSentry AI fact-checking chatbot as implemented in the monorepo. Key architectural decisions:

1. **Structured fact-checking data model** - Rich metadata per claim: source attribution, platform, topic, location, language, and granular verdicts
2. **Monorepo with clear package boundaries** - UI, API, database, email, and tRPC as separate packages
3. **Claim-centric pipeline** - Claims flow from PENDING through AI analysis to a specific verdict (verified, debunked, misleading, partially_true)
4. **Context-aware AI** - System prompt dynamically includes claim metadata (source, platform, topic, location) for better verification accuracy
5. **Direct OpenAI fetch** - Simple, no SDK wrapper on the API side for maximum control
6. **Multi-media evidence** - Supports text, image, video, audio claims and combinations via Supabase Storage
7. **Email-driven lifecycle** - Users are notified at submission and when verification completes
8. **Extensible language support** - Per-claim language tracking, architecture ready for French, Fula/Peul, and additional languages
9. **Human review fallback** - Claims the AI cannot confidently assess remain PENDING for manual review

For the main codebase, see `/Users/pro/Documents/ProjectPacepard/clients/TruthSentry`.
