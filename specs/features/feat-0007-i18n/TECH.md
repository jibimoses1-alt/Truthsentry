# feat-0007: Tech Spec — Internationalisation (ar / en, RTL)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Stack: **next-intl** on **Next.js 15** App Router with `[locale]` dynamic segment.

## File map

| Path | Role |
|------|------|
| `apps/web/i18n/routing.ts` | `locales`, `defaultLocale`, `localePrefix` |
| `apps/web/i18n/request.ts` | `getRequestConfig` — loads `messages/{locale}.json` |
| `apps/web/i18n/navigation.ts` | Locale-aware `Link`, `useRouter`, `usePathname`, `redirect` |
| `apps/web/middleware.ts` | `createMiddleware(routing)` |
| `apps/web/messages/ar.json` | Arabic strings |
| `apps/web/messages/en.json` | English strings |
| `apps/web/app/[locale]/layout.tsx` | `dir`, fonts, `NextIntlClientProvider`, `TrpcProvider` |
| `apps/web/components/locale-switcher.tsx` | AR/EN toggle |
| `apps/web/next.config.ts` | `createNextIntlPlugin('./i18n/request.ts')` |

## Routing config

```ts
// apps/web/i18n/routing.ts
export const routing = defineRouting({
    locales: ['ar', 'en'],
    defaultLocale: 'ar',
    localePrefix: 'always',
});
export type AppLocale = (typeof routing.locales)[number];
```

## Middleware

```ts
// apps/web/middleware.ts
export default createMiddleware(routing);
export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

Excludes static assets, Next internals, `api` routes.

## Locale layout

`apps/web/app/[locale]/layout.tsx`:

| Concern | Implementation |
|---------|----------------|
| Validate locale | `routing.locales.includes` else `notFound()` |
| `setRequestLocale(locale)` | Static rendering helper |
| RTL | `dir={locale === 'ar' ? 'rtl' : 'ltr'}` on `<html>` |
| Fonts | `Noto_Sans_Arabic` + `Inter` CSS variables |
| Body font | Arabic: `font-[family-name:var(--font-arabic)]`; else `font-sans` |
| tRPC locale | `<TrpcProvider locale={locale}>` → `x-locale` header |

Root `apps/web/app/layout.tsx` — minimal wrapper (children only); locale shell in `[locale]/layout.tsx`.

## Message loading

```ts
// apps/web/i18n/request.ts
messages: (await import(`../messages/${locale}.json`)).default,
```

Namespaces used in app (non-exhaustive):

| Namespace | Example consumers |
|-----------|-------------------|
| `auth`, `auth.signIn`, `auth.validation` | Sign-in page, forms |
| `common` | Shared buttons |
| `errors` | `AUTH_*` codes via `useApiToast` |
| `chat` | Chat shell (partial) |
| `marketing` | Landing (feat-0008) |

## Locale-aware navigation

```ts
// apps/web/i18n/navigation.ts
export const { Link, redirect, usePathname, useRouter, getPathname } =
    createNavigation(routing);
```

**Prefer** over `next/link` and `next/navigation` in localized pages.

## LocaleSwitcher

`apps/web/components/locale-switcher.tsx`:

- `useLocale()`, `usePathname()`, `useRouter()` from i18n navigation
- `router.replace(pathname, { locale: code })`
- Rendered on sign-in page and chat top bar

## API locale bridge

```ts
// apps/web/components/trpc-provider.tsx
headers() {
    return { 'x-locale': locale };
}
```

Parsed server-side:

```ts
// apps/api/src/index.ts — parseUiLocale
return raw === 'en' ? 'en' : 'ar';
```

Feeds `ctx.uiLocale` → auth email templates (`packages/emails`).

## App routes under `[locale]`

| Route | i18n status |
|-------|-------------|
| `(marketing)/page.tsx` | Uses translations |
| `sign-in/page.tsx` | `getTranslations` metadata + form |
| `sign-up/page.tsx` | Page shell i18n; form gap |
| `sign-up/verify/page.tsx` | Partial |
| `forgot-password`, `reset-password` | Mixed |
| `chat/page.tsx` | Metadata French; client French blocks |

## Sitemap

`apps/web/app/sitemap.ts` — should emit URLs per locale (verify when changing routes).

## RTL styling notes

- Use logical properties (`ms-`, `me-`, `text-start`) in new components per `docs/design/design-system.md`.
- `@truthsentry/ui` landing/chat kits consume CSS variables; test both dirs on marketing + chat.

## Known gaps (audit)

| Gap | Location | Fix direction |
|-----|----------|---------------|
| French in sign-up / verify forms | `components/auth/*` | `useTranslations` like sign-in |
| `verify-email-form` uses `next/navigation` | router.push('/chat') | `@/i18n/navigation` |
| French chat home + verdict labels | `chat-page-client.tsx` | Move to `messages/*` |
| Claim emails not localized | `packages/emails` | feat-0006 |
| French metadata on chat page | `chat/page.tsx` | `getTranslations` |
| CORS does not list `x-locale` | API | Add if preflight issues |

## Testing and validation

```bash
pnpm --filter @truthsentry/web typecheck
```

| Case | Steps | Expected |
|------|-------|----------|
| `/` redirect | Open root | Lands on `/ar/...` |
| Switch locale | Click EN on sign-in | URL `/en/sign-in`, dir ltr |
| RTL | `/ar/chat` | `html[dir=rtl]` |
| API email | Register on `/en/sign-up` | English verify subject |
| errors | Wrong password | Toast uses `errors.AUTH_INVALID_CREDENTIALS` in locale |
| Invalid locale | `/xx/foo` | 404 |

Manual: visual RTL check on auth cards and chat composer; no clipped icons in sidebar.

## Related

- [feat-0004 TECH](../feat-0004-auth/TECH.md)
- [feat-0003 TECH](../feat-0003-api-trpc/TECH.md)
- [feat-0006 TECH](../feat-0006-email/TECH.md)
- [feat-0008 TECH](../feat-0008-landing/TECH.md)
- `apps/web/i18n/routing.ts`
- `apps/web/messages/ar.json`
