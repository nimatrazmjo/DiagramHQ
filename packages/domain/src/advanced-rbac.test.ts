import { describe, expect, it } from 'vitest';
import { createId } from './ids';
import {
  ALL_FINE_GRAINED_PERMISSIONS,
  assertFineGrainedPermission,
  auditRoleLeastPrivilege,
  createBuiltinEnterpriseRoles,
  createCustomRole,
  evaluateFineGrainedPermission,
  testFineGrainedRoleDenial,
} from './advanced-rbac';

describe('Advanced RBAC & Fine-Grained Roles (F104)', () => {
  const orgId = createId('org');

  it('exposes a comprehensive catalog of fine-grained permissions across 7 domains', () => {
    expect(ALL_FINE_GRAINED_PERMISSIONS.length).toBeGreaterThanOrEqual(25);
    const domains = new Set(ALL_FINE_GRAINED_PERMISSIONS.map((p) => p.domain));
    expect(domains.has('architecture')).toBe(true);
    expect(domains.has('model')).toBe(true);
    expect(domains.has('flow')).toBe(true);
    expect(domains.has('docs')).toBe(true);
    expect(domains.has('governance')).toBe(true);
    expect(domains.has('admin')).toBe(true);
    expect(domains.has('billing')).toBe(true);
  });

  describe('Predefined Enterprise Specialized Roles', () => {
    it('creates built-in specialized roles adhering to least privilege', () => {
      const roles = createBuiltinEnterpriseRoles(orgId);
      expect(roles.length).toBe(5);

      const auditor = roles.find((r) => r.name === 'Security Auditor');
      const docSpecialist = roles.find((r) => r.name === 'Documentation Specialist');
      const compliance = roles.find((r) => r.name === 'Compliance Officer');
      const jrArch = roles.find((r) => r.name === 'Junior Architect');
      const billing = roles.find((r) => r.name === 'Billing Administrator');

      expect(auditor).toBeDefined();
      expect(docSpecialist).toBeDefined();
      expect(compliance).toBeDefined();
      expect(jrArch).toBeDefined();
      expect(billing).toBeDefined();

      // Auditor can inspect audit/compliance, but is explicitly denied model & diagram mutations
      expect(auditor?.permissions).toContain('audit:read');
      expect(auditor?.permissions).toContain('compliance:read');
      expect(auditor?.explicitDenials).toContain('model:edit_object');
      expect(auditor?.explicitDenials).toContain('architecture:edit');
      expect(auditor?.explicitDenials).toContain('workspace:delete');

      // Tech writer can edit markdown docs, but cannot touch model or publish code
      expect(docSpecialist?.permissions).toContain('docs:edit');
      expect(docSpecialist?.explicitDenials).toContain('model:create_object');

      // Billing admin strictly isolated from architecture diagrams
      expect(billing?.permissions).toContain('billing:manage');
      expect(billing?.explicitDenials).toContain('architecture:view');
      expect(billing?.explicitDenials).toContain('model:view');
    });
  });

  describe('Custom Role Creation', () => {
    it('creates custom fine-grained roles with custom allow/deny lists', () => {
      const customRole = createCustomRole(orgId, {
        name: 'API Governance Lead',
        description: 'Oversees REST and GraphQL schema contracts',
        permissions: ['model:view', 'model:manage_connections', 'docs:view', 'docs:edit'],
        explicitDenials: ['workspace:delete', 'billing:manage'],
      });

      expect(customRole.name).toBe('API Governance Lead');
      expect(customRole.permissions).toContain('model:manage_connections');
      expect(customRole.explicitDenials).toContain('workspace:delete');
      expect(customRole.isSystemRole).toBe(false);
    });

    it('rejects empty role names', () => {
      expect(() => {
        createCustomRole(orgId, {
          name: '',
          description: 'invalid',
          permissions: ['architecture:view'],
        });
      }).toThrow('Role name cannot be empty');
    });
  });

  describe('Least Privilege Permission Evaluation Engine', () => {
    it('evaluates EXPLICIT_ALLOW when action is granted', () => {
      const roles = createBuiltinEnterpriseRoles(orgId);
      const auditor = roles.find((r) => r.name === 'Security Auditor')!;

      const evalResult = evaluateFineGrainedPermission(auditor, 'audit:read');
      expect(evalResult.allowed).toBe(true);
      expect(evalResult.decision).toBe('ALLOW');
      expect(evalResult.reasonCode).toBe('EXPLICIT_ALLOW');
    });

    it('evaluates EXPLICIT_DENY when action is in explicit denials', () => {
      const roles = createBuiltinEnterpriseRoles(orgId);
      const auditor = roles.find((r) => r.name === 'Security Auditor')!;

      const evalResult = evaluateFineGrainedPermission(auditor, 'model:edit_object');
      expect(evalResult.allowed).toBe(false);
      expect(evalResult.decision).toBe('DENY');
      expect(evalResult.reasonCode).toBe('EXPLICIT_DENY');
      expect(evalResult.explanation).toContain('explicitly denied');
    });

    it('evaluates NOT_GRANTED (deny-by-default) when action is out of scope', () => {
      const customRole = createCustomRole(orgId, {
        name: 'Read Only Viewer',
        description: 'Minimal viewer',
        permissions: ['architecture:view'],
      });

      const evalResult = evaluateFineGrainedPermission(customRole, 'flow:create');
      expect(evalResult.allowed).toBe(false);
      expect(evalResult.decision).toBe('DENY');
      expect(evalResult.reasonCode).toBe('NOT_GRANTED');
      expect(evalResult.explanation).toContain('out of scope');
    });

    it('throws in assertFineGrainedPermission when denied', () => {
      const roles = createBuiltinEnterpriseRoles(orgId);
      const billing = roles.find((r) => r.name === 'Billing Administrator')!;

      expect(() => {
        assertFineGrainedPermission(billing, 'architecture:edit');
      }).toThrow(/\[Advanced RBAC\]/);

      expect(() => {
        assertFineGrainedPermission(billing, 'billing:manage');
      }).not.toThrow();
    });
  });

  describe('Acceptance Criteria Verification (testFineGrainedRoleDenial)', () => {
    it('denies out-of-scope actions for Security Auditor', () => {
      const roles = createBuiltinEnterpriseRoles(orgId);
      const auditor = roles.find((r) => r.name === 'Security Auditor')!;

      // Out of scope action 1: editing model
      const test1 = testFineGrainedRoleDenial(auditor, 'model:edit_object');
      expect(test1.denied).toBe(true);
      expect(test1.evaluation.decision).toBe('DENY');
      expect(test1.evaluation.reasonCode).toBe('EXPLICIT_DENY');

      // Out of scope action 2: deleting workspace
      const test2 = testFineGrainedRoleDenial(auditor, 'workspace:delete');
      expect(test2.denied).toBe(true);
      expect(test2.evaluation.decision).toBe('DENY');

      // Out of scope action 3: inviting members
      const test3 = testFineGrainedRoleDenial(auditor, 'member:invite');
      expect(test3.denied).toBe(true);
      expect(test3.evaluation.decision).toBe('DENY');
    });

    it('denies out-of-scope actions for Documentation Specialist', () => {
      const roles = createBuiltinEnterpriseRoles(orgId);
      const docSpecialist = roles.find((r) => r.name === 'Documentation Specialist')!;

      // Can edit docs
      const allowDoc = evaluateFineGrainedPermission(docSpecialist, 'docs:edit');
      expect(allowDoc.allowed).toBe(true);

      // Denies deleting diagrams or modifying model
      const testModel = testFineGrainedRoleDenial(docSpecialist, 'model:delete_object');
      expect(testModel.denied).toBe(true);

      const testDiag = testFineGrainedRoleDenial(docSpecialist, 'architecture:delete');
      expect(testDiag.denied).toBe(true);
    });

    it('denies out-of-scope actions for Billing Administrator', () => {
      const roles = createBuiltinEnterpriseRoles(orgId);
      const billing = roles.find((r) => r.name === 'Billing Administrator')!;

      // Denies reading diagrams or viewing models
      const testView = testFineGrainedRoleDenial(billing, 'architecture:view');
      expect(testView.denied).toBe(true);

      const testModel = testFineGrainedRoleDenial(billing, 'model:view');
      expect(testModel.denied).toBe(true);
    });
  });

  describe('Least Privilege Role Audit', () => {
    it('audits roles and detects high-privilege risk violations', () => {
      const dangerousRole = createCustomRole(orgId, {
        name: 'Dangerous Junior Role',
        description: 'Too many permissions',
        baseArchetype: 'viewer',
        permissions: [
          'workspace:delete',
          'sso:configure',
          'model:delete_object',
          'architecture:delete',
          'role:manage',
        ],
      });

      const report = auditRoleLeastPrivilege(dangerousRole);
      expect(report.riskLevel).toBe('CRITICAL');
      expect(report.highPrivilegeCount).toBeGreaterThanOrEqual(4);
      expect(report.leastPrivilegeViolations.length).toBeGreaterThanOrEqual(2);
      expect(report.recommendations.length).toBeGreaterThanOrEqual(2);
    });

    it('reports LOW risk for well-scoped least-privilege roles', () => {
      const safeRole = createCustomRole(orgId, {
        name: 'Safe Viewer',
        description: 'View only',
        permissions: ['architecture:view', 'docs:view'],
      });

      const report = auditRoleLeastPrivilege(safeRole);
      expect(report.riskLevel).toBe('LOW');
      expect(report.leastPrivilegeViolations.length).toBe(0);
    });
  });
});
