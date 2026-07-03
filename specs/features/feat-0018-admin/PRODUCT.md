# feat-0018: Admin role and human review (partial)

## Summary

Staff accounts can hold the **`ADMIN`** role on `User`. Admins may call **`admin.queueCount`** via tRPC — today returning the **total count of all claims**, not a filtered human-review queue. There is **no admin web UI**, no claim assignment, and no reviewer actions. This feat documents the **security gate** and the **placeholder metric** until [feat-0015](../feat-0015-claims-ai/PRODUCT.md) human-queue path and review UI exist.

Complements [feat-0005](../feat-0005-session/PRODUCT.md) (session exposes role), [feat-0015](../feat-0015-claims-ai/PRODUCT.md) (claims lifecycle).

## Problem

Human fact-checkers need a queue and tools to resolve claims the AI cannot handle. The schema and API need an admin role before any UI ships. Exposing a misleading `queueCount` without documenting it risks operators trusting the wrong number.

## Non-goals (current release)

- Admin dashboard routes under `apps/web`.
- Claim approve/reject mutations.
- Reviewer assignment, SLA, or notes.
- Filtering queue by `PROCESSING`, `PENDING` verdict, or low confidence.
- Separate `REVIEWER` role (only `USER` | `ADMIN`).

## Actors

| Actor | Description |
|-------|-------------|
| **Admin** | `User.role === 'ADMIN'`; may call `admin.*` procedures. |
| **Regular user** | `FORBIDDEN` on admin routes. |
| **Platform** | Prisma `claim.count()` for placeholder metric. |

## Use case catalog

### A. Authorization

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Admin session includes role | Admin logged in | `session.me` returns `role: 'ADMIN'` | Client could gate future UI |
| **UC-A02** | User denied admin API | `role: 'USER'` | Call `admin.queueCount` | `FORBIDDEN` `AUTH_ADMIN_REQUIRED` |
| **UC-A03** | Unauthenticated denied | No session | Call `admin.queueCount` | `UNAUTHORIZED` |
| **UC-A04** | Promote user to admin | DB / seed / manual SQL | Set `User.role = ADMIN` | Next session reflects role |

### B. Queue metric (placeholder)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Admin fetches queue count | Admin auth | `admin.queueCount` query | `{ total: number }` |
| **UC-B11** | Metric meaning today | Any data | `prisma.claim.count()` — **all claims** | Not human-queue depth |
| **UC-B12** | Target metric (future) | Human queue implemented | Count claims where status/verdict matches review policy | Documented in feat-0015 roadmap |

### C. Future admin UI (not implemented)

| ID | Use case | Target behavior |
|----|----------|-----------------|
| **UC-C20** | Open review queue | `/admin/queue` list with filters |
| **UC-C21** | Open claim dossier | Read messages + metadata + AI run summary |
| **UC-C22** | Resolve claim | Set verdict, notify user, remove from queue |
| **UC-C23** | Queue count badge | Sidebar shows true pending human count |

### D. Negative cases

| ID | Expected behavior |
|----|-------------------|
| **UC-D30** | Admin APIs not linked from marketing or chat nav |
| **UC-D31** | No audit log of admin reads |

## Behavior (product rules)

1. **`ADMIN`** is stored on `User.role` enum (`packages/prisma/schema.prisma`).
2. **`adminProcedure`** chains after `protectedProcedure` and checks `sessionUser.role === 'ADMIN'`.
3. **`queueCount`** is a **placeholder** — product must not label it “human queue” in operator docs until filter logic ships.
4. Regular users never see admin affordances in web app today.

## Open questions

1. Rename procedure to `claim.totalCount` until queue semantics exist? **Default:** yes or add `humanQueueCount` later.
2. Seed admin user in staging? **Default:** env-driven bootstrap script.
3. Align with `claims-ai-pipeline.md` `queued_human` state? **Default:** feat-0015 amendment.

## Related

- [feat-0015 PRODUCT](../feat-0015-claims-ai/PRODUCT.md) — AI vs human path
- [feat-0005 PRODUCT](../feat-0005-session/PRODUCT.md) — session role
- [`../../claims-ai-pipeline.md`](../../claims-ai-pipeline.md)
- `packages/trpc/src/routers/admin.ts`
- `packages/trpc/src/core.ts`
