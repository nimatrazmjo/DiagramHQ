import { describe, it, expect } from 'vitest';
import {
  generateObjectDocumentation,
  generateSystemArchitectureDocumentation,
  refreshDocumentationOnModelChange,
} from './ai-documentation';
import type {
  ArchitectureId,
  VersionId,
  ObjectId,
  ConnectionId,
  DecisionId,
  TeamId,
  OrgId,
} from './ids';
import type { ModelObject, ModelConnection } from './types';
import type { ArchitectureDecisionRecord } from './adrs';
import type { Team, ObjectOwnership } from './teams';

describe('AI Architecture Documentation (F068)', () => {
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;
  const v2 = 'ver-v2' as VersionId;
  const orgId = 'org-test' as OrgId;

  const edgeGateway: ModelObject = {
    id: 'app-gateway' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Edge API Gateway',
    kind: 'application',
    description: 'Reverse proxy managing TLS termination and auth validation',
    position: { x: 100, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const authService: ModelObject = {
    id: 'app-auth' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Authentication Service',
    kind: 'application',
    description: 'OAuth2 token issuer and permission engine',
    position: { x: 400, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const dbStore: ModelObject = {
    id: 'sto-auth-db' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Auth Postgres DB',
    kind: 'store',
    description: 'Credential and tenant token store',
    position: { x: 700, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const connGwAuth: ModelConnection = {
    id: 'con-gw-auth' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: edgeGateway.id,
    targetObjectId: authService.id,
    label: 'Authorize JWT Token',
    description: 'High-throughput synchronous gRPC RPC',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const connAuthDb: ModelConnection = {
    id: 'con-auth-db' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: authService.id,
    targetObjectId: dbStore.id,
    label: 'Query Accounts & Keys',
    description: 'Encrypted SQL queries over TCP pool',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const adrAuth: ArchitectureDecisionRecord = {
    id: 'adr-001' as DecisionId,
    number: 1,
    title: 'Stateless JWT Verification',
    status: 'accepted',
    context: 'High concurrency demands sub-millisecond validation.',
    decision: 'Use RSA public keys cached at gateway.',
    consequences: 'Zero DB lookups on valid token.',
    alternatives: ['Redis session tokens'],
    attachments: [
      { targetId: authService.id, targetType: 'object', attachedAt: '2026-10-01T00:00:00Z' },
    ],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const authTeam: Team = {
    id: 'team-auth' as TeamId,
    orgId,
    name: 'Identity & Access Team',
    slug: 'identity-access',
    memberUserIds: ['u1', 'u2'],
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const authOwnership: ObjectOwnership = {
    objectId: authService.id,
    primaryTeamId: authTeam.id,
    leadContactUserId: 'lead-alice',
    updatedAt: new Date('2026-10-01'),
  };

  const context = {
    objects: [edgeGateway, authService, dbStore],
    connections: [connGwAuth, connAuthDb],
    adrs: [adrAuth],
    teams: [authTeam],
    ownerships: [authOwnership],
  };

  it('1. Acceptance Test: Auto-generate object docs grounded in metadata + connections; test: generated docs are grounded, not invented', () => {
    const doc = generateObjectDocumentation({
      targetObjectId: authService.id,
      versionId: v1,
      context,
    });

    // 1. Structure assertions
    expect(doc.targetId).toBe(authService.id);
    expect(doc.title).toContain('Authentication Service');
    expect(doc.markdownContent).toContain('# Authentication Service');

    // 2. Invariant verification: Grounded, not invented
    // Cites real incoming connection and caller ID
    expect(doc.markdownContent).toContain('Authorize JWT Token');
    expect(doc.markdownContent).toContain('con-gw-auth');
    expect(doc.markdownContent).toContain('Edge API Gateway');
    expect(doc.markdownContent).toContain('app-gateway');

    // Cites real outgoing connection and target DB
    expect(doc.markdownContent).toContain('Query Accounts & Keys');
    expect(doc.markdownContent).toContain('con-auth-db');
    expect(doc.markdownContent).toContain('Auth Postgres DB');
    expect(doc.markdownContent).toContain('sto-auth-db');

    // Cites real ADR
    expect(doc.markdownContent).toContain('ADR-001: Stateless JWT Verification');

    // Cites real team ownership
    expect(doc.markdownContent).toContain('Identity & Access Team');
    expect(doc.markdownContent).toContain('lead-alice');

    // All grounded references match existing entities
    expect(doc.groundedReferences.some((r) => r.id === authService.id)).toBe(true);
    expect(doc.groundedReferences.some((r) => r.id === 'con-gw-auth')).toBe(true);
    expect(doc.groundedReferences.some((r) => r.id === 'con-auth-db')).toBe(true);
    expect(doc.groundedReferences.some((r) => r.id === 'adr-001')).toBe(true);
    expect(doc.groundedReferences.some((r) => r.id === 'team-auth')).toBe(true);
  });

  it('2. keeps documentation current on model change via refreshDocumentationOnModelChange', () => {
    const initialDoc = generateObjectDocumentation({
      targetObjectId: authService.id,
      versionId: v1,
      context,
    });

    // Update model: add a new connection to Redis cache
    const redisStore: ModelObject = {
      id: 'sto-redis' as ObjectId,
      architectureId: archId,
      versionId: v2,
      name: 'Session Redis',
      kind: 'store',
      position: { x: 400, y: 300 },
      createdAt: new Date('2026-10-02'),
      updatedAt: new Date('2026-10-02'),
    };

    const connAuthRedis: ModelConnection = {
      id: 'con-auth-redis' as ConnectionId,
      architectureId: archId,
      versionId: v2,
      sourceObjectId: authService.id,
      targetObjectId: redisStore.id,
      label: 'Cache Refresh Tokens',
      kind: 'sync',
      createdAt: new Date('2026-10-02'),
      updatedAt: new Date('2026-10-02'),
    };

    const updatedContext = {
      ...context,
      objects: [...context.objects, redisStore],
      connections: [...context.connections, connAuthRedis],
    };

    const refreshedDoc = refreshDocumentationOnModelChange(initialDoc, updatedContext, v2);

    expect(refreshedDoc.versionId).toBe(v2);
    // Newly added connection is now documented
    expect(refreshedDoc.markdownContent).toContain('Cache Refresh Tokens');
    expect(refreshedDoc.markdownContent).toContain('sto-redis');
    expect(refreshedDoc.groundedReferences.some((r) => r.id === 'con-auth-redis')).toBe(true);
  });

  it('3. generates system architecture overview documentation with component catalog', () => {
    const sysDoc = generateSystemArchitectureDocumentation(v1, context, 'Platform Overview');
    expect(sysDoc.type).toBe('architecture');
    expect(sysDoc.markdownContent).toContain('# Platform Overview');
    expect(sysDoc.markdownContent).toContain('Edge API Gateway');
    expect(sysDoc.markdownContent).toContain('Authentication Service');
    expect(sysDoc.markdownContent).toContain('Auth Postgres DB');
  });

  it('4. throws when target object is missing', () => {
    expect(() =>
      generateObjectDocumentation({
        targetObjectId: 'non-existent' as ObjectId,
        versionId: v1,
        context,
      })
    ).toThrow("Cannot generate documentation: Object with ID 'non-existent' not found");
  });
});
