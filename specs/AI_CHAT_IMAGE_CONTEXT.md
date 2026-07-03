# AI Chat Media, Evidence, and Fact-Check Context Integration

> **Implementation status:** Image **upload and display** are live ([feat-0012](./features/feat-0012-chat-uploads/PRODUCT.md)). **Vision / multimodal AI is not implemented** — see [feat-0023](./features/feat-0023-ai-image-context/PRODUCT.md). Sections below describing images in the OpenAI request describe the **target**, not current code.

## Overview

This document explains how the TruthSentry fact-checking chat system handles multi-media evidence (text, image, video, audio), enriched claim context (source, platform, topic, location), and AI-generated verification responses. Users submit claims with structured metadata, attach evidence files via Supabase Storage, and the AI receives the full claim context to produce accurate fact-check verdicts.

## How It Works

### 1. Frontend: Chat Page Client (`components/chat-page-client.tsx`)

The chat client handles:
- **Thread management**: Listing, creating, and switching between claim threads
- **Message composition**: Text input with optional image attachments
- **Image upload**: Requests a signed URL from the API, uploads directly to Supabase Storage
- **Message display**: Renders text content and image attachments in chat bubbles
- **Typing indicator**: Shows animation while the AI generates a reply

### 2. Backend: tRPC Claim Router (`packages/trpc/src/routers/claim.ts`)

The claim router:
- **Creates claims** with structured metadata (source, platform, topic, location, language, media type) and an initial user message
- **Appends messages** to existing claim threads (with idempotency via `clientReqId`)
- **Generates signed upload URLs** via Supabase Storage for secure evidence uploads
- **Triggers AI generation** through the fact-check pipeline, passing full claim context
- **Stores attachments** as JSON on `ClaimMessage.attachments`
- **Records fact-check verdicts** (verified, debunked, misleading, partially_true) on the Claim model

### 3. AI Generation (`apps/api/src/index.ts`)

The API server:
- **Builds enriched context** from claim metadata (source name/type, platform, topic, location, language, claim date)
- **Receives the last 20 messages** from the claim thread
- **Sends to OpenAI** with a dynamic system prompt that includes claim metadata
- **Returns the assistant response** which is saved as a `ClaimMessage` and parsed for a verdict
- **Handles failures** with a fallback system message in French; claim stays PENDING for human review

### 4. Supabase Storage Integration

The evidence upload pipeline:
- **Bucket**: `chat-uploads` (private, signed URLs only)
- **Path format**: `claims/{claimId}/{timestamp}-{safeName}` (timestamp prevents collisions, safeName strips non-alphanumeric chars)
- **Size limit**: 5 MB (configurable via `CHAT_IMAGE_MAX_BYTES`)
- **Allowed types**: PNG, JPEG, WebP (expandable for video/audio in future)

### 5. Claim Media Types

Claims can contain multiple forms of evidence. The `mediaType` field on the Claim model tracks the primary format:

| Media Type | Description |
|------------|-------------|
| `TEXT` | Text-only claim (default) |
| `IMAGE` | Image evidence (screenshot, photo) |
| `VIDEO` | Video clip |
| `AUDIO` | Audio recording |
| `TEXT_IMAGE` | Text claim with supporting image(s) |
| `TEXT_VIDEO` | Text claim with supporting video |
| `TEXT_AUDIO` | Text claim with supporting audio |

## Evidence Upload Flow

```
User selects evidence file in ChatComposer (image, screenshot, document photo)
    |
    v
Client calls claim.requestUpload (tRPC mutation)
    |-- Validates: file type, size, claim ownership
    |-- Returns: { signedUrl, publicUrl }
    |
    v
Client uploads file to signedUrl (PUT request to Supabase Storage)
    |
    v
Client includes publicUrl in message attachments
    |
    v
Client calls claim.appendUserMessage (or claim.create for first message)
    |-- content: "Here is the tweet screenshot"
    |-- attachments: [{ url: publicUrl, type: "image/jpeg", name: "tweet-screenshot.jpg" }]
    |-- (On create: also includes metadata: sourceName, sourceType, platform, etc.)
    |
    v
ClaimMessage saved with attachments JSON
Claim mediaType updated if evidence changes the type (e.g., TEXT -> TEXT_IMAGE)
    |
    v
Client calls claim.generateAssistantReply
    |-- AI receives: system prompt with claim metadata + thread messages
    |-- AI responds with fact-check analysis and verdict
    |
    v
Claim updated with: factCheckText, factCheckStatus, factCheckDate
    |
    v
ChatMessageBubble renders:
    |-- Text content (fact-check analysis)
    |-- Evidence thumbnails from attachments
    |-- Verdict badge (verified, debunked, misleading, partially_true)
```

## Attachment Data Model

### ClaimMessage.attachments Schema

Attachments are stored as a JSON array on the `ClaimMessage` model.

**Current schema** (as defined in `packages/trpc/src/schemas.ts` `chatMessageInput`):

```json
[
  {
    "url": "https://xxx.supabase.co/storage/v1/object/sign/chat-uploads/claim_id/1715500800000-photo.jpg?token=...",
    "mimeType": "image/jpeg",
    "sizeBytes": 245760
  }
]
```

**Target schema** (richer, with display-friendly fields):

```json
[
  {
    "url": "https://xxx.supabase.co/storage/v1/object/sign/chat-uploads/claim_id/1715500800000-photo.jpg?token=...",
    "mimeType": "image/jpeg",
    "sizeBytes": 245760,
    "name": "photo.jpg"
  }
]
```

> **Note**: The current `chatMessageInput` Zod schema validates `{ url, mimeType, sizeBytes }`. The `name` field is not yet included but is planned. When referencing attachments in the UI, extract the display name from the URL or add `name` to the schema.

### Prisma Schema (Relevant Models)

```prisma
model Claim {
  id              String           @id @default(cuid())
  claimText       String           // The exact statement being fact-checked
  claimLanguage   String           @default("fr")
  claimDate       DateTime?
  sourceName      String?          // Who made the claim
  sourceType      SourceType?      // politician, media, social_media, blog, ngo, citizen
  sourceUrl       String?          // Link to the original claim
  mediaType       MediaType        @default(TEXT)   // text, image, video, audio, combinations
  topicCategory   TopicCategory?   // politics, health, finance, tech, etc.
  location        String?          // Country or region
  platform        String?          // twitter, whatsapp, facebook, tv, etc.
  factCheckText   String?          // AI or reviewer verification output
  factCheckStatus FactCheckStatus  @default(PENDING)
  factCheckDate   DateTime?
  createdByUserId String
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  // ... relations
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

## Signed URL Upload Flow

### Step 1: Request Upload URL

```typescript
// Client-side
// Current API returns { uploadPath, uploadUrl } (not signedUrl/publicUrl)
const { uploadUrl, uploadPath } = await trpc.claim.requestUpload.mutate({
  claimId: 'claim_abc123',
  filename: 'evidence.jpg',
  mimeType: 'image/jpeg',
});
```

> **Note**: The current `createSignedUploadUrl` context function returns `{ uploadPath, uploadUrl }`. The spec uses `{ signedUrl, publicUrl }` as the target naming convention. See AI_CHATBOT_SPEC.md "Current vs Target State" for the full mapping.

### Step 2: Upload File to Signed URL

```typescript
// Client-side - direct upload to Supabase Storage
await fetch(signedUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type },
});
```

### Step 3: Include in Message

```typescript
// Client-side
await trpc.claim.appendUserMessage.mutate({
  claimId: 'claim_abc123',
  content: 'Here is the document I want to verify',
  clientRequestId: crypto.randomUUID(),
  attachments: [
    {
      url: publicUrl,
      type: 'image/jpeg',
      name: 'evidence.jpg',
    },
  ],
});
```

### Server-Side: requestUpload Procedure

```typescript
// packages/trpc/src/routers/claim.ts
requestUpload: protectedProcedure
  .input(
    z.object({
      claimId: z.string().cuid(),
      filename: z.string().min(1).max(255),
      mimeType: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    requireVerifiedEmail(ctx);

    // Validate claim ownership
    const claim = await ctx.prisma.claim.findUnique({
      where: { id: input.claimId, createdByUserId: ctx.sessionUser!.id },
    });
    if (!claim) throw new TRPCError({ code: 'NOT_FOUND' });

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(input.mimeType)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unsupported file type' });
    }

    // Create signed upload URL via Supabase Storage
    const { signedUrl, publicUrl } = await ctx.createSignedUploadUrl({
      claimId: input.claimId,
      filename: input.filename,
      mimeType: input.mimeType,
    });

    return { signedUrl, publicUrl };
  }),
```

## AI Context Integration

### How Claim Metadata Feeds the AI

The AI receives a dynamically constructed system prompt that includes all available claim metadata. This gives the model important context about the source, platform, topic, and region to produce more accurate fact-check verdicts.

### System Prompt Construction

```typescript
const claimContext = [
  claim.sourceName && `Source: ${claim.sourceName} (${claim.sourceType ?? 'unknown'})`,
  claim.platform && `Platform: ${claim.platform}`,
  claim.sourceUrl && `Original URL: ${claim.sourceUrl}`,
  claim.topicCategory && `Topic: ${claim.topicCategory}`,
  claim.location && `Location: ${claim.location}`,
  claim.claimLanguage && `Claim language: ${claim.claimLanguage}`,
  claim.claimDate && `Claim date: ${claim.claimDate}`,
  claim.mediaType && `Media type: ${claim.mediaType}`,
]
  .filter(Boolean)
  .join('\n');
```

### Full Request (Sent to OpenAI)

```json
{
  "model": "gpt-4.1-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a fact-checking assistant for TruthSentry, helping users in Africa verify claims and combat misinformation.\n\n1. Analyze claims against known facts, context, and logical reasoning.\n2. Provide a clear verdict: verified, debunked, misleading, or partially_true.\n3. Cite reasoning and suggest authoritative sources.\n4. Be culturally aware of the African context.\n5. Respond in the claim's language when possible.\n\nClaim metadata:\nSource: @infos_guinee (social_media)\nPlatform: twitter\nOriginal URL: https://twitter.com/infos_guinee/status/123\nTopic: health\nLocation: Guinea\nClaim language: fr\nClaim date: 2026-05-10\nMedia type: text_image"
    },
    {
      "role": "user",
      "content": "Le nouveau centre de sante de Labe ouvrira le mois prochain."
    },
    {
      "role": "assistant",
      "content": "Verdict: PARTIALLY_TRUE\n\nLa construction d'un centre de sante a Labe a bien ete confirmee par le Ministere de la Sante en mars 2026. Cependant, aucune source officielle n'a confirme une date d'ouverture precise pour le mois prochain. Le calendrier reste conditionnel.\n\nSources suggerees:\n- Communique du Ministere de la Sante (mars 2026)\n- Prefecture de Labe"
    },
    {
      "role": "user",
      "content": "Voici une photo du chantier comme preuve."
    }
  ]
}
```

### Current Limitations

- The AI currently receives **text-only context**. Image attachments are stored and displayed in the chat UI, but not sent as image content to the model.
- Video and audio evidence is referenced by metadata only; the content is not transcribed or analyzed by the AI.

### Planned: Vision-Enabled Context

When vision support is enabled (using a vision-capable model), image attachments will be passed as multi-part content:

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "Voici une photo du chantier comme preuve." },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://xxx.supabase.co/storage/v1/object/sign/chat-uploads/claim_id/chantier.jpg?token=..."
      }
    }
  ]
}
```

### Planned: Audio/Video Transcription Pipeline

For audio and video evidence, a future pipeline will:
1. Accept the upload (same signed URL flow)
2. Transcribe the content using Whisper API (audio) or a video-to-text service
3. Inject the transcription into the thread as additional user context
4. Pass to the AI for fact-checking alongside the original claim

## Frontend Rendering

### ChatMessageBubble

The `ChatMessageBubble` component in `packages/ui/src/components/chat/` renders text, evidence attachments, and (for assistant messages on resolved claims) a verdict badge:

```typescript
// Simplified rendering logic
function ChatMessageBubble({ role, content, attachments, createdAt, verdict }) {
  return (
    <div className={bubbleStyles[role]}>
      {/* Verdict badge for fact-check responses */}
      {verdict && role === 'ASSISTANT' && (
        <span className={verdictStyles[verdict]}>
          {verdictLabels[verdict]}
        </span>
      )}

      {/* Text content */}
      <div className="prose">{content}</div>

      {/* Evidence attachments */}
      {attachments?.length > 0 && (
        <div className="flex gap-2 mt-2">
          {attachments.map((att) => (
            <a href={att.url} target="_blank" rel="noopener noreferrer" key={att.url}>
              <img
                src={att.url}
                alt={att.name}
                className="max-w-48 rounded-lg border"
              />
            </a>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <time className="text-xs opacity-50">{formatTime(createdAt)}</time>
    </div>
  );
}

const verdictStyles: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium',
  DEBUNKED: 'bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-medium',
  MISLEADING: 'bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-medium',
  PARTIALLY_TRUE: 'bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-medium',
  PENDING: 'bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium',
};

const verdictLabels: Record<string, string> = {
  VERIFIED: 'Verifie',
  DEBUNKED: 'Dementi',
  MISLEADING: 'Trompeur',
  PARTIALLY_TRUE: 'Partiellement vrai',
  PENDING: 'En attente',
};
```

### Claim Metadata Display

When viewing a claim thread, the UI can display a metadata header showing the claim's source, platform, topic, and location:

```typescript
function ClaimMetadataHeader({ claim }) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-2 text-xs text-gray-500 border-b">
      {claim.sourceName && <span>Source: {claim.sourceName}</span>}
      {claim.platform && <span>Plateforme: {claim.platform}</span>}
      {claim.topicCategory && <span>Sujet: {claim.topicCategory}</span>}
      {claim.location && <span>Lieu: {claim.location}</span>}
      {claim.claimLanguage && <span>Langue: {claim.claimLanguage}</span>}
    </div>
  );
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_STORAGE_BUCKET_CHAT_UPLOADS` | `chat-uploads` | Storage bucket name |
| `CHAT_IMAGE_MAX_BYTES` | `5242880` (5 MB) | Maximum upload file size |
| `CHAT_ALLOWED_IMAGE_MIME_TYPES` | `image/png,image/jpeg,image/webp` | Comma-separated allowed types |

### Supabase Storage Bucket Setup

Create the `chat-uploads` bucket in Supabase Dashboard:
1. Navigate to Storage in the Supabase Dashboard
2. Create bucket named `chat-uploads`
3. Set access to private (signed URLs only)
4. Configure file size limit to 5 MB
5. No RLS policies needed (uploads use service role via signed URLs)

## Example Interactions

### Example 1: Political claim from Twitter

**Claim metadata:**
- Source: @ministre_sante_gn (politician)
- Platform: twitter
- Topic: health
- Location: Guinea
- Language: fr

**User:** "Le ministre a annonce que 500 000 doses de vaccin sont arrivees a Conakry."

**AI Response (verdict: PARTIALLY_TRUE):**
```
Verdict: PARTIALLY_TRUE

Le Ministere de la Sante a effectivement annonce une livraison de vaccins a Conakry
en avril 2026. Cependant, le chiffre officiel mentionne 350 000 doses, pas 500 000.
Le chiffre de 500 000 semble exagere ou confondu avec un objectif futur.

Sources suggerees:
- Communique officiel du Ministere de la Sante (12 avril 2026)
- OMS Guinee - rapport de livraison de vaccins
```

### Example 2: WhatsApp forward with screenshot

**Claim metadata:**
- Source: Unknown (citizen)
- Platform: whatsapp
- Topic: finance
- Location: West Africa
- Media type: text_image

**User uploads a screenshot and asks:** "Ce message circule sur WhatsApp. Est-ce que la BCRG va changer les billets?"

**Chat Display:**
- User message with text and screenshot thumbnail
- AI response with verdict

```
Verdict: DEBUNKED

Ce message est une fausse information qui circule regulierement sur WhatsApp.
La Banque Centrale de la Republique de Guinee (BCRG) n'a fait aucune annonce
concernant un changement de billets. Ce type de rumeur est souvent utilise pour
creer la panique.

Je n'ai pas pu analyser l'image directement. Si elle contient des details
supplementaires, veuillez les decrire et je pourrai affiner ma verification.

Sources suggerees:
- Site officiel de la BCRG (bcrg-guinee.org)
- Dementi de la BCRG sur les reseaux sociaux
```

### Example 3: Health claim in Fula

**Claim metadata:**
- Source: Radio communautaire (media)
- Platform: radio
- Topic: health
- Location: Labe, Guinea
- Language: ff

**User:** "Nawdi COVID heɓtii kadi e Labe, yimɓe 20 nawtaama."

**AI Response (verdict: PENDING):**
```
Mi waawaa tabbinde walla waɗɗinde ndee haala jooni. Mi alaa seedamfaagal
laaɓtungal dow COVID e Labe e ñalawma hannde.

Mi wasiyii on ƴeewde:
- Lowre OMS Gine
- Wasiyaaji Ministere Cellal

Ndee haala tottaama yimɓe ƴeewndotooɓe goonga yoo ƴeewndoo ɗum.
```

*(Claim remains PENDING -- queued for human review due to insufficient AI confidence.)*

## Existing Audio and Language Infrastructure

The following are already implemented in `apps/web/` and available for integration with the media handling pipeline:

### Audio Recording (`hooks/use-audio-recording.ts` + `lib/audio-utils.ts`)
- `useAudioRecording` hook with states: `isListening`, `isRecording`, `isTranscribing`
- `recordAudio()` utility wrapping browser MediaRecorder API
- Codec: `audio/webm;codecs=opus`
- Accepts `transcribeAudio` callback and `onTranscriptionComplete` handler
- Ready to wire into the ChatComposer microphone button

### Language Detection (`lib/language-detection.ts`)
- `detectLanguageFromText(text)` -- uses `franc` library
- `getBrowserLanguage()` -- reads `navigator.language`
- `detectUserLanguage(textInput?, audioLanguage?)` -- hierarchical: audio > text > browser > default
- Currently maps to Igbo/Hausa/Yoruba (Ahioma legacy) -- needs remapping to French/Fula/English

### Auto-Scroll (`hooks/use-auto-scroll.ts`)
- `useAutoScroll(dependencies)` -- auto-scrolls message container to bottom unless user scrolls up
- Returns `containerRef`, `scrollToBottom`, `handleScroll`, `shouldAutoScroll`

---

## Troubleshooting

### Images Not Uploading
- Verify the Supabase Storage bucket `chat-uploads` exists
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly in the API environment
- Confirm file size is under the `CHAT_IMAGE_MAX_BYTES` limit
- Verify MIME type is in the allowed list

### Images Not Displaying
- Check that the signed URL has not expired
- Verify the `attachments` JSON is properly structured on the `ClaimMessage`
- Inspect browser network tab for 403/404 responses from Supabase Storage

### AI Not Responding
- Check `AI_API_KEY` is set and valid
- Verify `AI_MODEL` is a valid OpenAI model identifier
- Check API server logs for timeout errors (20-second limit)
- Confirm the claim status is not already RESOLVED or FAILED

### Claim Stuck in PROCESSING
- Check API server logs for uncaught errors in `generateAssistantReply`
- Verify OpenAI API is reachable from the deployment environment
- A stuck claim can be manually updated via Prisma Studio or direct SQL

## Best Practices

1. **Always capture claim metadata**: When creating a claim, collect as much structured metadata as possible (source, platform, topic, location, language). This significantly improves AI verification accuracy.
2. **Idempotent message creation**: Always pass a `clientRequestId` to prevent duplicate messages on network retries.
3. **Upload before send**: Complete the evidence upload before calling `appendUserMessage` with the attachment URL.
4. **Update mediaType on attachment**: When a user attaches an image to a text claim, update the claim's `mediaType` from `TEXT` to `TEXT_IMAGE`.
5. **Validate client-side**: Check file type and size before requesting a signed URL to avoid unnecessary API calls.
6. **Graceful AI failures**: The system saves a French fallback message and keeps the claim as PENDING for human review, ensuring users always see a response.
7. **Thread size management**: The AI context is limited to the last 20 messages to control token usage and cost.
8. **Verdict parsing**: Extract the verdict (verified, debunked, misleading, partially_true) from the AI response using a structured approach (regex or structured output) to update the `factCheckStatus` field.
9. **Source URL validation**: When a `sourceUrl` is provided, validate it is a well-formed URL before storing it.
10. **Language consistency**: The AI should respond in the claim's language (`claimLanguage`), not always in French or English.
