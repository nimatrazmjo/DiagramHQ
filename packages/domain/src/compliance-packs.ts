/**
 * DiagramHQ - Compliance Packs & Regulatory Framework Mappings (F131)
 *
 * Implements architectural governance and control mapping across 7 major compliance standards:
 * - SOC 2 Type II (Trust Services Criteria: Security, Availability, Confidentiality)
 * - ISO/IEC 27001:2022 (Organizational, People, Physical, Technological controls)
 * - GDPR (Articles 25, 32, 33, 35 - Privacy by Design, Security of Processing)
 * - HIPAA Security Rule (Administrative, Physical, Technical Safeguards 164.312)
 * - PCI DSS v4.0 (Network Security, Cryptography, Access Control, Audit Trails)
 * - NIST SP 800-53 Rev. 5 (AC, AU, CM, CP, IA, SC control families)
 * - CIS Critical Security Controls v8
 *
 * Enforces the core relationship:
 *   Control -> Objects -> Evidence -> Owner -> Status
 *
 * CRITICAL GOVERNANCE PRINCIPLE:
 *   The system NEVER automatically stamps or claims compliance.
 *   Evidence collection and architecture mapping support auditability,
 *   but status requires explicit human owner assessment and independent auditor attestation.
 */

import { createId, type ComplianceMappingId, type ObjectId, type OrgId, type UserId } from './ids';

// ============================================================================
// 1. Framework Catalog Types
// ============================================================================

export type ComplianceFrameworkId =
  | 'soc2'
  | 'iso27001'
  | 'gdpr'
  | 'hipaa'
  | 'pci_dss'
  | 'nist_sp_800_53'
  | 'cis_controls';

export interface FrameworkMetadata {
  id: ComplianceFrameworkId;
  name: string;
  version: string;
  category: 'security' | 'privacy' | 'healthcare' | 'payments' | 'federal';
  description: string;
  issuingBody: string;
}

export interface ComplianceControlDefinition {
  id: string; // Unique slug, e.g. 'SOC2-CC6.1'
  frameworkId: ComplianceFrameworkId;
  code: string; // e.g. 'CC6.1', 'A.8.24', 'Art.32', 'Req 3.4', 'SC-13'
  title: string;
  domain: string;
  description: string;
  guidance: string;
}

// ============================================================================
// 2. Control -> Objects -> Evidence -> Owner -> Status
// ============================================================================

export type EvidenceType =
  | 'architecture_diagram'
  | 'audit_log'
  | 'encryption_spec'
  | 'dr_drill'
  | 'adr'
  | 'policy_document'
  | 'external_url';

export interface ComplianceEvidence {
  id: string;
  title: string;
  type: EvidenceType;
  uriOrRef: string;
  collectedAt: string;
  verifiedBy?: UserId;
  notes?: string;
}

export interface ControlOwner {
  userId: UserId;
  name: string;
  email: string;
  role: string;
}

/**
 * Strict Assessment Status lifecycle.
 * NOTICE: There is NO 'auto_compliant' or 'system_certified' status!
 * Compliance is an attestation workflow, never an automated software claim.
 */
export type ControlAssessmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'evidence_collected'
  | 'under_audit_review'
  | 'attested';

export interface ControlMapping {
  id: ComplianceMappingId;
  orgId: OrgId;
  frameworkId: ComplianceFrameworkId;
  controlId: string;
  controlCode: string;
  controlTitle: string;
  mappedObjectIds: ObjectId[];
  evidenceItems: ComplianceEvidence[];
  owner: ControlOwner;
  status: ControlAssessmentStatus;
  notes?: string;
  lastAssessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompliancePackSummary {
  frameworkId: ComplianceFrameworkId;
  frameworkName: string;
  totalControls: number;
  mappedControlsCount: number;
  unmappedControlsCount: number;
  totalEvidenceCount: number;
  statusBreakdown: Record<ControlAssessmentStatus, number>;
  attestationProgressPercent: number;
  // Guarantees no false automatic certification
  hasAutoClaimedCompliance: false;
  disclaimer: string;
}

// ============================================================================
// 3. Built-in Framework Catalogs
// ============================================================================

export const FRAMEWORK_CATALOG: Record<ComplianceFrameworkId, FrameworkMetadata> = {
  soc2: {
    id: 'soc2',
    name: 'SOC 2 Type II',
    version: '2017 TSC',
    category: 'security',
    description: 'AICPA Trust Services Criteria covering Security, Availability, and Confidentiality.',
    issuingBody: 'AICPA',
  },
  iso27001: {
    id: 'iso27001',
    name: 'ISO/IEC 27001:2022',
    version: '2022',
    category: 'security',
    description: 'International Information Security Management System (ISMS) standard.',
    issuingBody: 'ISO / IEC',
  },
  gdpr: {
    id: 'gdpr',
    name: 'EU GDPR',
    version: 'Regulation (EU) 2016/679',
    category: 'privacy',
    description: 'European Union General Data Protection Regulation and privacy safeguards.',
    issuingBody: 'European Commission',
  },
  hipaa: {
    id: 'hipaa',
    name: 'HIPAA Security Rule',
    version: '45 CFR Part 164 Subpart C',
    category: 'healthcare',
    description: 'National standards for safeguarding electronic Protected Health Information (ePHI).',
    issuingBody: 'HHS / OCR',
  },
  pci_dss: {
    id: 'pci_dss',
    name: 'PCI DSS v4.0',
    version: 'v4.0',
    category: 'payments',
    description: 'Payment Card Industry Data Security Standard for protecting cardholder data.',
    issuingBody: 'PCI Security Standards Council',
  },
  nist_sp_800_53: {
    id: 'nist_sp_800_53',
    name: 'NIST SP 800-53 Rev. 5',
    version: 'Rev. 5',
    category: 'federal',
    description: 'Security and Privacy Controls for Federal Information Systems and Organizations.',
    issuingBody: 'NIST',
  },
  cis_controls: {
    id: 'cis_controls',
    name: 'CIS Critical Security Controls',
    version: 'v8',
    category: 'security',
    description: 'Prioritized set of actions that protect organizations and data from cyber attack vectors.',
    issuingBody: 'Center for Internet Security',
  },
};

export const BUILTIN_CONTROLS: ComplianceControlDefinition[] = [
  // SOC2
  {
    id: 'SOC2-CC6.1',
    frameworkId: 'soc2',
    code: 'CC6.1',
    title: 'Logical and Physical Access Controls',
    domain: 'Security & Access',
    description: 'The entity implements logical access security software, infrastructure, and architectures.',
    guidance: 'Map identity providers, gateways, and fine-grained authorization components.',
  },
  {
    id: 'SOC2-CC6.6',
    frameworkId: 'soc2',
    code: 'CC6.6',
    title: 'Boundary Protection & Network Encryption',
    domain: 'Network & Perimeter',
    description: 'The entity restricts inbound and outbound transmission through network boundaries and encrypts data in transit.',
    guidance: 'Map external APIs, reverse proxies, and TLS termination edges.',
  },
  {
    id: 'SOC2-CC6.7',
    frameworkId: 'soc2',
    code: 'CC6.7',
    title: 'Data Transmission Protection',
    domain: 'Data Protection',
    description: 'The entity protects data in transmission using approved encryption protocols.',
    guidance: 'Map TLS 1.3 connections, message queues, and API gateways.',
  },
  {
    id: 'SOC2-CC7.2',
    frameworkId: 'soc2',
    code: 'CC7.2',
    title: 'System Activity Monitoring & Audit Logs',
    domain: 'Audit & Monitoring',
    description: 'The entity monitors system components to detect anomalies and unauthorized actions.',
    guidance: 'Map immutable audit log ledgers and SIEM pipelines.',
  },

  // ISO 27001
  {
    id: 'ISO-A.8.20',
    frameworkId: 'iso27001',
    code: 'A.8.20',
    title: 'Network Security',
    domain: 'Technological Controls',
    description: 'Networks and network devices shall be secured, managed and controlled to protect information.',
    guidance: 'Map customer VPC topologies, subnets, and firewalls.',
  },
  {
    id: 'ISO-A.8.24',
    frameworkId: 'iso27001',
    code: 'A.8.24',
    title: 'Use of Cryptography',
    domain: 'Technological Controls',
    description: 'Rules for the effective use of cryptography, including cryptographic key management, shall be defined.',
    guidance: 'Map KMS key rotation, AES-256 datastores, and envelope encryption.',
  },

  // GDPR
  {
    id: 'GDPR-Art.25',
    frameworkId: 'gdpr',
    code: 'Art. 25',
    title: 'Data Protection by Design and by Default',
    domain: 'Privacy Architecture',
    description: 'Implement appropriate technical and organizational measures ensuring personal data is protected by design.',
    guidance: 'Map data flows, tokenization components, and minimization boundaries.',
  },
  {
    id: 'GDPR-Art.32',
    frameworkId: 'gdpr',
    code: 'Art. 32',
    title: 'Security of Processing',
    domain: 'Data Security',
    description: 'Pseudonymisation and encryption of personal data, continuous confidentiality, integrity and availability.',
    guidance: 'Map database encryption, backup vaults, and restore procedures.',
  },

  // HIPAA
  {
    id: 'HIPAA-164.312-a',
    frameworkId: 'hipaa',
    code: '164.312(a)',
    title: 'Access Control for ePHI',
    domain: 'Technical Safeguards',
    description: 'Assign a unique name and/or number for identifying and tracking user identity in systems containing ePHI.',
    guidance: 'Map authentication services, audit logs, and emergency access procedures.',
  },
  {
    id: 'HIPAA-164.312-e',
    frameworkId: 'hipaa',
    code: '164.312(e)',
    title: 'Transmission Security for ePHI',
    domain: 'Technical Safeguards',
    description: 'Guard against unauthorized access to electronic protected health information that is being transmitted over an electronic communications network.',
    guidance: 'Map TLS 1.3 endpoints, API connections, and VPN tunnels.',
  },

  // PCI DSS
  {
    id: 'PCI-Req-3.4',
    frameworkId: 'pci_dss',
    code: 'Req 3.4',
    title: 'Protect Stored Account Data with Strong Cryptography',
    domain: 'Cardholder Data Protection',
    description: 'Render PAN unreadable anywhere it is stored using strong cryptography with associated key management.',
    guidance: 'Map payment datastores, token vaults, and HSM/KMS keys.',
  },
  {
    id: 'PCI-Req-10.2',
    frameworkId: 'pci_dss',
    code: 'Req 10.2',
    title: 'Automated Audit Trail Generation',
    domain: 'Logging & Monitoring',
    description: 'Implement automated audit trails for all system components to reconstruct user and admin actions.',
    guidance: 'Map tamper-evident immutable audit logs and SIEM exporters.',
  },

  // NIST SP 800-53
  {
    id: 'NIST-AC-2',
    frameworkId: 'nist_sp_800_53',
    code: 'AC-2',
    title: 'Account Management',
    domain: 'Access Control',
    description: 'Manage information system accounts, group memberships, and role assignments.',
    guidance: 'Map SCIM provisioning, SSO/SAML directories, and fine-grained RBAC.',
  },
  {
    id: 'NIST-SC-13',
    frameworkId: 'nist_sp_800_53',
    code: 'SC-13',
    title: 'Cryptographic Protection',
    domain: 'System and Communications',
    description: 'Employ FIPS-validated cryptographic modules in accordance with applicable federal laws and standards.',
    guidance: 'Map AES-256-GCM algorithms, TLS 1.3 ciphers, and key lifecycle management.',
  },

  // CIS Controls
  {
    id: 'CIS-Control-3',
    frameworkId: 'cis_controls',
    code: 'Control 3',
    title: 'Data Protection',
    domain: 'Data Protection',
    description: 'Develop processes and technical controls to identify, classify, securely handle, retain, and dispose of data.',
    guidance: 'Map data classification tags, crypto-shredding, and export controls.',
  },
  {
    id: 'CIS-Control-6',
    frameworkId: 'cis_controls',
    code: 'Control 6',
    title: 'Access Control Management',
    domain: 'Identity & Access',
    description: 'Use processes and tools to assign, manage, and revoke access credentials and privileges.',
    guidance: 'Map RBAC roles, MFA mandates, and session duration policies.',
  },
];

// ============================================================================
// 4. Mapping Operations & Integrity
// ============================================================================

export interface CreateControlMappingParams {
  orgId: OrgId;
  frameworkId: ComplianceFrameworkId;
  controlId: string;
  mappedObjectIds?: ObjectId[];
  evidenceItems?: ComplianceEvidence[];
  owner: ControlOwner;
  notes?: string;
}

export function createControlMapping(params: CreateControlMappingParams): ControlMapping {
  const controlDef = BUILTIN_CONTROLS.find((c) => c.id === params.controlId);
  if (!controlDef) {
    throw new Error(`Control '${params.controlId}' not found in compliance catalog`);
  }

  const now = new Date().toISOString();
  const evidence = params.evidenceItems ?? [];

  // Determine initial status based on evidence presence, never 'compliant'
  let initialStatus: ControlAssessmentStatus = 'not_started';
  if (params.mappedObjectIds && params.mappedObjectIds.length > 0) {
    initialStatus = evidence.length > 0 ? 'evidence_collected' : 'in_progress';
  }

  return {
    id: createId('cpl'),
    orgId: params.orgId,
    frameworkId: params.frameworkId,
    controlId: controlDef.id,
    controlCode: controlDef.code,
    controlTitle: controlDef.title,
    mappedObjectIds: params.mappedObjectIds ?? [],
    evidenceItems: evidence,
    owner: params.owner,
    status: initialStatus,
    notes: params.notes,
    createdAt: now,
    updatedAt: now,
  };
}

export function attachEvidenceToControlMapping(
  mapping: ControlMapping,
  evidence: ComplianceEvidence,
): ControlMapping {
  const updatedEvidence = [...mapping.evidenceItems, evidence];
  const nextStatus: ControlAssessmentStatus =
    mapping.status === 'not_started' || mapping.status === 'in_progress'
      ? 'evidence_collected'
      : mapping.status;

  return {
    ...mapping,
    evidenceItems: updatedEvidence,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };
}

export function updateControlMappingStatus(
  mapping: ControlMapping,
  newStatus: ControlAssessmentStatus,
  assessorNotes?: string,
): ControlMapping {
  const now = new Date().toISOString();
  return {
    ...mapping,
    status: newStatus,
    notes: assessorNotes ?? mapping.notes,
    lastAssessedAt: now,
    updatedAt: now,
  };
}

/**
 * Summarizes the compliance posture for a framework pack.
 * Enforces strictly that NO automated 'compliant' certification is generated.
 */
export function summarizeCompliancePack(
  mappings: ControlMapping[],
  frameworkId: ComplianceFrameworkId,
): CompliancePackSummary {
  const framework = FRAMEWORK_CATALOG[frameworkId];
  const frameworkControls = BUILTIN_CONTROLS.filter((c) => c.frameworkId === frameworkId);
  const totalControls = frameworkControls.length;

  const relevantMappings = mappings.filter((m) => m.frameworkId === frameworkId);
  const mappedControlIds = new Set(relevantMappings.map((m) => m.controlId));

  const mappedControlsCount = mappedControlIds.size;
  const unmappedControlsCount = Math.max(0, totalControls - mappedControlsCount);

  let totalEvidenceCount = 0;
  const statusBreakdown: Record<ControlAssessmentStatus, number> = {
    not_started: 0,
    in_progress: 0,
    evidence_collected: 0,
    under_audit_review: 0,
    attested: 0,
  };

  for (const mapping of relevantMappings) {
    totalEvidenceCount += mapping.evidenceItems.length;
    statusBreakdown[mapping.status] = (statusBreakdown[mapping.status] || 0) + 1;
  }

  // Count unmapped controls as 'not_started'
  statusBreakdown.not_started += unmappedControlsCount;

  const attestedCount = statusBreakdown.attested;
  const attestationProgressPercent =
    totalControls > 0 ? Math.round((attestedCount / totalControls) * 100) : 0;

  return {
    frameworkId,
    frameworkName: framework.name,
    totalControls,
    mappedControlsCount,
    unmappedControlsCount,
    totalEvidenceCount,
    statusBreakdown,
    attestationProgressPercent,
    hasAutoClaimedCompliance: false, // Invariant: system never auto-claims compliance
    disclaimer:
      'DiagramHQ provides architecture mapping and evidence collection for audit readiness. Certification requires independent third-party auditor attestation.',
  };
}
