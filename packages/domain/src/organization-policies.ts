/**
 * DiagramHQ - Organization Governance Policies (F106)
 *
 * Provides organization-wide governance, security enforcement, and administrative controls:
 * 1. IP Restrictions: Allowlist / denylist with CIDR subnet matching (IPv4) and role exemptions.
 * 2. Session Management: Max session duration, idle inactivity timeout, concurrent session limits, MFA & device trust.
 * 3. Data Retention: Auto-purge lifecycle for soft-deleted entities, version histories, audit logs, and inactive workspaces.
 * 4. Export Controls: Restricted formats, mandatory watermarking, recipient domain filtering, and sensitive classification guards.
 * 5. Governance Engine: Centralized policy evaluation with enforcement modes ('enforce', 'audit_only', 'disabled').
 */

import { createId, type OrgId, type OrgPolicyId, type UserId } from './ids';
import type { MemberRole } from './types';
import type { ExportFormat } from './export';

// ============================================================================
// 1. IP Restriction Types & Helpers
// ============================================================================

export type IpRestrictionMode = 'allowlist' | 'denylist' | 'disabled';

export interface IpRestrictionPolicy {
  enabled: boolean;
  mode: IpRestrictionMode;
  allowedRanges: string[];
  deniedRanges: string[];
  exemptRoles: MemberRole[];
  customErrorMessage?: string;
}

/**
 * Converts an IPv4 string into an unsigned 32-bit integer.
 * Returns null if the format is invalid.
 */
export function ipToNumber(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;

  let num = 0;
  for (let i = 0; i < 4; i++) {
    const partStr = parts[i];
    if (partStr === undefined) return null;
    if (!/^\d{1,3}$/.test(partStr)) return null;
    const part = Number(partStr);
    if (isNaN(part) || part < 0 || part > 255) return null;
    num = (num << 8) + part;
  }
  return num >>> 0;
}

/**
 * Checks if a given IPv4 address matches an IP or CIDR block (e.g., '192.168.1.0/24' or '10.0.0.1').
 */
export function isIpInCidr(ip: string, cidrOrIp: string): boolean {
  const targetNum = ipToNumber(ip);
  if (targetNum === null) return false;

  const trimmed = cidrOrIp.trim();
  const slashIdx = trimmed.indexOf('/');

  if (slashIdx === -1) {
    const directNum = ipToNumber(trimmed);
    return directNum !== null && directNum === targetNum;
  }

  const cidrIpStr = trimmed.slice(0, slashIdx);
  const bitsStr = trimmed.slice(slashIdx + 1);
  const netNum = ipToNumber(cidrIpStr);
  if (netNum === null) return false;

  const bits = Number(bitsStr);
  if (isNaN(bits) || bits < 0 || bits > 32 || !/^\d{1,2}$/.test(bitsStr)) {
    return false;
  }

  if (bits === 0) return true;

  const mask = ((~0 << (32 - bits)) >>> 0);
  return (targetNum & mask) === (netNum & mask);
}

/**
 * Validates whether a string is a valid IPv4 address or CIDR notation.
 */
export function isValidIpOrCidr(input: string): boolean {
  const trimmed = input.trim();
  const slashIdx = trimmed.indexOf('/');
  if (slashIdx === -1) {
    return ipToNumber(trimmed) !== null;
  }
  const cidrIpStr = trimmed.slice(0, slashIdx);
  const bitsStr = trimmed.slice(slashIdx + 1);
  if (ipToNumber(cidrIpStr) === null) return false;
  if (!/^\d{1,2}$/.test(bitsStr)) return false;
  const bits = Number(bitsStr);
  return bits >= 0 && bits <= 32;
}

// ============================================================================
// 2. Session Management Types
// ============================================================================

export interface SessionManagementPolicy {
  enabled: boolean;
  maxSessionDurationMinutes: number; // e.g. 720 (12h)
  idleTimeoutMinutes: number; // e.g. 30 min
  maxConcurrentSessions: number; // e.g. 3 (0 for unlimited)
  forceMfa: boolean;
  enforceDeviceTrust: boolean;
  allowRememberMe: boolean;
}

export interface SessionContext {
  createdAt: string; // ISO date string
  lastActivityAt: string; // ISO date string
  activeSessionCount?: number;
  mfaVerified?: boolean;
  isTrustedDevice?: boolean;
}

// ============================================================================
// 3. Data Retention Types
// ============================================================================

export interface DataRetentionPolicy {
  enabled: boolean;
  softDeletedRetentionDays: number; // e.g. 30 days
  versionHistoryRetentionDays: number; // e.g. 90 days (0 for unlimited)
  auditLogRetentionDays: number; // e.g. 365 days (0 for unlimited)
  inactiveWorkspaceArchiveDays: number; // e.g. 180 days (0 for unlimited)
  autoPurgeEnabled: boolean;
}

export type RetentionItemType = 'soft_deleted' | 'version' | 'audit_log' | 'workspace';

export interface RetentionItemContext {
  type: RetentionItemType;
  timestamp: string; // deletion date or creation date
}

// ============================================================================
// 4. Export Control Types
// ============================================================================

export type PolicyExportFormat = ExportFormat | 'csv' | 'markdown';

export interface ExportControlPolicy {
  enabled: boolean;
  allowedFormats: PolicyExportFormat[];
  requireWatermark: boolean;
  watermarkText: string;
  allowPublicShareLinks: boolean;
  allowedRecipientDomains: string[]; // e.g. ['@acme.com', '@partner.org']
  blockSensitiveDataExport: boolean;
  sensitiveClassificationTags: string[]; // e.g. ['pci', 'phi', 'pii', 'secret', 'confidential']
}

export interface ExportRequestContext {
  format: PolicyExportFormat;
  recipientEmail?: string;
  classificationTags?: string[];
  isPublicShare?: boolean;
}

// ============================================================================
// 5. Aggregate Organization Policies
// ============================================================================

export type PolicyEnforcementMode = 'enforce' | 'audit_only' | 'disabled';

export interface OrganizationPolicies {
  id: OrgPolicyId;
  orgId: OrgId;
  name: string;
  enforcementMode: PolicyEnforcementMode;
  ipRestriction: IpRestrictionPolicy;
  sessionManagement: SessionManagementPolicy;
  dataRetention: DataRetentionPolicy;
  exportControl: ExportControlPolicy;
  createdAt: string;
  updatedAt: string;
  updatedBy: UserId;
  version: number;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  policyType: 'ip_restriction' | 'session_management' | 'data_retention' | 'export_control' | 'org_policy';
  reason: string;
  ruleViolation?: string;
  enforcementMode: PolicyEnforcementMode;
  watermarkRequired?: boolean;
  watermarkText?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 6. Policy Evaluators
// ============================================================================

/**
 * Evaluates whether an incoming client IP address is allowed under the IP restriction policy.
 */
export function evaluateIpRestriction(
  clientIp: string,
  policy: IpRestrictionPolicy,
  userRole?: MemberRole,
  enforcementMode: PolicyEnforcementMode = 'enforce',
): PolicyEvaluationResult {
  if (enforcementMode === 'disabled' || !policy.enabled || policy.mode === 'disabled') {
    return {
      allowed: true,
      policyType: 'ip_restriction',
      reason: 'IP restriction policy is disabled',
      enforcementMode,
    };
  }

  // Exempt roles check
  if (userRole && policy.exemptRoles.includes(userRole)) {
    return {
      allowed: true,
      policyType: 'ip_restriction',
      reason: `User role '${userRole}' is exempt from IP restriction policy`,
      enforcementMode,
      metadata: { exemptRole: userRole },
    };
  }

  if (policy.mode === 'allowlist') {
    if (policy.allowedRanges.length === 0) {
      return {
        allowed: false,
        policyType: 'ip_restriction',
        ruleViolation: 'allowlist_empty',
        reason: policy.customErrorMessage || 'IP restriction allowlist is active but no IP ranges are configured',
        enforcementMode,
      };
    }

    const matchesAllowlist = policy.allowedRanges.some((range) => isIpInCidr(clientIp, range));
    if (!matchesAllowlist) {
      return {
        allowed: enforcementMode === 'audit_only',
        policyType: 'ip_restriction',
        ruleViolation: 'ip_not_in_allowlist',
        reason: policy.customErrorMessage || `Access denied: IP ${clientIp} is not in the organization allowlist`,
        enforcementMode,
        metadata: { clientIp },
      };
    }

    return {
      allowed: true,
      policyType: 'ip_restriction',
      reason: `IP ${clientIp} matches authorized range in allowlist`,
      enforcementMode,
      metadata: { clientIp },
    };
  }

  if (policy.mode === 'denylist') {
    const matchesDenylist = policy.deniedRanges.some((range) => isIpInCidr(clientIp, range));
    if (matchesDenylist) {
      return {
        allowed: enforcementMode === 'audit_only',
        policyType: 'ip_restriction',
        ruleViolation: 'ip_in_denylist',
        reason: policy.customErrorMessage || `Access denied: IP ${clientIp} is on the organization denylist`,
        enforcementMode,
        metadata: { clientIp },
      };
    }

    return {
      allowed: true,
      policyType: 'ip_restriction',
      reason: `IP ${clientIp} is not blocked by denylist`,
      enforcementMode,
      metadata: { clientIp },
    };
  }

  return {
    allowed: true,
    policyType: 'ip_restriction',
    reason: 'Policy mode not active',
    enforcementMode,
  };
}

/**
 * Evaluates session constraints: max duration, idle timeout, concurrent session caps, MFA, device trust.
 */
export function evaluateSessionPolicy(
  session: SessionContext,
  policy: SessionManagementPolicy,
  enforcementMode: PolicyEnforcementMode = 'enforce',
  now: Date = new Date(),
): PolicyEvaluationResult {
  if (enforcementMode === 'disabled' || !policy.enabled) {
    return {
      allowed: true,
      policyType: 'session_management',
      reason: 'Session management policy is disabled',
      enforcementMode,
    };
  }

  const nowMs = now.getTime();
  const createdMs = new Date(session.createdAt).getTime();
  const lastActivityMs = new Date(session.lastActivityAt).getTime();

  // Check MFA mandate
  if (policy.forceMfa && session.mfaVerified === false) {
    return {
      allowed: enforcementMode === 'audit_only',
      policyType: 'session_management',
      ruleViolation: 'mfa_required',
      reason: 'Organization policy mandates Multi-Factor Authentication (MFA)',
      enforcementMode,
    };
  }

  // Check Device Trust
  if (policy.enforceDeviceTrust && session.isTrustedDevice === false) {
    return {
      allowed: enforcementMode === 'audit_only',
      policyType: 'session_management',
      ruleViolation: 'untrusted_device',
      reason: 'Access requires an approved, managed corporate device',
      enforcementMode,
    };
  }

  // Check Max Lifetime Duration
  if (policy.maxSessionDurationMinutes > 0) {
    const elapsedMinutes = (nowMs - createdMs) / (1000 * 60);
    if (elapsedMinutes > policy.maxSessionDurationMinutes) {
      return {
        allowed: enforcementMode === 'audit_only',
        policyType: 'session_management',
        ruleViolation: 'session_max_duration_exceeded',
        reason: `Session exceeded maximum duration limit of ${policy.maxSessionDurationMinutes} minutes`,
        enforcementMode,
        metadata: { elapsedMinutes, maxMinutes: policy.maxSessionDurationMinutes },
      };
    }
  }

  // Check Idle Timeout
  if (policy.idleTimeoutMinutes > 0) {
    const idleMinutes = (nowMs - lastActivityMs) / (1000 * 60);
    if (idleMinutes > policy.idleTimeoutMinutes) {
      return {
        allowed: enforcementMode === 'audit_only',
        policyType: 'session_management',
        ruleViolation: 'session_idle_timeout',
        reason: `Session terminated due to inactivity exceeding ${policy.idleTimeoutMinutes} minutes`,
        enforcementMode,
        metadata: { idleMinutes, timeoutMinutes: policy.idleTimeoutMinutes },
      };
    }
  }

  // Check Concurrent Sessions
  if (policy.maxConcurrentSessions > 0 && session.activeSessionCount !== undefined) {
    if (session.activeSessionCount > policy.maxConcurrentSessions) {
      return {
        allowed: enforcementMode === 'audit_only',
        policyType: 'session_management',
        ruleViolation: 'concurrent_session_limit_exceeded',
        reason: `Concurrent session limit of ${policy.maxConcurrentSessions} exceeded (${session.activeSessionCount} active)`,
        enforcementMode,
        metadata: { activeSessions: session.activeSessionCount, limit: policy.maxConcurrentSessions },
      };
    }
  }

  return {
    allowed: true,
    policyType: 'session_management',
    reason: 'Session satisfies all policy criteria',
    enforcementMode,
  };
}

/**
 * Evaluates export controls: format restrictions, watermarks, public share links, domain restrictions, sensitive tags.
 */
export function evaluateExportControl(
  request: ExportRequestContext,
  policy: ExportControlPolicy,
  enforcementMode: PolicyEnforcementMode = 'enforce',
): PolicyEvaluationResult {
  if (enforcementMode === 'disabled' || !policy.enabled) {
    return {
      allowed: true,
      policyType: 'export_control',
      reason: 'Export control policy is disabled',
      enforcementMode,
    };
  }

  // 1. Allowed Formats
  if (!policy.allowedFormats.includes(request.format)) {
    return {
      allowed: enforcementMode === 'audit_only',
      policyType: 'export_control',
      ruleViolation: 'format_not_permitted',
      reason: `Export format '${request.format.toUpperCase()}' is disabled by organization policy`,
      enforcementMode,
      metadata: { requestedFormat: request.format, allowedFormats: policy.allowedFormats },
    };
  }

  // 2. Public Share Links
  if (request.isPublicShare && !policy.allowPublicShareLinks) {
    return {
      allowed: enforcementMode === 'audit_only',
      policyType: 'export_control',
      ruleViolation: 'public_sharing_prohibited',
      reason: 'Public share links and unauthenticated exports are prohibited by organization policy',
      enforcementMode,
    };
  }

  // 3. Recipient Domain Filtering
  if (request.recipientEmail && policy.allowedRecipientDomains.length > 0) {
    const email = request.recipientEmail.toLowerCase();
    const domainMatch = policy.allowedRecipientDomains.some((d) => {
      const cleanDomain = d.startsWith('@') ? d.slice(1).toLowerCase() : d.toLowerCase();
      return email.endsWith(`@${cleanDomain}`);
    });

    if (!domainMatch) {
      return {
        allowed: enforcementMode === 'audit_only',
        policyType: 'export_control',
        ruleViolation: 'recipient_domain_restricted',
        reason: `Export cannot be transmitted outside approved domains (${policy.allowedRecipientDomains.join(', ')})`,
        enforcementMode,
        metadata: { recipientEmail: request.recipientEmail },
      };
    }
  }

  // 4. Sensitive Data Classification Block
  if (policy.blockSensitiveDataExport && request.classificationTags && request.classificationTags.length > 0) {
    const sensitiveMatch = request.classificationTags.find((tag) =>
      policy.sensitiveClassificationTags.map((t) => t.toLowerCase()).includes(tag.toLowerCase()),
    );

    if (sensitiveMatch) {
      return {
        allowed: enforcementMode === 'audit_only',
        policyType: 'export_control',
        ruleViolation: 'sensitive_data_export_blocked',
        reason: `Export blocked: contains classified sensitive tag '${sensitiveMatch}'`,
        enforcementMode,
        metadata: { matchedTag: sensitiveMatch },
      };
    }
  }

  // 5. Watermarking Requirement
  const requiresWatermark = policy.requireWatermark && ['png', 'svg', 'pdf'].includes(request.format);

  return {
    allowed: true,
    policyType: 'export_control',
    reason: 'Export request authorized by organization policy',
    enforcementMode,
    watermarkRequired: requiresWatermark,
    watermarkText: requiresWatermark ? policy.watermarkText : undefined,
  };
}

/**
 * Calculates whether an item is past its retention threshold and eligible for permanent deletion.
 */
export function isItemEligibleForRetentionPurge(
  itemTimestamp: string,
  retentionDays: number,
  now: Date = new Date(),
): boolean {
  if (retentionDays <= 0) return false; // 0 or negative represents indefinite retention
  const itemMs = new Date(itemTimestamp).getTime();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  return now.getTime() - itemMs >= maxAgeMs;
}

/**
 * Computes the ISO cutoff timestamp for a retention duration.
 */
export function calculateRetentionCutoffDate(retentionDays: number, now: Date = new Date()): string {
  if (retentionDays <= 0) return '';
  const cutoffMs = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  return new Date(cutoffMs).toISOString();
}

/**
 * Evaluates whether an item should be purged or retained according to the retention policy.
 */
export function evaluateDataRetentionPolicy(
  item: RetentionItemContext,
  policy: DataRetentionPolicy,
  now: Date = new Date(),
): { isExpired: boolean; purgeEligible: boolean; cutoffDate: string; retentionDays: number } {
  if (!policy.enabled) {
    return { isExpired: false, purgeEligible: false, cutoffDate: '', retentionDays: -1 };
  }

  let retentionDays = 0;
  switch (item.type) {
    case 'soft_deleted':
      retentionDays = policy.softDeletedRetentionDays;
      break;
    case 'version':
      retentionDays = policy.versionHistoryRetentionDays;
      break;
    case 'audit_log':
      retentionDays = policy.auditLogRetentionDays;
      break;
    case 'workspace':
      retentionDays = policy.inactiveWorkspaceArchiveDays;
      break;
  }

  const isExpired = isItemEligibleForRetentionPurge(item.timestamp, retentionDays, now);
  const cutoffDate = calculateRetentionCutoffDate(retentionDays, now);

  return {
    isExpired,
    purgeEligible: isExpired && policy.autoPurgeEnabled,
    cutoffDate,
    retentionDays,
  };
}

// ============================================================================
// 7. Policy Factory & Validation
// ============================================================================

export function createDefaultOrganizationPolicies(orgId: OrgId, userId?: UserId): OrganizationPolicies {
  const now = new Date().toISOString();
  return {
    id: createId('pol'),
    orgId,
    name: 'Default Corporate Governance Policy',
    enforcementMode: 'enforce',
    ipRestriction: {
      enabled: false,
      mode: 'allowlist',
      allowedRanges: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.1/32'],
      deniedRanges: [],
      exemptRoles: ['owner'],
    },
    sessionManagement: {
      enabled: true,
      maxSessionDurationMinutes: 720, // 12 hours
      idleTimeoutMinutes: 60, // 1 hour
      maxConcurrentSessions: 5,
      forceMfa: false,
      enforceDeviceTrust: false,
      allowRememberMe: true,
    },
    dataRetention: {
      enabled: true,
      softDeletedRetentionDays: 30, // 30-day trash retention
      versionHistoryRetentionDays: 365, // 1-year version history
      auditLogRetentionDays: 730, // 2-year audit log retention
      inactiveWorkspaceArchiveDays: 180, // 6 months inactivity
      autoPurgeEnabled: true,
    },
    exportControl: {
      enabled: true,
      allowedFormats: ['png', 'svg', 'pdf', 'json', 'csv', 'markdown'],
      requireWatermark: false,
      watermarkText: 'CONFIDENTIAL - INTERNAL ONLY',
      allowPublicShareLinks: true,
      allowedRecipientDomains: [],
      blockSensitiveDataExport: true,
      sensitiveClassificationTags: ['pci', 'phi', 'secret', 'confidential'],
    },
    createdAt: now,
    updatedAt: now,
    updatedBy: userId ?? ('usr_system' as UserId),
    version: 1,
  };
}

export function validateOrganizationPolicies(policies: OrganizationPolicies): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!policies.orgId) {
    errors.push('Organization ID is required');
  }

  // IP validations
  if (policies.ipRestriction.enabled && policies.ipRestriction.mode !== 'disabled') {
    if (policies.ipRestriction.mode === 'allowlist') {
      for (const range of policies.ipRestriction.allowedRanges) {
        if (!isValidIpOrCidr(range)) {
          errors.push(`Invalid IP or CIDR block in allowed ranges: '${range}'`);
        }
      }
    } else if (policies.ipRestriction.mode === 'denylist') {
      for (const range of policies.ipRestriction.deniedRanges) {
        if (!isValidIpOrCidr(range)) {
          errors.push(`Invalid IP or CIDR block in denied ranges: '${range}'`);
        }
      }
    }
  }

  // Session validations
  if (policies.sessionManagement.enabled) {
    if (policies.sessionManagement.maxSessionDurationMinutes < 0) {
      errors.push('maxSessionDurationMinutes cannot be negative');
    }
    if (policies.sessionManagement.idleTimeoutMinutes < 0) {
      errors.push('idleTimeoutMinutes cannot be negative');
    }
    if (
      policies.sessionManagement.maxSessionDurationMinutes > 0 &&
      policies.sessionManagement.idleTimeoutMinutes > policies.sessionManagement.maxSessionDurationMinutes
    ) {
      errors.push('idleTimeoutMinutes cannot exceed maxSessionDurationMinutes');
    }
  }

  // Retention validations
  if (policies.dataRetention.enabled) {
    if (policies.dataRetention.softDeletedRetentionDays < 0) {
      errors.push('softDeletedRetentionDays cannot be negative');
    }
    if (policies.dataRetention.auditLogRetentionDays < 0) {
      errors.push('auditLogRetentionDays cannot be negative');
    }
  }

  // Export control validations
  if (policies.exportControl.enabled) {
    if (policies.exportControl.allowedFormats.length === 0) {
      errors.push('At least one export format must be permitted');
    }
    if (policies.exportControl.requireWatermark && !policies.exportControl.watermarkText.trim()) {
      errors.push('Watermark text must not be empty when watermark enforcement is enabled');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
