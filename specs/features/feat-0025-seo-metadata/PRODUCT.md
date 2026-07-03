# feat-0025: SEO, metadata, and PWA

## Summary

TruthSentry exposes **locale-aware metadata**, **Open Graph / Twitter** images, **robots** policy, **sitemap**, **web app manifest**, and **JSON-LD** for the marketing app. Indexing is **production-only** (`VERCEL_ENV === 'production'`). Chat and legal stubs use **`noindex`**. Copy for titles/descriptions comes from **`messages/{locale}/metadata`** where migrated; root OG routes use English fallbacks from `site.ts`.

Complements [feat-0008](../feat-0008-landing/PRODUCT.md), [feat-0007](../feat-0007-i18n/PRODUCT.md), [feat-0017](../feat-0017-legal/PRODUCT.md), [feat-0009](../feat-0009-theme-branding/PRODUCT.md).

## Problem

Campaign links and organic search need correct locale URLs, hreflang alternates, and share cards. Without a dedicated spec, metadata drifts (weak JSON-LD description, duplicate French stubs indexed, chat indexed by mistake).

## Non-goals

- Blog or CMS-driven content pages.
- Per-claim public share URLs.
- AMP or separate mobile domain.
- Server-side analytics pixels (marketing tags).

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Sees correct title/snippet in search and social previews. |
| **Crawler** | Respects robots; discovers `/ar` and `/en` landing URLs. |
| **Operator** | Sets `NEXT_PUBLIC_APP_URL` for canonical and OG absolute URLs. |

## Surface catalog

| Surface | Route / file | Index? |
|---------|--------------|--------|
| Marketing home | `/[locale]/` | Yes (production) |
| Sign-in / sign-up | `/[locale]/sign-in`, etc. | Typically noindex (verify per page metadata) |
| Chat | `/[locale]/chat` | **noindex** |
| Legal stubs | `/[locale]/legal/*` | **noindex, follow** |
| OG image | `app/opengraph-image.tsx` | Generated |
| Twitter image | `app/twitter-image.tsx` | Generated |
| Favicon | `app/icon.tsx`, `apple-icon.tsx` | — |
| Manifest | `app/manifest.ts` | PWA install metadata |

## Use case catalog

### A. Indexing policy

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-S01** | Production landing indexed | `VERCEL_ENV=production` | `shouldAllowIndexing()` true | `robots.ts` allows |
| **UC-S02** | Preview/staging not indexed | Vercel preview | `shouldAllowIndexing()` false | Disallow all |
| **UC-S03** | Chat not indexed | Crawler hits `/en/chat` | Page metadata `robots: noindex` | Chat not in SERP |

### B. Locale metadata

| ID | Use case | Expected |
|----|----------|----------|
| **UC-S10** | Arabic landing title | `getSiteMetadata('ar')` from messages |
| **UC-S11** | English landing title | `getSiteMetadata('en')` |
| **UC-S12** | `hreflang` / alternates | `openGraphAlternateLocale` in metadata |
| **UC-S13** | Canonical URL | `/{locale}` on marketing page |

### C. Social sharing

| ID | Use case | Expected |
|----|----------|----------|
| **UC-S20** | OG image generates | `opengraph-image.tsx` 1200x630 |
| **UC-S21** | Absolute URLs | `getMetadataBase()` from `NEXT_PUBLIC_APP_URL` |
| **UC-S22** | Brand icon in manifest | `siteIconPath` `/truthsentry-icon.png` |

### D. Structured data

| ID | Use case | Expected |
|----|----------|----------|
| **UC-S30** | JSON-LD on landing | `buildJsonLd({ locale, description })` |
| **UC-S31** | Description fallback gap | **Today:** `description` may fall back to `siteName` only — **gap** |

### E. Sitemap

| ID | Use case | Expected |
|----|----------|----------|
| **UC-S40** | Public paths listed | `sitemap.ts` includes locales + legal paths |
| **UC-S41** | noindex pages in sitemap | Legal URLs listed but noindex — intentional link graph |

## Behavior (product rules)

1. **`NEXT_PUBLIC_APP_URL`** must be set in staging/production for correct canonicals.
2. **Default locale** `ar` reflected in JSON-LD `url` when not overridden.
3. **Do not index** authenticated product surfaces (chat).
4. **Legal stubs** stay noindex until counsel-approved copy (feat-0017).
5. Metadata strings live in **message catalogs**, not hard-coded in `page.tsx` (migrate remaining French).

## Open questions

1. Index sign-in for branded queries? **Default:** noindex auth pages.
2. Fix `buildJsonLd` to always pass translated description? **Default:** yes.
3. Add `hreflang` link elements explicitly in layout? **Default:** verify next-intl metadata API.

## Related

- [feat-0008 PRODUCT](../feat-0008-landing/PRODUCT.md)
- [feat-0017 PRODUCT](../feat-0017-legal/PRODUCT.md)
- `apps/web/lib/site.ts`
- `apps/web/app/sitemap.ts`, `robots.ts`, `manifest.ts`
