# Feature Review Audit: F136 — Honest Surface: Gate Simulated Features

## Acceptance Criteria Checklist
- [x] **No unlabelled simulated control appears in the default studio view**: All 10 simulated features are wrapped with `<PreviewAffordance>` carrying `data-preview="true"` and `data-testid="preview-badge"`.
- [x] **Preview controls carry a consistent "Preview — not saved" badge**: Verified in both component tests and rendered HTML.
- [x] **Real controls are unaffected**: Add object, connect, inspector, autosave, export, layout, undo/redo, and share-link remain functional and unlabelled by preview badges.
- [x] **Tests added**:
  - `studio renders with 0 unlabelled preview controls`
  - `a preview control shows the badge`
  - `a real control (add object) still works`

## Review Sign-off
- **Architectural Boundary**: All preview logic is encapsulated in `apps/web/lib/preview-flags.ts`; zero layer boundary violations.
- **Component Design**: Accessible tooltips and warning badge styling without breaking canvas flex layout on mobile/desktop.
- **Status**: APPROVED for merge to `main`.
