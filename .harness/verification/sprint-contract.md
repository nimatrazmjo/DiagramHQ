# Sprint Contract — F013: Multi-Select

Feature: F013 — Multi-select
Phase: Phase 02 — Canvas
Date: 2026-09-26

## 1. Scope & Acceptance Criteria
- [ ] Shift-click and modifier-click to toggle individual objects in and out of the multi-selection.
- [ ] Marquee box-selection: Drag to draw a selection rectangle that selects all intersecting/contained objects on the canvas.
- [ ] UI feedback: Distinct multi-selection badge ("MULTI-SELECT (N ITEMS)"), clear selection action, and active focus rings on all selected nodes.
- [ ] Group move: Dragging any selected object moves all selected objects simultaneously, strictly preserving their relative offsets/positions.
- [ ] Multi-node command layer persistence: `MoveNodesCommand` implementing the `Command` interface, dispatching batched coordinate updates through `CommandDispatcher` with full undo/redo capability.
- [ ] API batch layout endpoint: `PATCH /views/:viewId/objects/positions` to atomically persist multiple object positions in a single transaction with multi-tenant and role authorization guards.
- [ ] Monorepo verification: `pnpm verify` (typecheck, lint, test, check-architecture) and `pnpm build` pass with zero errors.

## 2. Boundaries & Invariants
- Rule 3: Canvas code mutates ONLY via client-model command layer (never direct fetch).
- Rule 4: Canvas holds NO domain entity models in Zustand (transient viewport and selection IDs only).
- Zero `any` types across all packages and apps.

## 3. Worker Decomposition
- **Sub-Agent 1: API Batch Layout Worker**
  - Scope: `apps/api/src/views/` (`views.dto.ts`, `views.service.ts`, `views.controller.ts`, `views.service.spec.ts`, `views.e2e.spec.ts`)
  - Deliverables: `BatchUpdateObjectPositionsDto`, `updateMultipleObjectPositions` method, `PATCH :viewId/objects/positions` endpoint, unit & E2E tests.
- **Sub-Agent 2: Web Command & Multi-Select Canvas Worker**
  - Scope: `apps/web/lib/commands/` (`move-nodes-command.ts`, `index.ts`), `apps/web/lib/canvas-store.ts`, `apps/web/components/canvas/infinite-canvas.tsx`, `apps/web/multi-select.spec.ts`
  - Deliverables: `MoveNodesCommand` with batch execution and undo, marquee box-selection props and toggle mode, group drag stop handler preserving relative coordinates, unit & component tests.

## 4. Verification Targets
- All monorepo tests pass.
- Evaluator rubric score >= 4.5/5.0.
