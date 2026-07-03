# feat-0017: Legal pages (privacy and terms)

## Summary

Locale-prefixed **marketing legal routes** expose **privacy** and **terms of use** pages. Current implementation is **stub content** (placeholder copy in French) with **`noindex, follow`** robots metadata. Footer links on the landing page point to these URLs. Production launch requires counsel-approved text before removing stub messaging.

Complements [feat-0008](../feat-0008-landing/PRODUCT.md) (marketing), [feat-0007](../feat-0007-i18n/PRODUCT.md) (locale routing).

## Problem

Users and regulators expect discoverable privacy and terms links from the marketing site. Shipping without pages blocks footer completeness; shipping false legal text creates liability. Stubs document the route contract while legal copy is pending.

## Non-goals

- Cookie consent banner (see [feat-0019](../feat-0019-whatsapp-distribution/PRODUCT.md) attribution privacy notes).
- Jurisdiction-specific multi-version terms.
- In-app legal acceptance checkbox at sign-up (not implemented).
- Automated legal PDF export.

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Reads legal pages from footer or direct URL. |
| **Legal / compliance** | Replaces stub body before production. |
| **Search engines** | `noindex` — pages not promoted in search |

## Routes (product)

| Path | Page title (today) | Locale |
|------|-------------------|--------|
| `/{locale}/legal/privacy` | Confidentialite | `ar`, `en` via App Router |
| `/{locale}/legal/terms` | Conditions d'utilisation | same |

Canonical metadata paths omit locale prefix: `/legal/privacy`, `/legal/terms` (see page `metadata.alternates`).

## Use case catalog

### A. Discovery and navigation

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Open privacy from landing footer | On `/{locale}/` | Tap Privacy link → `/legal/privacy` | Stub privacy page |
| **UC-A02** | Open terms from landing footer | On landing | Tap Terms link | Stub terms page |
| **UC-A03** | Direct URL | Any | Navigate to `/{locale}/legal/privacy` | Page renders inside marketing layout |
| **UC-A04** | Locale preserved | User on `/en/…` | Footer uses i18n navigation | English locale segment kept |

### B. Content and SEO

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Stub disclaimer visible | Page load | Body states provisional text + `specs/landing-page.md` reference | User warned content is not final |
| **UC-B11** | Noindex | Crawler | `robots: { index: false, follow: true }` | Page not indexed |
| **UC-B12** | Theme toggle | Any legal page | Fixed `ThemeToggle` top-right | Light/dark readable |
| **UC-B13** | Sitemap inclusion | Build | `apps/web/app/sitemap.ts` lists `/legal/privacy`, `/legal/terms` | URLs emitted per locale config |

### C. Production readiness (future)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Replace stub with counsel text | Legal sign-off | Swap article body; update metadata description | Remove “provisoire” copy |
| **UC-C21** | Localised legal copy | ar + en counsel versions | Use `next-intl` messages or MDX per locale | Both locales legally valid |
| **UC-C22** | Index when ready | Product decision | Change robots to `index: true` | SEO policy updated |

### D. Negative cases

| ID | Expected behavior |
|----|-------------------|
| **UC-D30** | Invalid locale → middleware/routing fallback per feat-0007 |
| **UC-D31** | Missing translation for legal body → stub still renders (French hard-coded today) |

## Behavior (product rules)

1. Legal pages use **`LandingKitRoot`** styling consistent with marketing.
2. Links in `apps/web/app/[locale]/(marketing)/page.tsx` footer use `href: '/legal/privacy'` and `'/legal/terms'` (locale-aware router resolves prefix).
3. **`packages/ui` `landing-site-footer.tsx`** also hardcodes `/legal/privacy` and `/legal/terms` for kit demos.
4. Stubs must be replaced **before** production marketing promises compliance ([`specs/landing-page.md`](../../landing-page.md)).

## Open questions

1. Single French stub for both `ar` and `en` locales acceptable temporarily? **Default:** no for launch.
2. Add last-updated date component? **Default:** yes when real copy lands.

## Related

- [feat-0008 PRODUCT](../feat-0008-landing/PRODUCT.md)
- [feat-0007 PRODUCT](../feat-0007-i18n/PRODUCT.md)
- [`specs/landing-page.md`](../../landing-page.md)
- `apps/web/app/[locale]/(marketing)/legal/privacy/page.tsx`
- `apps/web/app/[locale]/(marketing)/legal/terms/page.tsx`
