# feat-0009: Tech Spec — Theme and branding

## Context

See [`PRODUCT.md`](./PRODUCT.md). Theme is app-wide via next-themes; visual kits are opt-in per surface.

## Theme stack

| Module | Path | Role |
|--------|------|------|
| Provider | `apps/web/components/theme-provider.tsx` | Wraps `NextThemesProvider` |
| Toggle | `apps/web/components/theme-toggle.tsx` | Client toggle; mount guard |
| Layout mount | `apps/web/app/[locale]/layout.tsx` | `<ThemeProvider>` inside `<html suppressHydrationWarning>` |

```tsx
// theme-provider.tsx
<NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
```

Toggle uses `resolvedTheme` and `setTheme('light' | 'dark')`.

## Brand components

| Component | Package / app | Implementation |
|-----------|---------------|----------------|
| `ThemeWordmark` | `packages/ui/src/components/brand/theme-wordmark.tsx` | Dual `<img>` with `dark:hidden` / `hidden dark:block` |
| `BrandLogo` | `apps/web/components/brand-logo.tsx` | Next `Image` pair; same swap pattern |
| Export | `packages/ui/src/components/brand/index.ts` | Re-exports `ThemeWordmark` |

### Consumers

| Surface | Component | Logo props |
|---------|-----------|------------|
| `LandingSiteHeader` | `ThemeWordmark` | `brandLogoSrc`, `brandLogoDarkSrc` |
| `LandingSiteFooter` | `ThemeWordmark` | same |
| `ChatTopBar` | `ThemeWordmark` (via props) | `brandLogoSrc`, `brandLogoDarkSrc` from `chat-page-client.tsx` |
| Auth pages | `BrandLogo` | `siteLogoPath` / `siteLogoOnDarkPath` |

## Site constants

`apps/web/lib/site.ts`:

```ts
export const siteLogoPath = '/truthsentry.png';
export const siteLogoOnDarkPath = '/truthsentry-white.png';
export const siteIconPath = '/truthsentry-icon.png';
export const siteThemeColor = '#42acb5';
```

## CSS token kits

Imported in `packages/ui/src/styles.css` (pulled by `apps/web/app/layout.tsx`).

### Landing kit

File: `packages/ui/src/landing-kit.css`

- Scope: `[data-ui-kit='landing']`
- Light tokens: `--lp-bg`, `--lp-fg`, `--lp-accent`, `--lp-hero-gradient`, radii, shadows
- Dark: `.dark [data-ui-kit='landing'] { … }`
- Root: `LandingKitRoot` → `data-ui-kit="landing"`

### Chat kit

File: `packages/ui/src/chat-gpt-kit.css`

- Scope: `[data-ui-kit='chatgpt']`
- Tokens: `--chat-canvas`, `--chat-sidebar-*`, `--chat-composer-*`, `--chat-accent-strong`
- Dark: `.dark [data-ui-kit='chatgpt']`
- Root: `ChatKitRoot` → `data-ui-kit="chatgpt"` + `bg-[var(--chat-canvas)]`

### Shared base

`packages/ui/src/styles.css` — Tailwind/shadcn base; `--font-sans` from Inter in locale layout.

## Public assets

| File | `apps/web/public/` |
|------|---------------------|
| `truthsentry.png` | Light wordmark |
| `truthsentry-white.png` | Dark wordmark |
| `truthsentry-icon.png` | Icon |
| `truthsentry-dark.png` | Alternate (unused in code paths today) |

Manifest: `apps/web/app/manifest.ts` references icon and `siteThemeColor`.

## API / data

None. Theme preference stored in browser by next-themes (localStorage key `theme`).

## PRODUCT mapping

| UC IDs | Files |
|--------|-------|
| UC-T01–T05 | `theme-provider.tsx`, `theme-toggle.tsx` |
| UC-T10–T13 | `theme-wordmark.tsx`, `landing-site-header.tsx`, `chat-top-bar.tsx` |
| UC-T20–T22 | `landing-kit-root.tsx`, `chat-kit-root.tsx`, respective CSS |
| UC-T30–T31 | `site.ts`, `manifest.ts` |

## Known gaps

| Gap | Detail |
|-----|--------|
| Theme toggle i18n | `aria-label` hard-coded English in `theme-toggle.tsx` |
| Dual logo components | `ThemeWordmark` (img) vs `BrandLogo` (next/image) |
| `truthsentry-dark.png` | Not referenced in `site.ts` |
| Verdict badges in chat | Tailwind color utilities, not `--chat-*` tokens ([feat-0011](../feat-0011-chat-messaging/TECH.md)) |
| No automated visual regression | Manual theme check only |

## Testing and validation

```bash
pnpm --filter @truthsentry/web exec tsc --noEmit
```

| Case | Expected |
|------|----------|
| Toggle on `/ar` | Landing sections respect dark `--lp-*` |
| Toggle on `/ar/chat` | Sidebar/composer respect `--chat-*` |
| Hard refresh | Theme persists |
| First paint | Placeholder toggle button until mounted |

## Related

- [feat-0008 TECH](../feat-0008-landing/TECH.md)
- [feat-0011 TECH](../feat-0011-chat-messaging/TECH.md)
- [`../../docs/design/design-system.md`](../../docs/design/design-system.md)
