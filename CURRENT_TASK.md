# Current Task: F138 — Canvas context menus

**Status**: NOT STARTED

## Description

Third task of Phase 14 — UX Remediation (see
`.harness/phases/PHASE-14-UX-REMEDIATION.md`, derived from `docs/ux-review.html`).

Right-click menus on node, edge and pane. The universal "act on the
thing" affordance is entirely absent today (0 context-menu handlers in repo).

- Feature ID: F138
- Phase: 14 — UX Remediation
- Priority: P1 · Effort: Low
- Dependencies: F136 (COMPLETE), F137 (COMPLETE)

## Acceptance Criteria

- `onNodeContextMenu`, `onEdgeContextMenu`, `onPaneContextMenu` wired.
- Each action dispatches the same command path as its toolbar/inspector twin:
  - Node menu: Rename, Duplicate, Delete, Add connection, Add to view, Drill in.
  - Edge menu: Edit label, Reverse, Delete.
  - Pane menu: Add object (by kind), Paste, Select all, Fit view, Auto-layout.
- Keyboard-dismissible (Esc), outside-click dismissible, and positioned within viewport bounds.

## Files

- new `apps/web/components/canvas/context-menu.tsx`
- `apps/web/components/canvas/infinite-canvas.tsx`

## Test

- Right-click node shows menu; Duplicate adds a copy; Delete removes it.
- Right-click pane → Add object creates one at the cursor.

## Next Steps (Phase 14 order)

F136 gate previews (COMPLETE) → F137 inline rename/edge labels (COMPLETE) →
F138 context menus → F139 clipboard/duplicate/marquee → F140 IA cleanup →
F141 one canvas → F142 real C4 drill-down → F143 ⌘K + total undo →
F144 wire editor to model API → F145 real views (reuse across views).

Full specs, success metrics, and before/after interaction budgets:
`.harness/phases/PHASE-14-UX-REMEDIATION.md` and `docs/ux-review.html`.
