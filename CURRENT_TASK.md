# Current Task: F053 — Permissions

**Status**: NOT STARTED

## Description
Full role catalog (Owner, Admin, Editor, Viewer, Guest) with per-workspace and per-diagram permission checking and action enforcement.
- Feature ID: F053
- Phase: 06 — Collaboration
- Dependencies: F005
- Acceptance criteria:
  - Roles: Owner, Admin, Editor, Viewer, Guest
  - Per-workspace + per-diagram permissions
  - Test: viewer cannot edit; editor can edit; admin can invite.

## Next Steps
1. Review `PHASE-06-COLLABORATION.md` for F053 acceptance criteria.
2. In `packages/domain/src/`, implement permissions engine (`permissions.ts`):
   - Roles: `Role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest'`
   - Resource actions: `edit_model`, `create_diagram`, `edit_diagram`, `view_diagram`, `comment`, `invite_members`, `manage_roles`, `delete_workspace`, `create_share_link`.
   - Resource permission matrix: `canPerformAction(role, action, resourceOverride?)`.
   - Unit tests in `packages/domain/src/permissions.test.ts`.
3. In `apps/web/`, implement permission indicators and guards:
   - `<PermissionGuard />` component conditionally rendering UI based on user role and action.
   - `<RoleBadge />` chip displaying role with role-specific color and icon.
   - Web integration specs in `apps/web/permissions.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
