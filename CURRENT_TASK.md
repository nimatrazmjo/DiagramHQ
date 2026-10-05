# Current Task: F143 — Command palette (⌘K) + total undo coverage

**Status**: NOT STARTED

## Description

Eighth task of Phase 14 — UX Remediation (see
`.harness/phases/PHASE-14-UX-REMEDIATION.md`, derived from `docs/ux-review.html`).

Add a ⌘K palette over objects + actions, and route EVERY mutation through
the command stack so undo is total. Today inspector edits and
inspector-created connections mutate state directly and cannot be undone;
creation via palette vs inspector take different code paths.

- Feature ID: F143
- Phase: 14 — UX Remediation
- Priority: P1 · Effort: Medium
- Dependencies: F137 (COMPLETE)

## Acceptance Criteria

- ⌘K opens a palette: fuzzy-search objects (jump/select/center) and run actions (add kind, auto-layout, toggle view, drill, export, share).
- ⌘K finds an object in ≤ 2s and selects/centres it.
- Rename, description, technology, and inspector-created connections are undoable with ⌘Z.
- No mutation bypasses the command dispatcher.

## Files

- new `apps/web/components/shell/command-palette.tsx`
- `apps/web/app/studio/page.tsx` (`handleMetadataChange`, `handleConnectNodesFromInspector` → commands)
- `apps/web/lib/commands/`

## Test

- ⌘K → type → Enter centres object; rename then ⌘Z reverts; inspector connection then ⌘Z removes it.

## Next Steps (Phase 14 order)

F136 gate previews (COMPLETE) → F137 inline rename/edge labels (COMPLETE) →
F138 context menus (COMPLETE) → F139 clipboard/duplicate/marquee (COMPLETE) →
F140 IA cleanup (COMPLETE) → F141 one canvas (COMPLETE) → F142 real C4 drill-down (COMPLETE) →
F143 ⌘K + total undo → F144 wire editor to model API → F145 real views.

Full specs, success metrics, and before/after interaction budgets:
`.harness/phases/PHASE-14-UX-REMEDIATION.md` and `docs/ux-review.html`.
