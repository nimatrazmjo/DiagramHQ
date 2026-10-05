# Current Task: F142 — Real C4 drill-down

**Status**: NOT STARTED

## Description

Seventh task of Phase 14 — UX Remediation (see
`.harness/phases/PHASE-14-UX-REMEDIATION.md`, derived from `docs/ux-review.html`).

Make level switching real navigation over a parent/child hierarchy,
not a breadcrumb relabel. Today `displayNodes` ignores `c4Level`
(`app/studio/page.tsx:1169`) so the graph is identical at every level.

- Feature ID: F142
- Phase: 14 — UX Remediation
- Priority: P0 · Effort: Medium
- Dependencies: F141 (COMPLETE)

## Acceptance Criteria

- Model/respect a containment hierarchy (system → container → component).
- Switching level changes the visible graph: Context (L1) / Container (L2) / Component (L3) filters canvas to the relevant level.
- Double-click-to-descend (or right-click context menu "Drill in") into a parent reveals its children; breadcrumb ascends back to parent level.
- Objects without children degrade gracefully (no empty dead-ends).

## Files

- `apps/web/app/studio/page.tsx` (`displayNodes`, `c4Level`, breadcrumb)
- `apps/web/components/canvas/infinite-canvas.tsx` (double-click descend, drill in)
- `packages/domain` (hierarchy/containment helpers)

## Test

- At L1 only systems show; double-click a system reveals its containers; breadcrumb returns to L1.
- Drill-down navigates the containment hierarchy.

## Next Steps (Phase 14 order)

F136 gate previews (COMPLETE) → F137 inline rename/edge labels (COMPLETE) →
F138 context menus (COMPLETE) → F139 clipboard/duplicate/marquee (COMPLETE) →
F140 IA cleanup (COMPLETE) → F141 one canvas (COMPLETE) → F142 real C4 drill-down →
F143 ⌘K + total undo → F144 wire editor to model API → F145 real views.

Full specs, success metrics, and before/after interaction budgets:
`.harness/phases/PHASE-14-UX-REMEDIATION.md` and `docs/ux-review.html`.
