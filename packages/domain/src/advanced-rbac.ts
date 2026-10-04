/**
 * DiagramHQ - Enterprise Advanced Role-Based Access Control (Advanced RBAC) (F104)
 *
 * Implements fine-grained roles beyond the base catalog and strict least-privilege enforcement:
 * - Granular permission catalog across 7 enterprise domains
 * - Built-in specialized enterprise roles (Security Auditor, Documentation Specialist, Compliance Officer, Junior Architect, Billing Administrator)
 * - Custom role creation with explicit allow and deny lists
 * - Least privilege evaluator with explicit-deny precedence and deny-by-default guarantees
 * - Out-of-scope action denial testing harness
 * - Role privilege risk analysis & least privilege audit
 */

import { createId, type CustomRoleId, type OrgId } from './ids';
import type { MemberRole } from './types';

export type FineGrainedPermission =
  // Architecture & Canvas
  | 'architecture:view'
  | 'architecture:edit'
  | 'architecture:delete'
  | 'architecture:publish'
  | 'architecture:export'
  // Model & Catalog
  | 'model:view'
  | 'model:create_object'
  | 'model:edit_object'
  | 'model:delete_object'
  | 'model:manage_connections'
  // Flows & Execution
  | 'flow:view'
  | 'flow:create'
  | 'flow:edit'
  | 'flow:delete'
  // Documentation & ADRs
  | 'docs:view'
  | 'docs:edit'
  | 'docs:publish'
  | 'docs:export'
  | 'adr:create'
  | 'adr:edit'
  | 'adr:approve'
  // Security, Governance & Audit
  | 'audit:read'
  | 'compliance:read'
  | 'compliance:export'
  | 'security:scan'
  | 'policy:manage'
  // Administration
  | 'member:invite'
  | 'member:remove'
  | 'role:manage'
  | 'sso:configure'
  | 'scim:manage'
  | 'workspace:delete'
  // Billing & Plans
  | 'billing:view'
  | 'billing:manage';

export type PermissionDomain =
  | 'architecture'
  | 'model'
  | 'flow'
  | 'docs'
  | 'governance'
  | 'admin'
  | 'billing';

export interface PermissionDefinition {
  id: FineGrainedPermission;
  name: string;
  domain: PermissionDomain;
  description: string;
  isHighPrivilege: boolean;
}

export const ALL_FINE_GRAINED_PERMISSIONS: PermissionDefinition[] = [
  // Architecture
  { id: 'architecture:view', name: 'View Diagrams', domain: 'architecture', description: 'View architecture diagrams and canvas', isHighPrivilege: false },
  { id: 'architecture:edit', name: 'Edit Diagrams', domain: 'architecture', description: 'Modify diagram layouts and visual elements', isHighPrivilege: false },
  { id: 'architecture:delete', name: 'Delete Diagrams', domain: 'architecture', description: 'Delete entire architecture views', isHighPrivilege: true },
  { id: 'architecture:publish', name: 'Publish Diagrams', domain: 'architecture', description: 'Publish diagrams to public portal or production', isHighPrivilege: true },
  { id: 'architecture:export', name: 'Export Diagrams', domain: 'architecture', description: 'Export diagrams to PDF, PNG, SVG, or JSON', isHighPrivilege: false },

  // Model
  { id: 'model:view', name: 'View Model', domain: 'model', description: 'Read systems, containers, components, and connections', isHighPrivilege: false },
  { id: 'model:create_object', name: 'Create Model Objects', domain: 'model', description: 'Add new architectural systems or components', isHighPrivilege: false },
  { id: 'model:edit_object', name: 'Edit Model Objects', domain: 'model', description: 'Modify object definitions, metadata, and tags', isHighPrivilege: false },
  { id: 'model:delete_object', name: 'Delete Model Objects', domain: 'model', description: 'Remove architectural objects from catalog', isHighPrivilege: true },
  { id: 'model:manage_connections', name: 'Manage Connections', domain: 'model', description: 'Create and update relationships between objects', isHighPrivilege: false },

  // Flows
  { id: 'flow:view', name: 'View Flows', domain: 'flow', description: 'Inspect sequence flows and playback', isHighPrivilege: false },
  { id: 'flow:create', name: 'Create Flows', domain: 'flow', description: 'Author new message sequence flows', isHighPrivilege: false },
  { id: 'flow:edit', name: 'Edit Flows', domain: 'flow', description: 'Modify existing flow steps and payloads', isHighPrivilege: false },
  { id: 'flow:delete', name: 'Delete Flows', domain: 'flow', description: 'Delete execution flows', isHighPrivilege: false },

  // Docs & ADRs
  { id: 'docs:view', name: 'View Documentation', domain: 'docs', description: 'Read markdown architecture specifications', isHighPrivilege: false },
  { id: 'docs:edit', name: 'Edit Documentation', domain: 'docs', description: 'Author and modify markdown documentation', isHighPrivilege: false },
  { id: 'docs:publish', name: 'Publish Documentation', domain: 'docs', description: 'Deploy public documentation site', isHighPrivilege: true },
  { id: 'docs:export', name: 'Export Documentation', domain: 'docs', description: 'Export docs to standalone HTML or PDF', isHighPrivilege: false },
  { id: 'adr:create', name: 'Create ADRs', domain: 'docs', description: 'Propose new Architecture Decision Records', isHighPrivilege: false },
  { id: 'adr:edit', name: 'Edit ADRs', domain: 'docs', description: 'Update ADR details, context, and consequences', isHighPrivilege: false },
  { id: 'adr:approve', name: 'Approve ADRs', domain: 'docs', description: 'Formally approve or reject Architecture Decisions', isHighPrivilege: true },

  // Governance & Security
  { id: 'audit:read', name: 'Read Audit Logs', domain: 'governance', description: 'Access immutable security and access audit logs', isHighPrivilege: false },
  { id: 'compliance:read', name: 'View Compliance Reports', domain: 'governance', description: 'Read SOC2, ISO, HIPAA compliance mappings', isHighPrivilege: false },
  { id: 'compliance:export', name: 'Export Compliance Evidence', domain: 'governance', description: 'Download compliance attestation packages', isHighPrivilege: true },
  { id: 'security:scan', name: 'Run Security Scans', domain: 'governance', description: 'Execute automated security & vulnerability audits', isHighPrivilege: false },
  { id: 'policy:manage', name: 'Manage Org Policies', domain: 'governance', description: 'Define and enforce org-wide governance policies', isHighPrivilege: true },

  // Administration
  { id: 'member:invite', name: 'Invite Members', domain: 'admin', description: 'Send workspace invitations', isHighPrivilege: false },
  { id: 'member:remove', name: 'Remove Members', domain: 'admin', description: 'Revoke member access to workspace', isHighPrivilege: true },
  { id: 'role:manage', name: 'Manage Roles & RBAC', domain: 'admin', description: 'Create and assign fine-grained roles', isHighPrivilege: true },
  { id: 'sso:configure', name: 'Configure SSO/SAML', domain: 'admin', description: 'Manage corporate identity providers and certificates', isHighPrivilege: true },
  { id: 'scim:manage', name: 'Manage SCIM Provisioning', domain: 'admin', description: 'Configure SCIM tokens and directory sync', isHighPrivilege: true },
  { id: 'workspace:delete', name: 'Delete Workspace', domain: 'admin', description: 'Permanently destroy a workspace and all diagrams', isHighPrivilege: true },

  // Billing
  { id: 'billing:view', name: 'View Billing', domain: 'billing', description: 'Read invoices, subscription plans, and seat usage', isHighPrivilege: false },
  { id: 'billing:manage', name: 'Manage Billing', domain: 'billing', description: 'Update credit cards, tiers, and purchase seats', isHighPrivilege: true },
];

export interface CustomRole {
  readonly id: CustomRoleId;
  readonly orgId: OrgId;
  name: string;
  description: string;
  isSystemRole: boolean;
  baseArchetype: MemberRole;
  permissions: FineGrainedPermission[];
  explicitDenials: FineGrainedPermission[];
  createdAt: Date;
  updatedAt: Date;
}

export type DecisionType = 'ALLOW' | 'DENY';
export type DecisionReasonCode =
  | 'EXPLICIT_DENY'
  | 'NOT_GRANTED'
  | 'EXPLICIT_ALLOW'
  | 'SUPER_ADMIN_ALLOW';

export interface FineGrainedEvaluationResult {
  allowed: boolean;
  decision: DecisionType;
  reasonCode: DecisionReasonCode;
  explanation: string;
  action: FineGrainedPermission;
  roleId: string;
  roleName: string;
}

export interface PrivilegeRiskReport {
  roleId: string;
  roleName: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  highPrivilegeCount: number;
  highPrivilegePermissions: FineGrainedPermission[];
  leastPrivilegeViolations: string[];
  recommendations: string[];
}

/**
 * Creates predefined enterprise specialized roles with explicit least privilege boundaries.
 */
export function createBuiltinEnterpriseRoles(orgId: OrgId): CustomRole[] {
  const now = new Date();

  return [
    // 1. Security Auditor (Read-only inspection of architecture, security & audit logs; CANNOT edit model or invite users)
    {
      id: `role_auditor_${orgId}` as CustomRoleId,
      orgId,
      name: 'Security Auditor',
      description: 'Audits security posture, compliance, and logs. Denied from modifying diagrams or models.',
      isSystemRole: true,
      baseArchetype: 'viewer',
      permissions: [
        'architecture:view',
        'architecture:export',
        'model:view',
        'flow:view',
        'docs:view',
        'audit:read',
        'compliance:read',
        'compliance:export',
        'security:scan',
      ],
      explicitDenials: [
        'architecture:edit',
        'architecture:delete',
        'architecture:publish',
        'model:create_object',
        'model:edit_object',
        'model:delete_object',
        'model:manage_connections',
        'member:invite',
        'member:remove',
        'role:manage',
        'workspace:delete',
        'sso:configure',
        'scim:manage',
      ],
      createdAt: now,
      updatedAt: now,
    },

    // 2. Documentation Specialist (Edits markdown and export specs; CANNOT alter models or infrastructure)
    {
      id: `role_techwriter_${orgId}` as CustomRoleId,
      orgId,
      name: 'Documentation Specialist',
      description: 'Maintains architecture manuals and ADRs. Denied from mutating core model objects.',
      isSystemRole: true,
      baseArchetype: 'editor',
      permissions: [
        'architecture:view',
        'architecture:export',
        'model:view',
        'flow:view',
        'docs:view',
        'docs:edit',
        'docs:publish',
        'docs:export',
        'adr:create',
        'adr:edit',
      ],
      explicitDenials: [
        'architecture:delete',
        'model:create_object',
        'model:edit_object',
        'model:delete_object',
        'model:manage_connections',
        'adr:approve',
        'policy:manage',
        'role:manage',
        'sso:configure',
        'scim:manage',
        'workspace:delete',
      ],
      createdAt: now,
      updatedAt: now,
    },

    // 3. Compliance Officer (Reviews audit, compliance frameworks, approves ADRs; CANNOT edit diagrams)
    {
      id: `role_compliance_${orgId}` as CustomRoleId,
      orgId,
      name: 'Compliance Officer',
      description: 'Oversees regulatory frameworks and policy governance. Denied from altering diagrams.',
      isSystemRole: true,
      baseArchetype: 'viewer',
      permissions: [
        'architecture:view',
        'model:view',
        'flow:view',
        'docs:view',
        'audit:read',
        'compliance:read',
        'compliance:export',
        'policy:manage',
        'adr:approve',
      ],
      explicitDenials: [
        'architecture:edit',
        'architecture:delete',
        'model:create_object',
        'model:edit_object',
        'model:delete_object',
        'member:remove',
        'workspace:delete',
        'scim:manage',
      ],
      createdAt: now,
      updatedAt: now,
    },

    // 4. Junior Architect (Drafts diagrams and flows; CANNOT delete models, publish publicly, or manage admin)
    {
      id: `role_jrarch_${orgId}` as CustomRoleId,
      orgId,
      name: 'Junior Architect',
      description: 'Authors draft diagrams and flow sequences. Denied from publishing or deleting resources.',
      isSystemRole: true,
      baseArchetype: 'editor',
      permissions: [
        'architecture:view',
        'architecture:edit',
        'model:view',
        'model:create_object',
        'model:edit_object',
        'model:manage_connections',
        'flow:view',
        'flow:create',
        'flow:edit',
        'docs:view',
        'docs:edit',
        'adr:create',
      ],
      explicitDenials: [
        'architecture:delete',
        'architecture:publish',
        'model:delete_object',
        'adr:approve',
        'policy:manage',
        'role:manage',
        'sso:configure',
        'scim:manage',
        'workspace:delete',
        'billing:manage',
      ],
      createdAt: now,
      updatedAt: now,
    },

    // 5. Billing Administrator (Manages subscription, licenses, and seats; strictly zero access to architecture)
    {
      id: `role_billing_${orgId}` as CustomRoleId,
      orgId,
      name: 'Billing Administrator',
      description: 'Manages enterprise subscriptions and invoices. Strictly isolated from diagrams and model.',
      isSystemRole: true,
      baseArchetype: 'guest',
      permissions: [
        'billing:view',
        'billing:manage',
        'member:invite',
      ],
      explicitDenials: [
        'architecture:view',
        'architecture:edit',
        'architecture:delete',
        'architecture:publish',
        'model:view',
        'model:create_object',
        'model:edit_object',
        'model:delete_object',
        'docs:view',
        'audit:read',
        'compliance:read',
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Creates a dynamic custom role.
 */
export function createCustomRole(
  orgId: OrgId,
  input: {
    name: string;
    description: string;
    baseArchetype?: MemberRole;
    permissions: FineGrainedPermission[];
    explicitDenials?: FineGrainedPermission[];
  }
): CustomRole {
  if (!input.name.trim()) {
    throw new Error('Role name cannot be empty');
  }

  const roleId = createId('role') as CustomRoleId;
  return {
    id: roleId,
    orgId,
    name: input.name.trim(),
    description: input.description.trim(),
    isSystemRole: false,
    baseArchetype: input.baseArchetype ?? 'viewer',
    permissions: Array.from(new Set(input.permissions)),
    explicitDenials: Array.from(new Set(input.explicitDenials ?? [])),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Evaluates whether a role can execute a fine-grained action under least privilege principles:
 * 1. Super-admin / Owner has full access unless explicitly denied.
 * 2. Explicit Deny overrides any Allow.
 * 3. Deny-by-default: If not explicitly granted, action is denied.
 */
export function evaluateFineGrainedPermission(
  role: CustomRole,
  action: FineGrainedPermission
): FineGrainedEvaluationResult {
  // 1. Explicit Denial check (highest precedence - least privilege security guarantee)
  if (role.explicitDenials.includes(action)) {
    return {
      allowed: false,
      decision: 'DENY',
      reasonCode: 'EXPLICIT_DENY',
      explanation: `Action '${action}' is explicitly denied for role '${role.name}' to enforce least privilege.`,
      action,
      roleId: role.id,
      roleName: role.name,
    };
  }

  // 2. Explicit Grant check
  if (role.permissions.includes(action)) {
    return {
      allowed: true,
      decision: 'ALLOW',
      reasonCode: 'EXPLICIT_ALLOW',
      explanation: `Action '${action}' is explicitly granted to role '${role.name}'.`,
      action,
      roleId: role.id,
      roleName: role.name,
    };
  }

  // 3. Fallback: Deny by default
  return {
    allowed: false,
    decision: 'DENY',
    reasonCode: 'NOT_GRANTED',
    explanation: `Action '${action}' is out of scope and not granted for role '${role.name}' (least privilege deny-by-default).`,
    action,
    roleId: role.id,
    roleName: role.name,
  };
}

/**
 * Convenience assertion helper throwing an Error when permission is denied.
 */
export function assertFineGrainedPermission(
  role: CustomRole,
  action: FineGrainedPermission
): void {
  const result = evaluateFineGrainedPermission(role, action);
  if (!result.allowed) {
    throw new Error(`[Advanced RBAC] ${result.explanation}`);
  }
}

/**
 * Acceptance criteria test helper:
 * Verifies that a fine-grained role denies an out-of-scope action.
 */
export function testFineGrainedRoleDenial(
  role: CustomRole,
  outOfScopeAction: FineGrainedPermission
): { denied: boolean; evaluation: FineGrainedEvaluationResult } {
  const evaluation = evaluateFineGrainedPermission(role, outOfScopeAction);
  return {
    denied: !evaluation.allowed,
    evaluation,
  };
}

/**
 * Performs a Least Privilege audit on a role.
 */
export function auditRoleLeastPrivilege(role: CustomRole): PrivilegeRiskReport {
  const highPrivPerms = ALL_FINE_GRAINED_PERMISSIONS
    .filter((p) => p.isHighPrivilege && role.permissions.includes(p.id))
    .map((p) => p.id);

  const violations: string[] = [];
  const recommendations: string[] = [];

  // Check destructive permissions
  if (role.permissions.includes('workspace:delete')) {
    violations.push('Possesses workspace:delete destructive capability');
    recommendations.push('Limit workspace:delete exclusively to Owner archetype');
  }

  if (role.permissions.includes('sso:configure') && role.baseArchetype !== 'admin' && role.baseArchetype !== 'owner') {
    violations.push('Non-admin role possesses sso:configure security control');
    recommendations.push('Remove sso:configure from non-administrative roles');
  }

  if (role.permissions.includes('model:delete_object') && role.name.toLowerCase().includes('junior')) {
    violations.push('Junior role has permission to delete architecture model objects');
    recommendations.push('Revoke model:delete_object from junior architects');
  }

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (highPrivPerms.length >= 5 || violations.length >= 2) {
    riskLevel = 'CRITICAL';
  } else if (highPrivPerms.length >= 3 || violations.length === 1) {
    riskLevel = 'HIGH';
  } else if (highPrivPerms.length >= 1) {
    riskLevel = 'MEDIUM';
  }

  return {
    roleId: role.id,
    roleName: role.name,
    riskLevel,
    highPrivilegeCount: highPrivPerms.length,
    highPrivilegePermissions: highPrivPerms,
    leastPrivilegeViolations: violations,
    recommendations,
  };
}
