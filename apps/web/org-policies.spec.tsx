import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createDefaultOrganizationPolicies,
  evaluateExportControl,
  evaluateIpRestriction,
  evaluateSessionPolicy,
  isItemEligibleForRetentionPurge,
  type OrgId,
  type OrganizationPolicies,
} from '@diagramhq/domain';
import { OrgPoliciesModal } from './components/enterprise/org-policies-modal';

describe('Enterprise Organization Governance Policies UI & Enforcement (F106)', () => {
  const orgId = 'org_enterprise_gov' as OrgId;

  describe('OrgPoliciesModal Component Rendering', () => {
    it('renders modal with all governance tabs, controls, and enforcement mode bar', () => {
      const html = renderToString(
        <OrgPoliciesModal isOpen={true} onClose={() => {}} orgId={orgId} />
      );

      expect(html).toContain('Organization Governance &amp; Security Policies');
      expect(html).toContain('Enforcement Mode:');
      expect(html).toContain('Strict Enforcement (Block)');
      expect(html).toContain('Audit Only (Log Warnings)');
      expect(html).toContain('IP Restrictions');
      expect(html).toContain('Session Management');
      expect(html).toContain('Data Retention');
      expect(html).toContain('Export Controls');
      expect(html).toContain('Policy Enforcement Simulator');
      expect(html).toContain('Save Policies');
    });

    it('returns empty string when closed', () => {
      const html = renderToString(
        <OrgPoliciesModal isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe('');
    });
  });

  describe('Acceptance Criteria: A policy is enforced in test', () => {
    it('enforces IP restrictions blocking unauthorized external IP addresses', () => {
      const policies = createDefaultOrganizationPolicies(orgId);
      policies.ipRestriction.enabled = true;
      policies.ipRestriction.mode = 'allowlist';
      policies.ipRestriction.allowedRanges = ['10.50.0.0/16', '192.168.100.0/24'];
      policies.ipRestriction.exemptRoles = ['owner'];

      // 1. Permitted internal VPN IP
      const allowedResult = evaluateIpRestriction('10.50.4.12', policies.ipRestriction, 'editor');
      expect(allowedResult.allowed).toBe(true);

      // 2. Blocked external IP
      const blockedResult = evaluateIpRestriction('198.51.100.99', policies.ipRestriction, 'editor');
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.ruleViolation).toBe('ip_not_in_allowlist');
      expect(blockedResult.reason).toContain('is not in the organization allowlist');

      // 3. Exempt role bypasses restriction
      const exemptResult = evaluateIpRestriction('198.51.100.99', policies.ipRestriction, 'owner');
      expect(exemptResult.allowed).toBe(true);
      expect(exemptResult.reason).toContain("User role 'owner' is exempt");
    });

    it('enforces session management policy terminating idle and expired sessions', () => {
      const policies = createDefaultOrganizationPolicies(orgId);
      policies.sessionManagement.enabled = true;
      policies.sessionManagement.maxSessionDurationMinutes = 480; // 8 hours
      policies.sessionManagement.idleTimeoutMinutes = 30; // 30 minutes
      policies.sessionManagement.forceMfa = true;

      const now = new Date('2026-10-04T12:00:00Z');

      // 1. Session exceeding idle timeout
      const idleSession = {
        createdAt: new Date('2026-10-04T10:00:00Z').toISOString(),
        lastActivityAt: new Date('2026-10-04T11:20:00Z').toISOString(), // 40m idle (> 30m)
        mfaVerified: true,
      };
      const idleEval = evaluateSessionPolicy(idleSession, policies.sessionManagement, 'enforce', now);
      expect(idleEval.allowed).toBe(false);
      expect(idleEval.ruleViolation).toBe('session_idle_timeout');

      // 2. Session missing required MFA
      const noMfaSession = {
        createdAt: new Date('2026-10-04T11:50:00Z').toISOString(),
        lastActivityAt: new Date('2026-10-04T11:55:00Z').toISOString(),
        mfaVerified: false,
      };
      const mfaEval = evaluateSessionPolicy(noMfaSession, policies.sessionManagement, 'enforce', now);
      expect(mfaEval.allowed).toBe(false);
      expect(mfaEval.ruleViolation).toBe('mfa_required');
    });

    it('enforces data retention lifecycle determining purge eligibility', () => {
      const now = new Date('2026-10-04T00:00:00Z');
      const thirtyDays = 30;

      // Soft-deleted 35 days ago (older than 30-day retention threshold)
      const expiredTimestamp = new Date('2026-08-30T00:00:00Z').toISOString();
      expect(isItemEligibleForRetentionPurge(expiredTimestamp, thirtyDays, now)).toBe(true);

      // Soft-deleted 10 days ago (within 30-day retention threshold)
      const freshTimestamp = new Date('2026-09-24T00:00:00Z').toISOString();
      expect(isItemEligibleForRetentionPurge(freshTimestamp, thirtyDays, now)).toBe(false);
    });

    it('enforces export controls: rejects unauthorized formats, blocks sensitive tags, and enforces watermarking', () => {
      const customPolicies: OrganizationPolicies = {
        ...createDefaultOrganizationPolicies(orgId),
        exportControl: {
          enabled: true,
          allowedFormats: ['png', 'svg'],
          requireWatermark: true,
          watermarkText: 'TOP SECRET - PROPRIETARY',
          allowPublicShareLinks: false,
          allowedRecipientDomains: ['acme.com'],
          blockSensitiveDataExport: true,
          sensitiveClassificationTags: ['pci', 'secret'],
        },
      };

      // 1. Prohibited format (PDF is not allowed)
      const formatEval = evaluateExportControl({ format: 'pdf' }, customPolicies.exportControl);
      expect(formatEval.allowed).toBe(false);
      expect(formatEval.ruleViolation).toBe('format_not_permitted');

      // 2. Sensitive classification tag blocked
      const sensitiveEval = evaluateExportControl(
        { format: 'png', classificationTags: ['internal', 'PCI'] },
        customPolicies.exportControl,
      );
      expect(sensitiveEval.allowed).toBe(false);
      expect(sensitiveEval.ruleViolation).toBe('sensitive_data_export_blocked');

      // 3. Authorized visual export mandates watermark
      const authorizedEval = evaluateExportControl(
        { format: 'png', classificationTags: ['public'] },
        customPolicies.exportControl,
      );
      expect(authorizedEval.allowed).toBe(true);
      expect(authorizedEval.watermarkRequired).toBe(true);
      expect(authorizedEval.watermarkText).toBe('TOP SECRET - PROPRIETARY');
    });
  });
});
