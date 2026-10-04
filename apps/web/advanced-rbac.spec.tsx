import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createBuiltinEnterpriseRoles,
  createCustomRole,
  createId,
  evaluateFineGrainedPermission,
  testFineGrainedRoleDenial,
} from '@diagramhq/domain';
import { AdvancedRbacModal } from './components/enterprise/advanced-rbac-modal';

describe('Advanced RBAC Integration & UI (F104)', () => {
  const orgId = createId('org');

  describe('AdvancedRbacModal Rendering', () => {
    it('renders the Advanced RBAC modal with enterprise roles catalog and tabs', () => {
      const html = renderToString(
        <AdvancedRbacModal isOpen={true} onClose={() => {}} orgName="Global Corp" />
      );

      expect(html).toContain('Advanced Role-Based Access Control (Advanced RBAC)');
      expect(html).toContain('F104');
      expect(html).toContain('Enterprise Roles');
      expect(html).toContain('Least Privilege Evaluator');
      expect(html).toContain('Risk &amp; Compliance Audit');
      expect(html).toContain('+ Custom Role');

      // Predefined enterprise roles
      expect(html).toContain('Security Auditor');
      expect(html).toContain('Documentation Specialist');
      expect(html).toContain('Compliance Officer');
      expect(html).toContain('Junior Architect');
      expect(html).toContain('Billing Administrator');
    });

    it('renders closed modal as null', () => {
      const html = renderToString(
        <AdvancedRbacModal isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe('');
    });
  });

  describe('Least Privilege Action Denial Acceptance Tests', () => {
    it('acceptance test: Security Auditor fine-grained role denies out-of-scope model mutation', () => {
      const roles = createBuiltinEnterpriseRoles(orgId);
      const auditor = roles.find((r) => r.name === 'Security Auditor')!;

      // 1. Auditor can view audit logs and architecture
      const auditRead = evaluateFineGrainedPermission(auditor, 'audit:read');
      expect(auditRead.allowed).toBe(true);
      expect(auditRead.decision).toBe('ALLOW');

      const archView = evaluateFineGrainedPermission(auditor, 'architecture:view');
      expect(archView.allowed).toBe(true);

      // 2. Acceptance Criteria: a fine-grained role denies an out-of-scope action
      const outOfScopeTest = testFineGrainedRoleDenial(auditor, 'model:edit_object');
      expect(outOfScopeTest.denied).toBe(true);
      expect(outOfScopeTest.evaluation.decision).toBe('DENY');
      expect(outOfScopeTest.evaluation.reasonCode).toBe('EXPLICIT_DENY');
      expect(outOfScopeTest.evaluation.explanation).toContain('explicitly denied');
    });

    it('acceptance test: Documentation Specialist fine-grained role denies out-of-scope workspace deletion', () => {
      const roles = createBuiltinEnterpriseRoles(orgId);
      const techwriter = roles.find((r) => r.name === 'Documentation Specialist')!;

      // Can edit docs
      expect(evaluateFineGrainedPermission(techwriter, 'docs:edit').allowed).toBe(true);

      // Denies out-of-scope destructive action
      const outOfScopeTest = testFineGrainedRoleDenial(techwriter, 'workspace:delete');
      expect(outOfScopeTest.denied).toBe(true);
      expect(outOfScopeTest.evaluation.decision).toBe('DENY');
    });

    it('acceptance test: Custom Role with minimal scope denies ungranted actions by default', () => {
      const customRole = createCustomRole(orgId, {
        name: 'SOC2 Assessor',
        description: 'External auditor for annual SOC2 review',
        permissions: ['compliance:read', 'compliance:export', 'audit:read'],
      });

      // Permitted actions
      expect(evaluateFineGrainedPermission(customRole, 'compliance:read').allowed).toBe(true);

      // Out-of-scope action is denied (deny-by-default)
      const outOfScopeTest = testFineGrainedRoleDenial(customRole, 'architecture:edit');
      expect(outOfScopeTest.denied).toBe(true);
      expect(outOfScopeTest.evaluation.decision).toBe('DENY');
      expect(outOfScopeTest.evaluation.reasonCode).toBe('NOT_GRANTED');
    });
  });
});
