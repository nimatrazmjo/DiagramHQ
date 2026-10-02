import { describe, it, expect } from 'vitest';
import {
  auditArchitectureSecurity,
} from './ai-security';
import type {
  ArchitectureId,
  VersionId,
  ObjectId,
  ConnectionId,
} from './ids';
import type { ModelObject, ModelConnection } from './types';

describe('AI Architecture Security Analysis (F067)', () => {
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  // Seeded architecture with 3 specific security issues:
  // 1. Public client directly invokes internal Payments Service (bypassing Edge Gateway)
  // 2. Payments Service sends customer PII over cleartext HTTP connection
  // 3. Payments Service queries Customer DB with missing auth boundary
  const publicClient: ModelObject = {
    id: 'usr-attacker' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'External Client',
    kind: 'actor',
    position: { x: 100, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const paymentsService: ModelObject = {
    id: 'app-payments' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Payments Core Service',
    kind: 'application',
    position: { x: 400, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const customerDb: ModelObject = {
    id: 'sto-customers' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Customer PII Database',
    kind: 'store',
    description: 'Stores customer accounts and credit card records',
    position: { x: 700, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  // Seeded Issue 1: Unauthenticated public endpoint
  const seededPublicBypassConn: ModelConnection = {
    id: 'con-public-bypass' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: publicClient.id,
    targetObjectId: paymentsService.id,
    label: 'Direct Ingress',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  // Seeded Issue 2: Cleartext PII transmission
  const seededCleartextPiiConn: ModelConnection = {
    id: 'con-cleartext-pii' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: paymentsService.id,
    targetObjectId: customerDb.id,
    label: 'Transmit customer PII password',
    description: 'Plain sync call sending customer credentials',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const seededContext = {
    objects: [publicClient, paymentsService, customerDb],
    connections: [seededPublicBypassConn, seededCleartextPiiConn],
  };

  it('1. Acceptance Test: Find PII paths, public endpoints, missing auth; narrate risks; AI security findings match seeded issues', () => {
    const report = auditArchitectureSecurity(seededContext);

    // 1. Structural findings detection
    expect(report.findings.length).toBeGreaterThanOrEqual(3);

    const publicEndpointFinding = report.findings.find(
      (f) => f.type === 'public_endpoint_unauthenticated'
    );
    expect(publicEndpointFinding).toBeDefined();
    expect(publicEndpointFinding?.affectedObjectIds).toContain(publicClient.id);
    expect(publicEndpointFinding?.affectedObjectIds).toContain(paymentsService.id);
    expect(publicEndpointFinding?.severity).toBe('critical');

    const piiPathFinding = report.findings.find(
      (f) => f.type === 'pii_cleartext_path'
    );
    expect(piiPathFinding).toBeDefined();
    expect(piiPathFinding?.affectedConnectionIds).toContain(seededCleartextPiiConn.id);
    expect(piiPathFinding?.severity).toBe('high');

    const missingAuthFinding = report.findings.find(
      (f) => f.type === 'missing_auth_boundary'
    );
    expect(missingAuthFinding).toBeDefined();
    expect(missingAuthFinding?.affectedObjectIds).toContain(customerDb.id);

    const unencryptedStoreFinding = report.findings.find(
      (f) => f.type === 'unencrypted_pii_store'
    );
    expect(unencryptedStoreFinding).toBeDefined();
    expect(unencryptedStoreFinding?.affectedObjectIds).toContain(customerDb.id);

    // 2. AI narrative matches seeded issues
    expect(report.narrative.executiveSummary).toContain('Security audit detected');
    expect(report.narrative.perimeterRisks).toContain('Perimeter vulnerabilities detected');
    expect(report.narrative.piiPrivacyRisks).toContain('Data privacy compliance risk');
    expect(report.narrative.authenticationRisks).toContain('Internal authentication gaps');
    expect(report.narrative.prioritizedActions.length).toBe(report.findings.length);
  });

  it('2. clean architecture with approved gateways, TLS, and encrypted stores has 0 findings and 100 score', () => {
    const edgeGateway: ModelObject = {
      id: 'app-gateway' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Cloudflare Edge Gateway Proxy',
      kind: 'application',
      position: { x: 300, y: 100 },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const secureDb: ModelObject = {
      id: 'sto-secure' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Encrypted Vault Store',
      description: 'Customer data protected with AES-256 KMS encryption',
      kind: 'store',
      position: { x: 700, y: 100 },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const secureClientConn: ModelConnection = {
      id: 'con-sec-1' as ConnectionId,
      architectureId: archId,
      versionId: v1,
      sourceObjectId: publicClient.id,
      targetObjectId: edgeGateway.id,
      label: 'HTTPS with TLS 1.3',
      kind: 'sync',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const secureStoreConn: ModelConnection = {
      id: 'con-sec-2' as ConnectionId,
      architectureId: archId,
      versionId: v1,
      sourceObjectId: edgeGateway.id,
      targetObjectId: secureDb.id,
      label: 'mTLS gRPC with IAM Token',
      kind: 'sync',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const cleanReport = auditArchitectureSecurity({
      objects: [publicClient, edgeGateway, secureDb],
      connections: [secureClientConn, secureStoreConn],
    });

    expect(cleanReport.score).toBe(100);
    expect(cleanReport.findings).toHaveLength(0);
    expect(cleanReport.summary.total).toBe(0);
    expect(cleanReport.narrative.executiveSummary).toContain('Security posture is exemplary');
  });

  it('3. calculates severity counts and score penalties correctly', () => {
    const report = auditArchitectureSecurity(seededContext);
    expect(report.summary.critical).toBeGreaterThanOrEqual(1);
    expect(report.summary.high).toBeGreaterThanOrEqual(1);
    expect(report.score).toBeLessThan(70);
  });
});
