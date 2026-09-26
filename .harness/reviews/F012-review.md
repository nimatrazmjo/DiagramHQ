# Code Review — F012 (Drag and drop)

Reviewer: Evaluator (Rubric-based). Date: 2026-09-26.
Branch: `feat/F012-drag-and-drop`.
Target: Drag objects on the canvas to reposition them. Position updates persist in the view layout state via the client-model command layer (ADR-0002 / Layer Boundary Rule 3).

## Evaluator Rubric Scores
- **Acceptance completeness**: 5/5
  - Drag objects to reposition: Nodes can be dragged on canvas; `onNodeDragStop` event handler is bound in `InfiniteCanvas`.
  - Client-model command layer: `MoveNodeCommand` implements `Command<{ x: number; y: number }>` with both `execute()` and `undo()`. Dispatched via `CommandDispatcher` (singleton `defaultCommandDispatcher`), ensuring canvas components never make direct HTTP calls (strictly enforcing Layer Boundary Rule 3).
  - Position updates persist in view layout state: NestJS API endpoint `PATCH /views/:viewId/objects/:objectId/position` updates/upserts `ViewObject.position` in the PostgreSQL database.
  - Role-based permissions & multi-tenancy: Only members with write access (`owner`, `admin`, `editor`) can mutate layout positions; `viewer` role receives `403 Forbidden` (`canWrite` guard). Cross-tenant requests return `404 Not Found`.
  - Tests: 17 new tests in `apps/web/drag-drop.spec.ts` (command execution, undo/redo, history tracking, canvas drag stop dispatch) and 11 new tests in `apps/api/src/views/views.service.spec.ts` & `views.e2e.spec.ts` (unit & integration tests against live DB).
- **Correctness**: 5/5
  - Drag stop event cleanly captures prior position and final position, executing `MoveNodeCommand`.
  - Database upsert handles both first-time placed objects and existing positioned objects in view.
  - Multi-tenant tenant verification prevents unauthorized access or position manipulation across workspaces.
- **Boundary & scope compliance**: 5/5
  - Rule 3 strictly honored: Canvas code mutates only via client-model command layer. No `fetch` calls in canvas components.
  - Rule 4 strictly honored: Canvas holds no domain entity models in Zustand; only transient coordinates and IDs.
  - Zero `any` types. Architecture checks (`./scripts/check-architecture.sh`) clean.
- **Modularity**: 5/5
  - Clean separation: Command layer (`apps/web/lib/commands/`), canvas renderer (`apps/web/components/canvas/`), API view persistence (`apps/api/src/views/`).
- **Evidence & handoff quality**: 5/5
  - 273 automated tests passing monorepo-wide (34 domain, 98 web, 141 api).
  - Production build clean across Next.js and NestJS targets.

**Average Score**: 5.0 / 5.0
**Verdict**: PASS

## Verification Summary
- `pnpm prisma:generate`: Clean.
- `pnpm build:domain`: Clean.
- `pnpm typecheck`: Clean across all packages and apps (0 errors).
- `pnpm lint`: Clean (0 errors, 0 warnings).
- `pnpm test`: 273 tests passed (34 domain, 98 web, 141 api).
- `pnpm build`: Clean production build across all Next.js and NestJS targets.
- Architecture check: `./scripts/check-architecture.sh` -> clean.

## PR Review — Round 1 (PR #13)
Independent pass over the pull request diff:
1. **Command Layer Implementation**:
   - `Command<T>` interface and `MoveNodeCommand` implement command pattern with undo capability.
   - `CommandDispatcher` provides transactional dispatch, undo/redo history, and decoupling from React components.
2. **Infinite Canvas Drag Integration**:
   - `InfiniteCanvas` binds `onNodeDragStop`, captures origin and destination positions, dispatches `MoveNodeCommand`.
3. **API View Object Persistence**:
   - `ViewsModule`, `ViewsService`, and `ViewsController` expose `PATCH /views/:viewId/objects/:objectId/position` and `GET /views/:viewId/objects`.
   - Role guard enforces `canWrite` permission; non-members receive 404.
4. **Automated Testing**:
   - 28 new tests added (17 web, 11 api). 273 total passing tests.

**PR Verdict**: CLEAN. Exiting PR review loop.
