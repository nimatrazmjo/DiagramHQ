/**
 * Architecture Security Engine (F090)
 *
 * Strict Acceptance Criteria:
 * - Trust boundaries, public endpoints, auth/authz, encryption, secrets, PII/PCI/HIPAA, compliance zones.
 * - Test: security model renders boundaries + flags exposures.
 */

import { type ArchitectureId, type ObjectId, type ConnectionId } from './ids';
import type { ModelObject, ModelConnection, ArchitectureModel } from './types';

// ============================================================================
// Types
// ============================================================================

export type TrustLevel = 'untrusted' | 'dmz' | 'trusted' | 'restricted' | 'critical';
export type ExposureSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ComplianceStandard = 'PII' | 'PCI' | 'HIPAA' | 'GDPR' | 'SOC2';

export interface TrustBoundary {
  id: string;
  name: string;
  level: TrustLevel;
  zone: string;
  description: string;
  objectIds: ObjectId[];
}

export interface PublicEndpoint {
  nodeId: ObjectId;
  nodeName: string;
  nodeKind: string;
  endpoint?: string;
  authScheme: string | null;
  isSecured: boolean;
  requiresAuth: boolean;
  exposureSeverity: ExposureSeverity | 'none';
}

export interface DataEncryption {
  nodeId: ObjectId;
  nodeName: string;
  nodeKind: string;
  atRest: boolean;
  algorithm?: string;
  containsSensitiveData: boolean;
  sensitiveTypes: ComplianceStandard[];
  isExposed: boolean;
}

export interface SecretManagement {
  nodeId: ObjectId;
  nodeName: string;
  hasSecrets: boolean;
  secretsManager?: string;
  isManaged: boolean;
  hasHardcodedSecrets: boolean;
}

export interface ComplianceZone {
  standard: ComplianceStandard;
  name: string;
  description: string;
  objectIds: ObjectId[];
  sensitiveStoreCount: number;
}

export interface CrossBoundaryConnection {
  connectionId: ConnectionId;
  sourceNodeId: ObjectId;
  sourceName: string;
  sourceBoundary: string;
  targetNodeId: ObjectId;
  targetName: string;
  targetBoundary: string;
  isCrossingBoundary: boolean;
  inTransitEncryption: boolean;
  authEnforced: boolean;
  protocol?: string;
  risk: ExposureSeverity | 'none';
}

export interface SecurityExposure {
  id: string;
  type:
    | 'unauthenticated_public_endpoint'
    | 'unencrypted_sensitive_store'
    | 'unencrypted_boundary_transit'
    | 'unmanaged_secrets'
    | 'compliance_violation'
    | 'unauthorized_boundary_crossing';
  severity: ExposureSeverity;
  targetId: string;
  targetName: string;
  targetKind: 'object' | 'connection';
  title: string;
  description: string;
  remediation: string;
  complianceImpact?: ComplianceStandard[];
}

export interface SecurityArchitectureMetrics {
  trustBoundaryCount: number;
  publicEndpointCount: number;
  unsecuredPublicEndpointCount: number;
  sensitiveStoreCount: number;
  unencryptedStoreCount: number;
  crossBoundaryConnectionCount: number;
  unencryptedTransitCount: number;
  secretsManagedCount: number;
  complianceZoneCounts: Record<ComplianceStandard, number>;
  totalExposures: number;
  criticalExposures: number;
  highExposures: number;
  mediumExposures: number;
  lowExposures: number;
  securityScore: number; // 0 - 100
}

export interface SecurityArchitectureReport {
  architectureId: ArchitectureId;
  boundaries: TrustBoundary[];
  publicEndpoints: PublicEndpoint[];
  encryption: DataEncryption[];
  secrets: SecretManagement[];
  complianceZones: ComplianceZone[];
  crossBoundaryConnections: CrossBoundaryConnection[];
  exposures: SecurityExposure[];
  metrics: SecurityArchitectureMetrics;
  analyzedAt: string;
}

// ============================================================================
// Helpers & Classifiers
// ============================================================================

const SENSITIVE_KEYWORDS: Record<ComplianceStandard, string[]> = {
  PII: ['pii', 'user_data', 'profile', 'ssn', 'email', 'personal', 'identity'],
  PCI: ['pci', 'card', 'payment', 'credit_card', 'cvv', 'billing', 'pan'],
  HIPAA: ['hipaa', 'phi', 'health', 'medical', 'patient', 'diagnosis', 'ehr'],
  GDPR: ['gdpr', 'consent', 'eu_data', 'cookie'],
  SOC2: ['soc2', 'audit', 'confidential'],
};

function extractSensitiveTypes(obj: ModelObject): ComplianceStandard[] {
  const standards: ComplianceStandard[] = [];
  const meta = obj.metadata || {};

  // Check explicit booleans
  if (meta.pii === true) standards.push('PII');
  if (meta.pci === true) standards.push('PCI');
  if (meta.hipaa === true) standards.push('HIPAA');
  if (meta.gdpr === true) standards.push('GDPR');
  if (meta.soc2 === true) standards.push('SOC2');

  // Check compliance array
  if (Array.isArray(meta.compliance)) {
    for (const c of meta.compliance) {
      const upper = String(c).toUpperCase();
      if (['PII', 'PCI', 'HIPAA', 'GDPR', 'SOC2'].includes(upper)) {
        if (!standards.includes(upper as ComplianceStandard)) {
          standards.push(upper as ComplianceStandard);
        }
      }
    }
  }

  // Check dataClassification or tags
  const tags: string[] = [
    ...(Array.isArray(meta.tags) ? meta.tags.map(String) : []),
    ...(meta.dataClassification ? [String(meta.dataClassification)] : []),
    obj.name.toLowerCase(),
  ];

  for (const [standard, keywords] of Object.entries(SENSITIVE_KEYWORDS)) {
    if (standards.includes(standard as ComplianceStandard)) continue;
    const match = tags.some((tag) =>
      keywords.some((kw) => tag.toLowerCase().includes(kw))
    );
    if (match) {
      standards.push(standard as ComplianceStandard);
    }
  }

  return standards;
}

function resolveTrustBoundaryName(obj: ModelObject): { name: string; level: TrustLevel } {
  const meta = obj.metadata || {};
  const explicitZone = (meta.trustZone || meta.boundary || meta.zone || meta.vpc) as
    | string
    | undefined;

  if (explicitZone) {
    const lower = explicitZone.toLowerCase();
    if (lower.includes('dmz')) return { name: explicitZone, level: 'dmz' };
    if (lower.includes('public') || lower.includes('internet'))
      return { name: explicitZone, level: 'untrusted' };
    if (lower.includes('pci') || lower.includes('critical') || lower.includes('secret'))
      return { name: explicitZone, level: 'critical' };
    if (lower.includes('secure') || lower.includes('restricted') || lower.includes('data'))
      return { name: explicitZone, level: 'restricted' };
    return { name: explicitZone, level: 'trusted' };
  }

  if (obj.kind === 'actor') {
    return { name: 'Public Internet', level: 'untrusted' };
  }

  if (meta.publicEndpoint === true || meta.public === true || meta.internetFacing === true) {
    return { name: 'DMZ / Ingress Zone', level: 'dmz' };
  }

  if (obj.kind === 'store') {
    return { name: 'Internal Data Zone', level: 'restricted' };
  }

  return { name: 'Internal Network', level: 'trusted' };
}

function isConnectionEncryptedInTransit(conn: ModelConnection): boolean {
  const meta = conn.metadata || {};
  if (meta.tls === true || meta.ssl === true || meta.encrypted === true) return true;
  if (typeof meta.encryption === 'string' && ['tls', 'ssl', 'https'].includes(meta.encryption.toLowerCase())) {
    return true;
  }
  const label = (conn.label || '').toLowerCase();
  return (
    label.includes('https') ||
    label.includes('tls') ||
    label.includes('ssl') ||
    label.includes('wss') ||
    label.includes('grpc-tls')
  );
}

function isConnectionAuthenticated(conn: ModelConnection): boolean {
  const meta = conn.metadata || {};
  if (meta.authenticated === true || meta.auth === true) return true;
  if (meta.authScheme || meta.authorization) return true;
  const label = (conn.label || '').toLowerCase();
  return label.includes('jwt') || label.includes('oauth') || label.includes('mtls') || label.includes('apikey');
}

// ============================================================================
// Core Security Architecture Analysis
// ============================================================================

export function analyzeSecurityArchitecture(
  model: ArchitectureModel
): SecurityArchitectureReport {
  const objectMap = new Map<ObjectId, ModelObject>(model.objects.map((o) => [o.id, o]));
  const exposures: SecurityExposure[] = [];

  // 1. Group Objects by Trust Boundary
  const boundaryMap = new Map<
    string,
    { id: string; name: string; level: TrustLevel; zone: string; objectIds: ObjectId[] }
  >();

  for (const obj of model.objects) {
    const { name, level } = resolveTrustBoundaryName(obj);
    const key = name.toLowerCase();
    if (!boundaryMap.has(key)) {
      boundaryMap.set(key, {
        id: `boundary-${key.replace(/[^a-z0-9_-]/g, '-')}`,
        name,
        level,
        zone: key,
        objectIds: [],
      });
    }
    boundaryMap.get(key)!.objectIds.push(obj.id);
  }

  const boundaries: TrustBoundary[] = Array.from(boundaryMap.values()).map((b) => ({
    ...b,
    description: `Trust boundary enclosing ${b.objectIds.length} component(s) at ${b.level} isolation level.`,
  }));

  // 2. Identify Public Endpoints & Auth / Authz
  const publicEndpoints: PublicEndpoint[] = [];
  const actorIds = new Set<ObjectId>(
    model.objects.filter((o) => o.kind === 'actor').map((o) => o.id)
  );

  // Directly connect to actors OR explicitly marked public
  const actorConnectedTargetIds = new Set<ObjectId>(
    model.connections
      .filter((c) => actorIds.has(c.sourceObjectId))
      .map((c) => c.targetObjectId)
  );

  for (const obj of model.objects) {
    if (obj.kind === 'actor') continue;

    const meta = obj.metadata || {};
    const isExplicitlyPublic =
      meta.publicEndpoint === true ||
      meta.public === true ||
      meta.internetFacing === true ||
      meta.isPublic === true;
    const isActorTarget = actorConnectedTargetIds.has(obj.id);

    if (isExplicitlyPublic || isActorTarget) {
      const authScheme = (meta.authScheme || meta.auth || meta.authentication || null) as
        | string
        | null;
      const requiresAuth =
        meta.requiresAuth === true || (authScheme !== null && authScheme !== 'none');
      const isSecured = requiresAuth && authScheme !== null && authScheme !== 'none';

      let exposureSeverity: ExposureSeverity | 'none' = 'none';
      if (!isSecured) {
        exposureSeverity = 'critical';
        exposures.push({
          id: `sec-exp-pub-auth-${obj.id}`,
          type: 'unauthenticated_public_endpoint',
          severity: 'critical',
          targetId: obj.id,
          targetName: obj.name,
          targetKind: 'object',
          title: `Unauthenticated Public Endpoint: ${obj.name}`,
          description: `Component '${obj.name}' is exposed to public/actor ingress but does not enforce an authentication scheme.`,
          remediation: `Configure authentication (OAuth2, JWT, or API Key) on '${obj.name}' in metadata.authScheme and metadata.requiresAuth.`,
        });
      }

      publicEndpoints.push({
        nodeId: obj.id,
        nodeName: obj.name,
        nodeKind: obj.kind,
        endpoint: (meta.endpoint || meta.url || meta.route) as string | undefined,
        authScheme,
        isSecured,
        requiresAuth,
        exposureSeverity,
      });
    }
  }

  // 3. Data Encryption (At Rest) & Sensitive Data (PII / PCI / HIPAA / GDPR / SOC2)
  const encryption: DataEncryption[] = [];

  for (const obj of model.objects) {
    const meta = obj.metadata || {};
    const isStore = obj.kind === 'store';
    const sensitiveTypes = extractSensitiveTypes(obj);
    const containsSensitive = sensitiveTypes.length > 0;

    const atRest =
      meta.encryptionAtRest === true ||
      meta.encrypted === true ||
      (typeof meta.encryption === 'string' &&
        meta.encryption.toLowerCase().includes('aes'));
    const algorithm = (meta.encryptionAlgorithm ||
      (atRest ? meta.encryption || 'AES-256' : undefined)) as string | undefined;

    const isExposed = containsSensitive && !atRest;

    if (isStore || containsSensitive) {
      if (isExposed) {
        const hasPciOrHipaa =
          sensitiveTypes.includes('PCI') || sensitiveTypes.includes('HIPAA');
        const severity: ExposureSeverity = hasPciOrHipaa ? 'critical' : 'high';

        exposures.push({
          id: `sec-exp-store-enc-${obj.id}`,
          type: 'unencrypted_sensitive_store',
          severity,
          targetId: obj.id,
          targetName: obj.name,
          targetKind: 'object',
          title: `Unencrypted Sensitive Store: ${obj.name}`,
          description: `Datastore '${obj.name}' contains sensitive data (${sensitiveTypes.join(
            ', '
          )}) but lacks encryption at rest.`,
          remediation: `Enable storage encryption (AES-256 or cloud KMS) on '${obj.name}' via metadata.encryptionAtRest: true.`,
          complianceImpact: sensitiveTypes,
        });
      }

      encryption.push({
        nodeId: obj.id,
        nodeName: obj.name,
        nodeKind: obj.kind,
        atRest,
        algorithm,
        containsSensitiveData: containsSensitive,
        sensitiveTypes,
        isExposed,
      });
    }
  }

  // 4. Secret Management
  const secrets: SecretManagement[] = [];

  for (const obj of model.objects) {
    const meta = obj.metadata || {};
    const hasSecrets =
      meta.hasSecrets === true || meta.containsSecrets === true || !!meta.secrets;
    const secretsManager = (meta.secretsManager || meta.vault || meta.kms) as
      | string
      | undefined;
    const hasHardcodedSecrets = meta.hardcodedSecrets === true;
    const isManaged = hasSecrets ? !!secretsManager && !hasHardcodedSecrets : true;

    if (hasSecrets || hasHardcodedSecrets) {
      if (hasHardcodedSecrets) {
        exposures.push({
          id: `sec-exp-secrets-hardcoded-${obj.id}`,
          type: 'unmanaged_secrets',
          severity: 'critical',
          targetId: obj.id,
          targetName: obj.name,
          targetKind: 'object',
          title: `Hardcoded Secrets Detected: ${obj.name}`,
          description: `Component '${obj.name}' contains unmanaged or hardcoded secrets.`,
          remediation: `Migrate static credentials in '${obj.name}' to a centralized secrets manager (HashiCorp Vault or Cloud KMS).`,
        });
      } else if (!isManaged) {
        exposures.push({
          id: `sec-exp-secrets-unmanaged-${obj.id}`,
          type: 'unmanaged_secrets',
          severity: 'high',
          targetId: obj.id,
          targetName: obj.name,
          targetKind: 'object',
          title: `Unmanaged Secrets on ${obj.name}`,
          description: `Component '${obj.name}' stores credentials without a designated secrets manager.`,
          remediation: `Configure metadata.secretsManager (e.g. 'AWS Secrets Manager' or 'HashiCorp Vault') for '${obj.name}'.`,
        });
      }

      secrets.push({
        nodeId: obj.id,
        nodeName: obj.name,
        hasSecrets,
        secretsManager,
        isManaged,
        hasHardcodedSecrets,
      });
    }
  }

  // 5. Cross-Boundary Connections & In-Transit Encryption
  const crossBoundaryConnections: CrossBoundaryConnection[] = [];

  for (const conn of model.connections) {
    const srcObj = objectMap.get(conn.sourceObjectId);
    const tgtObj = objectMap.get(conn.targetObjectId);
    if (!srcObj || !tgtObj) continue;

    const srcBoundary = resolveTrustBoundaryName(srcObj);
    const tgtBoundary = resolveTrustBoundaryName(tgtObj);
    const isCrossing = srcBoundary.name !== tgtBoundary.name;
    const inTransitEncryption = isConnectionEncryptedInTransit(conn);
    const authEnforced = isConnectionAuthenticated(conn);

    let risk: ExposureSeverity | 'none' = 'none';

    if (isCrossing) {
      if (!inTransitEncryption && !authEnforced) {
        risk = 'critical';
        exposures.push({
          id: `sec-exp-boundary-x-${conn.id}`,
          type: 'unencrypted_boundary_transit',
          severity: 'critical',
          targetId: conn.id,
          targetName: `${srcObj.name} → ${tgtObj.name}`,
          targetKind: 'connection',
          title: `Unencrypted Cross-Boundary Connection`,
          description: `Connection between '${srcObj.name}' (${srcBoundary.name}) and '${tgtObj.name}' (${tgtBoundary.name}) crosses trust boundaries without encryption or auth.`,
          remediation: `Enforce TLS/HTTPS encryption and authentication on this connection.`,
        });
      } else if (!inTransitEncryption) {
        risk = 'high';
        exposures.push({
          id: `sec-exp-boundary-tls-${conn.id}`,
          type: 'unencrypted_boundary_transit',
          severity: 'high',
          targetId: conn.id,
          targetName: `${srcObj.name} → ${tgtObj.name}`,
          targetKind: 'connection',
          title: `Missing TLS on Cross-Boundary Link`,
          description: `Connection between '${srcObj.name}' and '${tgtObj.name}' crosses trust boundaries without TLS encryption.`,
          remediation: `Add TLS in-transit encryption (e.g. label 'HTTPS' or metadata.tls: true).`,
        });
      } else if (!authEnforced && tgtBoundary.level === 'restricted') {
        risk = 'medium';
        exposures.push({
          id: `sec-exp-boundary-auth-${conn.id}`,
          type: 'unauthorized_boundary_crossing',
          severity: 'medium',
          targetId: conn.id,
          targetName: `${srcObj.name} → ${tgtObj.name}`,
          targetKind: 'connection',
          title: `Unauthenticated Ingress to Restricted Zone`,
          description: `Connection ingress into restricted zone '${tgtBoundary.name}' without explicit caller authentication.`,
          remediation: `Configure mutual authentication (mTLS or service token) for this link.`,
        });
      }

      crossBoundaryConnections.push({
        connectionId: conn.id,
        sourceNodeId: srcObj.id,
        sourceName: srcObj.name,
        sourceBoundary: srcBoundary.name,
        targetNodeId: tgtObj.id,
        targetName: tgtObj.name,
        targetBoundary: tgtBoundary.name,
        isCrossingBoundary: true,
        inTransitEncryption,
        authEnforced,
        protocol: conn.label || undefined,
        risk,
      });
    }
  }

  // 6. Compliance Zones (PII, PCI, HIPAA, GDPR, SOC2)
  const standards: ComplianceStandard[] = ['PII', 'PCI', 'HIPAA', 'GDPR', 'SOC2'];
  const complianceZoneCounts: Record<ComplianceStandard, number> = {
    PII: 0,
    PCI: 0,
    HIPAA: 0,
    GDPR: 0,
    SOC2: 0,
  };

  const complianceZones: ComplianceZone[] = standards
    .map((std) => {
      const matchingObjects = model.objects.filter((o) =>
        extractSensitiveTypes(o).includes(std)
      );
      complianceZoneCounts[std] = matchingObjects.length;

      if (matchingObjects.length === 0) return null;

      const storeCount = matchingObjects.filter((o) => o.kind === 'store').length;

      return {
        standard: std,
        name: `${std} Compliance Zone`,
        description: `Encloses ${matchingObjects.length} component(s) subject to ${std} regulatory requirements (${storeCount} data stores).`,
        objectIds: matchingObjects.map((o) => o.id),
        sensitiveStoreCount: storeCount,
      };
    })
    .filter((z): z is ComplianceZone => z !== null);

  // 7. Metrics & Score Calculation
  const criticalExposures = exposures.filter((e) => e.severity === 'critical').length;
  const highExposures = exposures.filter((e) => e.severity === 'high').length;
  const mediumExposures = exposures.filter((e) => e.severity === 'medium').length;
  const lowExposures = exposures.filter((e) => e.severity === 'low').length;

  // Deduct score: start at 100
  let score = 100;
  score -= criticalExposures * 25;
  score -= highExposures * 10;
  score -= mediumExposures * 5;
  score -= lowExposures * 2;
  const securityScore = Math.max(0, Math.min(100, score));

  const metrics: SecurityArchitectureMetrics = {
    trustBoundaryCount: boundaries.length,
    publicEndpointCount: publicEndpoints.length,
    unsecuredPublicEndpointCount: publicEndpoints.filter((p) => !p.isSecured).length,
    sensitiveStoreCount: encryption.filter((e) => e.containsSensitiveData).length,
    unencryptedStoreCount: encryption.filter((e) => e.isExposed).length,
    crossBoundaryConnectionCount: crossBoundaryConnections.length,
    unencryptedTransitCount: crossBoundaryConnections.filter((c) => !c.inTransitEncryption).length,
    secretsManagedCount: secrets.filter((s) => s.isManaged).length,
    complianceZoneCounts,
    totalExposures: exposures.length,
    criticalExposures,
    highExposures,
    mediumExposures,
    lowExposures,
    securityScore,
  };

  return {
    architectureId: model.architecture.id,
    boundaries,
    publicEndpoints,
    encryption,
    secrets,
    complianceZones,
    crossBoundaryConnections,
    exposures,
    metrics,
    analyzedAt: new Date().toISOString(),
  };
}
