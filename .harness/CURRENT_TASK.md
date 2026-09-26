# Current Task

Feature ID: F004
Feature: Workspaces (Workspace under an organization; contains architectures; scoped to org membership)
Status: COMPLETE (PR ready for review loop)
Phase: Phase 01 — Foundation

## Objective
Implement workspace entity and organization scoping: authenticated members of an organization can create, retrieve, update, delete, and list workspaces within that organization. A workspace contains architectures, and access to any workspace is strictly gated by organization membership.

## Prerequisite
F001, F002, F003, F006, and F007 are COMPLETE and merged to `main`. Branch `feat/F004-workspaces` is active.

## Steps
- [x] Create `WorkspacesModule`, `WorkspacesService`, and `WorkspacesController` in `apps/api/src/workspaces`
- [x] Implement DTOs with validation (`CreateWorkspaceDto`, `UpdateWorkspaceDto`)
- [x] Add `POST /organizations/:orgId/workspaces` with org membership verification and per-org slug uniqueness
- [x] Add `GET /organizations/:orgId/workspaces` listing workspaces for an organization
- [x] Add `GET /workspaces/:id` returning workspace details, parent org, and contained architecture count/list
- [x] Add `PATCH /workspaces/:id` and `DELETE /workspaces/:id` with org membership & role verification
- [x] Add `GET /workspaces/:id/architectures` listing architectures contained in the workspace
- [x] Add workspace server actions and UI in `apps/web`
- [x] Automated unit and e2e integration tests verifying CRUD, architecture containment, and tenant/membership isolation
- [x] Full verification suite (`pnpm verify` + `pnpm build`)

## Verification
- [x] TypeScript: PASS · Lint: PASS · Unit/Integration: PASS · Build: PASS · check-architecture: PASS

## Do Not
- Implement canvas engine, pan/zoom, or nodes/edges (Phase 02).
- Implement full architecture CRUD and version branching (Phase 03 F018).
- Implement full RBAC permission matrices (F005 / F104).
- Add enterprise SSO/SCIM (Phase 13).

## Next Task
F005 — User roles (or F008 — Application shell).

## Last Updated
2026-09-26
