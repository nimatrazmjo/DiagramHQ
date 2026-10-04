# Current Task: F132 — Billing & plans

**Status**: COMPLETE

## Description
Monetization & Tier Gating Architecture (Phase 13 — Enterprise):
- Tier Gating & Quota Management (`@diagramhq/domain`):
  - 4 Progressive tiers: Free, Pro, Business, Enterprise with monthly/annual pricing.
  - Enterprise feature gating matrix (`FEATURE_MINIMUM_TIERS`) covering AI Copilot, collaboration, Git sync, clean export, SSO/SAML, SCIM, org policies, advanced RBAC, compliance packs, private VPC, custom audit retention, and SLA support.
  - Quantitative usage limits for seats, model objects, diagram views, AI query credits, and audit retention.
  - Strict enforcement functions: `enforceTierGating` (throwing `TierGatingError`) and `enforceUsageLimit` (throwing `UsageLimitExceededError`).
  - Invoice calculation (`calculateInvoice`) with transparent annual discount rates.
- Web & Component Layer (`@diagramhq/web`):
  - `apps/web/components/enterprise/billing-modal.tsx`: Interactive modal with tier comparison cards, live usage consumption progress meters, feature entitlement matrix, upgrade checkout, and interactive enforcement simulator.
  - `apps/web/components/enterprise/index.ts`: Exported `BillingModal`.
- Acceptance criteria:
  - Free/Pro/Business/Enterprise tiers gate features; usage limits
  - Test: tier gating enforced; over-limit blocked.

- Feature ID: F132
- Phase: 13 — Enterprise
- Dependencies: None

## Evidence
- Domain: `packages/domain/src/billing-plans.ts`, `packages/domain/src/billing-plans.test.ts` (9 tests passing)
- Web: `apps/web/components/enterprise/billing-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/billing.spec.tsx` (3 tests passing)
- Reviews: `.harness/reviews/F132-PR.md`, `.harness/reviews/F132-review.md`

## Next Feature
- **Phase 13 — Enterprise**: **F133 — Marketplace** (Templates, integration plugins, technology catalogs, AI agents, rules, compliance packs; install flow; test: install a template pack; assets appear)
