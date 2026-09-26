# Current Task

Feature ID: F012
Feature: Drag and drop (Reposition objects, position persists to view_objects, command layer mutations)
Status: COMPLETE
Phase: Phase 02 — Canvas

## Objective
Reposition objects on the canvas via drag-and-drop and persist per-view layout coordinates to `view_objects` through a decoupled client-model command layer adhering to Layer Boundaries Rule 3.

## Prerequisite
F011 (Object selection) is COMPLETE and merged to `main`. Branch `feat/F012-drag-and-drop` is active.

## Steps
- [x] Implement `ViewsModule` in `apps/api/src/views/` (`PATCH /views/:viewId/objects/:objectId/position`, `GET /views/:viewId/objects`)
- [x] Add unit and E2E integration tests in `apps/api/src/views/views.service.spec.ts` and `views.e2e.spec.ts`
- [x] Implement client-model command layer in `apps/web/lib/commands/` (`Command`, `MoveNodeCommand`, `CommandDispatcher`)
- [x] Connect `onNodeDragStop` in `InfiniteCanvas` to dispatch `MoveNodeCommand`
- [x] Implement tests in `apps/web/drag-drop.spec.ts`
- [x] Run full verification suite (`pnpm verify` + `pnpm build`)

## Verification
- [x] TypeScript: PASS · Lint: PASS · Unit/Integration: PASS · Build: PASS · check-architecture: PASS

## Do Not
- Store domain entity models inside Zustand stores (layer-boundaries rule 4).
- Call fetch directly from canvas components (layer-boundaries rule 3).

## Next Task
F013 — Multi-select.

## Last Updated
2026-09-26
