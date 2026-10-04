import { describe, expect, it } from 'vitest';
import type { OrgId, UserId } from './ids';
import {
  calculateRetentionCutoffDate,
  createDefaultOrganizationPolicies,
  evaluateDataRetentionPolicy,
  evaluateExportControl,
  evaluateIpRestriction,
  evaluateSessionPolicy,
  ipToNumber,
  isIpInCidr,
  isItemEligibleForRetentionPurge,
  isValidIpOrCidr,
  type DataRetentionPolicy,
  type ExportControlPolicy,
  type IpRestrictionPolicy,
  type SessionManagementPolicy,
  validateOrganizationPolicies,
} from './organization-policies';

describe('F106 — Organization Policies Domain Logic', () => {
  const orgId = 'org_test123' as OrgId;
  const userId = 'usr_admin1' as UserId;

  describe('IP and CIDR utilities', () => {
    it('correctly converts IPv4 strings to unsigned integers', () => {
      expect(ipToNumber('0.0.0.0')).toBe(0);
      expect(ipToNumber('255.255.255.255')).toBe(4294967295);
      expect(ipToNumber('192.168.1.1')).toBe(3232235777);
      expect(ipToNumber('10.0.0.1')).toBe(167772161);
    });

    it('rejects malformed IP addresses', () => {
      expect(ipToNumber('256.0.0.1')).toBeNull();
      expect(ipToNumber('192.168.1')).toBeNull();
      expect(ipToNumber('192.168.1.1.5')).toBeNull();
      expect(ipToNumber('abc.def.ghi.jkl')).toBeNull();
      expect(ipToNumber('-1.0.0.1')).toBeNull();
    });

    it('validates IP and CIDR formats', () => {
      expect(isValidIpOrCidr('192.168.1.1')).toBe(true);
      expect(isValidIpOrCidr('10.0.0.0/8')).toBe(true);
      expect(isValidIpOrCidr('172.16.0.0/12')).toBe(true);
      expect(isValidIpOrCidr('192.168.1.0/24')).toBe(true);
      expect(isValidIpOrCidr('0.0.0.0/0')).toBe(true);
      expect(isValidIpOrCidr('192.168.1.0/33')).toBe(false);
      expect(isValidIpOrCidr('invalid-ip')).toBe(false);
    });

    it('accurately matches IP within CIDR subnets', () => {
      // Direct IP match
      expect(isIpInCidr('192.168.1.50', '192.168.1.50')).toBe(true);
      expect(isIpInCidr('192.168.1.51', '192.168.1.50')).toBe(false);

      // /24 subnet (192.168.1.0 - 192.168.1.255)
      expect(isIpInCidr('192.168.1.1', '192.168.1.0/24')).toBe(true);
      expect(isIpInCidr('192.168.1.254', '192.168.1.0/24')).toBe(true);
      expect(isIpInCidr('192.168.2.1', '192.168.1.0/24')).toBe(false);

      // /16 subnet (172.16.0.0 - 172.16.255.255)
      expect(isIpInCidr('172.16.10.20', '172.16.0.0/16')).toBe(true);
      expect(isIpInCidr('172.17.10.20', '172.16.0.0/16')).toBe(false);

      // /8 subnet (10.0.0.0 - 10.255.255.255)
      expect(isIpInCidr('10.200.15.1', '10.0.0.0/8')).toBe(true);
      expect(isIpInCidr('11.0.0.1', '10.0.0.0/8')).toBe(false);

      // /0 wildcard (matches everything)
      expect(isIpInCidr('203.0.113.1', '0.0.0.0/0')).toBe(true);
    });
  });

  describe('IP Restriction Policy Enforcement', () => {
    const allowlistPolicy: IpRestrictionPolicy = {
      enabled: true,
      mode: 'allowlist',
      allowedRanges: ['10.0.0.0/8', '192.168.1.0/24'],
      deniedRanges: [],
      exemptRoles: ['owner'],
    };

    it('allows IP within configured allowlist ranges', () => {
      const res = evaluateIpRestriction('10.1.2.3', allowlistPolicy, 'editor');
      expect(res.allowed).toBe(true);
      expect(res.ruleViolation).toBeUndefined();
    });

    it('blocks IP outside allowlist ranges with specific violation', () => {
      const res = evaluateIpRestriction('203.0.113.50', allowlistPolicy, 'editor');
      expect(res.allowed).toBe(false);
      expect(res.ruleViolation).toBe('ip_not_in_allowlist');
      expect(res.reason).toContain('is not in the organization allowlist');
    });

    it('exempts privileged roles from IP restriction block', () => {
      const res = evaluateIpRestriction('203.0.113.50', allowlistPolicy, 'owner');
      expect(res.allowed).toBe(true);
      expect(res.reason).toContain("User role 'owner' is exempt");
    });

    it('respects denylist policy mode', () => {
      const denylistPolicy: IpRestrictionPolicy = {
        enabled: true,
        mode: 'denylist',
        allowedRanges: [],
        deniedRanges: ['198.51.100.0/24'],
        exemptRoles: [],
      };

      const blockedRes = evaluateIpRestriction('198.51.100.42', denylistPolicy);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.ruleViolation).toBe('ip_in_denylist');

      const allowedRes = evaluateIpRestriction('203.0.113.1', denylistPolicy);
      expect(allowedRes.allowed).toBe(true);
    });

    it('flags audit_only mode without blocking connection', () => {
      const res = evaluateIpRestriction('203.0.113.50', allowlistPolicy, 'editor', 'audit_only');
      expect(res.allowed).toBe(true);
      expect(res.ruleViolation).toBe('ip_not_in_allowlist');
      expect(res.enforcementMode).toBe('audit_only');
    });

    it('permits all IPs when policy is disabled', () => {
      const disabledPolicy: IpRestrictionPolicy = { ...allowlistPolicy, enabled: false };
      const res = evaluateIpRestriction('203.0.113.50', disabledPolicy);
      expect(res.allowed).toBe(true);
      expect(res.reason).toContain('disabled');
    });
  });

  describe('Session Management Policy Enforcement', () => {
    const sessionPolicy: SessionManagementPolicy = {
      enabled: true,
      maxSessionDurationMinutes: 480, // 8 hours
      idleTimeoutMinutes: 30, // 30 mins
      maxConcurrentSessions: 3,
      forceMfa: true,
      enforceDeviceTrust: true,
      allowRememberMe: false,
    };

    const now = new Date('2026-10-04T12:00:00Z');

    it('approves compliant session context', () => {
      const res = evaluateSessionPolicy(
        {
          createdAt: new Date('2026-10-04T10:00:00Z').toISOString(), // 2 hours ago
          lastActivityAt: new Date('2026-10-04T11:50:00Z').toISOString(), // 10 mins ago
          activeSessionCount: 2,
          mfaVerified: true,
          isTrustedDevice: true,
        },
        sessionPolicy,
        'enforce',
        now,
      );
      expect(res.allowed).toBe(true);
      expect(res.reason).toBe('Session satisfies all policy criteria');
    });

    it('terminates session on idle timeout', () => {
      const res = evaluateSessionPolicy(
        {
          createdAt: new Date('2026-10-04T10:00:00Z').toISOString(),
          lastActivityAt: new Date('2026-10-04T11:20:00Z').toISOString(), // 40 mins ago (idle > 30)
          activeSessionCount: 1,
          mfaVerified: true,
          isTrustedDevice: true,
        },
        sessionPolicy,
        'enforce',
        now,
      );
      expect(res.allowed).toBe(false);
      expect(res.ruleViolation).toBe('session_idle_timeout');
    });

    it('terminates session on maximum duration expiration', () => {
      const res = evaluateSessionPolicy(
        {
          createdAt: new Date('2026-10-04T02:00:00Z').toISOString(), // 10 hours ago (> 8h)
          lastActivityAt: new Date('2026-10-04T11:58:00Z').toISOString(), // 2 mins ago
          activeSessionCount: 1,
          mfaVerified: true,
          isTrustedDevice: true,
        },
        sessionPolicy,
        'enforce',
        now,
      );
      expect(res.allowed).toBe(false);
      expect(res.ruleViolation).toBe('session_max_duration_exceeded');
    });

    it('denies when concurrent session limit is exceeded', () => {
      const res = evaluateSessionPolicy(
        {
          createdAt: new Date('2026-10-04T11:00:00Z').toISOString(),
          lastActivityAt: new Date('2026-10-04T11:50:00Z').toISOString(),
          activeSessionCount: 5, // limit is 3
          mfaVerified: true,
          isTrustedDevice: true,
        },
        sessionPolicy,
        'enforce',
        now,
      );
      expect(res.allowed).toBe(false);
      expect(res.ruleViolation).toBe('concurrent_session_limit_exceeded');
    });

    it('mandates MFA verification when forceMfa is true', () => {
      const res = evaluateSessionPolicy(
        {
          createdAt: new Date('2026-10-04T11:00:00Z').toISOString(),
          lastActivityAt: new Date('2026-10-04T11:50:00Z').toISOString(),
          activeSessionCount: 1,
          mfaVerified: false,
          isTrustedDevice: true,
        },
        sessionPolicy,
        'enforce',
        now,
      );
      expect(res.allowed).toBe(false);
      expect(res.ruleViolation).toBe('mfa_required');
    });

    it('mandates device trust when enforceDeviceTrust is true', () => {
      const res = evaluateSessionPolicy(
        {
          createdAt: new Date('2026-10-04T11:00:00Z').toISOString(),
          lastActivityAt: new Date('2026-10-04T11:50:00Z').toISOString(),
          activeSessionCount: 1,
          mfaVerified: true,
          isTrustedDevice: false,
        },
        sessionPolicy,
        'enforce',
        now,
      );
      expect(res.allowed).toBe(false);
      expect(res.ruleViolation).toBe('untrusted_device');
    });
  });

  describe('Export Control Policy Enforcement', () => {
    const exportPolicy: ExportControlPolicy = {
      enabled: true,
      allowedFormats: ['png', 'svg', 'json'],
      requireWatermark: true,
      watermarkText: 'ACME CORP PROPRIETARY',
      allowPublicShareLinks: false,
      allowedRecipientDomains: ['acme.com', 'partner.org'],
      blockSensitiveDataExport: true,
      sensitiveClassificationTags: ['pci', 'phi', 'secret'],
    };

    it('approves permitted export and applies watermarking requirements to visual exports', () => {
      const res = evaluateExportControl(
        {
          format: 'png',
          recipientEmail: 'analyst@acme.com',
          classificationTags: ['internal'],
          isPublicShare: false,
        },
        exportPolicy,
      );
      expect(res.allowed).toBe(true);
      expect(res.watermarkRequired).toBe(true);
      expect(res.watermarkText).toBe('ACME CORP PROPRIETARY');
    });

    it('blocks unapproved export format', () => {
      const res = evaluateExportControl({ format: 'pdf' }, exportPolicy);
      expect(res.allowed).toBe(false);
      expect(res.ruleViolation).toBe('format_not_permitted');
    });

    it('blocks public share links when disabled by policy', () => {
      const res = evaluateExportControl({ format: 'png', isPublicShare: true }, exportPolicy);
      expect(res.allowed).toBe(false);
      expect(res.ruleViolation).toBe('public_sharing_prohibited');
    });

    it('blocks transmission to unauthorized recipient email domains', () => {
      const res = evaluateExportControl(
        { format: 'json', recipientEmail: 'outsider@competitor.com' },
        exportPolicy,
      );
      expect(res.allowed).toBe(false);
      expect(res.ruleViolation).toBe('recipient_domain_restricted');
    });

    it('blocks export containing sensitive classification tags', () => {
      const res = evaluateExportControl(
        { format: 'svg', classificationTags: ['general', 'PCI'] },
        exportPolicy,
      );
      expect(res.allowed).toBe(false);
      expect(res.ruleViolation).toBe('sensitive_data_export_blocked');
      expect(res.reason).toContain('PCI');
    });
  });

  describe('Data Retention Policy & Cutoff Calculations', () => {
    const retentionPolicy: DataRetentionPolicy = {
      enabled: true,
      softDeletedRetentionDays: 30,
      versionHistoryRetentionDays: 90,
      auditLogRetentionDays: 365,
      inactiveWorkspaceArchiveDays: 180,
      autoPurgeEnabled: true,
    };

    const now = new Date('2026-10-04T00:00:00Z');

    it('identifies items past retention duration as eligible for purge', () => {
      // 31 days ago (cutoff is 30 days)
      const deleted31DaysAgo = new Date('2026-09-03T00:00:00Z').toISOString();
      expect(isItemEligibleForRetentionPurge(deleted31DaysAgo, 30, now)).toBe(true);

      // 10 days ago (within 30 days)
      const deleted10DaysAgo = new Date('2026-09-24T00:00:00Z').toISOString();
      expect(isItemEligibleForRetentionPurge(deleted10DaysAgo, 30, now)).toBe(false);
    });

    it('handles indefinite retention when retentionDays is 0 or negative', () => {
      const ancientDate = new Date('2020-01-01T00:00:00Z').toISOString();
      expect(isItemEligibleForRetentionPurge(ancientDate, 0, now)).toBe(false);
      expect(isItemEligibleForRetentionPurge(ancientDate, -1, now)).toBe(false);
      expect(calculateRetentionCutoffDate(0, now)).toBe('');
    });

    it('evaluates data retention policy for soft-deleted entities', () => {
      const evaluation = evaluateDataRetentionPolicy(
        {
          type: 'soft_deleted',
          timestamp: new Date('2026-08-01T00:00:00Z').toISOString(), // > 30 days
        },
        retentionPolicy,
        now,
      );
      expect(evaluation.isExpired).toBe(true);
      expect(evaluation.purgeEligible).toBe(true);
      expect(evaluation.retentionDays).toBe(30);
    });
  });

  describe('Policy Validation and Factory Defaults', () => {
    it('creates sensible corporate defaults', () => {
      const defaults = createDefaultOrganizationPolicies(orgId, userId);
      expect(defaults.orgId).toBe(orgId);
      expect(defaults.enforcementMode).toBe('enforce');
      expect(defaults.sessionManagement.enabled).toBe(true);
      expect(defaults.dataRetention.softDeletedRetentionDays).toBe(30);

      const validation = validateOrganizationPolicies(defaults);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('validates invalid IP CIDR entries and session configurations', () => {
      const invalid = createDefaultOrganizationPolicies(orgId, userId);
      invalid.ipRestriction.enabled = true;
      invalid.ipRestriction.allowedRanges = ['999.999.999.999/24', 'invalid-entry'];
      invalid.sessionManagement.maxSessionDurationMinutes = 60;
      invalid.sessionManagement.idleTimeoutMinutes = 120; // idle > max duration!
      invalid.exportControl.allowedFormats = []; // empty formats

      const validation = validateOrganizationPolicies(invalid);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Invalid IP or CIDR'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('idleTimeoutMinutes cannot exceed'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('At least one export format'))).toBe(true);
    });
  });
});
