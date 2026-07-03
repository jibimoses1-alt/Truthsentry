# feat-0001: Tech Spec — Platform monorepo

## Context

See [`PRODUCT.md`](./PRODUCT.md). TruthSentry is a **pnpm monorepo**: `apps/web` (Next.js 15), `apps/api` (Node HTTP + tRPC + WebSocket), shared packages under `packages/*`.

## Repository layout

| Path | Role |
|------|------|
| `apps/web` | Next.js App Router, `[locale]` routes, chat client |
| `apps/api` | tRPC handler, session cookies, OpenAI, Supabase storage, WS |
| `packages/trpc` | Routers, schemas, rate limit, guards |
| `packages/prisma` | Schema + migrations |
| `packages/emails` | Resend templates + send |
| `packages/ui` | Landing kit, chat kit, coss components |
| `configs/*` | ESLint, TypeScript shared configs |

## Runtime topology

```text
Browser → apps/web (Next) → HTTP tRPC → apps/api (/trpc)
                              ↓
                         Postgres (Prisma)
                         Supabase Storage (uploads)
                         Resend (email)
                         OpenAI (AI)
```

## Environment (names only)

| Variable | Consumer |
|----------|----------|
| `DATABASE_URL` | Prisma |
| `NEXT_PUBLIC_APP_URL` | Web + API CORS + email links |
| `NEXT_PUBLIC_API_URL` | Web tRPC client |
| `AUTH_COOKIE_NAME` | Session cookie |
| `RESEND_API_KEY`, `EMAIL_FROM` | Emails |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Uploads |
| `OPENAI_API_KEY` | API AI (server) |

## Build & verify

```bash
pnpm install
pnpm --filter @truthsentry/web typecheck
pnpm --filter @truthsentry/api typecheck
pnpm --filter @truthsentry/trpc typecheck
```

## Known gaps vs program.md

| Gap | Notes |
|-----|-------|
| `packages/ai` | Not present; AI in `apps/api/src/index.ts` |
| Claim state enum | Code uses `ClaimStatus` + `FactCheckStatus`; not full program enum set |
| Admin UI | No `apps/web/app/admin` routes |

## Related

- [feat-0002 TECH](../feat-0002-database/TECH.md)
- [feat-0003 TECH](../feat-0003-api-trpc/TECH.md)
