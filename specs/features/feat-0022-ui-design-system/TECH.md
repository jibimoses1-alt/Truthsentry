# feat-0022: Tech Spec — Shared UI package

## Context

See [`PRODUCT.md`](./PRODUCT.md). Package: `packages/ui` (`@truthsentry/ui`). Consumed by `apps/web` via workspace dependency.

## Package layout

| Path | Purpose |
|------|---------|
| `src/components/ui/*` | coss primitives (button, dialog, accordion, …) |
| `src/components/landing/*` | Landing kit components |
| `src/components/chat/*` | Chat kit components |
| `src/components/auth/*` | Auth layout shells |
| `src/components/brand/theme-wordmark.tsx` | Dual light/dark wordmark |
| `src/landing-kit.css` | `--lp-*` tokens |
| `src/chat-gpt-kit.css` | `--chat-*` tokens |
| `src/styles.css` | Tailwind entry, font tokens |

Barrel exports: `src/components/landing/index.ts`, `src/components/chat/index.ts`, `src/components/brand/index.ts`.

## Web integration

| File | Role |
|------|------|
| `apps/web/app/layout.tsx` | Imports `@truthsentry/ui/styles.css` |
| `apps/web/app/[locale]/layout.tsx` | Fonts: Inter + Noto Sans Arabic |
| `apps/web/app/[locale]/(marketing)/page.tsx` | Landing composition + prop wiring |
| `apps/web/components/chat-page-client.tsx` | Chat data + prop wiring |

## i18n pattern (required)

```text
apps/web/messages/{ar,en}.json  →  getTranslations / useTranslations  →  component props
```

**Anti-pattern:** `useTranslations` inside `packages/ui` (except future explicit `LocaleProvider` if ever added — not today).

## Key props contracts (examples)

| Component | Props from web |
|-----------|----------------|
| `LandingSiteHeader` | `signInLabel`, `navAriaLabel`, `chatHref`, `chatLabel` |
| `LandingSiteFooter` | `columns[]` with headings and links |
| `LandingHero` | `id`, preview message strings |
| `ChatComposer` | `offlineMessage` |
| `ChatSidebar` | **Gap:** many labels still internal French |

## Build

```bash
pnpm --filter @truthsentry/ui typecheck
```

UI package is TypeScript source consumed directly by Next transpile (`transpilePackages` in `next.config.ts`).

## Known gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| `ChatSidebar` French strings | High | UC-U12; blocks feat-0007 completion |
| `landing-site-footer.tsx` hardcoded `/legal/*` | Medium | feat-0017 |
| `ThemeWordmark` vs `BrandLogo` duplication | Low | feat-0009 |
| No component-level tests in ui | Medium | feat-0026 |
| `ChatWelcome` unused | Low | feat-0011 |
| `LandingFeatures` dead code in web | Low | feat-0008 |

## Testing and validation

| Check | Command / action |
|-------|------------------|
| Typecheck | `pnpm --filter @truthsentry/ui typecheck` |
| Visual | Manual `/ar` and `/en` landing + chat light/dark |
| RTL | Arabic chat composer + landing FAQ accordion |
| Prop regression | Grep `packages/ui` for French string literals |

## Related

- [feat-0007 TECH](../feat-0007-i18n/TECH.md)
- [feat-0009 TECH](../feat-0009-theme-branding/TECH.md)
- `packages/ui/README.md`
