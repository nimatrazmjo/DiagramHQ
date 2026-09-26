# Sprint Contract — F018: Architecture model

Feature: F018 — Architecture model
Phase: Phase 03 — Architecture Model
Date: 2026-09-26

## 1. Scope & Acceptance Criteria
- [x] Architecture holds objects + connections independent of diagrams:
  - Domain types and model snapshot interface (`ArchitectureModel`) in `packages/domain`.
  - Architecture entity persists independently from views/diagrams; views only contain projection layouts.
- [x] CRUD via API; save/load; reload yields an identical model:
  - API endpoints for Architecture, ModelObject, and ModelConnection lifecycle.
  - Invariants strictly enforced: `canConnect`, `validateConnection`, `hasParentCycle`, RBAC `canWrite`.
  - Saving objects & connections and reloading the architecture model yields an identical model structure (`isModelIdentical`).
- [x] Optimistic writes with rollback on error:
  - Client-side model manager applies optimistic writes to local state immediately.
  - If backend mutation fails/rejects, rollback cleanly restores the previous model snapshot without data loss or inconsistency.
- [x] Layer Boundary Invariants:
  - Rule 1: Dependency direction strictly packages/domain <- apps/api and packages/domain <- apps/web.
  - Rule 3: Canvas code mutates ONLY via client-model command layer.
  - Rule 4: Canvas holds no domain entity models in Zustand (transient UI/viewport/selection flags only).
  - Zero `any` types across all changes.
- [x] Monorepo verification:
  - `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build` pass with zero errors.
