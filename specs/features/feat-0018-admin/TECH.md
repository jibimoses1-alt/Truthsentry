# feat-0018: Tech Spec — Admin (partial)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Minimal admin surface: **role enum**, **procedure guard**, **one query**. No web routes.

## Data model

```prisma
enum UserRole {
  USER
  ADMIN
}

model User {
  role UserRole @default(USER)
  // ...
}
```

File: `packages/prisma/schema.prisma`.

Admin promotion: manual DB update or seed — no `auth.promoteAdmin` API.

## tRPC

### Guard (`packages/trpc/src/core.ts`)

```ts
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.sessionUser.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'AUTH_ADMIN_REQUIRED' });
  }
  return next();
});
```

### Router (`packages/trpc/src/routers/admin.ts`)

| Procedure | Input | Output | Implementation |
|-----------|-------|--------|----------------|
| `queueCount` | — | `{ total: number }` | `ctx.prisma.claim.count()` |

Registered in `packages/trpc/src/index.ts` as `admin: adminRouter`.

### Session exposure (`packages/trpc/src/routers/session.ts`)

`session.me` output includes `role: z.enum(['USER', 'ADMIN'])` for future client gating.

## API context

`apps/api/src/index.ts` loads `session.user.role` into `sessionUser` when resolving session cookie.

## Web

| Expected path | Status |
|---------------|--------|
| `apps/web/app/[locale]/admin/**` | **Not present** |
| Chat / landing links to admin | **None** |

## Relationship to claim lifecycle

| `Claim.status` | Admin relevance today |
|----------------|----------------------|
| `OPEN` | Counted in `queueCount` |
| `PROCESSING` | Counted (usually brief in MVP AI) |
| `RESOLVED` | Counted |
| `FAILED` | Counted |

**Target filter (not implemented):** e.g. `status = PROCESSING` AND `factCheckStatus = PENDING` AND human-queue flag — requires feat-0015 pipeline changes.

## Known gaps

| Gap | PRODUCT ref |
|-----|-------------|
| `queueCount` is total claims | UC-B11 |
| No admin UI | UC-C20–C23 |
| No review mutations | UC-C22 |
| No `ClaimAiRun` for reviewers | feat-0015 |
| No audit trail | UC-D31 |
| No bootstrap promote endpoint | UC-A04 |

## Testing and validation

```ts
// packages/trpc — future test pattern
// admin.queueCount as USER → FORBIDDEN
// admin.queueCount as ADMIN → { total: N }
```

Manual: set role in DB → call `admin.queueCount` via tRPC client.

```bash
pnpm --filter @truthsentry/trpc typecheck
```

## Related

- [feat-0015 TECH](../feat-0015-claims-ai/TECH.md)
- [feat-0005 TECH](../feat-0005-session/TECH.md)
- `packages/trpc/src/routers/admin.ts`
