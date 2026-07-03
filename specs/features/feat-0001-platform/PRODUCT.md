# feat-0001: TruthSentry platform (program)

## Summary

TruthSentry is a **web-first fact-checking product**: users submit **claims** (text, links, images) in **Arabic or English**, receive **AI-assisted verification** when curated sources support an answer, and enter a **human review path** when confidence is low. Distribution is primarily **campaign links** (WhatsApp and similar) to a **locale-prefixed** marketing site, then **auth**, then **chat**.

This spec is the **product umbrella** for all feature specs under `specs/features/`. Detailed behavior lives in child feats; [`../../program.md`](../../program.md) remains the stakeholder-facing program document.

## Problem

Viral claims spread faster than manual review. Users need a single place to submit dossiers in their language, see clear verdicts or honest uncertainty, and trust that sensitive items reach humans. Operators need attributable campaigns without building separate tools per channel.

## Non-goals (MVP)

- Native WhatsApp Business API bot as primary UX ([feat-0019](../feat-0019-whatsapp-distribution/PRODUCT.md) covers link-out only).
- Full legal case management beyond claim text + review metadata.
- Public npm publishing of monorepo packages.
- Dialectal Arabic UI (MSA only per [feat-0007](../feat-0007-i18n/PRODUCT.md)).

## Actors

| Actor | Description |
|-------|-------------|
| **Claimant** | End user submitting claims via web chat after sign-in. |
| **Reviewer / admin** | Staff with `ADMIN` role; human queue ([feat-0018](../feat-0018-admin/PRODUCT.md)). |
| **Campaign operator** | Configures links/UTM outside app; attribution spec in feat-0019. |
| **Platform** | AI, email, storage, rate limits. |

## Product funnel

```text
Campaign / organic link → /{locale}/ landing → sign-up or sign-in → /{locale}/chat → claim threads
```

## Core capabilities (feature map)

| Capability | Feature spec |
|------------|--------------|
| Postgres persistence | feat-0002 |
| tRPC API + Node server | feat-0003 |
| Register, login, verify, reset | feat-0004 |
| HttpOnly session cookie | feat-0005 |
| Resend transactional mail | feat-0006 |
| ar/en UI, RTL | feat-0007 |
| Marketing site | feat-0008 |
| Light/dark, logos | feat-0009 |
| Thread sidebar | feat-0010 |
| Send/receive messages | feat-0011 |
| Image evidence | feat-0012 |
| Live updates | feat-0013 |
| Offline outbox | feat-0014 |
| AI fact-check + metadata | feat-0015 |
| Abuse throttling | feat-0016 |
| Privacy/terms stubs | feat-0017 |
| Admin queue (partial) | feat-0018 |
| Campaign attribution (planned) | feat-0019 |
| Mic → text (partial) | feat-0020 |
| Health + email webhooks | feat-0021 |
| Shared UI kit (`packages/ui`) | feat-0022 |
| AI vision for attachments (target) | feat-0023 |
| Client error codes + toasts | feat-0024 |
| SEO / OG / sitemap / manifest | feat-0025 |
| Unit tests + CI contract | feat-0026 |

## Use case catalog (program level)

| ID | Use case | Success outcome |
|----|----------|-----------------|
| **UC-P01** | Visitor understands product from landing | Reaches sign-up or sign-in |
| **UC-P02** | User creates account and verifies email | Can open chat |
| **UC-P03** | User submits claim in Arabic or English | Text stored; language detected |
| **UC-P04** | AI can verify with policy | Verdict + assistant message; user notified |
| **UC-P05** | AI cannot verify confidently | User sees queue message; email optional |
| **UC-P06** | Admin reviews queue (future) | Claim status updated; user informed |
| **UC-P07** | User returns on mobile | Session or re-auth; thread history intact |

## Success criteria

| ID | Criterion |
|----|-----------|
| SC-1 | Claims persist with user id, timestamps, locale fields, raw text |
| SC-2 | User always sees verified answer, cannot-verify, or queued path in one session |
| SC-3 | No secrets in git; service role keys never in browser |
| SC-4 | Landing + auth + chat reachable on staging |

## Open questions

- Claim retention period and model output retention.
- WhatsApp in-thread capture timeline (feat-0019).
- Data residency vs Supabase region.

## Related

- [`../../program.md`](../../program.md)
- [`../../roadmap.md`](../../roadmap.md)
- [`../README.md`](../README.md)
