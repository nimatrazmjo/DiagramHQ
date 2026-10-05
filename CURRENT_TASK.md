# Current Task: F145 — Real views: reuse objects across views

**Status**: NOT STARTED

## Description

Tenth and final task of Phase 14 — UX Remediation (see
`.harness/phases/PHASE-14-UX-REMEDIATION.md`, derived from `docs/ux-review.html`).

Deliver the one thing that beats draw.io — one object, many views.
Replace the perspective-overlay-only model (security/data/ownership just toggle
badges on one canvas) with independent views, each with its own object
membership and layout, over the shared model.

- Feature ID: F145
- Phase: 14 — UX Remediation
- Priority: P1 · Effort: Medium
- Dependencies: F144 (COMPLETE)

## Acceptance Criteria

- Create/switch views; each stores selection + layout, never objects.
- Add an existing object to another view in ≤ 2 interactions.
- Removing an object from a view keeps it in the model (invariant already in domain).
- Same object appears in ≥ 2 views; editing it once updates all views.
- Remove-from-view ≠ delete-object (verified).
- Per-view layout persists independently.

## Files

- `apps/web/app/studio/page.tsx` (view switcher → real views)
- `apps/web/components/canvas/icepanel-sidebar.tsx` (Diagrams tab → real views)
- API: `apps/api/src/views/*` (reuse `/views/:viewId/objects`, projection)

## Test

- Add object to a second view; edit its name once → both views reflect it;
  remove from view A → still present in model and view B.

## Success Metric

- Reuse rate > 0 (% of objects in ≥ 2 views).

## Next Steps

Complete F145 to conclude Phase 14 — UX Remediation and finish all 145 roadmap features!
