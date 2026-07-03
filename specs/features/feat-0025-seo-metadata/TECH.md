# feat-0025: Tech Spec — SEO and metadata

## Context

See [`PRODUCT.md`](./PRODUCT.md). App: `apps/web` (Next.js 15 App Router).

## Core modules

| File | Role |
|------|------|
| `apps/web/lib/site.ts` | `siteName`, logo paths, `getMetadataBase`, `shouldAllowIndexing`, `getSiteMetadata`, `buildJsonLd` |
| `apps/web/lib/site.test.ts` | Unit tests for site helpers |
| `apps/web/app/robots.ts` | Dynamic robots from `shouldAllowIndexing()` |
| `apps/web/app/sitemap.ts` | Locale-prefixed public paths |
| `apps/web/app/manifest.ts` | PWA name, icons, `theme_color` |
| `apps/web/app/opengraph-image.tsx` | OG image route |
| `apps/web/app/twitter-image.tsx` | Twitter card image |
| `apps/web/app/icon.tsx` | Favicon |
| `apps/web/app/apple-icon.tsx` | Apple touch icon |

## Per-route metadata

| Route | Metadata source |
|-------|-----------------|
| `[locale]/(marketing)/page.tsx` | `generateMetadata` + `getSiteMetadata(locale)` + JSON-LD |
| `[locale]/chat/page.tsx` | `robots: { index: false }` |
| `[locale]/(marketing)/legal/*` | `noindex, follow` (feat-0017) |
| Auth pages | Check each `page.tsx` for `generateMetadata` |

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Canonical base URL |
| `VERCEL_ENV` | `production` gates indexing |

## i18n

Namespace: `messages/{ar,en}.json` → `metadata.title`, `metadata.description`, `metadata.keywords`.

`getSiteMetadata(locale)` uses `getTranslations` server-side.

## JSON-LD gap

`buildJsonLd` — when `overrides.description` omitted, falls back to `siteName` instead of `siteDefaultDescription` or translated description. Marketing page should pass translated description explicitly (UC-S31).

## Sitemap structure

`PUBLIC_PATHS` in `sitemap.ts` — includes marketing and legal paths; emits entries per configured locales (`routing.locales`).

## Known gaps

| Gap | UC | Notes |
|-----|-----|-------|
| Weak JSON-LD description default | S31 | `site.ts` |
| Auth page metadata not unified | — | Per-page audit |
| `chat/page.tsx` metadata French | — | feat-0007 |
| OG images not locale-specific text | S20 | English-only generation |
| No structured data for Organization | — | Optional |

## Testing and validation

```bash
pnpm --filter @truthsentry/web test -- site.test
pnpm --filter @truthsentry/web typecheck
```

| Manual check | Action |
|--------------|--------|
| View source `/ar` | `lang`, `dir`, title, JSON-LD |
| `/robots.txt` | production vs preview |
| `/sitemap.xml` | locale URLs present |
| Social debugger | OG image URL absolute |

## Related

- [feat-0007 TECH](../feat-0007-i18n/TECH.md)
- [feat-0009 TECH](../feat-0009-theme-branding/TECH.md)
