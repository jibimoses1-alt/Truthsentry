# feat-0020: Voice input (audio recording and Whisper)

## Summary

Chat composer supports **microphone capture** via `useAudioRecording`: record up to **120 seconds**, transcribe with **OpenAI Whisper** (`whisper-1`) through **`claim.transcribeAudio`** (server-side, `AI_API_KEY` only), append text to the composer. Language follows `detectUserLanguage` (`ar` / `en`).

Complements [feat-0011](../feat-0011-chat-messaging/PRODUCT.md) (composer), [feat-0007](../feat-0007-i18n/PRODUCT.md) (language; Whisper hard-coded `ar` today).

## Problem

Typing long claims on mobile is slow; voice is natural for WhatsApp-adjacent users. Client-side capture is implemented, but server-side transcription is required for production security and consistent language handling.

## Non-goals

- Server-side streaming STT in MVP fix (target: proxy upload endpoint).
- Voice messages as claim attachments (audio files not stored on claim).
- Dialectal Arabic ASR tuning.
- Offline on-device speech recognition.

## Actors

| Actor | Description |
|-------|-------------|
| **Claimant** | Toggles mic, speaks, reviews transcription in composer. |
| **Browser** | `getUserMedia`, `MediaRecorder`. |
| **OpenAI Whisper** | Transcription API (today: called from client). |

## Use case catalog

### A. Recording

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Start recording | Mic permission granted; `transcribeAudio` provided | Tap mic → `getUserMedia` → `recordAudio(stream)` | `isRecording` true; duration ticks |
| **UC-A02** | Stop recording manually | Recording active | Tap mic again → `stopRecording` | Stream tracks stopped |
| **UC-A03** | Auto-stop at max duration | Recording ≥ 120s | Timer calls `stopRecording` | Recording ends |
| **UC-A04** | Unsupported environment | No `mediaDevices` or no transcribe fn | `isSpeechSupported` false | Mic control hidden/disabled |
| **UC-A05** | Permission denied | User blocks mic | Error logged; recording state reset | No transcription |

### B. Transcription

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Transcribe to composer | Valid blob ≤ 10MB | POST Whisper with `language=ar` | Text appended to composer |
| **UC-B11** | Append to existing text | Composer non-empty | New text joined with space | User can edit before send |
| **UC-B12** | Oversized recording | Blob &gt; 10MB | `onError` size message | No transcription |
| **UC-B13** | Transcription loading | After stop | `isTranscribing` true | Composer may disable mic |

### C. Integration with send flow

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Send transcribed claim | User edits composer | Normal `handleSubmit` | Language detected from text ([feat-0015](../feat-0015-claims-ai/PRODUCT.md)) |
| **UC-C21** | English speech | Whisper `language=ar` | May mis-transcribe English | Gap: should use `detectUserLanguage` |

### D. Security and compliance

| ID | Use case | Expected today | Target |
|----|----------|----------------|--------|
| **UC-D30** | API key exposure | `NEXT_PUBLIC_OPENAI_API_KEY` in browser | **Server proxy only** |
| **UC-D31** | Audio leaves device | Sent to OpenAI from client | Server upload with auth |
| **UC-D32** | PII in audio | No retention policy in app | Document in privacy policy |

### E. Negative cases

| ID | Expected behavior |
|----|-------------------|
| **UC-E40** | Whisper HTTP error → empty or partial text; error logged |
| **UC-E41** | User navigates away mid-record → cleanup on unmount clears timers |
| **UC-E42** | Multiple rapid toggles | `activeRecordingRef` serialises one recording |

## Behavior (product rules)

1. **Max duration:** 120 seconds (`AUDIO_CONFIG.maxDuration`).
2. **Max file size:** 10 MiB (`AUDIO_CONFIG.maxFileSize`).
3. **Preferred MIME:** `audio/webm;codecs=opus` (`recordAudio` + `MediaRecorder`).
4. Transcription **does not auto-send** — only fills composer.
5. Whisper language parameter **hard-coded `ar`** in `chat-page-client.tsx` (English speech gap).

## Open questions

1. Replace with **`claim.transcribeAudio`** tRPC mutation? **Default:** yes before production.
2. Detect language from UI locale vs audio? **Default:** `detectUserLanguage` from `language-detection.ts`.
3. Show recording waveform / timer in UI? **Partial:** `duration` state exists; UI wiring in `ChatComposer`.

## Related

- [feat-0011 PRODUCT](../feat-0011-chat-messaging/PRODUCT.md)
- [feat-0015 PRODUCT](../feat-0015-claims-ai/PRODUCT.md) — `claimLanguage`
- `apps/web/hooks/use-audio-recording.ts`
- `apps/web/lib/audio-utils.ts`
- `apps/web/components/chat-page-client.tsx`
