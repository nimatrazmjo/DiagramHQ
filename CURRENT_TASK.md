# Current Task: F141 — Unify to one canvas

**Status**: NOT STARTED

## Description

Sixth task of Phase 14 — UX Remediation (see
`.harness/phases/PHASE-14-UX-REMEDIATION.md`, derived from `docs/ux-review.html`).

Collapse the four surfaces to one editor. Delete the hand-rolled SVG
canvas and embed the studio React Flow editor in the workspace shell. Fix the
duplicate zoom clusters and the colliding bottom-left panels.

Observed: `/canvas/[workspaceId]/[diagramId]` is a separate SVG canvas with its
own select/connector/hand modes; the workspace overview embeds a second, weaker
canvas; React Flow's native `<Controls>` (bottom-left) coexists with the custom
pan/zoom toolbar (top-right) and the auto-layout menu overlaps the native
controls.

- Feature ID: F141
- Phase: 14 — UX Remediation
- Priority: P0 · Effort: Medium
- Dependencies: F137 (COMPLETE), F138 (COMPLETE), F139 (COMPLETE), F140 (COMPLETE)

## Acceptance Criteria

- Exactly one canvas editor implementation remains in the repo (`InfiniteCanvas` / React Flow).
- Hand-rolled `/canvas/*` SVG implementation removed or redirecting to the unified editor.
- Workspace shell hosts the unified `InfiniteCanvas` editor.
- One zoom/pan cluster (bottom-right); drop React Flow default `<Controls>`; layout menu has its own corner without overlapping.
- No overlapping control clusters at desktop or phone width (tested down to 400px).
- Entering the editor from dashboard, deep link, or share lands in the same UI.

## Files

- `apps/web/app/canvas/[workspaceId]/[diagramId]/page.tsx` (remove / redirect)
- `apps/web/components/canvas/infinite-canvas.tsx` (Controls/MiniMap/panels)
- `apps/web/app/workspace/[workspaceId]/*`

## Test

- Grep shows one canvas editor implementation in repo.
- Workspace route renders the unified editor.
- No panel overlap at 400px.

## Next Steps (Phase 14 order)

F136 gate previews (COMPLETE) → F137 inline rename/edge labels (COMPLETE) →
F138 context menus (COMPLETE) → F139 clipboard/duplicate/marquee (COMPLETE) →
F140 IA cleanup (COMPLETE) → F141 one canvas → F142 real C4 drill-down →
F143 ⌘K + total undo → F144 wire editor to model API → F145 real views.

Full specs, success metrics, and before/after interaction budgets:
`.harness/phases/PHASE-14-UX-REMEDIATION.md` and `docs/ux-review.html`.
