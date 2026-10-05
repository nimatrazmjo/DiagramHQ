# Current Task: F140 — IA cleanup: hide plumbing, one brand, honest copy

**Status**: NOT STARTED

## Description

Fifth task of Phase 14 — UX Remediation (see
`.harness/phases/PHASE-14-UX-REMEDIATION.md`, derived from `docs/ux-review.html`).

Stop leaking the internal model to the surface and stop confusing
the user about which product they are in.
Observed: dashboard shows org `slug`, org `id`, `User ID` as primary content;
workspace header shows raw `workspaceId`; dashboard brands as "Architecture OS"
while studio brands as "DiagramHQ"; landing copy still says "the infinite canvas
arrives in Phase 02".

- Feature ID: F140
- Phase: 14 — UX Remediation
- Priority: P2 · Effort: Low
- Dependencies: F136 (COMPLETE), F137 (COMPLETE), F138 (COMPLETE), F139 (COMPLETE)

## Acceptance Criteria

- 0 raw ids/slugs in default dashboard/workspace views (keep in dev/debug affordance only).
- Single brand name ("DiagramHQ") across landing, dashboard, studio, navigator footer.
- Landing copy contains no stale phase references ("Phase 02").
- Primary CTA into the real editor.

## Files

- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/workspace/[workspaceId]/page.tsx`
- `apps/web/components/shell/left-navigator.tsx` (footer brand name)

## Test

- Dashboard + workspace render with no visible raw ids/slugs.
- Landing copy asserted free of "Phase 02".
- Consistent brand naming ("DiagramHQ").

## Next Steps (Phase 14 order)

F136 gate previews (COMPLETE) → F137 inline rename/edge labels (COMPLETE) →
F138 context menus (COMPLETE) → F139 clipboard/duplicate/marquee (COMPLETE) →
F140 IA cleanup → F141 one canvas → F142 real C4 drill-down →
F143 ⌘K + total undo → F144 wire editor to model API → F145 real views.

Full specs, success metrics, and before/after interaction budgets:
`.harness/phases/PHASE-14-UX-REMEDIATION.md` and `docs/ux-review.html`.
