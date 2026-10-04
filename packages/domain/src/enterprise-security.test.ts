import { describe, expect, it } from 'vitest';
import type { OrgId, UserId } from './ids';
import {
  createHardenedEnterpriseSecurityProfile,
  evaluateEnterpriseSecurityChecklist,
  executeCryptoShredding,
  simulateBackupRestoreDrill,
  type EnterpriseSecurityProfile,
} from './enterprise-security';

describe('F107 — Enterprise Security Domain Logic', () => {
  const orgId = 'org_enterprise_sec' as OrgId;
  const userId = 'usr_ciso' as UserId;

  describe('Acceptance Criteria: The enterprise security checklist passes', () => {
    it('evaluates a hardened enterprise security baseline to full compliance (100% score)', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId, userId);
      const report = evaluateEnterpriseSecurityChecklist(profile);

      // Acceptance test: the checklist passes
      expect(report.overallStatus).toBe('compliant');
      expect(report.failedCount).toBe(0);
      expect(report.criticalFailures.length).toBe(0);
      expect(report.score).toBe(100);
      expect(report.passedCount).toBe(report.totalCount);
      expect(report.totalCount).toBeGreaterThanOrEqual(12);

      // Verify all domains are covered
      const categories = new Set(report.items.map((i) => i.category));
      expect(categories.has('network_transport')).toBe(true);
      expect(categories.has('cryptography_rest')).toBe(true);
      expect(categories.has('identity_access')).toBe(true);
      expect(categories.has('audit_logging')).toBe(true);
      expect(categories.has('resilience_dr')).toBe(true);
      expect(categories.has('vulnerability_mgmt')).toBe(true);
    });

    it('fails transport security when minimum TLS 1.3 is not enforced', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId, userId);
      profile.encryptionTransit.minTlsVersion = 'TLS_1_2';

      const report = evaluateEnterpriseSecurityChecklist(profile);
      const tlsItem = report.items.find((i) => i.id === 'SEC-NET-01');

      expect(tlsItem?.status).toBe('fail');
      expect(tlsItem?.severity).toBe('critical');
      expect(report.overallStatus).toBe('non_compliant');
      expect(report.criticalFailures.some((f) => f.id === 'SEC-NET-01')).toBe(true);
      expect(tlsItem?.remediation).toContain('Upgrade minimum transport protocol');
    });

    it('flags warning when key rotation exceeds 90-day CIS standard', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId, userId);
      profile.encryptionRest.keyRotationDays = 180; // > 90 days

      const report = evaluateEnterpriseSecurityChecklist(profile);
      const rotationItem = report.items.find((i) => i.id === 'SEC-CRYPTO-02');

      expect(rotationItem?.status).toBe('warn');
      expect(report.warnCount).toBe(1);
      expect(report.overallStatus).toBe('conditional');
    });

    it('fails identity governance when corporate SSO/SAML is unenforced', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId, userId);
      profile.ssoEnforced = false;

      const report = evaluateEnterpriseSecurityChecklist(profile);
      const ssoItem = report.items.find((i) => i.id === 'SEC-IAM-01');

      expect(ssoItem?.status).toBe('fail');
      expect(report.overallStatus).toBe('non_compliant');
    });

    it('fails audit logging when immutable chained logs or AI tracking is disabled', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId, userId);
      profile.aiAgentAuditingEnabled = false;

      const report = evaluateEnterpriseSecurityChecklist(profile);
      const aiAuditItem = report.items.find((i) => i.id === 'SEC-LOG-02');

      expect(aiAuditItem?.status).toBe('fail');
      expect(aiAuditItem?.frameworkRef).toContain('NIST AI RMF');
    });

    it('fails resilience review when disaster recovery drill has not been verified within 90 days', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId, userId);
      profile.backupDr.restoreVerificationPassed = false;

      const report = evaluateEnterpriseSecurityChecklist(profile);
      const drItem = report.items.find((i) => i.id === 'SEC-RES-03');

      expect(drItem?.status).toBe('fail');
      expect(drItem?.remediation).toContain('Execute and verify an automated backup restoration drill');
    });
  });

  describe('Backup & Disaster Recovery Simulation Drill', () => {
    it('verifies automated restore drill achieves target RTO and RPO', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId, userId);
      const result = simulateBackupRestoreDrill(profile, true);

      expect(result.success).toBe(true);
      expect(result.rtoTargetMet).toBe(true);
      expect(result.rpoTargetMet).toBe(true);
      expect(result.rtoActualMinutes).toBeLessThanOrEqual(profile.backupDr.targetRtoMinutes);
      expect(result.rpoActualMinutes).toBeLessThanOrEqual(profile.backupDr.targetRpoMinutes);
      expect(result.checksumVerified).toBe(true);
    });

    it('identifies drill failure when actual recovery exceeds RTO budget', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId, userId);
      const result = simulateBackupRestoreDrill(profile, false);

      expect(result.success).toBe(false);
      expect(result.rtoTargetMet).toBe(false);
      expect(result.notes).toContain('restore execution exceeded target RTO');
    });
  });

  describe('Data Retention & Cryptographic Shredding', () => {
    it('executes NIST SP 800-88 compliant crypto-shredding to render data irrecoverable', () => {
      const profile = createHardenedEnterpriseSecurityProfile(orgId, userId);
      const result = executeCryptoShredding(profile, 'arch_sensitive_model');

      expect(result.success).toBe(true);
      expect(result.dataIrrecoverable).toBe(true);
      expect(result.keysDestroyedCount).toBe(2);
      expect(result.standard).toBe('NIST_SP_800_88_Rev1');
      expect(result.legalHoldBlocked).toBe(false);
    });

    it('strictly blocks crypto-shredding and preserves data when legal hold is active', () => {
      const profile: EnterpriseSecurityProfile = {
        ...createHardenedEnterpriseSecurityProfile(orgId, userId),
        sanitization: {
          cryptoShreddingEnabled: true,
          sanitizationStandard: 'NIST_SP_800_88_Rev1',
          legalHoldActive: true,
          legalHoldReason: 'Pending litigation subpoena - Matter 2026-CV-882',
        },
      };

      const result = executeCryptoShredding(profile, 'arch_sensitive_model');

      expect(result.success).toBe(false);
      expect(result.legalHoldBlocked).toBe(true);
      expect(result.dataIrrecoverable).toBe(false);
      expect(result.keysDestroyedCount).toBe(0);
    });
  });
});
