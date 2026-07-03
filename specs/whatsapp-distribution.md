# Spec: WhatsApp and campaign distribution

## Problem

Users discover the product through **WhatsApp** and other **campaign channels**. Links must be **trustworthy**, **measurable**, and **stable** while still allowing operators to run multiple campaigns without breaking old shared links.

## Goals

- Document canonical URL shapes from production domain (e.g. `https://truthsentry.org/...`).
- Preserve **query parameters** used for attribution (`utm_source`, `utm_medium`, `utm_campaign`, optional custom `ref` or `c` codes) through redirect and sign-up flows where technically possible.
- Clear user messaging when opening in **in-app browsers** (Facebook, Instagram, WhatsApp) that may strip cookies or behave differently.

## Non-goals

- Building Meta Business Manager assets or template message flows inside this repo (operational runbooks live outside; link from ops doc when created).
- Short-link provider selection (Bitly, etc.) unless product standardises one.

## Scope

- Landing entry URLs, optional future `/r/{slug}` resolver mapping slug to campaign metadata in DB.
- Client-side preservation: read query on first paint, stash in `sessionStorage` or first-party cookie before auth redirect if needed (document security implications).

## User stories

1. As a **user**, I tap a link in WhatsApp and land on a page that explains the product in my language choice before I sign up.
2. As an **operator**, I want each campaign link to record which campaign drove sign-ups (server-side join on first authenticated event).

## Success criteria

- Campaign query parameters survive the path **landing → auth → first authenticated page** at a rate to be measured (target: greater than 95% when using recommended client preservation pattern).
- No open redirect endpoints: any `next` or `redirect` query must validate against allowlist of paths.

## Functional requirements

### FR-WA-1 URL catalogue

- Maintain internal table (Notion/sheet or future DB table) of slugs → campaign id; code only enforces technical rules.

### FR-WA-2 Slug resolver (optional MVP)

- `GET /r/{slug}` loads campaign metadata (title for analytics), sets first-party cookie `campaign_id`, **302** to `/` or `/signup` with same query string preserved.

### FR-WA-3 Attribution join

- On `user.created` or first `session` after signup, attach `campaign_id` from cookie/storage if present; store on `User` or `Attribution` table (schema in `api.md` amendment).

### FR-WA-4 In-app browser notes

- If cookie blocked, show one-time UI: “For best results, open in external browser” (optional; A/B decision).

## Architecture impact

- **Web** routes only for MVP; **API** endpoint may record attribution server-side from posted body if cookie unreliable (prefer server-confirmed event).

## API and data impact

- Optional models: `Campaign`, `UserAttribution` with indexes on `campaignId`, `createdAt`.

## Implementation plan

1. Document baseline URLs without slug resolver.
2. Add optional slug route + cookie write behind feature flag.
3. Add server event to persist attribution on signup.
4. Dashboard later (admin) — tie to `web.md` admin section.

## Risks and mitigations

- **Risk**: Open redirect vulnerability.
    - **Mitigation**: fixed allowlist for post-auth redirects; never pass raw user URL to `Location`.
- **Risk**: Privacy regulations on campaign tracking.
    - **Mitigation**: consent banner policy in `landing-page.md` / legal review.

## Test plan

- Manual matrix: WhatsApp iOS, WhatsApp Android, plain Safari with full query string.
- Automated: unit tests for allowlist redirect helper.

## Open questions

- Whether slug resolver is MVP or post-MVP.
- Retention window for attribution cookies.
