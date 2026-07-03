# Spec: Landing page (public entry)

## Problem

Visitors arrive from **WhatsApp or campaigns** with little context. They need to understand TruthSentry, trust the site, choose language where offered, and reach **sign-up or sign-in** without friction. After that, they should land in the **AI chat interface** where claims are submitted and answered (see `web.md`). The landing page must not leak internal implementation details.

## Product funnel

```text
Landing (marketing) → Sign up / Sign in → AI chat (authenticated product)
```

- Primary CTA on the landing page always advances toward the **chat app** (via auth when required), not a dead-end marketing page.
- Secondary CTA can be **Sign in** for returning users.

## Goals

- Communicate purpose: claims intake (including Fula/Peul), AI-assisted verification when possible, human review when not.
- Clear primary CTA: open the **AI chat** flow (exact label in content pass, e.g. “Start in chat” / “Vérifier une déclaration”).
- Clear secondary CTA: **Sign in** for returning users (exact copy in content pass).
- Support **truthsentry.org** (or configured `NEXT_PUBLIC_APP_URL`) and future campaign paths (see `whatsapp-distribution.md`).
- Fast first paint; minimal JavaScript for static hero; defer heavy widgets.

## Content architecture (reference, not copy)

Use [iWeaver’s AI fact-checking landing](https://www.iweaver.ai/agents/fact-checking/?utm_source=chatgpt.com) as a **structural reference** for useful public content: hero with clear promise, a short **how it works** sequence, **why this product** bullets, **who it is for** (use cases), and **FAQs**. **Do not paste or lightly rewrite their proprietary marketing copy**; write original TruthSentry copy in FR/EN (and later other UI languages as needed).

Map their pattern to TruthSentry:

| Reference pattern (iWeaver-style) | TruthSentry meaning                                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upload / submit content           | User will **submit a claim in chat** after sign-in (not on the landing page for MVP).                                                                      |
| AI verification                   | Cross-check against **approved knowledge** and policies; return an answer or flag uncertainty (see `claims-ai-pipeline.md`).                               |
| Detailed report                   | User sees **clear outcome** in chat (verified path, unable to verify, or queued for human review) plus any allowed citations.                              |
| Source credibility / red flags    | Explain that the system uses **curated sources** and **confidence**, and escalates to **humans** when needed (accuracy claims must be honest and bounded). |
| Privacy FAQ                       | Align with `program.md` and legal: encryption in transit, retention, who can see claims (admins for queue).                                                |

Optional later: a **non-authenticated** “demo” or sample screenshot section on the landing page only if legal and product approve (out of scope for MVP unless amended).

## Non-goals

- Hosting the authenticated **AI chat** UI on the same route tree as marketing without a deliberate layout split (keep `(marketing)` vs app route group clear unless an ADR changes this).
- Collecting **claim text** on the landing page itself for MVP (claims happen inside the authenticated chat; see `web.md`).
- Claiming third-party benchmarks (e.g. fixed “accuracy %”) unless you have **your own** evaluation methodology documented in `claims-ai-pipeline.md` and approved for public display.

## Scope (this iteration)

- Hero, short value proposition, **primary CTA to chat (via auth)**, trust strip (partners / security posture as approved), footer with legal links placeholders.
- **How it works** (3 steps): sign in → describe claim in chat → receive AI outcome or human queue (see [Content architecture](#content-architecture-reference-not-copy)).
- **Why TruthSentry** (4 to 6 bullets): curated knowledge, confidence and limits, human escalation, languages (Fula/Peul + UI languages), high-level privacy posture.
- **Use cases** (3 to 4 cards): tune to TruthSentry stakeholders; avoid mirroring the reference site’s exact vertical list or wording.
- **FAQs** (6 to 10): accuracy limits, human review, languages, data retention (or “see privacy”), scope of media/manipulation checks, operator/contact.
- Optional locale switcher (FR/EN) for chrome only; claim languages explained in copy, not necessarily selectable on landing.
- Metadata for SEO and social preview (title, description, OG image when asset exists).

## User stories

1. As a **mobile visitor**, I want to read the headline and tap one obvious button so I can **reach the AI chat** (through sign-up or sign-in when required).
2. As a **campaign operator**, I want UTM parameters preserved when the user navigates to auth so we can attribute sign-ups (implementation in app; landing must not strip query strings).

## Success criteria

- Lighthouse performance target to be set (e.g. performance score greater than 85 on staging mobile) — record actual target in rollout.
- Zero layout shift on primary CTA between font load and paint (use font strategy from design system).
- All links reachable by keyboard; focus order logical.

## Functional requirements

### FR-LP-1 Content blocks

- Hero: H1, subcopy, **primary CTA** (start chat flow), **secondary CTA** (sign in).
- “How it works”: three numbered steps aligned to chat (see [Content architecture](#content-architecture-reference-not-copy)).
- “Why TruthSentry”: short bullet list (credibility, limits, escalation, languages).
- “Who it is for”: compact use-case cards with links or anchors; no claim submission forms here.
- FAQ accordion: minimum 6 questions covering languages, data use, human review, accuracy limits, security, contact (extend list in content pass).
- Final band: single reinforcement line + repeat primary CTA (optional; matches common landing pattern on reference site).

### FR-LP-2 Routing

- `/` landing; `/legal/privacy`, `/legal/terms` as stubs or real pages before production.
- Deep links from campaigns may land on `/` or `/r/{slug}` if slug-based campaigns are introduced (coordinate with `whatsapp-distribution.md`).

### FR-LP-3 Analytics (optional MVP)

- If enabled: single anonymised page view event with consent banner where required by jurisdiction (open question).

## Architecture impact

- **Affected**: `apps/web` (App Router: marketing route group vs app route group).
- **Packages**: `packages/ui` for layout primitives; no direct Prisma from RSC unless explicitly planned (prefer zero DB on landing for MVP).

## API and data impact

- None for MVP landing if fully static. If CMS added later: document read path and cache invalidation in amendment.

## Implementation plan

1. Route group `(marketing)` with shared layout and footer.
2. Implement hero + CTAs linking to auth routes.
3. Add legal stubs and i18n strings file for FR/EN chrome.
4. Wire OG metadata and favicon when brand assets exist (`program.md` brand items).

## Risks and mitigations

- **Risk**: Campaign links break when URL structure changes.
    - **Mitigation**: version campaign URL format in `whatsapp-distribution.md`; redirect old paths.
- **Risk**: Legal copy missing at launch.
    - **Mitigation**: block production deploy checklist until terms/privacy linked or “draft” banner approved.

## Rollout plan

- Ship to staging first; verify from real mobile device and WhatsApp in-app browser.
- Production behind same domain with CDN caching rules for static segments.

## Rollback plan

- Revert to previous static export or prior deployment revision; landing has no migration dependency.

## Test plan

- **Manual**: iOS Safari, Android Chrome, WhatsApp webview opening CTA.
- **Automated**: smoke Playwright visit `/`, assert H1 and CTA href (when e2e exists).

## Open questions

- Brand colours and fonts (`program.md` brand track).
- Official languages list for legal pages.
