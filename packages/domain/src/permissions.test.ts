import { describe, it, expect } from 'vitest';
import {
  canPerform,
  assertPermission,
  getAllowedActions,
  PermissionDeniedError,
} from './permissions';

describe('Permissions Domain Logic (F053)', () => {
  it('1. Acceptance Test: viewer cannot edit; editor can edit; admin can invite', () => {
    // 1. Viewer cannot edit, but can view and comment
    expect(canPerform({ role: 'viewer' }, 'edit_model')).toBe(false);
    expect(canPerform({ role: 'viewer' }, 'edit_diagram')).toBe(false);
    expect(canPerform({ role: 'viewer' }, 'invite_member')).toBe(false);
    expect(canPerform({ role: 'viewer' }, 'view_diagram')).toBe(true);
    expect(canPerform({ role: 'viewer' }, 'comment')).toBe(true);

    // 2. Editor can edit model and diagrams, but cannot invite members
    expect(canPerform({ role: 'editor' }, 'edit_model')).toBe(true);
    expect(canPerform({ role: 'editor' }, 'edit_diagram')).toBe(true);
    expect(canPerform({ role: 'editor' }, 'create_flow')).toBe(true);
    expect(canPerform({ role: 'editor' }, 'resolve_comment')).toBe(true);
    expect(canPerform({ role: 'editor' }, 'invite_member')).toBe(false);
    expect(canPerform({ role: 'editor' }, 'manage_roles')).toBe(false);

    // 3. Admin can invite members and manage roles as well as edit
    expect(canPerform({ role: 'admin' }, 'invite_member')).toBe(true);
    expect(canPerform({ role: 'admin' }, 'manage_roles')).toBe(true);
    expect(canPerform({ role: 'admin' }, 'edit_model')).toBe(true);
    expect(canPerform({ role: 'admin' }, 'delete_workspace')).toBe(false); // Only owner
  });

  it('2. verifies Owner has universal capabilities', () => {
    expect(canPerform({ role: 'owner' }, 'delete_workspace')).toBe(true);
    expect(canPerform({ role: 'owner' }, 'manage_roles')).toBe(true);
    expect(canPerform({ role: 'owner' }, 'invite_member')).toBe(true);
    expect(canPerform({ role: 'owner' }, 'edit_model')).toBe(true);
  });

  it('3. verifies Guest has read-only diagram access only', () => {
    expect(canPerform({ role: 'guest' }, 'view_diagram')).toBe(true);
    expect(canPerform({ role: 'guest' }, 'comment')).toBe(false);
    expect(canPerform({ role: 'guest' }, 'edit_diagram')).toBe(false);
    expect(canPerform({ role: 'guest' }, 'invite_member')).toBe(false);
  });

  it('4. throws PermissionDeniedError on assertPermission failure', () => {
    expect(() =>
      assertPermission({ role: 'viewer' }, 'edit_model')
    ).toThrow(PermissionDeniedError);

    try {
      assertPermission({ role: 'viewer' }, 'edit_model');
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionDeniedError);
      const permErr = err as PermissionDeniedError;
      expect(permErr.action).toBe('edit_model');
      expect(permErr.role).toBe('viewer');
      expect(permErr.message).toContain("Role 'viewer' is not authorized");
    }

    // Passes when allowed
    expect(() => assertPermission({ role: 'editor' }, 'edit_model')).not.toThrow();
  });

  it('5. respects per-workspace permission overrides', () => {
    const wsId = 'ws-collab-special';

    // Normal editor cannot invite
    expect(canPerform({ role: 'editor', workspaceId: wsId }, 'invite_member')).toBe(false);

    // With workspace override allowing invite_member
    const contextWithOverride = {
      role: 'editor' as const,
      workspaceId: wsId,
      workspaceOverrides: [
        {
          workspaceId: wsId,
          allowedActions: ['invite_member' as const],
        },
      ],
    };

    expect(canPerform(contextWithOverride, 'invite_member')).toBe(true);

    // In a different workspace without override, still false
    expect(
      canPerform({ ...contextWithOverride, workspaceId: 'ws-other' }, 'invite_member')
    ).toBe(false);
  });

  it('6. respects per-diagram permission overrides with higher specificity', () => {
    const diagramLocked = 'diag-production-locked';
    const diagramSandbox = 'diag-sandbox-playground';

    // 1. Editor denied edit on a locked production diagram
    const lockedContext = {
      role: 'editor' as const,
      diagramId: diagramLocked,
      diagramOverrides: [
        {
          diagramId: diagramLocked,
          deniedActions: ['edit_diagram' as const, 'edit_model' as const],
        },
      ],
    };
    expect(canPerform(lockedContext, 'edit_diagram')).toBe(false);
    expect(canPerform(lockedContext, 'view_diagram')).toBe(true);

    // 2. Viewer granted edit on a sandbox diagram
    const sandboxContext = {
      role: 'viewer' as const,
      diagramId: diagramSandbox,
      diagramOverrides: [
        {
          diagramId: diagramSandbox,
          allowedActions: ['edit_diagram' as const],
        },
      ],
    };
    expect(canPerform(sandboxContext, 'edit_diagram')).toBe(true);
  });

  it('7. lists allowed actions for any role context', () => {
    const viewerActions = getAllowedActions({ role: 'viewer' });
    expect(viewerActions).toContain('view_diagram');
    expect(viewerActions).toContain('comment');
    expect(viewerActions).not.toContain('edit_model');

    const adminActions = getAllowedActions({ role: 'admin' });
    expect(adminActions).toContain('invite_member');
    expect(adminActions).toContain('edit_model');
    expect(adminActions).not.toContain('delete_workspace');
  });
});
