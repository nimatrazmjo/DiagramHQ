import { describe, it, expect } from 'vitest';
import { analyzeSecurityArchitecture } from './security-architecture';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from './types';

describe('Architecture Security Engine (F090)', () => {
  const archId = 'arch-sec-test' as ArchitectureId;
  const verId = 'ver-sec-v1' as VersionId;
  const wsId = 'ws-sec-main' as unknown as WorkspaceId;

  const mkObj = (
    id: string,
    name: string,
    kind: string,
    metadata?: Record<string, unknown>
  ) => ({
    id: id as unknown as ObjectId,
    architectureId: archId,
    versionId: verId,
    parentId: null,
    name,
    kind: kind as 'actor' | 'application' | 'store' | 'component' | 'system' | 'group',
    description: null,
    position: null,
    metadata: metadata ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mkConn = (
    id: string,
    src: string,
    tgt: string,
    label?: string,
    metadata?: Record<string, unknown>
  ) => ({
    id: id as unknown as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: src as unknown as ObjectId,
    targetObjectId: tgt as unknown as ObjectId,
    kind: 'sync' as const,
    label: label ?? null,
    description: null,
    metadata: metadata ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mkModel = (
    objects: ReturnType<typeof mkObj>[],
    connections: ReturnType<typeof mkConn>[]
  ): ArchitectureModel => ({
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'Security Test Platform',
      defaultVersionId: verId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects,
    connections,
  });

  it('renders boundaries and flags exposures on public endpoints, unencrypted PII/PCI stores, and unencrypted transit', () => {
    /**
     * Model with security exposures:
     * - Public actor connects to unauthenticated API gateway
     * - Gateway connects to Payment Service over unencrypted HTTP (cross boundary)
     * - Payment Service connects to Postgres DB containing unencrypted PCI card data
     * - Payment Service has hardcoded secrets
     */
    const vulnerableModel = mkModel(
      [
        mkObj('actor', 'End User', 'actor'),
        mkObj('gateway', 'Public Ingress API', 'application', {
          publicEndpoint: true,
          // Missing requiresAuth / authScheme -> unauthenticated public endpoint
        }),
        mkObj('payment-svc', 'Payment Processing Service', 'application', {
          trustZone: 'PCI Enclave',
          pci: true,
          hasSecrets: true,
          hardcodedSecrets: true, // hardcoded secrets
        }),
        mkObj('card-db', 'Credit Card Store', 'store', {
          trustZone: 'PCI Enclave',
          pci: true,
          encryptionAtRest: false, // unencrypted PCI store
        }),
      ],
      [
        mkConn('c1', 'actor', 'gateway', 'HTTP'),
        mkConn('c2', 'gateway', 'payment-svc', 'HTTP / JSON'), // cross-boundary unencrypted transit
        mkConn('c3', 'payment-svc', 'card-db', 'SQL', { tls: true }),
      ]
    );

    const report = analyzeSecurityArchitecture(vulnerableModel);

    // 1. Boundaries are discovered
    expect(report.boundaries.length).toBeGreaterThanOrEqual(2);
    const pciBoundary = report.boundaries.find((b) => b.name === 'PCI Enclave');
    expect(pciBoundary).toBeDefined();
    expect(pciBoundary!.level).toBe('critical');

    // 2. Public Endpoints identified & exposure flagged
    expect(report.publicEndpoints.length).toBeGreaterThanOrEqual(1);
    const gatewayEndpoint = report.publicEndpoints.find(
      (p) => p.nodeName === 'Public Ingress API'
    );
    expect(gatewayEndpoint).toBeDefined();
    expect(gatewayEndpoint!.isSecured).toBe(false);
    expect(gatewayEndpoint!.exposureSeverity).toBe('critical');

    // 3. Unencrypted PCI store flagged
    const storeEnc = report.encryption.find((e) => e.nodeName === 'Credit Card Store');
    expect(storeEnc).toBeDefined();
    expect(storeEnc!.isExposed).toBe(true);
    expect(storeEnc!.containsSensitiveData).toBe(true);
    expect(storeEnc!.sensitiveTypes).toContain('PCI');

    // 4. Hardcoded secrets flagged
    const secretsEntry = report.secrets.find(
      (s) => s.nodeName === 'Payment Processing Service'
    );
    expect(secretsEntry).toBeDefined();
    expect(secretsEntry!.hasHardcodedSecrets).toBe(true);
    expect(secretsEntry!.isManaged).toBe(false);

    // 5. Cross-boundary unencrypted connection flagged
    const crossConn = report.crossBoundaryConnections.find(
      (c) => c.connectionId === ('c2' as unknown as ConnectionId)
    );
    expect(crossConn).toBeDefined();
    expect(crossConn!.isCrossingBoundary).toBe(true);
    expect(crossConn!.inTransitEncryption).toBe(false);
    expect(crossConn!.risk).toBe('critical');

    // 6. Exposures list contains all expected vulnerabilities
    const exposureTypes = report.exposures.map((e) => e.type);
    expect(exposureTypes).toContain('unauthenticated_public_endpoint');
    expect(exposureTypes).toContain('unencrypted_sensitive_store');
    expect(exposureTypes).toContain('unencrypted_boundary_transit');
    expect(exposureTypes).toContain('unmanaged_secrets');

    // Security score is severely penalized
    expect(report.metrics.securityScore).toBeLessThan(50);
    expect(report.metrics.criticalExposures).toBeGreaterThanOrEqual(3);
  });

  it('correctly maps compliance zones for PII, PCI, and HIPAA', () => {
    const compliantModel = mkModel(
      [
        mkObj('user-svc', 'User Directory', 'application', {
          compliance: ['PII', 'GDPR'],
        }),
        mkObj('user-db', 'User Data Vault', 'store', {
          pii: true,
          encryptionAtRest: true,
          encryption: 'AES-256',
        }),
        mkObj('ehr-svc', 'Health Record Service', 'application', {
          hipaa: true,
        }),
        mkObj('billing-svc', 'Billing Service', 'application', {
          pci: true,
        }),
      ],
      []
    );

    const report = analyzeSecurityArchitecture(compliantModel);

    // Compliance zones mapped
    const piiZone = report.complianceZones.find((z) => z.standard === 'PII');
    expect(piiZone).toBeDefined();
    expect(piiZone!.objectIds.length).toBeGreaterThanOrEqual(2);
    expect(piiZone!.sensitiveStoreCount).toBe(1);

    const hipaaZone = report.complianceZones.find((z) => z.standard === 'HIPAA');
    expect(hipaaZone).toBeDefined();
    expect(hipaaZone!.objectIds.length).toBeGreaterThanOrEqual(1);

    const pciZone = report.complianceZones.find((z) => z.standard === 'PCI');
    expect(pciZone).toBeDefined();
    expect(pciZone!.objectIds.length).toBeGreaterThanOrEqual(1);

    expect(report.metrics.complianceZoneCounts.PII).toBeGreaterThanOrEqual(2);
    expect(report.metrics.complianceZoneCounts.HIPAA).toBeGreaterThanOrEqual(1);
    expect(report.metrics.complianceZoneCounts.PCI).toBeGreaterThanOrEqual(1);
  });

  it('evaluates clean, fully compliant architecture with 100 security score', () => {
    const secureModel = mkModel(
      [
        mkObj('actor', 'End User', 'actor'),
        mkObj('gateway', 'Cloudflare Edge / API Gateway', 'application', {
          publicEndpoint: true,
          requiresAuth: true,
          authScheme: 'OAuth2 / OIDC',
          trustZone: 'Edge Ingress',
        }),
        mkObj('backend', 'Core Application Service', 'application', {
          trustZone: 'Internal VPC',
          hasSecrets: true,
          secretsManager: 'AWS Secrets Manager',
        }),
        mkObj('secure-db', 'Encrypted PostgreSQL DB', 'store', {
          trustZone: 'Internal VPC',
          pii: true,
          encryptionAtRest: true,
          encryption: 'AES-256-GCM',
        }),
      ],
      [
        mkConn('c1', 'actor', 'gateway', 'HTTPS (TLS 1.3)', { tls: true, auth: true }),
        mkConn('c2', 'gateway', 'backend', 'mTLS gRPC', { tls: true, auth: true }),
        mkConn('c3', 'backend', 'secure-db', 'TLS PostgreSQL', { tls: true, auth: true }),
      ]
    );

    const report = analyzeSecurityArchitecture(secureModel);

    // No exposures
    expect(report.exposures.length).toBe(0);
    expect(report.metrics.criticalExposures).toBe(0);
    expect(report.metrics.highExposures).toBe(0);
    expect(report.metrics.securityScore).toBe(100);

    // Public endpoint is secured
    const pub = report.publicEndpoints[0];
    expect(pub.isSecured).toBe(true);
    expect(pub.exposureSeverity).toBe('none');

    // Secrets are managed
    const sec = report.secrets[0];
    expect(sec.isManaged).toBe(true);
    expect(sec.hasHardcodedSecrets).toBe(false);

    // Storage is encrypted
    const enc = report.encryption.find((e) => e.nodeName === 'Encrypted PostgreSQL DB');
    expect(enc!.atRest).toBe(true);
    expect(enc!.isExposed).toBe(false);
  });
});
