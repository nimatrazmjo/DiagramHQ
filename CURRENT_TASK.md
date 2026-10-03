# Current Task: F093 — Markdown editor

**Status**: COMPLETE

## Description
Rich Markdown editor with architecture embeds, diagrams, tables, code, links, mentions, and comments (Phase 12 — Documentation):
- Model-first rich documentation editor:
  - Markdown authoring with live split-pane preview and formatting toolbar (headings, bold, italic, quotes, lists, tables, code).
  - Architecture embeds:
    - Embedded diagrams / views (````diagram id: ... ````) with interactive visual card previews, node previews, and canvas jump buttons.
    - Embedded architecture objects (````object id: ... ````) with live metadata, kind badges, and connection summaries.
    - Embedded execution flows (````flow id: ... ````) and ADRs (````adr id: ... ````).
    - Image attachments (`![alt](url)`) and code blocks with syntax highlighting.
    - Entity mentions (`@object-name` or `@username`) with link resolution.
    - Inline / document comment threads (`targetType: 'doc'`).
  - Validation: verifies embedded diagram/view/object IDs against live architecture models, flagging broken references.
- Acceptance criteria:
  - Markdown, rich text, images, architecture embeds, diagrams, tables, code, links, mentions, comments
  - Test: edit a doc; embed a diagram; it renders.

- Feature ID: F093
- Phase: 12 — Documentation
- Dependencies: Phase 03, Phase 04

## Next Feature
- **F094 — Public documentation**
