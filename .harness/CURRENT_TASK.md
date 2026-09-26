# Current Task

Feature ID: F005
Feature: User roles (Basic role model: owner/admin/editor/viewer; writes gating; role stored per member)
Status: COMPLETE (PR ready for review loop)
Phase: Phase 01 — Foundation

## Objective
Implement basic role model: each member has an assigned role (`owner`, `admin`, `editor`, `viewer`). Enforce write gating across endpoints so that viewers cannot write (HTTP 403) while editors/admins/owners can write. Support updating member roles by owners/admins.

## Prerequisite
F001, F002, F003, F004, F006, and F007 are COMPLETE and merged to `main`. Branch `feat/F005-user-roles` is active.

## Steps
- [x] Add role permission invariants (`canWrite`, `canAdmin`, `assertRoleCanWrite`) in `packages/domain/src/invariants.ts`
- [x] Add unit tests in `packages/domain/src/invariants.test.ts` verifying a viewer cannot write and an editor can write
- [x] Add `RolesGuard` and `@RequireRoles()` decorator in `apps/api/src/roles/`
- [x] Add `PATCH /organizations/:orgId/members/:memberId` endpoint in `apps/api` to update member roles
- [x] Add integration tests in `apps/api/src/roles/roles.e2e.spec.ts` verifying write gating and role transitions
- [x] Add role-aware UI logic and tests in `apps/web`
- [x] Run full verification suite (`pnpm verify` + `pnpm build`)

## Verification
- [x] TypeScript: PASS · Lint: PASS · Unit/Integration: PASS · Build: PASS · check-architecture: PASS

## Do Not
- Implement granular custom RBAC permission matrices (F104 / Phase 13).
- Implement enterprise SCIM / SSO directory synchronization (Phase 13).
- Implement canvas features (Phase 02).

## Next Task
F008 — Application shell.

## Last Updated
2026-09-26
