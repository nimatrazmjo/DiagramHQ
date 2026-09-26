# Current Task

Feature ID: F013
Feature: Multi-select (Shift-click, marquee box-select, group move preserving relative positions)
Status: IN PROGRESS
Phase: Phase 02 — Canvas

## Objective
Enable multi-object selection (via Shift-click, marquee box-select) and group dragging that preserves relative positions of all selected objects, persisted through the client-model command layer (`MoveNodesCommand`) and atomic API batch endpoint.

## Prerequisite
F012 (Drag and drop) is COMPLETE and merged to `main` (PR #13). Branch `feat/F013-multi-select` is active.

## Steps
- [ ] Implement batch position updates in `apps/api/src/views/` (`BatchUpdateObjectPositionsDto`, `updateMultipleObjectPositions`, `PATCH /views/:viewId/objects/positions`)
- [ ] Add unit and E2E integration tests in `apps/api/src/views/views.service.spec.ts` and `views.e2e.spec.ts`
- [ ] Implement `MoveNodesCommand` in `apps/web/lib/commands/move-nodes-command.ts` and export from `apps/web/lib/commands/index.ts`
- [ ] Enhance `InfiniteCanvas` to support marquee box-selection (`selectionMode="partial"`, `selectionKeyCode="Shift"`, `selectionOnDrag` toggle mode, `multiSelectionKeyCode`) and group dragging preserving relative offsets
- [ ] Implement comprehensive tests in `apps/web/multi-select.spec.ts`
- [ ] Run full verification suite (`pnpm verify` + `pnpm build`)

## Verification
- [ ] TypeScript: PASS · Lint: PASS · Unit/Integration: PASS · Build: PASS · check-architecture: PASS

## Do Not
- Store domain entity models inside Zustand stores (layer-boundaries rule 4).
- Call fetch directly from canvas components (layer-boundaries rule 3).

## Next Task
F014 — Alignment.

## Last Updated
2026-09-26
