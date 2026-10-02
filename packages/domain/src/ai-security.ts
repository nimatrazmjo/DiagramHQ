/**
 * DiagramHQ - AI Architecture Security Analysis Domain Logic (F067)
 *
 * Graph-grounded AI architectural security audit and risk review engine.
 * Inspects architecture topologies for critical security vulnerabilities, perimeter risks,
 * and data privacy violations:
 * - Unauthenticated public ingress endpoints (bypassing edge security boundaries)
 * - PII and sensitive data transit over cleartext / unencrypted communication paths
 * - Missing authentication and authorization boundaries on internal services and datastores
 * - Unencrypted sensitive PII datastores
 *
 * Strict invariant: AI security review findings strictly match seeded issues and structural analysis.
 */

import type { ObjectId, ConnectionId } from './ids';
import type { ModelObject, ModelConnection, FlowWithSteps } from './types';

export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low';

export type SecurityFindingType =
  | 'public_endpoint_unauthenticated'
  | 'pii_cleartext_path'
  | 'missing_auth_boundary'
  | 'unencrypted_pii_store';

export interface SecurityFinding {
  id: string;
  type: SecurityFindingType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  affectedObjectIds: ObjectId[];
  affectedConnectionIds: ConnectionId[];
  remediation: string;
}

export interface SecurityNarrative {
  title: string;
  executiveSummary: string;
  perimeterRisks: string;
  piiPrivacyRisks: string;
  authenticationRisks: string;
  prioritizedActions: string[];
}

export interface AISecurityReport {
  score: number; // 0 to 100
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  narrative: SecurityNarrative;
  auditedAt: string;
}

export interface SecurityAuditContext {
  objects: ModelObject[];
  connections: ModelConnection[];
  flows?: FlowWithSteps[];
}

/**
 * Checks if a connection or label specifies encrypted communication.
 */
function isEncryptedChannel(conn: ModelConnection): boolean {
  const text = `${conn.label || ''} ${conn.description || ''}`.toLowerCase();
  return (
    text.includes('https') ||
    text.includes('tls') ||
    text.includes('mtls') ||
    text.includes('ssl') ||
    text.includes('grpc/tls') ||
    text.includes('encrypted') ||
    text.includes('ssh')
  );
}

/**
 * Checks if a component is an approved edge gateway/reverse proxy.
 */
function isGatewayOrProxy(obj: ModelObject): boolean {
  const text = `${obj.name} ${obj.description || ''}`.toLowerCase();
  return (
    text.includes('gateway') ||
    text.includes('proxy') ||
    text.includes('waf') ||
    text.includes('ingress') ||
    text.includes('envoy') ||
    text.includes('edge')
  );
}

/**
 * Checks if text contains PII or sensitive data keywords.
 */
function containsPII(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('pii') ||
    lower.includes('user') ||
    lower.includes('customer') ||
    lower.includes('password') ||
    lower.includes('credit') ||
    lower.includes('payment') ||
    lower.includes('account') ||
    lower.includes('social security') ||
    lower.includes('credential')
  );
}

/**
 * Performs comprehensive security audit on architecture model graph.
 */
export function auditArchitectureSecurity(context: SecurityAuditContext): AISecurityReport {
  const findings: SecurityFinding[] = [];
  const objMap = new Map(context.objects.map((o) => [o.id, o]));

  let findingCounter = 1;

  // 1. Check: Unauthenticated Public Endpoints
  // An actor or external system connects directly to internal services without gateway
  for (const conn of context.connections) {
    const src = objMap.get(conn.sourceObjectId);
    const tgt = objMap.get(conn.targetObjectId);

    if (src && tgt && (src.kind === 'actor' || src.kind === 'system')) {
      if (!isGatewayOrProxy(tgt)) {
        findings.push({
          id: `SEC-${String(findingCounter++).padStart(3, '0')}`,
          type: 'public_endpoint_unauthenticated',
          severity: 'critical',
          title: `Public Ingress Bypassing Edge Gateway (${tgt.name})`,
          description: `External client '${src.name}' directly invokes internal service '${tgt.name}' without traversing an Edge Gateway, WAF, or authentication proxy.`,
          affectedObjectIds: [src.id, tgt.id],
          affectedConnectionIds: [conn.id],
          remediation: `Route inbound traffic from '${src.name}' through an API Gateway to enforce TLS termination, rate-limiting, and OAuth/JWT authentication.`,
        });
      }
    }
  }

  // 2. Check: PII / Sensitive Data Flow over Cleartext Path
  for (const conn of context.connections) {
    const connText = `${conn.label || ''} ${conn.description || ''}`;
    if (containsPII(connText) && !isEncryptedChannel(conn)) {
      const src = objMap.get(conn.sourceObjectId);
      const tgt = objMap.get(conn.targetObjectId);
      findings.push({
        id: `SEC-${String(findingCounter++).padStart(3, '0')}`,
        type: 'pii_cleartext_path',
        severity: 'high',
        title: `Unencrypted PII Transit (${conn.label || conn.id})`,
        description: `Connection '${conn.label || conn.id}' from '${src?.name || conn.sourceObjectId}' to '${tgt?.name || conn.targetObjectId}' transmits sensitive/PII data over an unencrypted channel.`,
        affectedObjectIds: [conn.sourceObjectId, conn.targetObjectId],
        affectedConnectionIds: [conn.id],
        remediation: `Upgrade connection '${conn.id}' to HTTPS, mTLS, or encrypted gRPC with TLS certificate verification.`,
      });
    }
  }

  // 3. Check: Missing Authentication / Authorization on Sensitive Internal Connections
  for (const conn of context.connections) {
    const tgt = objMap.get(conn.targetObjectId);
    const connText = `${conn.label || ''} ${conn.description || ''}`.toLowerCase();

    if (tgt && (tgt.kind === 'store' || tgt.kind === 'application')) {
      const hasAuthHeader =
        connText.includes('auth') ||
        connText.includes('token') ||
        connText.includes('jwt') ||
        connText.includes('iam') ||
        connText.includes('rbac') ||
        connText.includes('creds') ||
        connText.includes('mtls');

      // Specifically flag unauthenticated connections to data stores
      if (tgt.kind === 'store' && !hasAuthHeader) {
        const src = objMap.get(conn.sourceObjectId);
        findings.push({
          id: `SEC-${String(findingCounter++).padStart(3, '0')}`,
          type: 'missing_auth_boundary',
          severity: 'medium',
          title: `Missing Service-to-Datastore Auth (${src?.name || 'Caller'} -> ${tgt.name})`,
          description: `Access from '${src?.name || conn.sourceObjectId}' to datastore '${tgt.name}' does not specify explicit IAM, RBAC, or token-based authentication.`,
          affectedObjectIds: [conn.sourceObjectId, tgt.id],
          affectedConnectionIds: [conn.id],
          remediation: `Enforce mutual TLS or cloud IAM role-based access control (RBAC) on connections targeting '${tgt.name}'.`,
        });
      }
    }
  }

  // 4. Check: Unencrypted PII Stores
  for (const obj of context.objects) {
    if (obj.kind === 'store') {
      const storeText = `${obj.name} ${obj.description || ''}`.toLowerCase();
      if (containsPII(storeText)) {
        const hasEncryption =
          storeText.includes('encrypt') ||
          storeText.includes('kms') ||
          storeText.includes('aes') ||
          storeText.includes('vault');

        if (!hasEncryption) {
          findings.push({
            id: `SEC-${String(findingCounter++).padStart(3, '0')}`,
            type: 'unencrypted_pii_store',
            severity: 'high',
            title: `Datastore Storing PII Without Explicit Encryption (${obj.name})`,
            description: `Datastore '${obj.name}' stores customer/PII records without documented encryption-at-rest (AES-256 or KMS).`,
            affectedObjectIds: [obj.id],
            affectedConnectionIds: [],
            remediation: `Enable customer-managed key (CMK) encryption-at-rest and automated audit logging on '${obj.name}'.`,
          });
        }
      }
    }
  }

  // Calculate counts
  const summary = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    total: findings.length,
  };

  // Security score calculation
  const penalty =
    summary.critical * 30 + summary.high * 15 + summary.medium * 8 + summary.low * 4;
  const score = Math.max(0, 100 - penalty);

  // Synthesize AI Security Narrative (Strictly matching findings)
  const executiveSummary =
    summary.total === 0
      ? 'Security posture is exemplary (Score 100/100). All ingress routes terminate at approved gateways, inter-service communications enforce encryption and IAM boundaries, and sensitive data stores are protected.'
      : `Security audit detected ${summary.total} security issue(s) across the architecture (Security Score: ${score}/100). Found ${summary.critical} critical, ${summary.high} high, and ${summary.medium} medium risk vulnerabilities requiring remediation.`;

  const perimeterRisks =
    summary.critical > 0
      ? `Perimeter vulnerabilities detected: Found ${summary.critical} direct public access path(s) bypassing the edge security gateway. Direct external invocations expose internal microservices to unauthorized traffic and denial-of-service attacks.`
      : 'Network perimeter is well-defended. All public traffic terminates at designated gateways or load balancers.';

  const piiPrivacyRisks =
    findings.some((f) => f.type === 'pii_cleartext_path' || f.type === 'unencrypted_pii_store')
      ? `Data privacy compliance risk: Detected PII data flows traversing unencrypted network paths or stored without encryption-at-rest. Violates GDPR and SOC2 compliance standards.`
      : 'Data privacy controls satisfy baseline encryption standards.';

  const authenticationRisks =
    findings.some((f) => f.type === 'missing_auth_boundary')
      ? `Internal authentication gaps: Detected internal service-to-datastore connections lacking explicit IAM/token validation.`
      : 'All evaluated internal integrations enforce authentication boundaries.';

  const prioritizedActions: string[] = findings.map((f) => `${f.id}: ${f.remediation}`);
  if (prioritizedActions.length === 0) {
    prioritizedActions.push('Maintain continuous security regression scanning in CI/CD pipeline.');
  }

  const narrative: SecurityNarrative = {
    title: 'AI Architectural Security Review',
    executiveSummary,
    perimeterRisks,
    piiPrivacyRisks,
    authenticationRisks,
    prioritizedActions,
  };

  return {
    score,
    findings,
    summary,
    narrative,
    auditedAt: new Date().toISOString(),
  };
}
