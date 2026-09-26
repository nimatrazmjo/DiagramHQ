# Sprint Contract — F012 (Drag and Drop)

Written by the Planner before any code. It fixes "done" so the Generator cannot drift and the Evaluator has something objective to grade against.

## Feature
- Id: F012
- Title: Drag and drop
- Phase / slice: Phase 02 — Canvas

## Goal (one sentence)
Reposition objects on the canvas via drag-and-drop and persist per-view layout coordinates to `view_objects` through a decoupled client-model command layer adhering to Layer Boundaries Rule 3.

## Acceptance -> checks
Map each acceptance item from `PHASE-02-CANVAS.md` to how it will be verified.
| Acceptance item | How verified (command / test / screenshot) |
|---|---|
| Drag a node to reposition on canvas | Component tests in `apps/web/drag-drop.spec.ts` asserting node drag event updates position and dispatches move command |
| Position persists to `view_objects` (per-view layout) | API integration tests in `apps/api/src/views/views.e2e.spec.ts` testing `PATCH /views/:viewId/objects/:objectId/position` |
| Mutations go through client-model command layer (Rule 3) | `MoveNodeCommand` in `apps/web/lib/commands/` dispatches mutation; canvas does not call fetch directly |
| Test: drag persists position; reload restores it | E2E test verifying position persistence and subsequent view fetch retrieval with stored (x, y) coordinates |

## Plan (steps)
1. In `apps/api/src/views/`:
   - `views.dto.ts`: `UpdateObjectPositionDto` with `@IsNumber() x`, `@IsNumber() y`.
   - `views.service.ts`: `updateObjectPosition(userId, viewId, objectId, position)` verifying tenant membership & `canWrite` role.
   - `views.controller.ts`: `PATCH /views/:viewId/objects/:objectId/position` and `GET /views/:viewId/objects`.
   - `views.module.ts`: Register in `AppModule`.
   - `views.service.spec.ts` & `views.e2e.spec.ts`.
2. In `apps/web/lib/commands/`:
   - `command.ts`: `Command<T>` interface and `CommandDispatcher`.
   - `move-node-command.ts`: `MoveNodeCommand` implementing `execute()` and `undo()`.
3. In `apps/web/components/canvas/infinite-canvas.tsx`:
   - Wire `onNodeDragStop` to dispatch `MoveNodeCommand`.
4. In `apps/web/drag-drop.spec.ts`:
   - Test command execution, undo, drag event dispatching, and reload restoration.
5. Verification:
   - Run `pnpm verify` and `pnpm build`.

## In scope
- API endpoints for `view_objects` position persistence.
- Client-model command layer (`Command`, `MoveNodeCommand`, `CommandDispatcher`).
- Canvas `onNodeDragStop` integration.
- Unit and integration tests.

## Explicitly out of scope (parked)
- Multi-select marquee (F013).
- Alignment grid snapping (F014).
- Auto-layout engines (F015).
- Full session undo/redo history stack (F016).

## Boundaries touched
- `apps/api/src/views/*`
- `apps/api/src/app.module.ts`
- `apps/web/lib/commands/*`
- `apps/web/components/canvas/infinite-canvas.tsx`
- `apps/web/drag-drop.spec.ts`

## Definition of done
- All acceptance checks green + evidence recorded.
- `check-architecture` passes (Rule 3 clean).
- Evaluator score >= 4.0.
- State + handoff updated, committed on `feat/F012-drag-and-drop`.

---
Signed off (Planner) before build: [x]
