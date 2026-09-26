# Code Review — F005 (User Roles)

Reviewer: Evaluator (Rubric-based). Date: 2026-09-26.
Branch: `feat/F005-user-roles`.
Target: Basic role model (owner, admin, editor, viewer), write gating, and member role management.

## Evaluator Rubric Scores
- **Acceptance completeness**: 5/5
  - Role stored per member: `Member.role` using `MemberRole` enum (`owner`, `admin`, `editor`, `viewer`).
  - Basic role check gates writes: Viewers are rejected with 403 Forbidden on writes (`POST /organizations/:orgId/workspaces`, `PATCH /workspaces/:id`). Editors can write.
  - Delete operations restricted: Deleting workspaces requires `owner` or `admin`; editors and viewers receive 403 Forbidden.
  - Unit tests: Verified pure invariants in `packages/domain/src/invariants.test.ts` (`canWrite('viewer') === false`, `assertRoleCanWrite('viewer')` throws `RolePermissionDeniedError`; `canWrite('editor') === true`).
  - Full role catalog safely deferred to Phase 13.
- **Correctness**: 5/5
  - Edge cases verified in live PostgreSQL e2e tests (`apps/api/src/roles/roles.e2e.spec.ts`):
    - Viewer write attempts return 403 Forbidden.
    - Editor write attempts succeed with 201 Created.
    - Editor update workspace succeeds (200 OK).
    - Editor delete workspace rejected with 403 Forbidden.
    - Owner can promote Viewer to Editor via `PATCH /organizations/:orgId/members/:memberId`.
    - Promoted user immediately gains write permissions (201 Created).
    - Editor cannot update member roles (403 Forbidden).
    - Owner role protected from demotion by non-owners.
- **Boundary & scope compliance**: 5/5
  - Architecture checks (`./scripts/check-architecture.sh`) clean.
  - Pure domain functions in `packages/domain` (`canWrite`, `canAdmin`, `canDeleteOrg`, `assertRoleCanWrite`, `RolePermissionDeniedError`).
  - API modular separation: `RolesGuard` and `@RequireRoles` decorator in `apps/api/src/roles/`.
  - Scope boundaries respected: custom RBAC matrices and enterprise SSO deferred to Phase 13.
- **Modularity**: 5/5
  - Clean separation across domain, API, and web.
  - Next.js Web layer: `RoleBadge` component, `canRoleWrite` helper, read-only gating in `CreateWorkspaceForm`, and server action `updateMemberRoleAction`.
- **Evidence & handoff quality**: 5/5
  - Full automated suite: 176 tests passing monorepo-wide (23 domain, 23 web, 130 api).
  - All verification gates green: `pnpm verify` (`typecheck`, `lint`, `test`, `check-architecture`) and `pnpm build`.

**Average Score**: 5.0 / 5.0
**Verdict**: PASS

## Verification Summary
- `pnpm prisma:generate`: Clean.
- `pnpm build:domain`: Clean.
- `pnpm typecheck`: Clean across all packages and apps (0 errors).
- `pnpm lint`: Clean (0 errors, 0 warnings).
- `pnpm test`: 176 tests passed (23 domain, 23 web, 130 api).
- `check-architecture`: Clean (`check-architecture: clean`).
- `pnpm build`: Clean production build across all Next.js and NestJS targets.
