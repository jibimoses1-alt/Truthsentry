# feat-0005: Tech Spec — Sessions and access control

## Context

See [`PRODUCT.md`](./PRODUCT.md). Session resolution happens in `apps/api/src/index.ts` `createContext`; procedure gates in `packages/trpc/src/core.ts` and `guards.ts`.

## Cookie contract

| Setting | Value |
|---------|-------|
| Name | `process.env.AUTH_COOKIE_NAME` ?? `truthsentry_session` |
| Max-Age | `60 * 60 * 24 * 7` (7 days) |
| Flags | `HttpOnly; SameSite=Lax; Path=/` + `Secure` if `AUTH_COOKIE_SECURE=true` |
| Value | URL-encoded random UUID (raw); DB stores SHA-256 hash |

```ts
// apps/api/src/index.ts — buildCookie excerpt
`${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}; ...`
```

Clear on logout:

```ts
`${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 ...`
```

## Context resolution

```ts
// apps/api/src/index.ts — createContext
const rawToken = cookies[SESSION_COOKIE];
if (rawToken) {
    const tokenHash = hashToken(rawToken);
    const session = await prisma.session.findFirst({
        where: { tokenHash, expiresAt: { gt: new Date() } },
        include: { user: true },
    });
    if (session) {
        sessionUser = { id, email, role: session.user.role };
    }
}
```

## Procedures and middleware

| Export | File | Behavior |
|--------|------|----------|
| `publicProcedure` | `core.ts` | No session check |
| `protectedProcedure` | `core.ts` | Requires `ctx.sessionUser`; else `TRPCError UNAUTHORIZED` message `AUTH_SIGN_IN_REQUIRED` |
| `adminProcedure` | `core.ts` | Protected + `role === 'ADMIN'` → `AUTH_ADMIN_REQUIRED` |
| `requireVerifiedEmail` | `guards.ts` | DB check `emailVerifiedAt`; else `FORBIDDEN` `AUTH_EMAIL_NOT_VERIFIED` |

### session router

| Procedure | Middleware | File |
|-----------|------------|------|
| `session.me` | protected | `routers/session.ts` |

Output shape:

```ts
{ id, email, role: 'USER' | 'ADMIN', emailVerifiedAt: Date | null }
```

Missing user edge case: `SESSION_USER_MISSING` (UNAUTHORIZED).

## requireVerifiedEmail call sites

`packages/trpc/src/routers/claim.ts` — invoked at start of:

- `create`
- `appendUserMessage`
- `requestUpload`
- `generateAssistantReply`

Not used on `listMine`, `byId`.

## WebSocket auth

`apps/api/src/index.ts` `server.on('upgrade')`:

- Parse same cookie
- Same `session.findFirst` query
- 401 if missing/invalid
- `wsClients` keyed by `userId` (one slot per user — last connection wins)

## Web client usage

| Consumer | Pattern |
|----------|---------|
| `trpc-provider.tsx` | `credentials: 'include'` on fetch |
| `chat-page-client.tsx` | `session.me` + redirect effects |
| All auth mutations | Set-Cookie response handled by browser |

## SessionUser type

```ts
// packages/trpc/src/types.ts
export type SessionUser = {
    id: string;
    email: string;
    role: UserRole;
};
```

Note: `emailVerifiedAt` is **not** on `SessionUser` — fetched per `session.me` or `requireVerifiedEmail`.

## Known gaps (audit)

| Gap | Impact |
|-----|--------|
| Logout does not `prisma.session.delete` | Stolen cookie works until expiry after "logout" |
| New session on every login without pruning | Table growth |
| No `AUTH_SECRET` binding | Token is random UUID only |
| WS one client per userId | Second tab kicks first (Map overwrite) |
| `SESSION_USER_MISSING` rare | Orphan cookie after user delete |

## Testing and validation

| Case | Call | Expected |
|------|------|----------|
| No cookie | `session.me` | UNAUTHORIZED |
| After login | `session.me` | User fields |
| Unverified + `claim.create` | mutation | AUTH_EMAIL_NOT_VERIFIED |
| Verified | `claim.create` | Success |
| USER calls `admin.queueCount` | query | AUTH_ADMIN_REQUIRED |
| Cookie expired | protected | UNAUTHORIZED |

```bash
pnpm --filter @truthsentry/trpc typecheck
```

Integration: login via web → Application tab shows `truthsentry_session` HttpOnly.

## Related

- [feat-0004 TECH](../feat-0004-auth/TECH.md)
- [feat-0003 TECH](../feat-0003-api-trpc/TECH.md)
- [feat-0013 TECH](../feat-0013-chat-realtime/TECH.md)
- `apps/api/src/index.ts`
- `packages/trpc/src/core.ts`
- `packages/trpc/src/guards.ts`
