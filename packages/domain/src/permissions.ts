/**
 * DiagramHQ - Permissions Domain Logic (F053)
 *
 * Pure, framework-agnostic role catalog (Owner, Admin, Editor, Viewer, Guest)
 * and permission evaluator with per-workspace and per-diagram capabilities.
 */

import type { MemberRole } from './types';

export type PermissionAction =
  | 'view_diagram'
  | 'edit_diagram'
  | 'edit_model'
  | 'create_flow'
  | 'comment'
  | 'resolve_comment'
  | 'invite_member'
  | 'manage_roles'
  | 'create_share_link'
  | 'delete_workspace';

export interface DiagramPermissionOverride {
  diagramId: string;
  allowedActions?: PermissionAction[];
  deniedActions?: PermissionAction[];
}

export interface WorkspacePermissionOverride {
  workspaceId: string;
  allowedActions?: PermissionAction[];
  deniedActions?: PermissionAction[];
}

export interface PermissionContext {
  role: MemberRole;
  workspaceId?: string;
  diagramId?: string;
  workspaceOverrides?: WorkspacePermissionOverride[];
  diagramOverrides?: DiagramPermissionOverride[];
}

export class PermissionDeniedError extends Error {
  readonly action: PermissionAction;
  readonly role: MemberRole;

  constructor(action: PermissionAction, role: MemberRole, message?: string) {
    super(
      message ||
        `Permission denied: Role '${role}' is not authorized to perform action '${action}'`
    );
    this.name = 'PermissionDeniedError';
    this.action = action;
    this.role = role;
  }
}

/**
 * Base default permission matrix by role.
 */
const BASE_ROLE_PERMISSIONS: Record<MemberRole, ReadonlySet<PermissionAction>> = {
  owner: new Set<PermissionAction>([
    'view_diagram',
    'edit_diagram',
    'edit_model',
    'create_flow',
    'comment',
    'resolve_comment',
    'invite_member',
    'manage_roles',
    'create_share_link',
    'delete_workspace',
  ]),
  admin: new Set<PermissionAction>([
    'view_diagram',
    'edit_diagram',
    'edit_model',
    'create_flow',
    'comment',
    'resolve_comment',
    'invite_member',
    'manage_roles',
    'create_share_link',
  ]),
  editor: new Set<PermissionAction>([
    'view_diagram',
    'edit_diagram',
    'edit_model',
    'create_flow',
    'comment',
    'resolve_comment',
    'create_share_link',
  ]),
  viewer: new Set<PermissionAction>([
    'view_diagram',
    'comment',
  ]),
  guest: new Set<PermissionAction>([
    'view_diagram',
  ]),
};

/**
 * Evaluates whether a role can perform an action, taking into account
 * workspace and diagram level overrides.
 */
export function canPerform(
  context: PermissionContext,
  action: PermissionAction
): boolean {
  const { role, workspaceId, diagramId, workspaceOverrides, diagramOverrides } = context;

  // 1. Check Diagram-level overrides first (highest specificity)
  if (diagramId && diagramOverrides) {
    const diagOverride = diagramOverrides.find((d) => d.diagramId === diagramId);
    if (diagOverride) {
      if (diagOverride.deniedActions?.includes(action)) {
        return false;
      }
      if (diagOverride.allowedActions?.includes(action)) {
        return true;
      }
    }
  }

  // 2. Check Workspace-level overrides second
  if (workspaceId && workspaceOverrides) {
    const wsOverride = workspaceOverrides.find((w) => w.workspaceId === workspaceId);
    if (wsOverride) {
      if (wsOverride.deniedActions?.includes(action)) {
        return false;
      }
      if (wsOverride.allowedActions?.includes(action)) {
        return true;
      }
    }
  }

  // 3. Fallback to base role permissions
  const allowed = BASE_ROLE_PERMISSIONS[role]?.has(action) ?? false;
  return allowed;
}

/**
 * Asserts that the role can perform the action, throwing `PermissionDeniedError` if not.
 */
export function assertPermission(
  context: PermissionContext,
  action: PermissionAction
): void {
  if (!canPerform(context, action)) {
    throw new PermissionDeniedError(action, context.role);
  }
}

/**
 * Lists all actions permitted for a given context.
 */
export function getAllowedActions(context: PermissionContext): PermissionAction[] {
  const allActions: PermissionAction[] = [
    'view_diagram',
    'edit_diagram',
    'edit_model',
    'create_flow',
    'comment',
    'resolve_comment',
    'invite_member',
    'manage_roles',
    'create_share_link',
    'delete_workspace',
  ];

  return allActions.filter((action) => canPerform(context, action));
}
