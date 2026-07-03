# feat-0007: Internationalisation (ar / en, RTL)

## Summary

TruthSentry ships a **bilingual UI**: **Modern Standard Arabic (default)** and **English**, using **next-intl** with **locale-prefixed routes** (`/ar/…`, `/en/…`), **RTL layout** for Arabic, centralized **`messages/ar.json`** and **`messages/en.json`**, **middleware** for locale detection/redirect, and a **locale switcher** that preserves the current path. API email copy for auth follows **`x-locale`** (feat-0003).

Complements [feat-0001](../feat-0001-platform/PRODUCT.md) (Arabic-first program), [feat-0004](../feat-0004-auth/PRODUCT.md) (auth pages), [feat-0008](../feat-0008-landing/PRODUCT.md) (marketing).

**Implementation status:** Core i18n infrastructure **implemented**; **partial migration** — some auth/chat strings remain hardcoded French; claim emails French only (feat-0006 gap).

## Problem

Fact-check users arrive from Arabic-first campaigns. English must be first-class without duplicate route trees. RTL, fonts, and translated API errors must behave consistently or trust erodes.

## Non-goals

- Dialectal Arabic (Gulf, Maghrebi) — MSA only.
- French UI (legacy strings being removed).
- Automatic claim-language detection driving **UI** locale (claim text language is separate — `claimLanguage` field).
- RTL for email claim templates until localized (feat-0006).
- Crowdin / external TMS integration in MVP.

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Lands on `/` → redirected to default or negotiated locale. |
| **User** | Switches ar/en via `LocaleSwitcher`; expects same page. |
| **Developer** | Adds keys to both JSON message files. |

## Locales

| Code | Direction | Default? | Font |
|------|-----------|----------|------|
| `ar` | RTL | yes | Noto Sans Arabic |
| `en` | LTR | no | Inter (sans) |

Configured in `apps/web/i18n/routing.ts`: `localePrefix: 'always'`.

## Use case catalog

### A. Routing and middleware

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-I01** | Visit unprefixed path | `/` or `/chat` | `middleware.ts` redirects | `/{defaultLocale}/…` |
| **UC-I02** | Valid locale prefix | `/en/sign-in` | Page renders | `lang=en`, `dir=ltr` |
| **UC-I03** | Invalid locale | `/fr/chat` | `notFound()` in layout | 404 |
| **UC-I04** | Static params | Build time | `generateStaticParams` for locales | SSG locale segments |

### B. Messages and translations

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-I10** | Render translated page | Known namespace | `useTranslations` / `getTranslations` | Copy from `messages/{locale}.json` |
| **UC-I11** | API error toast | tRPC `message` code | `useApiToast` maps to `errors.AUTH_*` | Localized toast |
| **UC-I12** | Missing key | Dev oversight | next-intl fallback / console | Should be caught in review |
| **UC-I13** | Metadata i18n | `generateMetadata` | `getTranslations` per page | Localized title/description |

### C. RTL and typography

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-I20** | Arabic layout | `locale === 'ar'` | `<html dir="rtl">` + Arabic font class on body | Mirrored reading order |
| **UC-I21** | English layout | `locale === 'en'` | `dir=ltr`, `font-sans` | — |
| **UC-I22** | Theme + RTL | Dark mode | `ThemeProvider` under locale layout | Components use logical CSS where possible |

### D. Locale switcher

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-I30** | Switch ar → en | On any localized page | `router.replace(pathname, { locale: 'en' })` | Same path, new prefix |
| **UC-I31** | Switcher visible | Auth pages, chat top bar | `LocaleSwitcher` component | Toggles AR / EN buttons |
| **UC-I32** | API locale sync | After switch | `TrpcProvider` receives new `locale` prop | `x-locale` header updates |

### E. Navigation helpers

| ID | Use case | Expected behavior |
|----|----------|-------------------|
| **UC-I40** | `Link` from `@/i18n/navigation` | Href includes current locale |
| **UC-I41** | `router.push('/chat')` | Resolves to `/{locale}/chat` |
| **UC-I42** | Raw `next/navigation` | **Avoid** — breaks prefix (gap in some forms) |

### F. Gaps (partial i18n)

| ID | Surface | Status |
|----|---------|--------|
| **UC-I50** | `sign-up-form.tsx` | French hardcoded |
| **UC-I51** | `verify-email-form.tsx` | French hardcoded |
| **UC-I52** | `chat-page-client.tsx` home columns / verdict labels | French hardcoded |
| **UC-I53** | Claim email templates | French (feat-0006) |

## Behavior (product rules)

1. **Default locale `ar`** — URLs always show prefix (`/ar/`, `/en/`).

2. **Single message catalog per locale** — parity required: add keys to **both** `ar.json` and `en.json`.

3. **Auth errors** — stable codes in API; human text only from message files.

4. **Password reset links** must use active UI locale in path (feat-0004).

5. **No locale in cookie** for MVP — locale is path-driven; switcher changes URL.

6. **MSA** in Arabic JSON — avoid dialect labels in product copy.

## Open questions

1. **Accept-Language** negotiation vs always default `ar` for `/`?

2. **Complete French removal** — track remaining strings in grep pass?

3. **Locale in sitemap** — `apps/web/app/sitemap.ts` includes both locales?

## Related

- [feat-0001 PRODUCT](../feat-0001-platform/PRODUCT.md)
- [feat-0003 PRODUCT](../feat-0003-api-trpc/PRODUCT.md)
- [feat-0004 PRODUCT](../feat-0004-auth/PRODUCT.md)
- [feat-0006 PRODUCT](../feat-0006-email/PRODUCT.md)
- [feat-0008 PRODUCT](../feat-0008-landing/PRODUCT.md)
- `apps/web/i18n/`
- `apps/web/messages/`
