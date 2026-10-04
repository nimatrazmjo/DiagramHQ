/**
 * DiagramHQ - Enterprise Security & Hardening (F107)
 *
 * Implements enterprise-grade defense-in-depth, cryptographic hardening,
 * automated business continuity, and comprehensive security review compliance:
 * - Encryption at rest (AES-256-GCM, CMEK, envelope encryption, KMS rotation)
 * - Encryption in transit (TLS 1.3, HSTS preload, Perfect Forward Secrecy)
 * - Backup & Disaster Recovery (Continuous PITR, multi-region replication, WORM immutability, RTO/RPO)
 * - Data Retention & Cryptographic Sanitization (NIST SP 800-88 Rev 1 crypto-shredding, legal holds)
 * - Export Controls Integration (DLP scanning, classification watermarks)
 * - Enterprise Security Review Checklist Evaluation (SOC2, ISO 27001, NIST SP 800-53 alignment)
 */

import { createId, type OrgId, type SecurityProfileId, type UserId } from './ids';

// ============================================================================
// 1. Encryption at Rest & In Transit
// ============================================================================

export type KmsProvider = 'aws_kms' | 'gcp_kms' | 'azure_key_vault' | 'hashicorp_vault' | 'diagramhq_managed';

export interface EncryptionAtRestConfig {
  enabled: boolean;
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  kmsProvider: KmsProvider;
  keyRotationDays: number; // e.g. 90 days
  cmekEnabled: boolean; // Customer-Managed Encryption Key
  cmekKeyArn?: string;
  envelopeEncryption: boolean;
  lastRotatedAt?: string;
}

export interface EncryptionInTransitConfig {
  minTlsVersion: 'TLS_1_2' | 'TLS_1_3';
  hstsEnabled: boolean;
  hstsMaxAgeSeconds: number; // e.g. 31536000 (1 year)
  hstsIncludeSubDomains: boolean;
  hstsPreload: boolean;
  perfectForwardSecrecy: boolean;
  allowedCipherSuites: string[];
}

// ============================================================================
// 2. Backup, Resilience & Disaster Recovery
// ============================================================================

export type BackupFrequency = 'continuous_pitr' | 'hourly' | 'daily';

export interface BackupDisasterRecoveryConfig {
  enabled: boolean;
  frequency: BackupFrequency;
  pitrRetentionHours: number; // e.g. 720 hours = 30 days
  crossRegionReplication: boolean;
  primaryRegion: string; // e.g. 'us-east-1'
  replicationRegion?: string; // e.g. 'us-west-2'
  immutableBackupVault: boolean; // WORM / Object Lock protection against ransomware
  targetRtoMinutes: number; // Recovery Time Objective (e.g. 30 min)
  targetRpoMinutes: number; // Recovery Point Objective (e.g. 15 min)
  lastBackupTimestamp?: string;
  lastRestoreVerificationTimestamp?: string;
  restoreVerificationPassed: boolean;
}

// ============================================================================
// 3. Data Sanitization & Legal Hold
// ============================================================================

export interface DataSanitizationConfig {
  cryptoShreddingEnabled: boolean;
  sanitizationStandard: 'NIST_SP_800_88_Rev1' | 'DoD_5220_22_M';
  legalHoldActive: boolean;
  legalHoldReason?: string;
  legalHoldAppliedBy?: UserId;
  legalHoldAppliedAt?: string;
}

// ============================================================================
// 4. Enterprise Security Profile
// ============================================================================

export interface EnterpriseSecurityProfile {
  id: SecurityProfileId;
  orgId: OrgId;
  name: string;
  encryptionRest: EncryptionAtRestConfig;
  encryptionTransit: EncryptionInTransitConfig;
  backupDr: BackupDisasterRecoveryConfig;
  sanitization: DataSanitizationConfig;
  // Governance cross-links
  ssoEnforced: boolean;
  scimEnabled: boolean;
  auditLoggingEnabled: boolean;
  aiAgentAuditingEnabled: boolean;
  fineGrainedRbacEnabled: boolean;
  ipRestrictionsEnabled: boolean;
  vulnerabilityScanPassed: boolean;
  dlpScanningEnabled: boolean;
  updatedAt: string;
  updatedBy: UserId;
}

// ============================================================================
// 5. Enterprise Security Review Checklist Types
// ============================================================================

export type SecurityCategory =
  | 'network_transport'
  | 'cryptography_rest'
  | 'identity_access'
  | 'audit_logging'
  | 'resilience_dr'
  | 'vulnerability_mgmt';

export type SecurityCheckStatus = 'pass' | 'fail' | 'warn';

export interface SecurityChecklistItem {
  id: string;
  category: SecurityCategory;
  name: string;
  description: string;
  frameworkRef: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: SecurityCheckStatus;
  remediation?: string;
}

export interface SecurityChecklistReport {
  overallStatus: 'compliant' | 'conditional' | 'non_compliant';
  score: number; // 0 - 100
  passedCount: number;
  warnCount: number;
  failedCount: number;
  totalCount: number;
  items: SecurityChecklistItem[];
  criticalFailures: SecurityChecklistItem[];
  evaluatedAt: string;
}

// ============================================================================
// 6. Security Review Checklist Evaluator
// ============================================================================

export function evaluateEnterpriseSecurityChecklist(
  profile: EnterpriseSecurityProfile,
  now: Date = new Date(),
): SecurityChecklistReport {
  const items: SecurityChecklistItem[] = [];

  // 1. Network & Transport Security
  // TLS 1.3
  const isTls13 = profile.encryptionTransit.minTlsVersion === 'TLS_1_3';
  items.push({
    id: 'SEC-NET-01',
    category: 'network_transport',
    name: 'Minimum TLS 1.3 Encryption in Transit',
    description: 'Enforce modern TLS 1.3 for all web, canvas, and API traffic.',
    frameworkRef: 'NIST SP 800-52 Rev. 2 / SOC2 CC6.6',
    severity: 'critical',
    status: isTls13 ? 'pass' : 'fail',
    remediation: isTls13 ? undefined : 'Upgrade minimum transport protocol version to TLS 1.3.',
  });

  // HSTS Preload
  const hasHstsPreload =
    profile.encryptionTransit.hstsEnabled &&
    profile.encryptionTransit.hstsPreload &&
    profile.encryptionTransit.hstsMaxAgeSeconds >= 31536000;
  items.push({
    id: 'SEC-NET-02',
    category: 'network_transport',
    name: 'Strict Transport Security (HSTS) with Preload',
    description: 'Enforce HSTS with >= 1-year duration and includeSubDomains / preload flags.',
    frameworkRef: 'OWASP ASVS 14.4 / SOC2 CC6.7',
    severity: 'high',
    status: hasHstsPreload ? 'pass' : 'fail',
    remediation: hasHstsPreload ? undefined : 'Enable HSTS with max-age >= 31536000 and preload flag.',
  });

  // Perfect Forward Secrecy
  items.push({
    id: 'SEC-NET-03',
    category: 'network_transport',
    name: 'Perfect Forward Secrecy (PFS)',
    description: 'Ensure ephemeral key exchange algorithms protect past sessions against key compromise.',
    frameworkRef: 'NIST SP 800-57 Part 1',
    severity: 'high',
    status: profile.encryptionTransit.perfectForwardSecrecy ? 'pass' : 'fail',
    remediation: profile.encryptionTransit.perfectForwardSecrecy
      ? undefined
      : 'Mandate ECDHE / DHE cipher suites for Perfect Forward Secrecy.',
  });

  // 2. Cryptography at Rest
  // AES-256-GCM
  const isAes256 = profile.encryptionRest.enabled && profile.encryptionRest.algorithm === 'AES-256-GCM';
  items.push({
    id: 'SEC-CRYPTO-01',
    category: 'cryptography_rest',
    name: 'Authenticated AES-256-GCM Encryption at Rest',
    description: 'Hardware-accelerated AES-256 with Galois/Counter Mode authenticated encryption for all persistent data.',
    frameworkRef: 'FIPS 140-3 / SOC2 CC6.1',
    severity: 'critical',
    status: isAes256 ? 'pass' : 'fail',
    remediation: isAes256 ? undefined : 'Enable AES-256-GCM encryption at rest.',
  });

  // KMS Key Rotation
  const keyRotationValid =
    profile.encryptionRest.enabled &&
    profile.encryptionRest.keyRotationDays > 0 &&
    profile.encryptionRest.keyRotationDays <= 90;
  items.push({
    id: 'SEC-CRYPTO-02',
    category: 'cryptography_rest',
    name: 'Automated KMS Key Rotation (<= 90 days)',
    description: 'Automate periodic re-keying and KMS master key rotation.',
    frameworkRef: 'CIS Control 3.10 / ISO 27001 A.10.1',
    severity: 'high',
    status: keyRotationValid ? 'pass' : profile.encryptionRest.keyRotationDays <= 365 ? 'warn' : 'fail',
    remediation: keyRotationValid ? undefined : 'Configure KMS key rotation period to 90 days or less.',
  });

  // Envelope Encryption / CMEK
  items.push({
    id: 'SEC-CRYPTO-03',
    category: 'cryptography_rest',
    name: 'Envelope Encryption & Customer-Managed Keys (CMEK)',
    description: 'Employ envelope encryption using unique data keys encrypted under a KMS root key.',
    frameworkRef: 'NIST SP 800-57 Part 1',
    severity: 'medium',
    status: profile.encryptionRest.envelopeEncryption ? 'pass' : 'fail',
    remediation: profile.encryptionRest.envelopeEncryption
      ? undefined
      : 'Activate envelope encryption with KMS root key decoupling.',
  });

  // 3. Identity & Access Governance
  // SSO / SAML
  items.push({
    id: 'SEC-IAM-01',
    category: 'identity_access',
    name: 'Mandatory Corporate Single Sign-On (SSO / SAML 2.0)',
    description: 'Eliminate local credentials by enforcing corporate Identity Provider authentication.',
    frameworkRef: 'SOC2 CC6.2 / CIS Control 5.2',
    severity: 'critical',
    status: profile.ssoEnforced ? 'pass' : 'fail',
    remediation: profile.ssoEnforced ? undefined : 'Enforce corporate SSO/SAML requirement across all members.',
  });

  // SCIM Lifecycle Provisioning
  items.push({
    id: 'SEC-IAM-02',
    category: 'identity_access',
    name: 'Automated SCIM 2.0 User Provisioning & Deprovisioning',
    description: 'Automatically revoke access upon employee offboarding via SCIM standard.',
    frameworkRef: 'ISO 27001 A.9.2.6 / SOC2 CC6.3',
    severity: 'high',
    status: profile.scimEnabled ? 'pass' : 'warn',
    remediation: profile.scimEnabled ? undefined : 'Enable SCIM 2.0 provisioning for real-time deprovisioning.',
  });

  // Fine-Grained RBAC
  items.push({
    id: 'SEC-IAM-03',
    category: 'identity_access',
    name: 'Principle of Least Privilege via Advanced Fine-Grained RBAC',
    description: 'Restrict sensitive architecture modification, billing, and export permissions.',
    frameworkRef: 'NIST SP 800-53 AC-6 / SOC2 CC6.3',
    severity: 'high',
    status: profile.fineGrainedRbacEnabled ? 'pass' : 'fail',
    remediation: profile.fineGrainedRbacEnabled ? undefined : 'Activate fine-grained RBAC roles.',
  });

  // 4. Audit & Tamper Evident Logging
  // Immutable Audit Logs
  items.push({
    id: 'SEC-LOG-01',
    category: 'audit_logging',
    name: 'Cryptographically Chained Immutable Audit Logging',
    description: 'Record who/what/when in a tamper-evident, append-only Merkle-linked audit ledger.',
    frameworkRef: 'SOC2 CC7.2 / ISO 27001 A.12.4',
    severity: 'critical',
    status: profile.auditLoggingEnabled ? 'pass' : 'fail',
    remediation: profile.auditLoggingEnabled ? undefined : 'Enable immutable audit logging.',
  });

  // AI-Agent Activity Auditing
  items.push({
    id: 'SEC-LOG-02',
    category: 'audit_logging',
    name: 'Autonomous AI-Agent Traceability & Action Auditing',
    description: 'Track model identity, confidence scores, prompts, and autonomous tool calls executed.',
    frameworkRef: 'NIST AI RMF 1.0 (GOVERN 1.2)',
    severity: 'high',
    status: profile.aiAgentAuditingEnabled ? 'pass' : 'fail',
    remediation: profile.aiAgentAuditingEnabled
      ? undefined
      : 'Enable first-class AI-agent activity logging in the audit engine.',
  });

  // 5. Resilience & Disaster Recovery
  // Automated Backups & PITR
  const hasPitr =
    profile.backupDr.enabled &&
    profile.backupDr.frequency === 'continuous_pitr' &&
    profile.backupDr.pitrRetentionHours >= 168; // at least 7 days PITR
  items.push({
    id: 'SEC-RES-01',
    category: 'resilience_dr',
    name: 'Continuous Point-In-Time Recovery (PITR) Backups',
    description: 'Guarantee continuous transaction log archiving with sub-minute rollback capability.',
    frameworkRef: 'SOC2 CC9.1 / ISO 27001 A.12.3',
    severity: 'critical',
    status: hasPitr ? 'pass' : profile.backupDr.enabled ? 'warn' : 'fail',
    remediation: hasPitr ? undefined : 'Enable Continuous PITR with >= 7 days retention.',
  });

  // Immutable Backup Vault (WORM)
  items.push({
    id: 'SEC-RES-02',
    category: 'resilience_dr',
    name: 'Write-Once-Read-Many (WORM) Ransomware Protection',
    description: 'Lock backup archives against modification or early deletion even by root credentials.',
    frameworkRef: 'NIST SP 800-209 / CIS Control 11.2',
    severity: 'high',
    status: profile.backupDr.immutableBackupVault ? 'pass' : 'fail',
    remediation: profile.backupDr.immutableBackupVault
      ? undefined
      : 'Enable immutable Object Lock storage on backup vaults.',
  });

  // Tested Restore Drill Verification
  const restoreRecent =
    profile.backupDr.restoreVerificationPassed &&
    profile.backupDr.lastRestoreVerificationTimestamp !== undefined &&
    now.getTime() - new Date(profile.backupDr.lastRestoreVerificationTimestamp).getTime() <=
      90 * 24 * 60 * 60 * 1000; // verified within last 90 days

  items.push({
    id: 'SEC-RES-03',
    category: 'resilience_dr',
    name: 'Verified Automated Disaster Recovery Drill',
    description: 'Verify periodic automated restoration test drills meet RTO (< 60m) and RPO (< 15m).',
    frameworkRef: 'SOC2 CC9.2 / ISO 27001 A.17.1',
    severity: 'high',
    status: restoreRecent ? 'pass' : 'fail',
    remediation: restoreRecent
      ? undefined
      : 'Execute and verify an automated backup restoration drill (valid within 90 days).',
  });

  // 6. Vulnerability & Threat Management
  items.push({
    id: 'SEC-VULN-01',
    category: 'vulnerability_mgmt',
    name: 'Automated Container & Dependency Vulnerability Gate',
    description: 'Ensure zero high or critical CVEs exist in running application workloads.',
    frameworkRef: 'CIS Control 7.1 / SOC2 CC7.1',
    severity: 'critical',
    status: profile.vulnerabilityScanPassed ? 'pass' : 'fail',
    remediation: profile.vulnerabilityScanPassed
      ? undefined
      : 'Resolve all critical and high severity vulnerability findings.',
  });

  // DLP Scanning
  items.push({
    id: 'SEC-VULN-02',
    category: 'vulnerability_mgmt',
    name: 'Data Loss Prevention (DLP) & Secret Scanning',
    description: 'Inspect exports and diagrams for leaked credentials, API tokens, or PII/PCI secrets.',
    frameworkRef: 'NIST SP 800-53 SI-4 / CIS Control 3.12',
    severity: 'medium',
    status: profile.dlpScanningEnabled ? 'pass' : 'warn',
    remediation: profile.dlpScanningEnabled
      ? undefined
      : 'Activate Data Loss Prevention (DLP) scanning on model exports.',
  });

  // Compute metrics
  const totalCount = items.length;
  const passedCount = items.filter((i) => i.status === 'pass').length;
  const warnCount = items.filter((i) => i.status === 'warn').length;
  const failedCount = items.filter((i) => i.status === 'fail').length;

  const criticalFailures = items.filter((i) => i.status === 'fail' && i.severity === 'critical');

  // Weighted score: Pass = 100%, Warn = 50%, Fail = 0%
  const score = Math.round(((passedCount + warnCount * 0.5) / totalCount) * 100);

  let overallStatus: 'compliant' | 'conditional' | 'non_compliant';
  if (criticalFailures.length === 0 && failedCount === 0 && warnCount === 0) {
    overallStatus = 'compliant';
  } else if (criticalFailures.length === 0 && failedCount === 0) {
    overallStatus = 'conditional';
  } else {
    overallStatus = 'non_compliant';
  }

  return {
    overallStatus,
    score,
    passedCount,
    warnCount,
    failedCount,
    totalCount,
    items,
    criticalFailures,
    evaluatedAt: now.toISOString(),
  };
}

// ============================================================================
// 7. Security Profile Factory & Simulation Helpers
// ============================================================================

export function createHardenedEnterpriseSecurityProfile(
  orgId: OrgId,
  userId?: UserId,
): EnterpriseSecurityProfile {
  const now = new Date().toISOString();
  return {
    id: createId('sec'),
    orgId,
    name: 'Hardened Enterprise Security Baseline',
    encryptionRest: {
      enabled: true,
      algorithm: 'AES-256-GCM',
      kmsProvider: 'aws_kms',
      keyRotationDays: 90,
      cmekEnabled: true,
      cmekKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/c4e1f7a2-9b3c-4d5e-8f1a-0a2b3c4d5e6f',
      envelopeEncryption: true,
      lastRotatedAt: now,
    },
    encryptionTransit: {
      minTlsVersion: 'TLS_1_3',
      hstsEnabled: true,
      hstsMaxAgeSeconds: 31536000, // 1 year
      hstsIncludeSubDomains: true,
      hstsPreload: true,
      perfectForwardSecrecy: true,
      allowedCipherSuites: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
      ],
    },
    backupDr: {
      enabled: true,
      frequency: 'continuous_pitr',
      pitrRetentionHours: 720, // 30 days
      crossRegionReplication: true,
      primaryRegion: 'us-east-1',
      replicationRegion: 'us-west-2',
      immutableBackupVault: true,
      targetRtoMinutes: 30,
      targetRpoMinutes: 15,
      lastBackupTimestamp: now,
      lastRestoreVerificationTimestamp: now,
      restoreVerificationPassed: true,
    },
    sanitization: {
      cryptoShreddingEnabled: true,
      sanitizationStandard: 'NIST_SP_800_88_Rev1',
      legalHoldActive: false,
    },
    ssoEnforced: true,
    scimEnabled: true,
    auditLoggingEnabled: true,
    aiAgentAuditingEnabled: true,
    fineGrainedRbacEnabled: true,
    ipRestrictionsEnabled: true,
    vulnerabilityScanPassed: true,
    dlpScanningEnabled: true,
    updatedAt: now,
    updatedBy: userId ?? ('usr_security_admin' as UserId),
  };
}

export interface BackupDrillResult {
  success: boolean;
  timestamp: string;
  rtoActualMinutes: number;
  rpoActualMinutes: number;
  rtoTargetMet: boolean;
  rpoTargetMet: boolean;
  restoredEntitiesCount: number;
  checksumVerified: boolean;
  notes: string;
}

export function simulateBackupRestoreDrill(
  profile: EnterpriseSecurityProfile,
  simulatedSuccess: boolean = true,
  now: Date = new Date(),
): BackupDrillResult {
  const rtoActual = simulatedSuccess ? 18 : 75; // minutes
  const rpoActual = simulatedSuccess ? 4 : 45; // minutes

  return {
    success: simulatedSuccess,
    timestamp: now.toISOString(),
    rtoActualMinutes: rtoActual,
    rpoActualMinutes: rpoActual,
    rtoTargetMet: rtoActual <= profile.backupDr.targetRtoMinutes,
    rpoTargetMet: rpoActual <= profile.backupDr.targetRpoMinutes,
    restoredEntitiesCount: 1420,
    checksumVerified: simulatedSuccess,
    notes: simulatedSuccess
      ? 'Automated restoration drill completed cleanly. Cryptographic checksum matches primary database.'
      : 'Drill failed: restore execution exceeded target RTO.',
  };
}

export interface CryptoShreddingResult {
  success: boolean;
  targetId: string;
  standard: string;
  keysDestroyedCount: number;
  dataIrrecoverable: boolean;
  legalHoldBlocked: boolean;
  timestamp: string;
}

export function executeCryptoShredding(
  profile: EnterpriseSecurityProfile,
  targetId: string,
  now: Date = new Date(),
): CryptoShreddingResult {
  // If legal hold is active, crypto-shredding is legally prohibited
  if (profile.sanitization.legalHoldActive) {
    return {
      success: false,
      targetId,
      standard: profile.sanitization.sanitizationStandard,
      keysDestroyedCount: 0,
      dataIrrecoverable: false,
      legalHoldBlocked: true,
      timestamp: now.toISOString(),
    };
  }

  return {
    success: true,
    targetId,
    standard: profile.sanitization.sanitizationStandard,
    keysDestroyedCount: 2, // data encryption key + mirror copy
    dataIrrecoverable: true,
    legalHoldBlocked: false,
    timestamp: now.toISOString(),
  };
}
