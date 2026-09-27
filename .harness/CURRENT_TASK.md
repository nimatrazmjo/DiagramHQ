# CURRENT TASK: F036 — Filters (COMPLETE)

## Status: COMPLETE

## Completed Feature
**F036 — Filters** (Phase 04 — Diagrams and Views)
- \`FilterBuilder\` React component in \`apps/web/components/shell/filter-builder.tsx\` for building dynamic view filters.
- Supports 13 predefined filter keys: team, technology, environment, domain, owner, status, tag, criticality, dataClassification, cloud, region, repository, kind.
- Tested filter UI state updates and structure in \`apps/web/filter-builder.spec.tsx\` via \`renderToString\`.
- Validated that the constructed multi-attribute payload correctly filters domain objects via \`evaluateDynamicView\`.

## Pull Request
- PR #37 prepared, reviewed cleanly, verified across test suites, linters, builds, and squashed merged into main.

## Next Feature
- **F037 — Saved views** (Phase 04 — Diagrams and Views)
