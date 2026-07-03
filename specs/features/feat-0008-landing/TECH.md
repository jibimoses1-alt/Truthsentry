# feat-0008: Tech Spec — Landing and marketing page

## Context

See [`PRODUCT.md`](./PRODUCT.md). Marketing home is a **server component** page wiring `@truthsentry/ui/landing` primitives with next-intl strings.

## Route map

| URL | File | Layout |
|-----|------|--------|
| `/` | — | Middleware → `/ar` (default locale) |
| `/{locale}` | `apps/web/app/[locale]/(marketing)/page.tsx` | `(marketing)/layout.tsx` (passthrough) |
| `/{locale}/legal/privacy` | `apps/web/app/[locale]/(marketing)/legal/privacy/page.tsx` | feat-0017 |
| `/{locale}/legal/terms` | `apps/web/app/[locale]/(marketing)/legal/terms/page.tsx` | feat-0017 |

Locale config: `apps/web/i18n/routing.ts` — `locales: ['ar', 'en']`, `defaultLocale: 'ar'`, `localePrefix: 'always'`.

Middleware: `apps/web/middleware.ts` — next-intl matcher excludes static assets.

## UI package modules

Export barrel: `packages/ui/src/components/landing/index.ts`.

| Component | File | Role |
|-----------|------|------|
| `LandingKitRoot` | `landing-kit-root.tsx` | `data-ui-kit="landing"` wrapper |
| `LandingSiteHeader` | `landing-site-header.tsx` | Sticky nav, CTAs, `ThemeWordmark` |
| `LandingHero` | `landing-hero.tsx` | Hero + `LandingHeroChatPreview` |
| `LandingSkillsSuite` | `landing-skills-suite.tsx` | Four skill cards + CTA |
| `LandingFeatureSpotlight` | `landing-feature-spotlight.tsx` | Badge, title, bullets |
| `LandingDynamicFeatures` | `landing-dynamic-features.tsx` | Title + `LandingHeroDashboardPreview` |
| `LandingTestimonials` | `landing-testimonials.tsx` | Quote cards |
| `LandingFaqSplit` | `landing-faq-split.tsx` | Accordion (client) |
| `LandingSiteFooter` | `landing-site-footer.tsx` | Columns + wordmark |
| `LandingSectionBadge` | `landing-section-badge.tsx` | Shared section label |
| `LandingHeroDashboardPreview` | `landing-hero-dashboard-preview.tsx` | Mock dashboard visual |

CSS: `packages/ui/src/landing-kit.css` — `--lp-*` tokens; dark overrides under `.dark [data-ui-kit='landing']`.

Imported via `@truthsentry/ui/landing` (package export map).

## Web app wiring

| Module | Path | Role |
|--------|------|------|
| Page | `apps/web/app/[locale]/(marketing)/page.tsx` | Composes all sections; `generateMetadata` |
| Locale layout | `apps/web/app/[locale]/layout.tsx` | `ThemeProvider`, fonts, `NextIntlClientProvider` |
| Locale switcher | `apps/web/components/locale-switcher.tsx` | Header action |
| Theme toggle | `apps/web/components/theme-toggle.tsx` | Header action |
| Site constants | `apps/web/lib/site.ts` | `siteLogoPath`, `siteLogoOnDarkPath`, JSON-LD helpers |
| Messages | `apps/web/messages/ar.json`, `en.json` | `landing.*`, `common.*`, `metadata.*` |

### Page data assembly (excerpt pattern)

```ts
// apps/web/app/[locale]/(marketing)/page.tsx
const faqItems = [0, 1, 2, 3, 4, 5].map((i) => ({
  question: t(`landing.faq.items.${i}.question`, { brand }),
  answer: t(`landing.faq.items.${i}.answer`, { brand }),
}));
```

Nav items: `#how`, `#why`, `#faq`. Footer legal: `/legal/privacy`, `/legal/terms` (locale-aware via same-origin paths).

## API / data

| Layer | Usage |
|-------|-------|
| tRPC | None on landing |
| Prisma | None on landing |
| External | None |

## Metadata and SEO

- `generateMetadata` → `getSiteMetadata(locale)` from `lib/site.ts`
- Inline JSON-LD: `buildJsonLd()` + FAQPage entity from `faqItems`
- Sitemap: `apps/web/app/sitemap.ts` includes locale entries

## PRODUCT mapping

| UC IDs | Implementation |
|--------|----------------|
| UC-L01–L05 | `middleware.ts`, `routing.ts`, `LocaleSwitcher` |
| UC-L10–L16 | `LandingHero`, `LandingSiteHeader`, `LandingSkillsSuite` hrefs |
| UC-L20–L26 | Section components + message keys |
| UC-L30–L32 | `generateMetadata`, JSON-LD scripts |
| UC-L40–L41 | `ThemeToggle`, `ThemeWordmark` in header/footer |

## Known gaps

| Gap | Detail | PRODUCT ref |
|-----|--------|-------------|
| Footer placeholder links | `href: '#'` for product/company/resources | UC-L51 |
| `LandingFeatures` unused | Hard-coded French in `apps/web/components/landing-features.tsx` | Open questions |
| No E2E smoke | Playwright visit `/{locale}` not in repo | — |
| OG image asset | Twitter/OG may lack dedicated image path | UC-L30 |
| Chat header link | Unauthenticated users hit auth redirect on `/chat` | UC-L52 |
| Testimonial copy | Placeholder names/roles | UC-L24 |
| Integrations/pricing links | Stub `#` anchors | Footer columns |

## Testing and validation

```bash
pnpm --filter @truthsentry/web exec tsc --noEmit
pnpm --filter @truthsentry/web dev
# Manual: /ar, /en — sections, anchors, theme, locale switch, CTAs
```

| Case | Expected |
|------|----------|
| `/` redirect | Lands on `/ar` |
| Section order | Header → hero → skills → spotlight → dynamic → testimonials → FAQ → footer |
| FAQ accordion | One panel open by default (`defaultOpenIndex={1}`) |
| Dark mode | Landing tokens flip; white wordmark visible |

## Related

- [feat-0009 TECH](../feat-0009-theme-branding/TECH.md) — `landing-kit.css`, wordmarks
- [feat-0007 TECH](../feat-0007-i18n/TECH.md) — middleware, messages
- [`../../landing-page.md`](../../landing-page.md)
