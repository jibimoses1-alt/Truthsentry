# feat-0024: Client API errors and toasts

## Summary

The web app surfaces API failures through a **stable error-code contract**: tRPC procedures throw with `message` set to codes like `AUTH_INVALID_CREDENTIALS` or `CLAIM_RATE_LIMIT`; the client maps codes to **localized strings** in `messages/{ar,en}.json` via **`getApiErrorMessage`** and **`useApiToast`**. Success, warning, and info toasts use the same coss toast stack (`app-toast-providers.tsx`).

Complements [feat-0003](../feat-0003-api-trpc/PRODUCT.md) (server codes), [feat-0007](../feat-0007-i18n/PRODUCT.md) (translations), [feat-0016](../feat-0016-rate-limiting/PRODUCT.md) (rate limit codes).

## Problem

Mixed French hard-coded toasts, raw English server strings, and legacy `notifyApiError` calls create inconsistent UX and break ar/en parity. Without one spec, new procedures ship without client translation keys.

## Non-goals

- Toast notifications for realtime events (feat-0013).
- Server-side i18n of Zod field messages (English field errors today).
- Push notifications or email for errors.
- Sentry/error reporting integration (feat-0021).

## Actors

| Actor | Description |
|-------|-------------|
| **End user** | Sees localized toast title + description on failure. |
| **Developer** | Adds `errors.NEW_CODE` to both locale files when adding server codes. |

## Error code contract

| Pattern | Example | Server sets |
|---------|---------|-------------|
| `AUTH_*` | `AUTH_INVALID_CREDENTIALS` | `auth.ts` |
| `CLAIM_*` | `CLAIM_RATE_LIMIT` | `claim.ts` |
| `SESSION_*` / guards | `AUTH_SIGN_IN_REQUIRED` | `guards.ts`, `core.ts` |
| HTTP meta | `TOO_MANY_REQUESTS` | rate limit |

Client: if `message` matches `/^[A-Z][A-Z0-9_]+$/`, look up `errors.{code}` in next-intl.

## Use case catalog

### A. tRPC errors

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-E01** | Wrong password | Sign-in | `auth.login` → `AUTH_INVALID_CREDENTIALS` | Toast in ar/en |
| **UC-E02** | Rate limited register | 4th register/hour | `AUTH_RATE_LIMIT_REGISTER` | Localized toast |
| **UC-E03** | Claim rate limit | 6th create/min | `CLAIM_RATE_LIMIT` | Toast |
| **UC-E04** | Zod validation | Invalid email | Field errors joined | **English** field text today |
| **UC-E05** | Unknown error | Network offline | `TRPCClientError` without code | `errors.generic` or `errors.unexpected` |

### B. Toast variants

| ID | Use case | API | User sees |
|----|----------|-----|-----------|
| **UC-E10** | Success | `notifyApiSuccess` | Green toast (e.g. copy success) |
| **UC-E11** | Warning | `notifyApiWarning` | Empty composer, offline |
| **UC-E12** | Info | `notifyApiInfo` | Neutral |
| **UC-E13** | Exception helper | `notifyApiException(error)` | Title from `errors.requestFailed` + translated body |

### C. Migration gaps

| ID | Use case | Location | Status |
|----|----------|----------|--------|
| **UC-E20** | Sign-in form | `sign-in-form.tsx` | **Uses `useApiToast`** |
| **UC-E21** | Sign-up form | `sign-up-form.tsx` | **French hard-coded** — gap |
| **UC-E22** | Chat errors | `chat-page-client.tsx` | Mixed French + partial i18n |
| **UC-E23** | Upload validation toasts | `chat-page-client.tsx` | French strings |
| **UC-E24** | Claim router upload errors | Server French strings | Not codes — gap (feat-0003) |

### D. Legacy dual path

| ID | Use case | Expected |
|----|----------|----------|
| **UC-E30** | `api-toast.ts` direct calls | Still used by some forms; prefer `useApiToast` |
| **UC-E31** | `notifyApiError` without translation | Migrate to `notifyApiException` |

## Behavior (product rules)

1. **New server errors** must use stable `SCREAMING_SNAKE` codes, not French sentences.
2. **Every new code** requires `errors.{CODE}` in **both** `ar.json` and `en.json`.
3. **User-facing validation** on client should use translations before submit where possible.
4. **429 / rate limit:** show actionable copy (“try again later”), not stack traces.
5. **Do not** expose `AI_API_KEY`, stack traces, or internal paths in toast description.

## Open questions

1. Namespace `errors` vs split `auth.errors`? **Default:** keep flat `errors.*` for grep simplicity.
2. Auto-retry toast for 429 with countdown? **Default:** future; feat-0016.
3. Unify chat French toasts in one migration PR? **Default:** yes with feat-0007.

## Related

- [feat-0007 PRODUCT](../feat-0007-i18n/PRODUCT.md)
- [feat-0004 PRODUCT](../feat-0004-auth/PRODUCT.md)
- `apps/web/messages/en.json` — `errors` namespace
- `apps/web/lib/api-error.ts`
