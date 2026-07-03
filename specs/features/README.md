# TruthSentry feature specifications

Feature specs follow the **PRODUCT + TECH** pattern from [`sample/`](../../sample/):

| File | Purpose |
|------|---------|
| `PRODUCT.md` | User-visible behavior, actors, use cases, product rules, gaps |
| `TECH.md` | Routes, APIs, data model, modules, implementation gaps, tests |

Program-level north star remains [`../program.md`](../program.md). Vertical summaries in [`../web.md`](../web.md), [`../api.md`](../api.md), etc. are superseded for **feature detail** by this folder when they conflict.

## Feature index

| ID | Feature | PRODUCT | TECH | Depends on |
|----|---------|---------|------|------------|
| [feat-0001](./feat-0001-platform/PRODUCT.md) | Platform & program | [PRODUCT](./feat-0001-platform/PRODUCT.md) | [TECH](./feat-0001-platform/TECH.md) | — |
| [feat-0002](./feat-0002-database/PRODUCT.md) | Database & persistence | [PRODUCT](./feat-0002-database/PRODUCT.md) | [TECH](./feat-0002-database/TECH.md) | — |
| [feat-0003](./feat-0003-api-trpc/PRODUCT.md) | API / tRPC layer | [PRODUCT](./feat-0003-api-trpc/PRODUCT.md) | [TECH](./feat-0003-api-trpc/TECH.md) | feat-0002 |
| [feat-0004](./feat-0004-auth/PRODUCT.md) | Authentication | [PRODUCT](./feat-0004-auth/PRODUCT.md) | [TECH](./feat-0004-auth/TECH.md) | feat-0003, feat-0005, feat-0006 |
| [feat-0005](./feat-0005-session/PRODUCT.md) | Sessions & access control | [PRODUCT](./feat-0005-session/PRODUCT.md) | [TECH](./feat-0005-session/TECH.md) | feat-0004 |
| [feat-0006](./feat-0006-email/PRODUCT.md) | Transactional email | [PRODUCT](./feat-0006-email/PRODUCT.md) | [TECH](./feat-0006-email/TECH.md) | feat-0003, feat-0002 |
| [feat-0007](./feat-0007-i18n/PRODUCT.md) | Internationalisation (ar/en) | [PRODUCT](./feat-0007-i18n/PRODUCT.md) | [TECH](./feat-0007-i18n/TECH.md) | feat-0003 |
| [feat-0008](./feat-0008-landing/PRODUCT.md) | Landing & marketing | [PRODUCT](./feat-0008-landing/PRODUCT.md) | [TECH](./feat-0008-landing/TECH.md) | feat-0007, feat-0009 |
| [feat-0009](./feat-0009-theme-branding/PRODUCT.md) | Theme & branding | [PRODUCT](./feat-0009-theme-branding/PRODUCT.md) | [TECH](./feat-0009-theme-branding/TECH.md) | — |
| [feat-0010](./feat-0010-chat-threads/PRODUCT.md) | Chat threads (claims list) | [PRODUCT](./feat-0010-chat-threads/PRODUCT.md) | [TECH](./feat-0010-chat-threads/TECH.md) | feat-0004, feat-0005 |
| [feat-0011](./feat-0011-chat-messaging/PRODUCT.md) | Chat messaging & composer | [PRODUCT](./feat-0011-chat-messaging/PRODUCT.md) | [TECH](./feat-0011-chat-messaging/TECH.md) | feat-0010, feat-0015 |
| [feat-0012](./feat-0012-chat-uploads/PRODUCT.md) | Image uploads | [PRODUCT](./feat-0012-chat-uploads/PRODUCT.md) | [TECH](./feat-0012-chat-uploads/TECH.md) | feat-0011, feat-0003 |
| [feat-0013](./feat-0013-chat-realtime/PRODUCT.md) | Realtime (WebSocket) | [PRODUCT](./feat-0013-chat-realtime/PRODUCT.md) | [TECH](./feat-0013-chat-realtime/TECH.md) | feat-0011, feat-0005 |
| [feat-0014](./feat-0014-chat-outbox/PRODUCT.md) | Client message outbox | [PRODUCT](./feat-0014-chat-outbox/PRODUCT.md) | [TECH](./feat-0014-chat-outbox/TECH.md) | feat-0011 |
| [feat-0015](./feat-0015-claims-ai/PRODUCT.md) | Claims & AI pipeline | [PRODUCT](./feat-0015-claims-ai/PRODUCT.md) | [TECH](./feat-0015-claims-ai/TECH.md) | feat-0011, feat-0006 |
| [feat-0016](./feat-0016-rate-limiting/PRODUCT.md) | Rate limiting | [PRODUCT](./feat-0016-rate-limiting/PRODUCT.md) | [TECH](./feat-0016-rate-limiting/TECH.md) | feat-0003 |
| [feat-0017](./feat-0017-legal/PRODUCT.md) | Legal pages | [PRODUCT](./feat-0017-legal/PRODUCT.md) | [TECH](./feat-0017-legal/TECH.md) | feat-0007, feat-0008 |
| [feat-0018](./feat-0018-admin/PRODUCT.md) | Admin & human review | [PRODUCT](./feat-0018-admin/PRODUCT.md) | [TECH](./feat-0018-admin/TECH.md) | feat-0015, feat-0005 |
| [feat-0019](./feat-0019-whatsapp-distribution/PRODUCT.md) | WhatsApp & campaigns | [PRODUCT](./feat-0019-whatsapp-distribution/PRODUCT.md) | [TECH](./feat-0019-whatsapp-distribution/TECH.md) | feat-0008, feat-0004 |
| [feat-0020](./feat-0020-audio-input/PRODUCT.md) | Voice input (Whisper) | [PRODUCT](./feat-0020-audio-input/PRODUCT.md) | [TECH](./feat-0020-audio-input/TECH.md) | feat-0011 |
| [feat-0021](./feat-0021-health-observability/PRODUCT.md) | Health & observability | [PRODUCT](./feat-0021-health-observability/PRODUCT.md) | [TECH](./feat-0021-health-observability/TECH.md) | feat-0003 |
| [feat-0022](./feat-0022-ui-design-system/PRODUCT.md) | Shared UI / design system | [PRODUCT](./feat-0022-ui-design-system/PRODUCT.md) | [TECH](./feat-0022-ui-design-system/TECH.md) | feat-0007, feat-0009 |
| [feat-0023](./feat-0023-ai-image-context/PRODUCT.md) | AI vision / image context (target) | [PRODUCT](./feat-0023-ai-image-context/PRODUCT.md) | [TECH](./feat-0023-ai-image-context/TECH.md) | feat-0012, feat-0015 |
| [feat-0024](./feat-0024-client-errors-toasts/PRODUCT.md) | Client errors & toasts | [PRODUCT](./feat-0024-client-errors-toasts/PRODUCT.md) | [TECH](./feat-0024-client-errors-toasts/TECH.md) | feat-0003, feat-0007 |
| [feat-0025](./feat-0025-seo-metadata/PRODUCT.md) | SEO, metadata & PWA | [PRODUCT](./feat-0025-seo-metadata/PRODUCT.md) | [TECH](./feat-0025-seo-metadata/TECH.md) | feat-0007, feat-0008 |
| [feat-0026](./feat-0026-testing-ci/PRODUCT.md) | Testing & CI | [PRODUCT](./feat-0026-testing-ci/PRODUCT.md) | [TECH](./feat-0026-testing-ci/TECH.md) | feat-0001 |

## Suggested implementation / review order

1. feat-0002 → feat-0003 → feat-0004 → feat-0005 → feat-0006  
2. feat-0007 → feat-0009 → feat-0008 → feat-0022 → feat-0025  
3. feat-0016 → feat-0010 → feat-0011 → feat-0012 → feat-0013 → feat-0014 → feat-0024  
4. feat-0015 → feat-0023 (when multimodal) → feat-0018  
5. feat-0017, feat-0019, feat-0020, feat-0021, feat-0026 (parallel or as needed)

## Rules

- No secrets in specs (reference env var names only; see `docs/env/README.md`).
- When code changes behavior, update the matching PRODUCT or TECH spec in the same change set when possible.
- **Implementation status** is called out in each TECH spec under **Known gaps**.
