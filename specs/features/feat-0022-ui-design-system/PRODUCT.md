# feat-0022: Shared UI package and design system

## Summary

TruthSentry product surfaces are built from **`@truthsentry/ui`**: coss/Base UI primitives, **landing kit** (`data-ui-kit="landing"`), **chat kit** (`data-ui-kit="chatgpt"`), **auth shells**, and **brand** components (`ThemeWordmark`). Apps pass **locale-specific copy via props** rather than hard-coding strings inside shared components. Visual tokens live in **`landing-kit.css`** and **`chat-gpt-kit.css`**, aligned with [`docs/design/design-system.md`](../../../docs/design/design-system.md).

Complements [feat-0008](../feat-0008-landing/PRODUCT.md), [feat-0009](../feat-0009-theme-branding/PRODUCT.md), [feat-0011](../feat-0011-chat-messaging/PRODUCT.md), [feat-0007](../feat-0007-i18n/PRODUCT.md).

## Problem

Without a single UI spec, landing and chat teams duplicate layout patterns, leave French defaults in kit components, and break RTL when adding margins with physical `left`/`right`. Consumers cannot tell which components are **presentational-only** vs which own data fetching.

## Non-goals

- Publishing `@truthsentry/ui` to npm.
- Full Storybook or visual regression suite in MVP (see [feat-0026](../feat-0026-testing-ci/PRODUCT.md)).
- Replacing every shadcn-style primitive in one pass.
- Business logic or tRPC calls inside `packages/ui`.

## Figma

Figma: none provided. Baseline: teal `#42acb5` primary, Inter + Noto Sans Arabic (wired in `apps/web` locale layout), light/dark via `html.dark`.

## Actors

| Actor | Description |
|-------|-------------|
| **Web app** | Composes kits, passes i18n props and hrefs. |
| **Design / eng** | Extends tokens and components without breaking kit scoping. |
| **End user** | Sees consistent chat and landing chrome in ar/en + RTL. |

## Kit inventory (product surfaces)

### Landing kit

| Component | Role |
|-----------|------|
| `LandingKitRoot` | Scopes `--lp-*` tokens |
| `LandingSiteHeader` | Nav, sign-in, locale switcher slot |
| `LandingHero` | Hero + optional chat preview props |
| `LandingSkillsSuite` | How-it-works cards |
| `LandingFeatureSpotlight` | Why section |
| `LandingDynamicFeatures` | Feature grid |
| `LandingTestimonials` | Social proof |
| `LandingFaqSplit` | FAQ accordion |
| `LandingSiteFooter` | Column links (privacy, terms) |

**Not mounted on production page:** legacy `LandingFeatures` in `apps/web/components/landing-features.tsx` (French-only; remove or migrate).

### Chat kit

| Component | Role |
|-----------|------|
| `ChatKitRoot` | Scopes `--chat-*` tokens |
| `ChatAppShell` | Sidebar + main |
| `ChatSidebar` | Thread list, search, new chat, logout |
| `ChatTopBar` | Title, wordmark |
| `ChatComposer` | Textarea, attach, mic, send, offline banner |
| `ChatMessageList` / `ChatMessageRow` | History + verdict badges |
| `ChatMessageActions` | Copy, etc. |
| `ChatHomeEmpty` | Empty state columns (props from web) |
| `ChatWelcome` | Prompt cards (**optional**; not used on current chat home) |

### Auth kit

| Component | Role |
|-----------|------|
| `AuthPageShell` | Centered card layout for auth routes |
| `AuthCardFooter` | Secondary links |

Web-specific: `password-input-with-toggle`, `auth-top-back-link`, `sign-*-form` in `apps/web/components/auth/`.

## Use case catalog

### A. Composition

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-U01** | Landing page renders all sections | Locale route | Web passes translated props into landing components | No French defaults visible |
| **UC-U02** | Chat shell renders | Signed in | `ChatPageClient` wires sidebar + composer props | Thread UI functional |
| **UC-U03** | Auth page uses shell | `/[locale]/sign-in` | `AuthPageShell` + form | Consistent card width and spacing |
| **UC-U04** | Theme wordmark swaps | User toggles dark | `ThemeWordmark` shows correct asset | Light/dark logos |

### B. Internationalisation contract

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-U10** | Kit receives labels via props | ar or en | Web passes `signInLabel`, `offlineMessage`, etc. | UI package has no `useTranslations` |
| **UC-U11** | RTL layout | `dir=rtl` on `html` | Logical properties in new CSS (`ms-`, `text-start`) | No horizontal mirror bugs |
| **UC-U12** | Sidebar French gap | Today | `ChatSidebar` still has hard-coded French | **Gap:** migrate to props (feat-0007) |

### C. Accessibility (minimum)

| ID | Use case | Expected |
|----|----------|----------|
| **UC-U20** | Focus visible on interactive controls | coss focus rings |
| **UC-U21** | Accordion FAQ keyboard | feat-0008 accordion |
| **UC-U22** | Composer offline state | `aria-live` or visible banner via prop |
| **UC-U23** | Theme toggle label | English hard-coded today — **gap** (feat-0009) |

## Behavior (product rules)

1. **`packages/ui` stays presentational** — no imports from `apps/web` or tRPC.
2. **Kit scoping:** landing styles only under `[data-ui-kit='landing']`; chat under `[data-ui-kit='chatgpt']`.
3. **Breaking prop changes** require updating both web call sites and this spec.
4. **Brand assets** paths are owned by `apps/web/public/`; UI references paths passed as props or constants documented in feat-0009.
5. **Deprecated components** (`LandingFeatures`, unused `LandingFaq`) must not be re-mounted without i18n pass.

## Open questions

1. Consolidate `BrandLogo` (web) and `ThemeWordmark` (ui)? **Default:** single export in ui package.
2. Move `ChatWelcome` into production empty state? **Default:** product decision with feat-0011.
3. Document coss migration checklist in `packages/ui/README.md`? **Default:** yes.

## Related

- [feat-0008 PRODUCT](../feat-0008-landing/PRODUCT.md)
- [feat-0009 PRODUCT](../feat-0009-theme-branding/PRODUCT.md)
- [feat-0011 PRODUCT](../feat-0011-chat-messaging/PRODUCT.md)
- [`../../../docs/design/design-system.md`](../../../docs/design/design-system.md)
- `packages/ui/src/components/`
