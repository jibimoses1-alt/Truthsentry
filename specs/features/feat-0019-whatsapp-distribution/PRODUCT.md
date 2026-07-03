# feat-0019: WhatsApp and campaign distribution (planned)

## Summary

TruthSentry’s primary acquisition channel is **campaign links shared on WhatsApp** and similar apps. Product requires **trustworthy URLs**, **UTM attribution** preserved through sign-up, and optional **`/r/{slug}`** short links resolving to campaign metadata. **Implementation status:** documented in [`../../whatsapp-distribution.md`](../../whatsapp-distribution.md); **no `Campaign` model**, **no `/r/` route**, **no attribution persistence** in code yet.

Complements [feat-0008](../feat-0008-landing/PRODUCT.md) (landing entry), [feat-0004](../feat-0004-auth/PRODUCT.md) (signup join).

## Problem

Operators cannot measure which WhatsApp blast drove registrations. Users arriving in **in-app browsers** may lose query parameters or cookies. Without a spec tied to code gaps, marketing may publish links that break attribution or open redirect vulnerabilities.

## Non-goals

- WhatsApp Business API bot or template message builder in-repo.
- Bitly or third-party shortener as required dependency.
- Meta Business Manager setup (operational runbook outside repo).
- Campaign performance dashboard (admin UI).

## Actors

| Actor | Description |
|-------|-------------|
| **Campaign operator** | Publishes links with UTM / slug. |
| **Visitor** | Taps link in WhatsApp; lands on locale marketing or auth. |
| **Platform** | (Planned) records `campaign_id` on signup. |

## URL shapes (target)

| Type | Example | Status |
|------|---------|--------|
| Organic landing | `https://truthsentry.org/ar/` | **Live** |
| UTM landing | `https://truthsentry.org/ar/?utm_source=whatsapp&utm_medium=chat&utm_campaign=launch_01` | **Live** (params not persisted) |
| Slug resolver | `https://truthsentry.org/r/wa-launch-01` | **Planned** |
| Auth with return | `https://truthsentry.org/ar/sign-up?...` | **Live**; attribution not joined |

## Use case catalog

### A. Landing entry (today)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Tap WhatsApp link to home | Link points to `/{locale}/` | Page loads; UTM visible in address bar | **No server-side campaign record** |
| **UC-A02** | Choose language | Default locale routing | Middleware / `[locale]` segment | User reads landing in ar or en |
| **UC-A03** | Proceed to sign-up | CTA | Navigate to `/{locale}/sign-up` | **UTM may be lost** unless client preservation added |
| **UC-A04** | In-app browser | Facebook / WhatsApp webview | Page renders | Cookie / storage limitations possible |

### B. Slug resolver (planned)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Open short link | `GET /r/{slug}` implemented | Load `Campaign` by slug; set first-party cookie `campaign_id`; 302 to `/` or `/sign-up` with query preserved | Attribution cookie set |
| **UC-B11** | Unknown slug | Invalid slug | 404 or redirect to `/` without campaign | No open redirect to arbitrary URL |
| **UC-B12** | Slug analytics title | Campaign row has `title` | Operator maps slug → internal campaign id | Reporting join key |

### C. Attribution join (planned)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Attribute signup | Cookie or `sessionStorage` has `campaign_id` | On `auth.register` or first session, write `UserAttribution` or `User.campaignId` | Server-confirmed join |
| **UC-C21** | Client stash UTM | First paint on landing | Read query; store in `sessionStorage` / cookie before auth redirect | &gt;95% survival target per roadmap spec |
| **UC-C22** | Privacy consent | Campaign tracking | Align with feat-0017 legal / consent banner | Jurisdiction compliance |

### D. Security

| ID | Use case | Expected behavior |
|----|----------|-------------------|
| **UC-D30** | Open redirect | Any `next` / `redirect` param must match path allowlist |
| **UC-D31** | Slug injection | Slug alphanumeric + hyphen only |

### E. Implementation status

| ID | Item | Status |
|----|------|--------|
| **UC-E40** | `Campaign` Prisma model | **Not implemented** |
| **UC-E41** | `UserAttribution` model | **Not implemented** |
| **UC-E42** | `apps/web/app/r/[slug]` route | **Not implemented** |
| **UC-E43** | UTM preservation helper | **Not implemented** |
| **UC-E44** | Signup attribution API | **Not implemented** |

## Behavior (product rules — target)

1. **Never** redirect to user-supplied absolute URLs.
2. Preserve `utm_source`, `utm_medium`, `utm_campaign`, optional `ref` / `c` through **landing → auth → first authenticated page** when technically feasible.
3. Slug resolver is **optional MVP** per [`../../whatsapp-distribution.md`](../../whatsapp-distribution.md) open questions.
4. Campaign catalogue may live in spreadsheet until DB model ships (FR-WA-1).

## Open questions

1. Slug resolver in MVP or post-MVP? **Default:** post-MVP; UTM preservation first.
2. Attribution cookie TTL? **Default:** 30 days first-party.
3. Show “open in external browser” banner? **Default:** A/B per roadmap.

## Related

- [`../../whatsapp-distribution.md`](../../whatsapp-distribution.md) — source roadmap spec
- [feat-0008 PRODUCT](../feat-0008-landing/PRODUCT.md)
- [feat-0017 PRODUCT](../feat-0017-legal/PRODUCT.md) — tracking consent
- [feat-0018 PRODUCT](../feat-0018-admin/PRODUCT.md) — future campaign dashboard
