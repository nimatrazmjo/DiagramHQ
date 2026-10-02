/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  canPerform,
  assertPermission,
  getAllowedActions,
  PermissionDeniedError,
} from '@diagramhq/domain';
import type { PermissionContext } from '@diagramhq/domain';
import {
  PermissionGuard,
  RoleBadge,
} from './components/canvas';

describe('Permissions Integration & UI (F053)', () => {
  it('1. Acceptance Test: viewer cannot edit; editor can edit; admin can invite', () => {
    const viewerContext: PermissionContext = { role: 'viewer' };
    const editorContext: PermissionContext = { role: 'editor' };
    const adminContext: PermissionContext = { role: 'admin' };

    // Viewer assertions
    expect(canPerform(viewerContext, 'edit_diagram')).toBe(false);
    expect(canPerform(viewerContext, 'view_diagram')).toBe(true);
    expect(canPerform(viewerContext, 'comment')).toBe(true);
    expect(canPerform(viewerContext, 'invite_member')).toBe(false);
    expect(() => assertPermission(viewerContext, 'edit_diagram')).toThrow(PermissionDeniedError);

    // Editor assertions
    expect(canPerform(editorContext, 'edit_diagram')).toBe(true);
    expect(canPerform(editorContext, 'create_flow')).toBe(true);
    expect(canPerform(editorContext, 'invite_member')).toBe(false);

    // Admin assertions
    expect(canPerform(adminContext, 'invite_member')).toBe(true);
    expect(canPerform(adminContext, 'manage_roles')).toBe(true);
    expect(canPerform(adminContext, 'edit_diagram')).toBe(true);
    expect(canPerform(adminContext, 'delete_workspace')).toBe(false); // Only owner can delete workspace
  });

  it('2. supports per-diagram and per-workspace permission overrides', () => {
    // User is normally a 'viewer' across the workspace
    const contextWithOverrides: PermissionContext = {
      role: 'viewer',
      workspaceId: 'ws-prod',
      diagramId: 'diag-sandbox',
      diagramOverrides: [
        {
          diagramId: 'diag-sandbox',
          allowedActions: ['edit_diagram', 'create_flow'],
        },
      ],
    };

    // Allowed on sandbox diagram due to override
    expect(canPerform(contextWithOverrides, 'edit_diagram')).toBe(true);
    expect(canPerform(contextWithOverrides, 'create_flow')).toBe(true);

    // Context for a different diagram in same workspace does not inherit override
    const prodDiagramContext: PermissionContext = {
      ...contextWithOverrides,
      diagramId: 'diag-production-core',
    };
    expect(canPerform(prodDiagramContext, 'edit_diagram')).toBe(false);
  });

  it('3. returns full list of allowed actions for context', () => {
    const actions = getAllowedActions({ role: 'guest' });
    expect(actions).toEqual(['view_diagram']);

    const editorActions = getAllowedActions({ role: 'editor' });
    expect(editorActions).toContain('view_diagram');
    expect(editorActions).toContain('edit_diagram');
    expect(editorActions).toContain('create_flow');
    expect(editorActions).toContain('comment');
    expect(editorActions).not.toContain('invite_member');
  });

  it('4. renders <RoleBadge /> for each member role', () => {
    const ownerHtml = renderToString(<RoleBadge role="owner" />);
    expect(ownerHtml).toContain('data-testid="role-badge"');
    expect(ownerHtml).toContain('data-role="owner"');
    expect(ownerHtml).toContain('Owner');

    const adminHtml = renderToString(<RoleBadge role="admin" />);
    expect(adminHtml).toContain('data-role="admin"');
    expect(adminHtml).toContain('Admin');

    const editorHtml = renderToString(<RoleBadge role="editor" />);
    expect(editorHtml).toContain('data-role="editor"');
    expect(editorHtml).toContain('Editor');

    const viewerHtml = renderToString(<RoleBadge role="viewer" />);
    expect(viewerHtml).toContain('data-role="viewer"');
    expect(viewerHtml).toContain('Viewer');

    const guestHtml = renderToString(<RoleBadge role="guest" />);
    expect(guestHtml).toContain('data-role="guest"');
    expect(guestHtml).toContain('Guest');
  });

  it('5. renders children in <PermissionGuard /> when authorized, and fallback when denied', () => {
    const viewerContext: PermissionContext = { role: 'viewer' };
    const editorContext: PermissionContext = { role: 'editor' };

    // When allowed: renders children
    const allowedHtml = renderToString(
      <PermissionGuard
        context={editorContext}
        action="edit_diagram"
        fallback={<span data-testid="denied">No Access</span>}
      >
        <button data-testid="edit-btn">Edit Diagram</button>
      </PermissionGuard>
    );
    expect(allowedHtml).toContain('data-testid="edit-btn"');
    expect(allowedHtml).toContain('Edit Diagram');
    expect(allowedHtml).not.toContain('data-testid="denied"');

    // When denied: renders fallback
    const deniedHtml = renderToString(
      <PermissionGuard
        context={viewerContext}
        action="edit_diagram"
        fallback={<span data-testid="denied">No Access</span>}
      >
        <button data-testid="edit-btn">Edit Diagram</button>
      </PermissionGuard>
    );
    expect(deniedHtml).not.toContain('data-testid="edit-btn"');
    expect(deniedHtml).toContain('data-testid="denied"');
    expect(deniedHtml).toContain('No Access');

    // When denied without fallback: renders empty string
    const noFallbackHtml = renderToString(
      <PermissionGuard
        context={viewerContext}
        action="edit_diagram"
      >
        <button data-testid="edit-btn">Edit Diagram</button>
      </PermissionGuard>
    );
    expect(noFallbackHtml).toBe('');
  });
});
