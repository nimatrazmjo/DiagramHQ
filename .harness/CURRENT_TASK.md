# CURRENT TASK: F016 — Undo/redo

## Status: IN PROGRESS

## Feature
**F016 — Undo/redo**

Reversible command layer on the canvas. Commands record reversible actions (create, connect, move, delete, metadata edit, align, layout) with per-session UI history and keyboard shortcuts (Cmd+Z / Cmd+Shift+Z).

## Scope

### Web command layer (`apps/web/lib/commands/`)
- `command.ts`: update `Command` interface to support optional `applyCanvasUpdate`.
- `dispatcher.ts`: add `canUndo`, `canRedo`, `peekUndo`, `peekRedo`, `subscribe`, `notify`, `getUndone`.
- `create-node-command.ts`: `CreateNodeCommand` (create node on canvas, undo removes it).
- `delete-node-command.ts`: `DeleteNodeCommand` (delete node & attached edges, undo restores them).
- `connect-nodes-command.ts`: `ConnectNodesCommand` (create edge, undo removes it).
- `update-metadata-command.ts`: `UpdateNodeMetadataCommand` (update node data/metadata, undo reverts).
- `move-node-command.ts`, `move-nodes-command.ts`, `align-nodes-command.ts`, `apply-layout-command.ts`: add `applyCanvasUpdate` so undo/redo updates canvas state.
- `index.ts`: export new commands.

### Canvas integration (`apps/web/components/canvas/`)
- `infinite-canvas.tsx`:
  - Subscribe to `defaultCommandDispatcher` state (`canUndo`, `canRedo`).
  - Wire up `handleUndo` and `handleRedo` syncing canvas `nodes` and `edges`.
  - Add Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z (and Ctrl+Y) keyboard shortcuts.
  - Add Undo (↶) and Redo (↷) buttons to the toolbar with `data-testid="undo-btn"` and `data-testid="redo-btn"`.

### Tests (`apps/web/`)
- `undo-redo.spec.ts`: comprehensive tests covering:
  - CommandDispatcher undo/redo/subscribe/canUndo/canRedo mechanics.
  - CreateNodeCommand execute/undo/redo.
  - DeleteNodeCommand execute/undo/redo with connected edges.
  - ConnectNodesCommand execute/undo/redo.
  - UpdateNodeMetadataCommand execute/undo/redo.
  - MoveNodeCommand / MoveNodesCommand undo/redo canvas updates.
  - AlignNodesCommand / ApplyLayoutCommand undo/redo canvas updates.
  - InfiniteCanvas toolbar Undo/Redo buttons SSR rendering.

## Verification
- Target: TypeScript PASS · Lint PASS · Tests PASS · Architecture PASS · Build PASS

## Owner
Control plane (this agent)

## Started
2026-09-26

## Next Task
F017 — Minimap.
