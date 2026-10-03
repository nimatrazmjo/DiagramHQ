# Phase 12 — Documentation

Status: IN PROGRESS

## Description
The model as living documentation: object docs, a markdown editor, a public portal, and exports.

## Dependencies
Phase 03, Phase 04

## Features

### F092 — Architecture documentation

Status: COMPLETE

Description: Object -> doc page.

Acceptance Criteria:

- Every object renders to a documentation page; an architecture doc tree

Test: an object doc page renders from metadata + connections.

Evidence:
- Domain engine: `packages/domain/src/architecture-documentation.ts`
- Unit tests: `packages/domain/src/architecture-documentation.test.ts` (11 tests passing)
- Canvas UI: `apps/web/components/canvas/architecture-documentation-panel.tsx`
- Integration tests: `apps/web/architecture-documentation.spec.tsx` (3 tests passing)
- PR and Review records: `.harness/reviews/F092-PR.md`, `.harness/reviews/F092-review.md`

### F093 — Markdown editor

Status: COMPLETE

Description: Rich editor.

Acceptance Criteria:

- Markdown, rich text, images, architecture embeds, diagrams, tables, code, links, mentions, comments

Test: edit a doc; embed a diagram; it renders.

Evidence:
- Domain engine: `packages/domain/src/markdown-editor.ts`
- Unit tests: `packages/domain/src/markdown-editor.test.ts` (10 tests passing)
- Canvas UI: `apps/web/components/canvas/markdown-editor-modal.tsx`
- Integration tests: `apps/web/markdown-editor.spec.tsx` (4 tests passing)
- PR and Review records: `.harness/reviews/F093-PR.md`, `.harness/reviews/F093-review.md`

### F094 — Public documentation

Status: COMPLETE

Description: Publish docs.

Acceptance Criteria:

- Publish documentation for external readers

Test: published docs are viewable without an account.

Evidence:
- Domain engine: `packages/domain/src/public-documentation.ts`
- Unit tests: `packages/domain/src/public-documentation.test.ts` (19 tests passing)
- Canvas UI: `apps/web/components/canvas/public-documentation-panel.tsx`
- Integration tests: `apps/web/public-documentation.spec.tsx` (4 tests passing)
- PR and Review records: `.harness/reviews/F094-PR.md`, `.harness/reviews/F094-review.md`

### F095 — Architecture portal

Status: COMPLETE

Description: Public explorer.

Dependencies: F052

Acceptance Criteria:

- Read-only site: search, zoom, navigate, drill-down, flows, docs, objects, dependencies; no account

Test: an anonymous visitor can browse and drill down.

Evidence:
- Domain engine: `packages/domain/src/architecture-portal.ts`
- Unit tests: `packages/domain/src/architecture-portal.test.ts` (13 tests passing)
- Canvas UI: `apps/web/components/canvas/architecture-portal-panel.tsx`
- Integration tests: `apps/web/architecture-portal.spec.tsx` (5 tests passing)
- PR and Review records: `.harness/reviews/F095-PR.md`, `.harness/reviews/F095-review.md`

### F096 — Export

Status: COMPLETE

Description: Export baseline.

Acceptance Criteria:

- Export a diagram/view to PNG and SVG (baseline in Phase 01; PDF here)

Test: export a view -> non-empty file; visual check.

Evidence:
- Domain engine: `packages/domain/src/export.ts`
- Unit tests: `packages/domain/src/export.test.ts` (15 tests passing)
- Canvas UI: `apps/web/components/canvas/export-modal.tsx`
- Integration tests: `apps/web/export.spec.tsx` (3 tests passing)
- PR and Review records: `.harness/reviews/F096-PR.md`, `.harness/reviews/F096-review.md`

### F097 — Mermaid

Status: COMPLETE

Description: Export/import Mermaid.

Acceptance Criteria:

- Export flows/diagrams to Mermaid; import Mermaid

Test: export -> Mermaid renders; round-trip import.

Evidence:
- Domain engine: `packages/domain/src/mermaid.ts`
- Unit tests: `packages/domain/src/mermaid.test.ts` (8 tests passing)
- Canvas UI: `apps/web/components/canvas/mermaid-modal.tsx`
- Integration tests: `apps/web/mermaid.spec.tsx` (4 tests passing)
- PR and Review records: `.harness/reviews/F097-PR.md`, `.harness/reviews/F097-review.md`

### F098 — PlantUML

Status: NOT STARTED

Description: Export PlantUML.

Acceptance Criteria:

- Export diagrams/flows to PlantUML

Test: export -> valid PlantUML.

### F099 — PDF

Status: NOT STARTED

Description: Export PDF.

Acceptance Criteria:

- Export a view/doc to PDF

Test: export -> valid PDF.

### F100 — SVG

Status: NOT STARTED

Description: Export SVG.

Acceptance Criteria:

- Export a view to SVG at fidelity

Test: export -> valid SVG matching the canvas.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
