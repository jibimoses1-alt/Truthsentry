# feat-0009: Theme and branding

## Summary

TruthSentry uses **next-themes** (`attribute="class"`) on `html` for **light / dark / system** mode. **Brand assets** live in `apps/web/public/`: `truthsentry.png` (light wordmark), `truthsentry-white.png` (dark wordmark), `truthsentry-icon.png` (favicon/PWA), and `truthsentry-dark.png` (alternate). UI surfaces swap logos via **`ThemeWordmark`** (`packages/ui`) or **`BrandLogo`** (`apps/web`). Visual tokens are scoped in **`landing-kit.css`** (`--lp-*`, `data-ui-kit="landing"`) and **`chat-gpt-kit.css`** (`--chat-*`, `data-ui-kit="chatgpt"`). Primary brand color: **#42acb5** (teal).

Consumed by [feat-0008](../feat-0008-landing/PRODUCT.md) (landing) and chat feats [feat-0010](../feat-0010-chat-threads/PRODUCT.md)–[feat-0013](../feat-0013-chat-realtime/PRODUCT.md).

## Problem

Marketing and chat share a product identity but use different layout kits. Without a single theme/branding spec, logo paths drift, hydration flashes appear on theme toggle, and dark-mode tokens break when components bypass kit roots.

## Non-goals

- User-persisted theme preference on server (client localStorage via next-themes only).
- Custom per-user accent colors.
- Rebranding workflow / asset CDN pipeline.
- High-contrast or forced-colors theme variant (future a11y pass).
- Email template branding detail ([feat-0006](../feat-0006-email/PRODUCT.md)).

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor / user** | Toggles theme from landing header or chat sidebar. |
| **Designer** | Updates PNG wordmarks and CSS token values. |
| **Developer** | Wires `ThemeWordmark` / `ChatKitRoot` / `LandingKitRoot`. |

## Brand assets

| Asset | Path | Usage |
|-------|------|-------|
| Light wordmark | `/truthsentry.png` | Light backgrounds, `siteLogoPath` |
| Dark wordmark | `/truthsentry-white.png` | Dark backgrounds, `siteLogoOnDarkPath` |
| Icon | `/truthsentry-icon.png` | Favicon, manifest (`siteIconPath`) |
| Dark variant | `/truthsentry-dark.png` | Available; not all surfaces reference it yet |

Constants: `apps/web/lib/site.ts` — `siteName`, `siteThemeColor` (`#42acb5`).

## Use case catalog

### A. Theme selection

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-T01** | First visit (system) | No stored preference | `defaultTheme="system"` | Matches OS light/dark |
| **UC-T02** | Toggle to dark | Mounted `ThemeToggle` | Click moon icon | `html` has `dark` class |
| **UC-T03** | Toggle to light | Dark active | Click sun icon | `dark` class removed |
| **UC-T04** | Persist preference | User toggled | Reload page | Preference restored from localStorage |
| **UC-T05** | Avoid hydration flash | SSR | Placeholder icon until `useLayoutEffect` | No incorrect interactive state before mount |

### B. Logo display

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-T10** | Landing header logo | Light theme | View header | `truthsentry.png` visible |
| **UC-T11** | Landing header logo (dark) | Dark theme | View header | `truthsentry-white.png` visible |
| **UC-T12** | Chat top bar logo | Active thread | `ChatTopBar` | Theme-aware wordmark props |
| **UC-T13** | Footer logo | Landing footer | `LandingSiteFooter` | Same swap as header |

### C. Kit scoping

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-T20** | Landing tokens active | On `/{locale}/` | Inside `LandingKitRoot` | `--lp-*` variables apply |
| **UC-T21** | Chat tokens active | On `/{locale}/chat` | Inside `ChatKitRoot` | `--chat-*` variables apply |
| **UC-T22** | Cross-kit isolation | Chat page | No `data-ui-kit="landing"` | Chat colors not mixed with landing |

### D. Browser chrome

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-T30** | PWA theme color | Install or mobile browser | `manifest.ts` / metadata | Teal `#42acb5` in chrome |
| **UC-T31** | Favicon | Any page | `app/icon` or public icon | Square mark loads |

### E. Negative cases

| ID | Expected behavior |
|----|-------------------|
| **UC-T40** | Missing logo file → broken image (deploy checklist must verify assets) |
| **UC-T41** | Theme toggle aria-label is English only today (i18n gap for feat-0007) |
| **UC-T42** | `disableTransitionOnChange` — no animated flash on theme swap |

## Behavior (product rules)

1. **Single mechanism:** `next-themes` on `html` with `class` strategy; components use `dark:` Tailwind variants or `.dark [data-ui-kit=…]` CSS overrides.

2. **Wordmark swap:** Light src shown when `dark:hidden`; dark src when `hidden dark:block` (`ThemeWordmark`, `BrandLogo`).

3. **Kit roots required:** Marketing pages wrap content in `LandingKitRoot`; chat in `ChatKitRoot`.

4. **Brand teal** (`#42acb5`) is accent in both kits: `--lp-accent`, `--chat-accent-strong`, `--chat-composer-ring`.

5. **No theme API:** Preference is client-only; not stored on `User` model.

6. **Chat sidebar** exposes theme toggle beside locale switcher (same `ThemeToggle` component as landing).

## Open questions

1. Standardize on `ThemeWordmark` vs `BrandLogo` (Next `Image`)? **Default:** converge on `ThemeWordmark` in shared UI; web `BrandLogo` for auth pages.

2. Use `truthsentry-dark.png` anywhere? **Default:** document only; wordmark pair is png/white.

## Related

- [feat-0008 PRODUCT](../feat-0008-landing/PRODUCT.md)
- [feat-0010 PRODUCT](../feat-0010-chat-threads/PRODUCT.md)
- [`../../docs/design/design-system.md`](../../docs/design/design-system.md)
