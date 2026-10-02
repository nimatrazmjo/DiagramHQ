# Current Task: F084 — Architecture drift

**Status**: NOT STARTED

## Description
Documented vs. actual architecture drift detection and governance engine for DiagramHQ (Phase 11 — Drift and Governance):
- Compare documented architecture model against actual imported infrastructure and discovered code state:
  - Surface the delta: added unmanaged objects/connections, modified attributes/properties, removed/missing entities, ungrounded dependencies.
  - Severity classification: `critical`, `high`, `medium`, `low`, `informational`.
  - Evidence-backed delta: includes concrete evidence links from code scanning (F072, F073) and cloud infrastructure discovery (F078-F083).
- User Actions:
  - `Update Model`: Directly reconcile and accept the actual state into the active model.
  - `Ignore`: Suppress specific drift items with reasoning and expiration/waiver.
  - `Create Change Request`: Formulate the detected drift into a structured DiagramHQ Pull Request / Change Proposal (`createChangeRequest` produces a PR ready for architectural review).
- Acceptance test: seeded drift detected; create-change-request produces a PR.

Acceptance Criteria:
- Compare documented vs imported/actual; surface the delta
- Actions: Update Model / Ignore / Create Change Request
- Test: seeded drift detected; create-change-request produces a PR.

- Feature ID: F084
- Phase: 11 — Drift and Governance
- Dependencies: F057, F060, F072, F078, F083, Phase 03, Phase 09, Phase 10

## Next Steps
1. In `packages/domain/src/`, implement the drift detection engine (`drift.ts`):
   - Type definitions: `DriftItem`, `DriftAction`, `DriftDeltaReport`, `DriftSuppression`, `CreateChangeRequestResult`.
   - Comparison engine computing deltas between documented `ArchitectureModel` and actual `ArchitectureModel` / discovered telemetry.
   - Action executors: `applyDriftUpdate`, `ignoreDriftItem`, `createChangeRequestFromDrift`.
   - Unit tests in `packages/domain/src/drift.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<ArchitectureDriftModal />` / Drift inspection drawer in `apps/web/components/canvas/drift-panel.tsx`.
   - Integration specs in `apps/web/drift.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
