# TruthSentry design system

This document describes the implementation that mirrors the **ChatGPT UI Kit (AI Chat, Community)** structure in Figma ([file `ruUg1KDBJspO8GtFCHowye`](https://www.figma.com/design/ruUg1KDBJspO8GtFCHowye/ChatGPT-UI-Kit--AI-Chat--Community-)). The canvas is not readable from this repository, so **hex values are approximations**. Use the Figma inspect panel to replace token values in source when you lock final brand decisions.

## Surfaces and kits (two pages)

| Route        | Figma intent (your notes) | Implementation |
| ------------ | ------------------------- | ---------------- |
| `/` (and marketing legal) | Landing frame (e.g. node `804-273`) | `[data-ui-kit="landing"]` — [`packages/ui/src/landing-kit.css`](../../packages/ui/src/landing-kit.css) + [`packages/ui/src/components/landing/*`](../../packages/ui/src/components/landing/) |
| `/sign-in`, `/sign-up` | Auth screens (nodes `807-2471`--`807-2474`) | Reuses `[data-ui-kit="landing"]` via `AuthPageShell` -- [`packages/ui/src/components/auth/*`](../../packages/ui/src/components/auth/) |
| `/chat`      | Chat shell, threads, composer (e.g. nodes `0-1`, `681-2796`, `681-3246`) | `[data-ui-kit="chatgpt"]` + `.dark` -- [`packages/ui/src/chat-gpt-kit.css`](../../packages/ui/src/chat-gpt-kit.css) + [`packages/ui/src/components/chat/*`](../../packages/ui/src/components/chat/) |

**Apps/web**

- Landing composition: [`apps/web/app/(marketing)/page.tsx`](../../apps/web/app/(marketing)/page.tsx).
- Chat experience (client state for sidebar collapse and demo thread): [`apps/web/components/chat-page-client.tsx`](../../apps/web/components/chat-page-client.tsx), route [`apps/web/app/chat/page.tsx`](../../apps/web/app/chat/page.tsx).
- Auth forms (email + password, Zod validation): [`apps/web/components/auth/sign-in-form.tsx`](../../apps/web/components/auth/sign-in-form.tsx), [`apps/web/components/auth/sign-up-form.tsx`](../../apps/web/components/auth/sign-up-form.tsx).

## Token architecture

1. **Shared foundation** — [`packages/ui/src/styles.css`](../../packages/ui/src/styles.css) imports Tailwind v4, Inter (`@fontsource-variable/inter`), then kit CSS files. It defines the global `@theme inline` colour system used by COSS primitives (buttons, inputs, etc.).
2. **Landing kit** — CSS custom properties prefixed with `--lp-*` (light marketing surface, accent `#10a37f` aligned with common ChatGPT marketing accents). Scoped under `[data-ui-kit="landing"]`.
3. **Chat kit** — CSS custom properties prefixed with `--chat-*` (dark canvas, elevated surfaces, composer, code blocks). Scoped under `[data-ui-kit="chatgpt"]`. The root [`ChatKitRoot`](../../packages/ui/src/components/chat/chat-kit-root.tsx) also sets `dark` so Tailwind `dark:` variants align with the chat palette.

When Figma variables are exported, prefer **one-way mapping**: Figma variable → `--lp-*` or `--chat-*` in the kit CSS files, then keep React components referencing only those variables (no raw hex in TSX except OG image).

## Typography

| Role | Implementation |
| ---- | -------------- |
| Sans / UI | Inter Variable via `@fontsource-variable/inter`; Tailwind `font-sans` on `<html>` in [`apps/web/app/layout.tsx`](../../apps/web/app/layout.tsx). |
| Mono / code | System stack in `@theme` (`--font-mono` in `styles.css`) for snippets inside chat. |
| Landing headings | `font-semibold`, `tracking-tight`, sizes `text-4xl` / `text-5xl` on hero. |
| Chat body | `text-[15px]` on bubbles for readability in narrow columns. |

## Colour (chat kit) — semantic groups

| Token | Approximate role | Notes |
| ----- | ----------------- | ----- |
| `--chat-canvas` | Main background behind messages | Replace with Figma background token. |
| `--chat-sidebar-bg` | Left rail | Collapsed rail reuses icon buttons. |
| `--chat-surface-raised` / `--chat-surface-overlay` | Composer, chips, elevated cards | |
| `--chat-text-primary` / `--chat-text-secondary` / `--chat-text-tertiary` | Text hierarchy | |
| `--chat-user-bubble` / `--chat-assistant-bubble` | Message surfaces | Assistant can render code with `--chat-code-*`. |
| `--chat-send-bg` / `--chat-send-fg` | Primary circular send | Disabled state uses `--chat-send-disabled-*`. |
| `--chat-accent-strong` | Accent line / emphasis | Pair with `--chat-accent-soft` for subtle fills. |

## Colour (landing kit) — semantic groups

| Token | Role |
| ----- | ---- |
| `--lp-bg`, `--lp-bg-elevated` | Page and card surfaces |
| `--lp-fg`, `--lp-fg-muted`, `--lp-fg-subtle` | Text hierarchy |
| `--lp-accent`, `--lp-accent-hover`, `--lp-accent-fg` | Primary buttons and highlights |
| `--lp-border`, `--lp-border-strong` | Hairlines and cards |
| `--lp-hero-gradient` | Top-of-page wash |

## Components (chat)

| Component | Responsibility |
| --------- | --------------- |
| `ChatKitRoot` | Applies `data-ui-kit="chatgpt"` + `dark` + canvas background. |
| `ChatAppShell` | Two-column layout: sidebar + main stack. |
| `ChatSidebar` | Expanded: new chat, search field, thread list, optional footer. Collapsed: icon rail. |
| `ChatTopBar` | Model / context title row with overflow menu affordance. |
| `ChatMessageList` | Scroll region centring the thread column (`max-w-3xl`). |
| `ChatWelcome` | Starter prompt grid (maps to empty-state frames in the kit). |
| `ChatMessageRow` + `ChatMessageBubble` | User right-aligned bubble; assistant contained bubble. |
| `ChatMessageActions` | Copy / regenerate / feedback icons (hover-revealed). |
| `ChatCodeSnippet` | Bordered code block with optional language header. |
| `ChatThreadDivider` | Date / session separators. |
| `ChatTypingIndicator` | Three-dot pulse. |
| `ChatComposer` | Attachment, textarea, disabled voice slot, send (Enter to submit, Shift+Enter newline). |

## Components (landing)

| Component | Responsibility |
| --------- | --------------- |
| `LandingKitRoot` | Applies `data-ui-kit="landing"`. |
| `LandingSiteHeader` | Sticky nav, anchors + `/chat` link, sign-in ghost, primary CTA. |
| `LandingHero` | Title, subtitle, dual CTAs. |
| `LandingSteps` | Numbered cards (How it works). |
| `LandingBullets` | Two-column value props. |
| `LandingFaq` | Native `<details>` accordion with chevron rotation via CSS in `landing-kit.css`. |
| `LandingSiteFooter` | Legal + chat links. |

## Components (auth)

Auth pages share the **landing kit** surface (`LandingKitRoot` / `--lp-*` tokens) so visual language stays consistent with marketing.

| Component | Responsibility |
| --------- | --------------- |
| `AuthPageShell` | Full-viewport centred layout wrapping `LandingKitRoot`, heading slot, and an elevated card (`--lp-bg-elevated`, `--lp-border`, `--lp-shadow-md`, `--lp-radius-lg`). |
| `AuthCardFooter` | Footer below the card with paired-route links ("Sign up" / "Sign in") and "Back to home". |

Auth forms (`SignInForm`, `SignUpForm`) live in `apps/web/components/auth/` as client components using COSS `Field`, `Input`, and `Button` with Zod validation.

### Auth verification model

Verification is **email-only**. After registration the UI directs users to check their inbox for a verification link (`auth.verifyEmail`). Password recovery also uses email (`auth.requestPasswordReset` / `auth.resetPassword`). No phone number field, SMS OTP, or phone collection step exists in the auth flow.

### Auth export

`@truthsentry/ui/auth` (from `packages/ui/package.json` export `"./auth"`) re-exports `AuthPageShell` and `AuthCardFooter`.

## Buttons

Product buttons reuse [`Button`](../../packages/ui/src/components/ui/button.tsx) (Base UI + CVA). Chat and landing pass **semantic classes** for kit colours (e.g. `bg-[var(--lp-accent)]` on marketing CTAs, `bg-[var(--chat-send-bg)]` on send). Variants `default`, `outline`, `ghost` map to kit contexts.

## Accessibility

- Focus rings: rely on shared `--ring` where possible; composer adds `focus-within` ring using `--chat-composer-ring`.
- Landmarks: `ChatMessageList` scroll region; `nav` labels on sidebar and footer; `aria-label` on icon-only buttons.
- Typing indicator exposes `role="status"`.

## Figma parity checklist (for designers)

- [ ] Replace `--chat-*` values with inspected fills from nodes `681-2796` / `681-3246` (chat states).
- [ ] Replace `--lp-*` values from node `804-273` (landing).
- [ ] Map typography scales (Figma text styles → Tailwind classes or extend `@theme`).
- [ ] Export icon set if the kit uses non-Lucide icons; currently **lucide-react** mirrors common kit icons (search, panel, send, more).
- [ ] Document motion (duration, easing) if Figma specifies; chat kit exposes `--chat-duration-fast` and `--chat-ease-standard`.
- [ ] Compare auth card spacing, border-radius, and shadow against Figma nodes `807-2471`--`807-2474`; adjust `--lp-radius-lg`, `--lp-shadow-md`, or `AuthPageShell` classes if off.
- [ ] Verify auth heading and body font sizes match Figma type styles; update Tailwind classes or extend `@theme` if needed.
- [ ] Confirm accent colour (`--lp-accent`) on auth links matches the Figma auth palette.
- [ ] Attach screenshots of final parity sign-off beside this file when approved.

## Monorepo wiring (`apps/web` + `@truthsentry/ui`)

- **Webpack** — [`apps/web/next.config.ts`](../../apps/web/next.config.ts) sets `resolve.alias['@']` to `[apps/web, packages/ui/src]` so `@/` imports resolve when Next transpiles UI.
- **TypeScript** — [`apps/web/tsconfig.json`](../../apps/web/tsconfig.json) maps `@/*` to `["./*", "../../packages/ui/src/*"]` so `next build` typechecking finds `@/lib/utils` inside UI.
- **PostCSS / Tailwind** — [`apps/web/postcss.config.mjs`](../../apps/web/postcss.config.mjs) and [`packages/ui/postcss.config.mjs`](../../packages/ui/postcss.config.mjs) use `@tailwindcss/postcss`. `tailwindcss` is a **devDependency of both** `apps/web` and `packages/ui` so `@import 'tailwindcss'` resolves from either context.
- **Content scanning** — `@source './**/*.{tsx,ts}'` in [`packages/ui/src/styles.css`](../../packages/ui/src/styles.css) registers UI sources for Tailwind v4.

## Related specs

- [`specs/landing-page.md`](../../specs/landing-page.md) — product copy and routing.
- [`specs/web.md`](../../specs/web.md) — authenticated chat product (this `/chat` route is a **layout preview** until tRPC and auth are wired).
