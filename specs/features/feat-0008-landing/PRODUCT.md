# feat-0008: Landing and marketing page

## Summary

The **public marketing home** lives at `/{locale}/` (default locale `ar`, also `en`). It is composed inside `LandingKitRoot` with eight vertical sections: **header**, **hero**, **skills suite**, **feature spotlight**, **dynamic features** (dashboard preview), **testimonials**, **FAQ accordion**, and **footer**. Copy and metadata are driven by **next-intl** (`messages/ar.json`, `messages/en.json`). Primary CTAs route visitors toward **sign-up** and **sign-in**; authenticated users can jump to **chat** from the header.

Depends on [feat-0007](../feat-0007-i18n/PRODUCT.md) (locale routing) and [feat-0009](../feat-0009-theme-branding/PRODUCT.md) (theme toggle, wordmarks, landing CSS tokens).

## Problem

Campaign and organic visitors (often from WhatsApp) need a fast, trustworthy explanation of TruthSentry before auth. Without a single spec for section composition, route paths, and i18n wiring, marketing changes drift from the chat funnel and duplicate hard-coded French strings in unused components.

## Non-goals

- Collecting claim text on the landing page (claims happen in [feat-0010](../feat-0010-chat-threads/PRODUCT.md) chat after sign-in).
- CMS or dynamic content management (strings live in JSON message files).
- Authenticated chat UI on the marketing route (separate `/chat` route group).
- `LandingFeatures` in `apps/web/components/landing-features.tsx` (legacy French-only grid; **not** mounted on the current page).
- Campaign slug routes `/r/{slug}` ([feat-0019](../feat-0019-whatsapp-distribution/PRODUCT.md)).
- Analytics / consent banner (optional later).

## Figma

Figma: none provided. Baseline: sticky header with wordmark, hero with chat preview mock, skills cards, spotlight bullets, dashboard preview band, testimonial cards, split FAQ accordion, multi-column footer.

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Unauthenticated; reads landing, may switch locale or theme. |
| **Returning user** | Uses Sign in or header Chat link. |
| **Campaign operator** | Sends links with UTM; expects query strings preserved through navigation. |
| **Content author** | Edits `messages/{locale}.json` landing keys. |

## Page composition (section order)

| # | Section | Component (`@truthsentry/ui/landing`) | Anchor / id |
|---|---------|--------------------------------------|-------------|
| 1 | Header | `LandingSiteHeader` | — (sticky) |
| 2 | Hero | `LandingHero` | `#how` |
| 3 | Skills / why | `LandingSkillsSuite` | `#why` |
| 4 | Spotlight | `LandingFeatureSpotlight` | — |
| 5 | Dynamic features | `LandingDynamicFeatures` | — |
| 6 | Testimonials | `LandingTestimonials` | — |
| 7 | FAQ | `LandingFaqSplit` | `#faq` |
| 8 | Footer | `LandingSiteFooter` | — |

Wrapper: `LandingKitRoot` sets `data-ui-kit="landing"` for scoped CSS tokens.

## Use case catalog

### A. Entry and locale

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-L01** | Open home (default locale) | None | Visit `/` | Middleware redirects to `/ar` |
| **UC-L02** | Open home (English) | None | Visit `/en` | English strings; `dir=ltr` |
| **UC-L03** | Open home (Arabic) | None | Visit `/ar` | Arabic strings; `dir=rtl` |
| **UC-L04** | Switch locale on landing | On any section | `LocaleSwitcher` | Same path, new locale prefix |
| **UC-L05** | Campaign deep link | URL has `?utm_*` | Land on `/ar` or `/en` | Query preserved on internal links via next-intl `Link` |

### B. Navigation and CTAs

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-L10** | Primary CTA (hero) | On hero | Tap primary button | Navigates to `/sign-up` (locale-prefixed) |
| **UC-L11** | Secondary CTA (hero) | On hero | Tap secondary | Navigates to `/sign-in` |
| **UC-L12** | Header Get Started | Any scroll position | Tap header primary | `/sign-up` |
| **UC-L13** | Header Sign in | Any | Tap Sign in | `/sign-in` |
| **UC-L14** | Header Chat shortcut | Any | Tap Chat | `/chat` (auth guard on chat page) |
| **UC-L15** | In-page nav | Desktop header | Tap How / Why / FAQ | Smooth scroll to `#how`, `#why`, `#faq` |
| **UC-L16** | Skills CTA | Skills section | Tap CTA | `/sign-up` |

### C. Content sections

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-L20** | Read hero promise | On page | View H1 + subtitle + preview mock | Understand product funnel |
| **UC-L21** | Explore skills blocks | Scroll to `#why` | Four blocks: prompts, outputs, response, evidence | Value props visible |
| **UC-L22** | Read spotlight | Below skills | Three bullets | Deeper product detail |
| **UC-L23** | View dashboard preview | Dynamic features band | `LandingHeroDashboardPreview` | Visual product mock |
| **UC-L24** | Read testimonials | Testimonials band | Three quotes | Social proof (placeholder names) |
| **UC-L25** | Expand FAQ item | FAQ section | Accordion trigger | Answer revealed; chevron rotates |
| **UC-L26** | Footer legal | Footer | Privacy / Terms links | `/legal/privacy`, `/legal/terms` ([feat-0017](../feat-0017-legal/PRODUCT.md)) |

### D. SEO and metadata

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-L30** | Page title and description | Crawler or share | `generateMetadata` | Locale-specific `metadata.*` keys |
| **UC-L31** | JSON-LD | Crawler | `WebApplication` + `FAQPage` scripts | Structured data in page source |
| **UC-L32** | Canonical URL | SEO | `alternates.canonical` | `/{locale}` |

### E. Theme (with feat-0009)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-L40** | Toggle light/dark | Header actions | `ThemeToggle` | `html.dark` class; landing tokens swap |
| **UC-L41** | Wordmark on theme change | Any theme | Header/footer logos | Light: `truthsentry.png`; dark: `truthsentry-white.png` |

### F. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-L50** | Unknown locale `/fr` → 404 (`notFound` in locale layout) |
| **UC-L51** | Footer placeholder links (`#`) → no navigation (product debt) |
| **UC-L52** | Chat link without session → chat page redirects to sign-in |
| **UC-L53** | Keyboard: header nav and accordion operable without mouse |

## Behavior (product rules)

1. **Funnel:** Landing always advances toward auth then chat; hero primary CTA is sign-up, not in-page claim submission.

2. **Locale:** All user-visible landing strings come from next-intl; `{brand}` interpolation uses `common.brand` (TruthSentry).

3. **Section IDs:** `#how` on hero, `#why` on skills, `#faq` on FAQ; header nav must match.

4. **FAQ:** Six items (`landing.faq.items.0` … `5`); default open index `1` on first render.

5. **Testimonials:** Three items; content is illustrative until real quotes are approved.

6. **Footer columns:** Product / company / resources links are mostly placeholders (`href: '#'`); only privacy and terms are real routes.

7. **Indexing:** `shouldAllowIndexing()` gates robots on production (`VERCEL_ENV === 'production'`).

8. **No database** on landing RSC path for MVP.

## Open questions

1. Replace placeholder footer links before launch? **Default:** yes for product/company; documentation can stay stub.

2. Mount `LandingFeatures` or remove dead component? **Default:** remove or wire in a later content pass.

3. Authenticated users on `/` — redirect to chat? **Default:** no; header Chat link is enough.

## Related

- [feat-0009 PRODUCT](../feat-0009-theme-branding/PRODUCT.md) — theme, logos, CSS kits
- [feat-0007 PRODUCT](../feat-0007-i18n/PRODUCT.md) — locale middleware
- [feat-0017 PRODUCT](../feat-0017-legal/PRODUCT.md) — privacy/terms pages
- [`../../landing-page.md`](../../landing-page.md) — program-level landing notes
- [`../../program.md`](../../program.md) — funnel north star
