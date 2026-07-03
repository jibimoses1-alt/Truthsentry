# feat-0026: Tech Spec — Testing and CI

## Context

See [`PRODUCT.md`](./PRODUCT.md). Monorepo: **pnpm** + **Turbo**.

## Package test matrix

| Package | Test runner | Notes |
|---------|-------------|-------|
| `@truthsentry/trpc` | Vitest | `upload-validation.test.ts`, `index.test.ts` |
| `@truthsentry/web` | Vitest | `lib/*.test.ts` |
| `@truthsentry/api` | Vitest (if configured) | Integration — `test:integration` filter |
| `@truthsentry/ui` | — | **No tests** |
| `@truthsentry/testing` | — | Stub export only |
| `@truthsentry/prisma` | Optional | Schema/migration checks manual |

## packages/testing

```typescript
// packages/testing/src/index.ts
export function createTestContext() {
    return { environment: 'test' };
}
```

**Target:** shared factories (mock `TrpcContext`, test users) — not implemented.

## Playwright

Root devDependency `@playwright/test`. Scripts: `test:e2e`, `test-playwright`.

Config: locate `playwright.config.ts` at repo root when adding e2e (verify on implement).

## Env validation

```bash
pnpm env-check:web
pnpm env-check:api
pnpm env-check:emails
```

Uses `dotenv-checker` against `*.env.example` files.

## Typecheck

```bash
pnpm typecheck
# or per package:
pnpm --filter @truthsentry/web typecheck
pnpm --filter @truthsentry/api typecheck
pnpm --filter @truthsentry/trpc typecheck
```

## Lint / format

```bash
pnpm lint
pnpm format
```

Shared configs: `configs/eslint`, `configs/typescript`.

## CI gap

No `.github/workflows` committed at time of writing. **Recommended workflow jobs:**

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm test:unit`
4. `pnpm lint`
5. (optional) `pnpm test:e2e` with secrets in CI vault

## Feature → test mapping

| Feature | Automated | Manual |
|---------|-----------|--------|
| feat-0012 uploads | `upload-validation.test.ts` | PUT to Supabase staging |
| feat-0007 i18n | `language-detection.test.ts` | `/ar` `/en` visual |
| feat-0025 SEO | `site.test.ts` | robots/sitemap curl |
| feat-0015 AI | — | Staging with `AI_API_KEY` |
| feat-0013 realtime | — | Two-browser WS test |

## Error code grep (feat-0024)

Suggested CI script (future):

```bash
# Extract AUTH_* / CLAIM_* from trpc routers; assert keys exist in en.json and ar.json
```

## Known gaps

| Gap | UC |
|-----|-----|
| No CI workflow file | T31 |
| Empty testing package | T30 |
| No ui package tests | T32 |
| E2E not documented in repo | T20–T22 |
| Husky hooks unverified | T34 |

## Testing and validation

This document **is** the meta test spec. Verify locally:

```bash
pnpm install
pnpm typecheck
pnpm test:unit
```

## Related

- [feat-0024 TECH](../feat-0024-client-errors-toasts/TECH.md)
- [`../../../docs/rules/engineering-rules.md`](../../../docs/rules/engineering-rules.md)
