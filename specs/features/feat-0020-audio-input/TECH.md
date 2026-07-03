# feat-0020: Tech Spec — Voice input

## Context

See [`PRODUCT.md`](./PRODUCT.md). Browser audio capture + **server-side** Whisper via `claim.transcribeAudio`.

## Module map

| File | Role |
|------|------|
| `apps/web/hooks/use-audio-recording.ts` | Recording lifecycle, timers, transcribe callback |
| `apps/web/lib/audio-utils.ts` | `recordAudio(stream)` MediaRecorder wrapper |
| `apps/web/components/chat-page-client.tsx` | `transcribeAudio` impl, `toggleListening` on composer |
| `apps/web/lib/language-detection.ts` | `detectUserLanguage` (not used by Whisper yet) |

## Configuration (`use-audio-recording.ts`)

```ts
export const AUDIO_CONFIG = {
  preferredMimeType: 'audio/webm;codecs=opus',
  fallbackMimeTypes: ['audio/ogg;codecs=opus', 'audio/mp4'],
  chunkInterval: 1_000,
  maxDuration: 120,
  maxFileSize: 10 * 1024 * 1024,
} as const;
```

## `recordAudio` (`audio-utils.ts`)

| Step | Behavior |
|------|----------|
| Start | `MediaRecorder` with `audio/webm;codecs=opus`, 1s timeslice |
| Stop | `recordAudio.stop()` stops recorder; resolves `Blob` |
| Error | Rejects with `MediaRecorder error` |

## Hook API

| Export | Type |
|--------|------|
| `isListening` | boolean |
| `isSpeechSupported` | `mediaDevices` + `transcribeAudio` |
| `isRecording` | boolean |
| `isTranscribing` | boolean |
| `audioStream` | `MediaStream \| null` |
| `duration` | seconds |
| `toggleListening` | start/stop |
| `stopRecording` | async stop + transcribe |

## Chat integration (`chat-page-client.tsx`)

```ts
useAudioRecording({
  transcribeAudio: async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ar');
    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? ''}` },
      body: formData,
    });
    const data = await resp.json();
    return data.text ?? '';
  },
  onTranscriptionComplete: (text) => {
    setComposer((prev) => (prev ? `${prev} ${text}` : text));
  },
});
```

Composer props (from feat-0011): passes `isRecording`, `isTranscribing`, `isSpeechSupported`, `toggleListening` into `ChatComposer` / `@truthsentry/ui` chat kit.

## Environment

| Variable | Where | Risk |
|----------|-------|------|
| `NEXT_PUBLIC_OPENAI_API_KEY` | Browser bundle | **Exposed to end users** |
| `AI_API_KEY` | `apps/api` server only | Correct pattern for chat AI |

`.env.example` should **not** encourage public OpenAI keys for production.

## Target architecture (not implemented)

```text
Browser → POST /trpc/claim.transcribeAudio (multipart)
       → apps/api validates session + rate limit + size
       → OpenAI Whisper with AI_API_KEY
       → return { text }
```

Reuse `validateUploadFile` patterns from `packages/trpc/src/upload-validation.ts` for audio MIME whitelist.

## Known gaps

| Gap | Severity | PRODUCT ref |
|-----|----------|-------------|
| Client-side OpenAI key | **Critical** | UC-D30 |
| Whisper `language=ar` always | Medium | UC-C21 |
| No server rate limit on transcribe | Medium | feat-0016 |
| No audio attachment on claim | Low | Non-goals |
| Error UX minimal | Low | UC-E40 |
| `packages/ui` mic button a11y labels | Low | feat-0011 |

## Testing and validation

| Case | Expected |
|------|----------|
| Grant mic → speak → stop | Composer text non-empty |
| Deny permission | Recording resets |
| 121s recording | Auto-stop at 120s |

No automated tests for MediaRecorder in CI.

```bash
pnpm --filter @truthsentry/web typecheck
```

Manual: confirm Network tab shows direct `api.openai.com` call from browser (documents gap).

## Related

- [feat-0011 TECH](../feat-0011-chat-messaging/TECH.md)
- [feat-0016 TECH](../feat-0016-rate-limiting/TECH.md)
- [feat-0015 TECH](../feat-0015-claims-ai/TECH.md)
- `apps/web/hooks/use-audio-recording.ts`
