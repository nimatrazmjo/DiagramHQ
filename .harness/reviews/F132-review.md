# Feature Review Audit: F132 — Billing & Plans

## Acceptance Criteria Checklist
- [x] **Tier Gating Architecture**: Free/Pro/Business/Enterprise tiers gate platform features and permissions (`FEATURE_MINIMUM_TIERS`, `checkFeatureAccess`, `enforceTierGating`).
- [x] **Usage Limits**: Explicit quotas for seats, architecture model objects, diagram views, AI query credits, and audit log retention days (`checkUsageLimit`, `enforceUsageLimit`).
- [x] **Test: Tier gating enforced; over-limit blocked**:
  - Gated feature invocation on lower tiers is strictly blocked by `TierGatingError`.
  - Quota-exceeding operations (e.g. allocating seats/objects beyond tier limits) are strictly blocked by `UsageLimitExceededError`.
  - Verified across 9 domain unit tests in `billing-plans.test.ts` and 3 web integration tests in `billing.spec.tsx`.

## Review Sign-off
- **Architectural Boundary**: Zero runtime dependencies in `@diagramhq/domain`.
- **Component Design**: Accessible modal dialog in `@diagramhq/web` with live usage meters and tier comparison.
- **Status**: APPROVED for merge to `main`.
