# Current Task: F139 — Clipboard, duplicate & default marquee-select

**Status**: NOT STARTED

## Description

Fourth task of Phase 14 — UX Remediation (see
`.harness/phases/PHASE-14-UX-REMEDIATION.md`, derived from `docs/ux-review.html`).

Canvas-convention parity. Add ⌘C/⌘V/⌘D and alt-drag duplicate, and
make dragging empty canvas marquee-select by default (today box-select is a
mode toggle; `selectionOnDrag` is off).

- Feature ID: F139
- Phase: 14 — UX Remediation
- Priority: P1 · Effort: Low
- Dependencies: F136 (COMPLETE), F137 (COMPLETE), F138 (COMPLETE)

## Acceptance Criteria

- Duplicate an object in 1 interaction (⌘D or Alt-drag).
- Copy/paste (⌘C/⌘V) preserves kind, metadata and relative layout; ids are regenerated.
- Dragging empty canvas draws a marquee and selects enclosed nodes by default.
- All of the above operations are undoable via ⌘Z.

## Files

- `apps/web/components/canvas/infinite-canvas.tsx` (keydown, `selectionOnDrag`)
- `apps/web/lib/commands/` (paste/duplicate commands)
- `apps/web/lib/canvas-store.ts` (`isBoxSelectMode` default/removal)

## Test

- ⌘D duplicates.
- ⌘C/⌘V round-trips a 2-node + 1-edge selection.
- Empty-drag marquee-selects.
- ⌘Z reverts.

## Next Steps (Phase 14 order)

F136 gate previews (COMPLETE) → F137 inline rename/edge labels (COMPLETE) →
F138 context menus (COMPLETE) → F139 clipboard/duplicate/marquee →
F140 IA cleanup → F141 one canvas → F142 real C4 drill-down →
F143 ⌘K + total undo → F144 wire editor to model API → F145 real views.

Full specs, success metrics, and before/after interaction budgets:
`.harness/phases/PHASE-14-UX-REMEDIATION.md` and `docs/ux-review.html`.
