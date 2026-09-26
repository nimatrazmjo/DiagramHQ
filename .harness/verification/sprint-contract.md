# Sprint Contract — F004 (Workspaces)

Written by the Planner before any code. It fixes "done" so the Generator cannot drift and the Evaluator has something objective to grade against.

## Feature
- Id: F004
- Title: Workspaces
- Phase / slice: Phase 01 — Foundation

## Goal (one sentence)
Authenticated members of an organization can create, retrieve, update, delete, and list workspaces within that organization, where each workspace contains architectures and access is strictly gated by organization membership.

## Acceptance -> checks
Map each acceptance item from `PHASE-01-FOUNDATION.md` to how it will be verified.
| Acceptance item | How verified (command / test / screenshot) |
|---|---|
| Create a workspace within an org | Integration test `POST /organizations/:orgId/workspaces` creating a workspace with `orgId`, validated name, unique slug within org, and optional settings |
| A workspace contains architectures | Integration test verifying `architectures` relation on workspace, querying contained architectures via `GET /workspaces/:id` (including architecture summary / count or `GET /workspaces/:id/architectures`), and cascade deletion of architectures when workspace is deleted |
| Scoped to org membership | Integration test verifying `GET /organizations/:orgId/workspaces` only returns workspaces for orgs the caller belongs to; `GET /workspaces/:id`, `PATCH /workspaces/:id`, `DELETE /workspaces/:id` return 404 for callers who are not members of the parent org |
| Workspace CRUD integration test | Full automated test suite in `apps/api/src/workspaces/workspaces.e2e.spec.ts` exercising create, get, list, update, and delete with multi-tenant and cross-org isolation |

## Plan (steps)
1. In `apps/api`: Create `WorkspacesModule`, `WorkspacesService`, and `WorkspacesController`.
   - `POST /organizations/:orgId/workspaces`: create workspace within an org; requires membership with `owner`, `admin`, or `editor` role; enforces slug uniqueness per org.
   - `GET /organizations/:orgId/workspaces`: list workspaces belonging to `orgId`; requires caller to be a member of `orgId`.
   - `GET /workspaces/:id`: return workspace details with contained architecture count/list; requires caller to be a member of the workspace's parent org (returns 404 otherwise).
   - `PATCH /workspaces/:id`: update workspace name/slug/settings; requires `owner`, `admin`, or `editor` role in the parent org.
   - `DELETE /workspaces/:id`: delete workspace (and cascade to architectures); requires `owner` or `admin` role in parent org.
   - `GET /workspaces/:id/architectures`: list architectures contained within the workspace.
2. DTOs and Validation:
   - `CreateWorkspaceDto`: `@IsString()`, `@MinLength(2)`, `@MaxLength(64)` for `name`; optional `@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)` for `slug`; optional `@IsObject()` for `settings`.
   - `UpdateWorkspaceDto`: optional `name`, `slug`, `settings`.
3. In `apps/web`:
   - Add server actions in `apps/web/app/dashboard/workspace-actions.ts` for creating and listing workspaces for an organization.
   - Add UI components to display workspaces under an organization and a create workspace form.
4. Automated tests:
   - Unit tests for `WorkspacesService` in `apps/api/src/workspaces/workspaces.service.spec.ts`.
   - End-to-end integration tests in `apps/api/src/workspaces/workspaces.e2e.spec.ts` testing workspace CRUD, architecture containment, and cross-org access prevention.
   - Web unit test in `apps/web`.
5. Verification:
   - Run `pnpm verify` (`typecheck`, `lint`, `test`, `check-architecture`) and `pnpm build`.

## In scope
- Workspace entity CRUD scoped to organization (`apps/api`).
- Unique slug within org (`@@unique([orgId, slug])`) with automatic collision resolution.
- Verification of caller's membership in the workspace's organization.
- Relationship between workspace and architectures (containment and cascade deletion).
- Web UI: Listing and creating workspaces for an organization.

## Explicitly out of scope (parked)
- Canvas engine, nodes, edges, pan/zoom (Phase 02 Canvas F009–F017).
- Full Architecture CRUD and versioning logic (Phase 03 F018).
- Fine-grained RBAC permission matrix (F005 / F104).
- SSO / SCIM (Phase 13).

## New dependencies
None. Reuses existing Prisma schema, NestJS infrastructure, Auth.js, and domain types.

## Boundaries touched
- `apps/api`: `src/workspaces/` (controller, service, DTOs, module, unit and e2e specs), wired into `app.module.ts`.
- `apps/web`: `app/dashboard/workspace-actions.ts`, workspace UI components.
- `packages/domain`: Reuses existing `WorkspaceId`, `Workspace`, `OrgId`, `Architecture`.

## Risks / unknowns
- Per-org slug collisions: Slugs must be unique per org (`@@unique([orgId, slug])`), so different orgs can use the same workspace slug, but the same org cannot duplicate.
- Cascade deletion: Workspace deletion must cleanly cascade to architectures via Prisma relation.

## Definition of done
- All acceptance checks green + evidence recorded.
- `check-architecture` passes.
- Evaluator score >= 4.0, no criterion at 1.
- State + handoff updated, committed on `feat/F004-workspaces`.

---
Signed off (Planner) before build: [x]
