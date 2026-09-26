# Sprint Contract — F016: Undo/redo

Feature: F016 — Undo/redo
Phase: Phase 02 — Canvas
Date: 2026-09-26

## 1. Scope & Acceptance Criteria
- [x] Command layer records reversible commands with per-session UI state (`CommandDispatcher.history` and `undone`).
- [x] Keyboard shortcuts: <kbd>Cmd</kbd>+<kbd>Z</kbd> / <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> (Mac) and <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> (Windows/Linux) when focus is not in text inputs.
- [x] Covered operations:
  - `create`: `CreateNodeCommand` (creates a node, undo removes it).
  - `connect`: `ConnectNodesCommand` (creates an edge, undo removes it).
  - `move`: `MoveNodeCommand` & `MoveNodesCommand` (moves nodes, undo restores positions).
  - `delete`: `DeleteNodeCommand` (removes node and connected edges, undo restores them).
  - `metadata edit`: `UpdateNodeMetadataCommand` (edits node data, undo reverts to previous data).
  - `align` & `layout`: `AlignNodesCommand` & `ApplyLayoutCommand` (undo restores previous positions).
- [x] Canvas state synchronization: Calling `undo()` or `redo()` synchronizes React Flow local nodes and edges so visual position and diagram contents update on screen immediately.
- [x] UI feedback: Undo (↶) and Redo (↷) buttons on the canvas toolbar with disabled states when history or undone stack is empty (`canUndo`, `canRedo`).
- [x] History is per-session UI state (not persisted across page reloads).
- [x] Monorepo verification: `pnpm verify` (typecheck, lint, test, check-architecture) and `pnpm build` pass with zero errors.

## 2. Boundaries & Invariants
- Rule 3: Canvas code mutates ONLY via client-model command layer (never direct fetch).
- Rule 4: Canvas holds NO domain entity models in Zustand (transient viewport and selection IDs only).
- Zero `any` types without explanation.

## 3. Implementation Steps
1. Update `apps/web/lib/commands/command.ts` and `dispatcher.ts` with `canUndo`, `canRedo`, `peekUndo`, `peekRedo`, `subscribe`, and `applyCanvasUpdate` interface.
2. Implement new command classes:
   - `create-node-command.ts` (`CreateNodeCommand`)
   - `delete-node-command.ts` (`DeleteNodeCommand`)
   - `connect-nodes-command.ts` (`ConnectNodesCommand`)
   - `update-metadata-command.ts` (`UpdateNodeMetadataCommand`)
3. Add `applyCanvasUpdate` to existing command classes (`move-node-command.ts`, `move-nodes-command.ts`, `align-nodes-command.ts`, `apply-layout-command.ts`).
4. Re-export all commands from `apps/web/lib/commands/index.ts`.
5. Integrate undo/redo handling, keyboard shortcuts, and toolbar buttons in `apps/web/components/canvas/infinite-canvas.tsx`.
6. Write comprehensive tests in `apps/web/undo-redo.spec.ts`.
7. Verify monorepo: typecheck, lint, test, check-architecture, build.
