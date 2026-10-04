import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createHardenedEnterpriseSecurityProfile,
  evaluateEnterpriseSecurityChecklist,
  executeCryptoShredding,
  simulateBackupRestoreDrill,
  type OrgId,
} from '@diagramhq/domain';
import { EnterpriseSecurityModal } from './components/enterprise/enterprise-security-modal';

describe('Enterprise Security & Hardening UI & Checklist (F107)', () => {
  const orgId = 'org_cyberdyne_enterprise' as OrgId;

  describe('EnterpriseSecurityModal Component Rendering', () => {
    it('renders modal with executive KPI ribbon, tabs, and checklist controls', () => {
      const html = renderToString(
        <EnterpriseSecurityModal isOpen={true} onClose={() => {}} orgId={orgId} />
      );

      expect(html).toContain('Enterprise Security &amp; Hardening');
      expect(html).toContain('F107 Verified');
      expect(html).toContain('Checklist Status');
      expect(html).toContain('Security Score');
      expect(html).toContain('Controls Evaluated');
      expect(html).toContain('Critical CVE / Breaches');
      expect(html).toContain('Security Review Checklist');
      expect(html).toContain('Encryption &amp; Cryptography');
      expect(html).toContain('Disaster Recovery (PITR)');
      expect(html).toContain('Retention &amp; Crypto-Shredding');
      expect(html).toContain('SEC-NET-01');
      expect(html).toContain('Minimum TLS 1.3 Encryption in Transit');
      expect(html).toContain('SEC-CRYPTO-01');
      expect(html).toContain('Authenticated AES-256-GCM Encryption at Rest');
    });

    it('returns empty string when closed', () => {
      const html = renderToString(
        <EnterpriseSecurityModal isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe('');
    });
  });

  describe('Acceptance Criteria: The enterprise security checklist passes', () => {
    it('verifies that the enterprise security checklist passes with 100% compliance', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId);
      const report = evaluateEnterpriseSecurityChecklist(profile);

      // The enterprise security checklist passes
      expect(report.overallStatus).toBe('compliant');
      expect(report.score).toBe(100);
      expect(report.failedCount).toBe(0);
      expect(report.criticalFailures.length).toBe(0);
      expect(report.passedCount).toBe(report.totalCount);
    });

    it('verifies automated backup restore drills fulfill RTO and RPO SLA criteria', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId);
      const drill = simulateBackupRestoreDrill(profile, true);

      expect(drill.success).toBe(true);
      expect(drill.rtoTargetMet).toBe(true);
      expect(drill.rpoTargetMet).toBe(true);
      expect(drill.rtoActualMinutes).toBeLessThanOrEqual(30);
      expect(drill.rpoActualMinutes).toBeLessThanOrEqual(15);
      expect(drill.checksumVerified).toBe(true);
    });

    it('verifies NIST SP 800-88 crypto-shredding and legal hold evidentiary protection', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId);

      // 1. Standard crypto-shredding destroys encryption keys
      const shredResult = executeCryptoShredding(profile, 'arch_decommissioned');
      expect(shredResult.success).toBe(true);
      expect(shredResult.dataIrrecoverable).toBe(true);
      expect(shredResult.keysDestroyedCount).toBe(2);

      // 2. Active legal hold halts destruction
      profile.sanitization.legalHoldActive = true;
      profile.sanitization.legalHoldReason = 'SEC inquiry 2026';
      const blockedResult = executeCryptoShredding(profile, 'arch_litigation_target');
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.legalHoldBlocked).toBe(true);
      expect(blockedResult.dataIrrecoverable).toBe(false);
    });
  });
});
