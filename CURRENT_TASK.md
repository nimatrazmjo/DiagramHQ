# Current Task: F128 — Cost visualization

**Status**: NOT STARTED

## Description
Cloud cost estimation and architectural cost overlay engine for DiagramHQ (Phase 10 — Infrastructure Integrations):
- Attach cloud cost data to infrastructure architecture model objects:
  - Per-service and per-resource cost models: monthly spend, hourly rate, currency (`USD`, `EUR`, `GBP`), billing period, cost breakdown (base compute, storage, egress/transfer, licenses/support).
  - Cost categorization: compute, database, storage, networking, messaging, other.
- Cost rollups and architectural aggregations:
  - System, group (VPC/VNet/Namespace), and architecture-level rollups.
  - Per-service rollup grouped by category (compute / db / storage / networking).
  - Budget thresholds, cost anomalies, and projected monthly growth.
- Grounded cost evidence:
  - Traceable `CostEvidence` (`sourceType: 'cloud_billing'`) with billing account ID, meter ID, provider, rate, and calculation timestamp.
- Canvas UI Integration:
  - `<CostVisualizationModal />` / Cost overlay badge on canvas: visual cost chips on nodes, cost breakdown by category, currency selector, and budget warning indicators.

Acceptance Criteria:
- Attach cloud cost to infra objects; per-service rollup (compute/db/storage/networking)
- Test: mocked cost data rolls up per service.

- Feature ID: F128
- Phase: 10 — Infrastructure Integrations (Final Feature of Phase 10!)
- Dependencies: F078, F079, F080, F081, F082, F083, Phase 03, Phase 09

## Next Steps
1. In `packages/domain/src/`, implement the cost visualization domain module (`cost-visualization.ts`):
   - Type definitions: `CloudCostSpec`, `ResourceCost`, `ServiceCostRollup`, `ArchitectureCostReport`, `CostCategory`, `CostEvidence`.
   - Functions: `attachCostToObject`, `calculateServiceCostRollup`, `calculateArchitectureCostReport`, `createMockCostDataset`.
   - Unit tests in `packages/domain/src/cost-visualization.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<CostVisualizationModal />` in `apps/web/components/canvas/cost-panel.tsx`.
   - Integration specs in `apps/web/cost.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
