# feat-0026: Testing and CI

## Summary

TruthSentry verifies behavior through **Turbo-orchestrated** scripts: **unit tests** (Vitest) in packages and apps, **typecheck** per package, **Playwright** e2e at repo root, and **env schema checks** via `dotenv-checker`. The `packages/testing` workspace exists as a **placeholder** for shared test utilities; most tests live next to source today.

Complements [feat-0001](../feat-0001-platform/PRODUCT.md) (monorepo), all feature TECH “Testing and validation” sections.

## Problem

Feature specs list manual checks but there is no program-level contract for **what must pass before merge**, which packages require tests for new logic, and how staging differs from CI. Risk: regressions in auth, upload validation, and i18n slip through.

## Non-goals

- 100% coverage gates in MVP.
- Load testing or k6 suites (future).
- Dedicated CI vendor lock-in in this spec (document patterns, not vendor IDs).
- Visual regression (Chromatic) unless added later.

## Actors

| Actor | Description |
|-------|-------------|
| **Developer** | Runs `pnpm test` / `typecheck` locally before PR. |
| **CI** | Runs same scripts on push (when configured). |
| **Reviewer** | Expects tests for non-trivial trpc/web logic. |

## Script catalogue (root `package.json`)

| Script | Scope |
|--------|-------|
| `pnpm test` | `turbo run test` — all packages with `test` script |
| `pnpm test:unit` | ai, emails, prisma, testing, trpc, ui |
| `pnpm test:integration` | api, web |
| `pnpm test:e2e` / `test-playwright` | Playwright |
| `pnpm typecheck` | Turbo typecheck all |
| `pnpm lint` | ESLint via Turbo |
| `pnpm env-check:web` | Schema vs `.env.example` |
| `pnpm env-check:api` | API env example |
| `pnpm env-check:emails` | Emails env example |

## Use case catalog

### A. Unit tests (existing)

| ID | Use case | Package | File |
|----|----------|---------|------|
| **UC-T01** | Upload validation rules | trpc | `upload-validation.test.ts` |
| **UC-T02** | tRPC router smoke | trpc | `index.test.ts` |
| **UC-T03** | Language detection | web | `language-detection.test.ts` |
| **UC-T04** | Image validation | web | `image-validation.test.ts` |
| **UC-T05** | Site helpers | web | `site.test.ts` |

### B. Required checks (target contract)

| ID | Use case | Preconditions | Expected |
|----|----------|---------------|----------|
| **UC-T10** | PR merge gate | Code change | `typecheck` passes |
| **UC-T11** | Logic change in trpc | New validation | Unit test added or extended |
| **UC-T12** | i18n routing change | middleware edit | `language-detection` or e2e smoke |
| **UC-T13** | Env var added | `.env.example` updated | `env-check:*` passes |

### C. E2E (Playwright)

| ID | Use case | Status |
|----|----------|--------|
| **UC-T20** | Landing loads | Configure in `playwright.config` |
| **UC-T21** | Sign-in flow | **Gap:** may need test user + API |
| **UC-T22** | Chat submit | **Gap:** needs OpenAI mock or staging |

### D. Gaps

| ID | Use case | Today |
|----|----------|-------|
| **UC-T30** | `packages/testing` utilities | Stub `createTestContext()` only |
| **UC-T31** | CI workflow in repo | **No `.github/workflows` in tree** — gap |
| **UC-T32** | `packages/ui` tests | None |
| **UC-T33** | API integration tests | Minimal |
| **UC-T34** | Husky pre-commit | `husky` in devDeps — verify hooks |

## Behavior (product rules)

1. **New pure functions** in `packages/trpc` or `apps/web/lib` should ship with Vitest tests when behavior is non-obvious.
2. **Do not commit secrets** — tests use mocks; env from `.env.example` only.
3. **E2E** may be optional for MVP merges but required before production launch checklist.
4. Feature TECH specs reference manual QA; this feat is the **aggregate** automated contract.
5. Playwright tests must target **`/[locale]/`** routes post-i18n.

## Open questions

1. Add GitHub Actions workflow template? **Default:** yes in follow-up PR.
2. Expand `packages/testing` with prisma test db helpers? **Default:** when integration tests grow.
3. Contract tests for `errors.*` keys vs server codes? **Default:** script grep in CI (feat-0024).

## Related

- [feat-0001 TECH](../feat-0001-platform/TECH.md)
- [feat-0024 PRODUCT](../feat-0024-client-errors-toasts/PRODUCT.md)
- `docs/rules/engineering-rules.md`
- Root `package.json` scripts
