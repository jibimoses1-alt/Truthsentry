# Spec-driven development (SDD)

This folder holds **program and feature specifications** used as the single source of truth before implementation. The workflow follows the same idea as [Zencoder’s spec-driven development guide](https://docs.zencoder.ai/user-guides/tutorials/spec-driven-development-guide): define requirements clearly up front, then plan, task, and implement against them.

## Four phases (how we use them here)

1. **Specify** — User-visible outcomes, constraints, non-goals, success metrics, acceptance tests. See `program.md` and [`features/`](./features/README.md).
2. **Plan** — Architecture touchpoints: apps, packages, ADRs, env vars, data boundaries. Each spec has an **Architecture impact** section (aligned with `docs/specs/template.md`).
3. **Tasks** — Trackable work: derive issues or checklist items from the spec’s implementation plan; keep tasks small enough to verify in one PR.
4. **Implement** — Code changes must trace to a spec section or an explicit amendment to the spec.

## Document map

| Spec | Purpose |
| ---- | ------- |
| **[`features/README.md`](./features/README.md)** | **Feature specs (primary):** 27 feats (`feat-0001`–`feat-0026`) with `PRODUCT.md` + `TECH.md` each |
| `program.md` | North star: TruthSentry product, stakeholders, global requirements, non-goals |
| `roadmap.md` | Phased delivery and dependency order (MVP v0.50.00) |
| `landing-page.md` | Marketing / entry site (summary; detail in feat-0008) |
| `web.md` | Authenticated web app (summary; detail in feat-0010–0014) |
| `api.md` | tRPC surface (summary; detail in feat-0003–0006) |
| `claims-ai-pipeline.md` | AI verification vision (detail in feat-0015) |
| `whatsapp-distribution.md` | Campaign channels (detail in feat-0019) |
| `AI_CHATBOT_SPEC.md` | Chat UX deep dive (cross-ref feat-0011; **partially stale**) |
| `AI_CHAT_IMAGE_CONTEXT.md` | Image context for AI (**target**; see feat-0023) |
| `resend-email-implementation.md` | Resend execution contract (**locale defaults stale**; see feat-0006) |

**Feature spec format** matches [`sample/`](../sample/): each folder under `features/feat-NNNN-*` has a product spec (actors, use cases, rules) and a tech spec (routes, APIs, modules, gaps).

Smaller or experimental changes can still use `docs/specs/template.md` under `docs/specs/` and link here when they affect the same flows.

## Rules

- **No secrets in specs** (passwords, API keys, session tokens). Reference only variable names documented in `docs/env/README.md` and values in private `.env` (never committed).
- When behaviour changes, **update the spec** in the same change set as the code when possible.
- Link **ADRs** from `docs/architecture/decisions/` in the Architecture impact section when a decision is involved.
