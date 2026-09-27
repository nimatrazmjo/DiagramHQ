# CURRENT TASK: F037 — Saved views (COMPLETE)

## Status: COMPLETE

## Completed Feature
**F037 — Saved views** (Phase 04 — Diagrams and Views)
- Updated `View` Prisma model and domain type to include `isStarred: Boolean`.
- Modified `createView` and added `updateView` endpoint `PATCH /views/:viewId` to support starring/unstarring a view.
- Handled filtering and saving a view via UI endpoints.
- Validated via `saved-views.e2e.spec.ts` passing.

## Pull Request
- PR to be merged cleanly across test suites, linters, and builds, squashed merged into main.

## Next Feature
- **F038 — Security views** (Phase 04 — Diagrams and Views)
