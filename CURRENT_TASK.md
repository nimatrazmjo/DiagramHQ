# Current Task: F137 — Inline rename & edge labels

**Status**: NOT STARTED

## Description

Second task of Phase 14 — UX Remediation (see
`.harness/phases/PHASE-14-UX-REMEDIATION.md`, derived from `docs/ux-review.html`).

Double-click a node to rename in place; double-click an edge to label it.
Removes the most frequent friction (naming currently costs 3+ interactions via
the inspector; labelling an edge costs 4).

- Feature ID: F137
- Phase: 14 — UX Remediation
- Priority: P1 · Effort: Low
- Dependencies: F136 (COMPLETE)

## Acceptance Criteria

- Name a new object in ≤ 2 interactions.
- Label a connection in ≤ 2 interactions.
- Inspector editing still works and stays in sync.
- Edit mode ignores canvas delete/select keybindings while focused
  (`isTextInput` guard already exists in `infinite-canvas.tsx`).

## Files

- `apps/web/components/canvas/custom-nodes.tsx` (node label editing)
- `apps/web/components/canvas/icepanel-edge.tsx` (edge label editing)
- `apps/web/components/canvas/infinite-canvas.tsx` (double-click handlers)

## Test

- Double-click node → type → Enter renames.
- Double-click edge → type labels.
- ⌘Z reverts both.

## Next Steps (Phase 14 order)

F136 gate previews (COMPLETE) → F137 inline rename/edge labels → F138 context menus →
F139 clipboard/duplicate/marquee → F140 IA cleanup → F141 one canvas →
F142 real C4 drill-down → F143 ⌘K + total undo → F144 wire editor to model API →
F145 real views (reuse across views).

Full specs, success metrics, and before/after interaction budgets:
`.harness/phases/PHASE-14-UX-REMEDIATION.md` and `docs/ux-review.html`.
