# Program specification: TruthSentry

> **Spec status:** For feature-level behaviour and implementation detail, prefer [`features/README.md`](./features/README.md) (feat-0001 through feat-0026). This program doc is the **north star**; where it conflicts with feature specs on shipped behaviour, **feature specs win** until this file is amended.

## Status

Living document. Last aligned to MVP target **v0.50.00** (monorepo with web + API). **UI locales:** Modern Standard Arabic + English (`ar` / `en`) per [feat-0007](./features/feat-0007-i18n/PRODUCT.md) — not French/English as originally drafted below.

## Problem

People need a trustworthy way to **submit claims** in **Arabic or English** (claim body may use extended Arabic script), receive **AI-assisted verification** when the system can answer with confidence, and have **low-confidence** items **stored for human review** without losing context. Access is primarily through **links** shared via **WhatsApp** or other campaign channels, plus a **web** experience for chat and account management.

## Stakeholders

- **End users**: claimants using mobile web from shared links; primary UI locales are Arabic (MSA) and English per feat-0007.
- **Reviewers / admins**: staff who resolve unmatched claims and correct the system over time.
- **Operators**: people configuring campaigns, domains, email, and hosting (not hard-coded into application specs).

## Goals

1. **Claim submission** from the web with clear consent, language/locale support, and stable persistence.
2. **AI-verified responses** when confidence and policy checks pass; transparent messaging when the system cannot verify.
3. **Unmatched claim queue** with enough metadata for humans to decide quickly (original text, locale, timestamps, model metadata, channel).
4. **Email + password authentication** for end users and a separate **admin** authentication path with stronger posture (see non-goals for what “admin” does not include in MVP).
5. **Transactional email** (Resend) for account lifecycle and critical notifications—not unbounded marketing sends from the app core.
6. **Supabase-hosted Postgres** as system of record via **Prisma**; API boundary via **tRPC** from **Next.js** web and Node API as designed in ADRs.

## Non-goals (MVP boundary)

- **Native WhatsApp Business API bot** as the primary UX (out of scope unless a later spec adds it); MVP assumes **link-out to web** unless explicitly expanded.
- **Full legal case management** (evidence bundles, courts, deadlines) beyond storing claim text and review state.
- **Public npm publishing** of workspace packages.
- **Storing operator credentials or third-party secrets inside this repository or in specs**; use environment configuration only.

## Success criteria (measurable)

| ID   | Criterion                  | Measurement                                                                                                                   |
| ---- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| SC-1 | Claim persistence          | 100% of submitted claims persist with user id (if authenticated), timestamp, locale, and raw text.                            |
| SC-2 | Response path clarity      | User always sees one of: verified answer, “cannot verify” with next steps, or “queued for review” within one session.         |
| SC-3 | Human queue usability      | Reviewer can open an unmatched item and see original claim + context without running ad hoc SQL.                              |
| SC-4 | Security baseline          | No secrets in git; auth sessions invalidated on password change where applicable; service role keys never exposed to browser. |
| SC-5 | Availability of core flows | Landing + auth + submit + history reachable on staging with monitoring on 5xx for API routes.                                 |

## Functional requirements (program level)

### FR-1 Distribution and entry

- Campaigns produce **stable URLs** (landing or deep link into app) with optional **query parameters** for attribution (documented in `whatsapp-distribution.md`).
- Landing explains purpose, languages supported, and link to sign-in / sign-up.

### FR-2 Identity and access

- **Email + password** for end users (implementation detail in `web.md` / `api.md`; provider choice for “magic link only” is out unless spec amended).
- **Admin** role can access review queue and internal dashboards only after admin auth (see `web.md`).

### FR-3 Claims lifecycle

- States at minimum: `submitted`, `ai_answered`, `ai_unable`, `queued_human`, `human_resolved` (exact enum in data spec / Prisma when implemented).
- Transitions logged with actor (system, user id, admin id) and timestamp.

### FR-4 AI and matching

- Described in `claims-ai-pipeline.md`: embedding or retrieval strategy, confidence thresholds, PII handling, and fallback to human queue.

### FR-5 Email

- Align with `docs/rules/email-rules.md` and ADR for Resend: transactional templates, idempotency keys where sends are triggered from state transitions.

### FR-6 Internationalisation

- UI shell supports **Arabic (MSA, default) and English** per [feat-0007](./features/feat-0007-i18n/PRODUCT.md); **claim body** must accept Unicode without corruption; language detection optional (`claimLanguage` ar/en).

## Non-functional requirements

- **Privacy**: minimise PII in logs; retention policy to be stated before production (open question until legal sign-off).
- **Performance**: p95 API round-trip for “submit claim” under staging SLO to be set (e.g. 3s excluding third-party AI latency).
- **Observability**: structured logs for claim state transitions and AI invocation outcomes (no raw secrets).

## Architecture impact

- **Apps**: `apps/web`, `apps/api` (as scaffolded).
- **Packages**: `packages/trpc`, `packages/prisma`, `packages/emails`, `packages/ui`, future `packages/ai` or equivalent for RAG.
- **ADRs**: repo boundaries, tRPC boundary, data access, Resend, testing strategy (`docs/architecture/decisions/`).

## Acceptance tests (program)

1. Anonymous visitor opens landing, switches locale (if implemented), reaches sign-up.
2. User signs up, verifies email if required by implementation, signs in, submits a claim in Latin and extended Arabic script sample text; text round-trips unchanged.
3. User receives either AI path response or explicit queue message; refresh does not duplicate claim (idempotency at API).
4. Admin signs in via admin path, sees queued item created in step 3, marks resolved with note; end user sees updated status when applicable.

## Open questions

- Retention period for claims and model outputs.
- Whether WhatsApp Cloud API becomes in-thread capture in v0.51+.
- Jurisdiction and data residency relative to Supabase region.

## Security note

Do **not** paste passwords, API keys, or production URLs with embedded credentials into any spec or issue. Use `docs/env/README.md` and private environment stores only.
