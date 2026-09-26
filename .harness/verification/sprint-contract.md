# Sprint Contract — F005 (User Roles)

Written by the Planner before any code. It fixes "done" so the Generator cannot drift and the Evaluator has something objective to grade against.

## Feature
- Id: F005
- Title: User roles
- Phase / slice: Phase 01 — Foundation

## Goal (one sentence)
Organization members have an assigned role (owner, admin, editor, viewer) that gates writes across the system, ensuring viewers cannot perform write mutations while editors/admins/owners can.

## Acceptance -> checks
Map each acceptance item from `PHASE-01-FOUNDATION.md` to how it will be verified.
| Acceptance item | How verified (command / test / screenshot) |
|---|---|
| Role stored per member | Prisma schema `Member.role` (MemberRole enum); integration test verifying role assignment and retrieval on member records |
| A basic role check gates writes | Unit & integration tests proving a viewer cannot create/update workspaces or orgs (HTTP 403 Forbidden), while an editor/admin/owner can write |
| Full role catalog deferred to Phase 13 | Verified that only basic roles (`owner`, `admin`, `editor`, `viewer`) are implemented without complex enterprise RBAC matrices |
| Test: unit: a viewer cannot write; an editor can | Unit test in `packages/domain/src/invariants.test.ts` + API integration tests in `apps/api/src/roles/roles.e2e.spec.ts` |

## Plan (steps)
1. In `packages/domain`:
   - Add role invariant functions: `canWrite(role: MemberRole): boolean`, `canAdmin(role: MemberRole): boolean`, `assertRoleCanWrite(role: MemberRole): void`, and `RolePermissionDeniedError`.
   - Add unit tests in `packages/domain/src/invariants.test.ts` verifying that viewers cannot write and editors can write.
2. In `apps/api`:
   - Implement `RolesGuard` and `@RequireRole('owner' | 'admin' | 'editor')` or `@RequireWriteRole()` decorator.
   - Add member role update endpoint: `PATCH /organizations/:orgId/members/:memberId` (guarded to `owner` and `admin`, prevents demoting the last owner).
   - Write integration tests in `apps/api/src/roles/roles.e2e.spec.ts` verifying:
     - Member roles are stored and returned.
     - Viewer write attempts to `POST /organizations/:orgId/workspaces` return 403 Forbidden.
     - Editor write attempts succeed (201 Created).
     - Editor delete attempts return 403 Forbidden (delete requires owner/admin).
     - Owner/admin can promote/demote members.
3. In `apps/web`:
   - Add role-aware UI logic in dashboard (displaying user role badge, gating workspace creation form for viewers).
   - Unit test in `apps/web/roles.spec.ts`.
4. Verification:
   - Run `pnpm verify` (`typecheck`, `lint`, `test`, `check-architecture`) and `pnpm build`.

## In scope
- Basic role model: `owner`, `admin`, `editor`, `viewer` stored per `Member`.
- Write gating: Viewers can read but cannot perform writes; editors can write; admins and owners can administer and delete.
- Role management: Updating member roles by owners/admins.
- Domain invariants for role permissions.

## Explicitly out of scope (parked)
- Full custom RBAC permission matrices, granular permission flags (F104 / Phase 13).
- Enterprise SSO, directory sync, SCIM (Phase 13).
- Canvas and drawing tools (Phase 02).

## New dependencies
None. Reuses existing Prisma schema and domain types.

## Boundaries touched
- `packages/domain`: `src/invariants.ts`, `src/invariants.test.ts`.
- `apps/api`: `src/roles/` (guard, decorators, spec, e2e spec), `src/organizations/organizations.service.ts` & `organizations.controller.ts` (member role update).
- `apps/web`: `app/dashboard/` (role UI badge and disabled states), `roles.spec.ts`.

## Definition of done
- All acceptance checks green + evidence recorded.
- `check-architecture` passes.
- Evaluator score >= 4.0, no criterion at 1.
- State + handoff updated, committed on `feat/F005-user-roles`.

---
Signed off (Planner) before build: [x]
