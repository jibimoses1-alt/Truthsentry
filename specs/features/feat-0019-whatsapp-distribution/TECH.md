# feat-0019: Tech Spec — WhatsApp distribution (planned)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Canonical requirements live in [`../../whatsapp-distribution.md`](../../whatsapp-distribution.md). This TECH spec records **current code reality** vs planned components.

## Current implementation

| Component | Path | Status |
|-----------|------|--------|
| Locale landing | `apps/web/app/[locale]/(marketing)/page.tsx` | Live |
| Sign-up / sign-in | `apps/web/app/[locale]/sign-up/page.tsx`, `sign-in/page.tsx` | Live |
| Middleware locale | `apps/web/middleware.ts` | Live |
| Campaign DB models | — | **Missing** |
| `/r/[slug]` route | — | **Missing** |
| UTM persistence util | — | **Missing** |
| Auth attribution hook | `packages/trpc/src/routers/auth.ts` `register` | **No campaign fields** |

## Planned data model (not in schema)

From roadmap — for implementation tracking:

```prisma
// PLANNED — not in packages/prisma/schema.prisma today

model Campaign {
  id        String   @id @default(cuid())
  slug      String   @unique
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model UserAttribution {
  id         String   @id @default(cuid())
  userId     String   @unique
  campaignId String?
  utmSource  String?
  utmMedium  String?
  utmCampaign String?
  createdAt  DateTime @default(now())
  user       User     @relation(...)
  campaign   Campaign? @relation(...)
}
```

Indexes suggested: `campaignId`, `createdAt`.

## Planned web routes

| Route | Handler responsibility |
|-------|------------------------|
| `apps/web/app/r/[slug]/route.ts` (or page) | Lookup slug → set `campaign_id` cookie → 302 to `/{defaultLocale}/` + preserved query |
| Landing client component | On mount: parse `URLSearchParams`, write `sessionStorage` key e.g. `ts_attribution` |
| Sign-up form | On success: POST attribution blob if cookie/storage present |

## Planned API changes

| Procedure | Change |
|-----------|--------|
| `auth.register` | Optional `attribution` input or server-read cookie header |
| `admin.*` (future) | Campaign CRUD, signup counts by campaign |

## UTM parameters (catalogue)

| Param | Purpose |
|-------|---------|
| `utm_source` | e.g. `whatsapp` |
| `utm_medium` | e.g. `chat`, `status` |
| `utm_campaign` | Operator-defined campaign code |
| `ref` / `c` | Optional short custom codes |

## Security: redirect allowlist (required before any `next` param)

```ts
// PLANNED helper — apps/web/lib/safe-redirect.ts
const ALLOWED_PREFIXES = ['/sign-in', '/sign-up', '/chat', '/'] as const;
```

Reject external URLs and protocol-relative `//` targets.

## In-app browser notes

| Client | Risk |
|--------|------|
| WhatsApp iOS/Android webview | Partitioned storage; ITP |
| Instagram in-app | Cookie blocking |

Mitigation: first-party cookie on parent domain + `sessionStorage` mirror on landing ([`../../whatsapp-distribution.md`](../../whatsapp-distribution.md) FR-WA-4).

## Known gaps (audit)

| Gap | PRODUCT ref |
|-----|-------------|
| No Campaign model | UC-E40 |
| No /r/ slug | UC-E41, UC-B10 |
| UTM lost on auth navigation | UC-A03, UC-E43 |
| No signup join | UC-C20 |
| No allowlist redirect helper | UC-D30 |
| No consent banner for tracking | UC-C22 |

## Testing and validation (when implemented)

| Case | Expected |
|------|----------|
| `/r/valid-slug?utm_source=wa` | 302 to `/ar/?utm_source=wa`; cookie set |
| `/r/unknown` | Safe fallback 404 |
| Register after landing with UTM | `UserAttribution` row |
| `?next=https://evil.com` | Rejected |

Manual matrix today: WhatsApp iOS/Android → landing only; confirm UTM **not** in DB.

```bash
# No automated tests yet
pnpm --filter @truthsentry/web typecheck
```

## Related

- [`../../whatsapp-distribution.md`](../../whatsapp-distribution.md)
- [feat-0008 TECH](../feat-0008-landing/TECH.md)
- [feat-0004 TECH](../feat-0004-auth/TECH.md)
- `specs/landing-page.md`
