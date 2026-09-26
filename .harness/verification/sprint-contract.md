# Sprint Contract — F003 (Organizations)

Written by the Planner before any code. It fixes "done" so the Generator cannot drift and the Evaluator has something objective to grade against.

## Feature
- Id: F003
- Title: Organizations
- Phase / slice: Phase 01 — Foundation

## Goal (one sentence)
Authenticated users can create, retrieve, update, and list organizations they belong to, with automatic owner membership upon creation and strict tenant isolation preventing any cross-organization data visibility.

## Acceptance -> checks
Map each acceptance item from `PHASE-01-FOUNDATION.md` to how it will be verified.
| Acceptance item | How verified (command / test / screenshot) |
|---|---|
| Create an organization; a user belongs to one or more orgs | Integration test `POST /organizations` creating an org and automatically creating an `owner` membership for the authenticated user; verifying the user belongs to multiple created orgs |
| All data is scoped to an org | Integration test verifying `GET /organizations` only returns orgs where the caller is a member; `GET /organizations/:id` returns 404/403 for an org the user does not belong to; database tenant isolation assertion |
| Org CRUD integration test | Full automated test suite in `apps/api/src/organizations/organizations.e2e.spec.ts` exercising create, get by id, list, update, and delete with tenant boundary checks |

## Plan (steps)
1. In `apps/api`: Create `OrganizationsModule`, `OrganizationsService`, and `OrganizationsController`.
   - `POST /organizations`: create organization with validated name and generated or validated slug, transactional initial `owner` member creation for `@CurrentUser()`.
   - `GET /organizations`: list organizations where `@CurrentUser()` is an active member.
   - `GET /organizations/:id`: return organization details if caller is a member; return 404/403 if not found or caller lacks membership.
   - `PATCH /organizations/:id`: update organization name/slug (restricted to owner/admin member).
   - `DELETE /organizations/:id`: delete organization (restricted to owner).
2. DTOs and Validation:
   - `CreateOrganizationDto`: `@IsString()`, `@MinLength(2)`, `@MaxLength(64)`, optional `slug` (`@Matches(/^[a-z0-9-]+$/)`).
   - `UpdateOrganizationDto`: optional name and slug.
3. In `apps/web`:
   - Add organization selection and creation UI in dashboard / `/organizations`.
   - Verify protected routing and auth session propagation.
4. Automated tests:
   - Unit tests for `OrganizationsService` in `apps/api/src/organizations/organizations.service.spec.ts`.
   - End-to-end integration tests in `apps/api/src/organizations/organizations.e2e.spec.ts` testing CRUD and multi-user tenant isolation.
5. Verification:
   - Run `pnpm verify` (`typecheck`, `lint`, `test`, `check-architecture`) and `pnpm build`.

## In scope
- Organization entity CRUD scoped to authenticated user (`apps/api`).
- Initial owner member record creation upon organization creation.
- Listing organizations for the authenticated user.
- Multi-tenant boundary enforcement: users cannot read, list, update, or delete organizations they do not belong to.
- Dashboard / organization creation in `apps/web`.

## Explicitly out of scope (parked)
- Multi-workspace architecture hierarchy within an org (F004 — Workspaces).
- Full granular RBAC permission matrix (F005 — User roles / F104).
- Enterprise SSO / SCIM federation (Phase 13).
- Billing / subscription tier management (Phase 12).

## New dependencies
None. Leverages existing NestJS, Prisma, Auth.js, and domain packages.

## Boundaries touched
- `apps/api`: `src/organizations/` (controller, service, DTOs, module, unit and e2e specs), wired into `app.module.ts`.
- `apps/web`: `/dashboard` organization view / management.
- `packages/domain`: Reuses existing `OrgId`, `Organization`, `Member`, `assertTenantAccess`.

## Risks / unknowns
- Slug collisions: Unique constraint on `organizations.slug` must be handled gracefully with 409 conflict envelope or auto-slug generation.
- Cascade deletion: Deleting an organization cascades to members and workspaces cleanly via foreign key cascade defined in Prisma schema.

## Definition of done
- All acceptance checks green + evidence recorded.
- `check-architecture` passes.
- Evaluator score >= 4.0, no criterion at 1.
- State + handoff updated, committed on `feat/F003-organizations`.

---
Signed off (Planner) before build: [x]
