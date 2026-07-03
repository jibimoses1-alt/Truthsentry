# feat-0017: Tech Spec — Legal pages

## Context

See [`PRODUCT.md`](./PRODUCT.md). Two static Next.js pages under the **marketing route group** with locale segment.

## Route map

| File | URL | Layout parent |
|------|-----|---------------|
| `apps/web/app/[locale]/(marketing)/legal/privacy/page.tsx` | `/{locale}/legal/privacy` | `(marketing)/layout.tsx` (passthrough fragment) |
| `apps/web/app/[locale]/(marketing)/legal/terms/page.tsx` | `/{locale}/legal/terms` | same |

Middleware: `apps/web/middleware.ts` (locale prefix enforcement per feat-0007).

## Page structure (both stubs)

| Concern | Implementation |
|---------|----------------|
| Wrapper | `LandingKitRoot` from `@truthsentry/ui/landing` |
| Theme | `ThemeToggle` fixed top-right |
| Content | Single `<article>` max-w-3xl; H1 + placeholder `<p>` |
| Metadata | `title`, `description` with `siteName` from `@/lib/site` |
| Canonical | `/legal/privacy` or `/legal/terms` (no locale in canonical string) |
| Robots | `{ index: false, follow: true }` |

### Privacy stub copy

- Title metadata: `Confidentialite`
- H1: `Confidentialite`
- Body: provisional page; replace before production (`specs/landing-page.md`)

### Terms stub copy

- Title metadata: `Conditions d'utilisation`
- H1: `Conditions d'utilisation`
- Body: same provisional pattern

**Note:** Page copy is **French** regardless of `[locale]` segment — i18n gap.

## Inbound links

| Source | Path |
|--------|------|
| `apps/web/app/[locale]/(marketing)/page.tsx` | Footer `t('landing.footer.privacy')`, `terms` |
| `packages/ui/src/components/landing/landing-site-footer.tsx` | Hardcoded Privacy/Terms hrefs |
| `apps/web/app/sitemap.ts` | `PUBLIC_PATHS` includes `'/legal/privacy'`, `'/legal/terms'` |

i18n navigation: `@/i18n/navigation` Link component resolves locale prefix on relative paths.

## Deleted legacy routes

Pre-i18n paths removed from git (replaced by `[locale]` tree):

- `apps/web/app/(marketing)/legal/privacy/page.tsx`
- `apps/web/app/(marketing)/legal/terms/page.tsx`

## Known gaps

| Gap | PRODUCT ref | Notes |
|-----|-------------|-------|
| No locale-specific legal text | UC-C21 | French only in page components |
| Stub not in `messages/*.json` | UC-D31 | Cannot translate without code change |
| `noindex` on sitemap URLs | UC-B13 | Sitemap lists URLs that ask not to index — intentional for discoverability of link graph only |
| No version / effective date | UC-C22 | — |
| No sign-up acceptance linkage | Non-goals | Terms not gated at register |

## Testing and validation

| Case | Expected |
|------|----------|
| `/ar/legal/privacy` | 200; stub renders RTL layout from root locale |
| `/en/legal/terms` | 200; stub French body (gap) |
| View page source | `noindex` in metadata |

```bash
pnpm --filter @truthsentry/web typecheck
pnpm --filter @truthsentry/web build
```

## Related

- [feat-0007 TECH](../feat-0007-i18n/TECH.md)
- [feat-0008 TECH](../feat-0008-landing/TECH.md)
- [`specs/landing-page.md`](../../landing-page.md)
