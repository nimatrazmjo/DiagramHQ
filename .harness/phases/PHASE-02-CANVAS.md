# Phase 02 — Canvas

Status: NOT STARTED

## Description
The generic infinite-canvas primitives (render + interaction) the architecture model renders into. React Flow behind a CanvasRenderer interface (ADR-0002).

## Dependencies
Phase 01

## Features

### F009 — Infinite canvas

Status: NOT STARTED

Description: React Flow mounted behind the CanvasRenderer interface.

Dependencies: F008

Acceptance Criteria:

- Infinite canvas mounts and renders nodes/edges
- CanvasRenderer interface isolates the renderer (ADR-0002, MODULES.md §7)
- Canvas holds no domain data in Zustand (layer-boundaries rule 4)

Files:

- apps/web/.../canvas

Test: component test + screenshot of a rendered graph.

### F010 — Pan and zoom

Status: NOT STARTED

Description: Infinite pan and zoom.

Acceptance Criteria:

- Wheel zoom, space-pan, fit-to-content (F)
- Smooth at target node counts

Test: component test for zoom/pan/fit.

### F011 — Object selection

Status: NOT STARTED

Description: Select objects on the canvas.

Acceptance Criteria:

- Click to select; selection state in the UI store
- Escape clears selection

Test: component test for selection state.

### F012 — Drag and drop

Status: NOT STARTED

Description: Reposition objects; persist layout.

Acceptance Criteria:

- Drag a node; position persists to view_objects (per-view layout)
- Mutations go through the client-model command layer (layer-boundaries rule 3)

Test: drag persists position; reload restores it.

### F013 — Multi-select

Status: NOT STARTED

Description: Select and move many objects.

Acceptance Criteria:

- Shift-click + marquee box-select
- Group move preserves relative positions

Test: component test for marquee + group move.

### F014 — Alignment

Status: NOT STARTED

Description: Snap, align, distribute.

Acceptance Criteria:

- Snap-to-grid; align edges/centers; distribute evenly

Test: alignment helpers produce expected coordinates.

### F015 — Auto-layout

Status: NOT STARTED

Description: Layout-engine registry.

Dependencies: F009

Acceptance Criteria:

- Registry with hierarchical, tree, force-directed, layered, radial, grid, LR, TB
- Apply-layout produces no overlaps; manual positions preserved unless re-applied

Test: each engine lays out a sample without overlap (bbox non-overlap assertion).

### F016 — Undo/redo

Status: NOT STARTED

Description: Reversible command layer.

Dependencies: F012

Acceptance Criteria:

- Command layer records reversible commands; Cmd+Z / Cmd+Shift+Z
- Covers create, connect, move, delete, metadata edit
- History is per-session UI state, not persisted

Test: undo/redo across all covered operations.

### F017 — Minimap

Status: NOT STARTED

Description: Minimap + fullscreen + focus mode.

Acceptance Criteria:

- Minimap reflects the graph; click-to-navigate
- Fullscreen and focus mode

Test: minimap renders; focus mode isolates selection (screenshot).

### F109 — Command palette

Status: NOT STARTED

Description: Cmd+K command palette.

Dependencies: F110

Acceptance Criteria:

- Create system/app/store/component/connection, jump-to-object, export, ask-AI (stub)
- Actions dispatch through the client-model command layer

Test: representative palette actions execute.

### F110 — Global search

Status: NOT STARTED

Description: Search across the model.

Acceptance Criteria:

- Cmd+K / '/' search across objects, tags, technologies (P1 scope)
- Fuzzy; results grouped; jump-to centers the node on canvas

Test: search returns matches; jump centers the node.

### F111 — Keyboard shortcuts

Status: NOT STARTED

Description: Full keymap.

Dependencies: F016, F109

Acceptance Criteria:

- Cmd+K, /, Space (pan), Delete, Cmd+Z / Cmd+Shift+Z, Cmd+C/V/D, F (fit), 1/2/3 (view levels)

Test: keymap unit test + a few e2e shortcut triggers.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
