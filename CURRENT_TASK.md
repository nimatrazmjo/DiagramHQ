# Current Task: F144 — Wire the editor to the model API

**Status**: NOT STARTED

## Description

Ninth task of Phase 14 — UX Remediation (see
`.harness/phases/PHASE-14-UX-REMEDIATION.md`, derived from `docs/ux-review.html`).

The decisive change. Objects persist as objects via the existing
model API; the canvas becomes a view (membership + layout) over that model —
not a JSON blob in `workspace.settings.studioDiagram`.

- Feature ID: F144
- Phase: 14 — UX Remediation
- Priority: P0 · Effort: High
- Dependencies: F141 (COMPLETE), F142 (COMPLETE)

## Acceptance Criteria

- Load/create an architecture + view for the editor session.
- Create/update/delete objects and connections through `/architectures/:id/objects` and `/connections` (optimistic + rollback, as the move commands already do).
- Positions persist per view via `/views/:viewId/objects/positions`.
- Keep guest/local mode working for the no-login open.
- A created object exists as a model object (visible via the model API), not only in a diagram blob.
- Reopening loads from the model, not a blob.
- Autosave status reflects real model writes.

## Files

- `apps/web/app/studio/page.tsx` (replace blob state with model-backed)
- `apps/web/lib/model/architecture-model-client.ts`
- `apps/web/app/api/diagrams/autosave/route.ts` (retire blob or migrate)
- API: `apps/api/src/architectures/*`, `apps/api/src/views/*` (reuse)

## Test

- Create object in editor → GET `/architectures/:id/objects` returns it; reload restores from model; e2e covers create→reload.

## Next Steps (Phase 14 order)

F136 gate previews (COMPLETE) → F137 inline rename/edge labels (COMPLETE) →
F138 context menus (COMPLETE) → F139 clipboard/duplicate/marquee (COMPLETE) →
F140 IA cleanup (COMPLETE) → F141 one canvas (COMPLETE) → F142 real C4 drill-down (COMPLETE) →
F143 ⌘K + total undo (COMPLETE) → F144 wire editor to model API → F145 real views.

Full specs, success metrics, and before/after interaction budgets:
`.harness/phases/PHASE-14-UX-REMEDIATION.md` and `docs/ux-review.html`.
