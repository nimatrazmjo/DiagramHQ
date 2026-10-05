# Current Task: F136 — Honest surface: gate simulated features

**Status**: NOT STARTED

## Description

First task of Phase 14 — UX Remediation (see
`.harness/phases/PHASE-14-UX-REMEDIATION.md`, derived from `docs/ux-review.html`).

Every studio control not wired to real data is labelled "Preview" or removed
from the default view. Cheapest, highest-leverage trust repair — do it first.

Simulated today (studio top bar + panels): presence peers (`INITIAL_PEERS`),
threaded comments, PR review, branches/snapshots/visual diff, and the four "AI"
actions (deterministic domain functions, not model calls).

- Feature ID: F136
- Phase: 14 — UX Remediation
- Priority: P0 · Effort: Low
- Dependencies: none

## Acceptance Criteria

- No unlabelled simulated control appears in the default studio view.
- Preview controls carry a consistent "Preview — not saved" badge + tooltip
  (or live under an overflow "Labs" menu).
- Real controls (add, connect, inspector, autosave, export, layout, undo,
  share-link) are unaffected.

## Files

- `apps/web/app/studio/page.tsx` (top-bar triggers ~1507–1804; seed fixtures)
- new `apps/web/lib/preview-flags.ts`

## Test

- Studio renders with 0 unlabelled preview controls.
- A preview control shows the badge.
- A real control (add object) still works.

## Next Steps (Phase 14 order)

F136 gate previews → F137 inline rename/edge labels → F138 context menus →
F139 clipboard/duplicate/marquee → F140 IA cleanup → F141 one canvas →
F142 real C4 drill-down → F143 ⌘K + total undo → F144 wire editor to model API →
F145 real views (reuse across views).

Full specs, success metrics, and before/after interaction budgets:
`.harness/phases/PHASE-14-UX-REMEDIATION.md` and `docs/ux-review.html`.
