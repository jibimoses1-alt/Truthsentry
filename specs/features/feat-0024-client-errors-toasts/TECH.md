# feat-0024: Tech Spec — Client errors and toasts

## Context

See [`PRODUCT.md`](./PRODUCT.md).

## Module map

| File | Role |
|------|------|
| `apps/web/lib/api-error.ts` | `getApiErrorMessage(error, t)` — TRPCClientError + code lookup |
| `apps/web/hooks/use-api-toast.ts` | `translateError`, `notifyApiException` |
| `apps/web/lib/api-toast.ts` | Low-level toast emitters (coss `toast`) |
| `apps/web/components/app-toast-providers.tsx` | Toaster mount in locale layout |
| `apps/web/messages/ar.json` | `errors.*` keys |
| `apps/web/messages/en.json` | `errors.*` keys |

## Resolution algorithm

```text
TRPCClientError
  → zod fieldErrors? → join field: message (English)
  → else shape.message or error.message
  → if /^[A-Z][A-Z0-9_]+$/ → t(`errors.${code}`) if not missing
  → else raw message or t('errors.generic')
```

## Server code sources

| Router | File | Example codes |
|--------|------|---------------|
| auth | `packages/trpc/src/routers/auth.ts` | `AUTH_EMAIL_IN_USE`, `AUTH_INVALID_CREDENTIALS` |
| claim | `packages/trpc/src/routers/claim.ts` | `CLAIM_NOT_FOUND`, `CLAIM_RATE_LIMIT` |
| guards | `packages/trpc/src/guards.ts` | `AUTH_EMAIL_NOT_VERIFIED`, `AUTH_ADMIN_REQUIRED` |

**Gap:** some `claim.ts` throws still use French literal strings — not mapped by `api-error.ts`.

## Consumer inventory

| Consumer | Pattern |
|----------|---------|
| `sign-in-form.tsx` | `useApiToast` + `notifyApiException` |
| `sign-up-form.tsx` | Legacy French — migrate |
| `verify-email-form.tsx` | Legacy |
| `reset-password-form.tsx` | Mixed |
| `chat-page-client.tsx` | `notifyApiWarning`, hard-coded French |

## tRPC client

`apps/web/components/trpc-provider.tsx` — does not global-handle errors; each mutation handles locally or via hook.

`apps/web/lib/fetch-with-retry.ts` — retries fetch; errors still surface as TRPCClientError at link layer.

## Known gaps

| Gap | Severity | Fix |
|-----|----------|-----|
| French server upload errors | High | Replace with `CLAIM_UPLOAD_*` codes |
| Chat/upload French toasts | High | `useTranslations('chat')` |
| Zod messages English only | Medium | Optional zod i18n map |
| Dual `api-toast` vs `useApiToast` | Low | Deprecate direct imports in forms |
| No central `onError` in trpc provider | Low | Optional global 401 redirect |

## Testing and validation

| Test | Location |
|------|----------|
| Code pattern regex | Manual / unit test `api-error.ts` |
| Sign-in wrong password | E2E `/ar/sign-in` toast Arabic |
| Missing translation key | Falls back to raw code string |

```bash
pnpm --filter @truthsentry/web typecheck
```

## Related

- [feat-0003 TECH](../feat-0003-api-trpc/TECH.md)
- [feat-0007 TECH](../feat-0007-i18n/TECH.md)
