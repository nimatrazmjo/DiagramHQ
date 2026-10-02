import { describe, it, expect } from 'vitest';
import {
  resolveDependencyRationale,
  queryModelGroundedQA,
  type ArchitectureGroundedContext,
} from './ai-chat';
import type {
  ArchitectureId,
  VersionId,
  ObjectId,
  ConnectionId,
} from './ids';
import type { ModelObject, ModelConnection } from './types';

describe('AI Architecture Copilot & Grounded Q&A (F062)', () => {
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  const edgeGateway: ModelObject = {
    id: 'app-gateway' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Edge API Gateway',
    kind: 'application',
    description: 'Reverse proxy terminating TLS and routing incoming traffic',
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
    description: 'Manages user sessions, OAuth2 PKCE tokens, and role permissions',
    position: { x: 300, y: 300 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const primaryDb: ModelObject = {
    id: 'sto-db' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Primary Database',
    kind: 'store',
    description: 'PostgreSQL 16 ledger and user accounts',
    position: { x: 600, y: 300 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const gwToAuthConn: ModelConnection = {
    id: 'con-gw-auth' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: edgeGateway.id,
    targetObjectId: authService.id,
    label: 'Authorize Bearer Token',
    description: 'gRPC request with 200ms deadline to validate incoming JWT',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const authToDbConn: ModelConnection = {
    id: 'con-auth-db' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: authService.id,
    targetObjectId: primaryDb.id,
    label: 'Query User Record',
    description: 'TCP 5432 SQL query',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const context: ArchitectureGroundedContext = {
    objects: [edgeGateway, authService, primaryDb],
    connections: [gwToAuthConn, authToDbConn],
  };

  it('1. Acceptance Test: "why does X depend on Y" cites the real connection and object IDs', () => {
    // Direct dependency query
    const result = resolveDependencyRationale(edgeGateway.id, authService.id, context);

    expect(result.direct).toBe(true);
    expect(result.connection?.id).toBe(gwToAuthConn.id);
    expect(result.explanation).toContain('app-gateway');
    expect(result.explanation).toContain('app-auth');
    expect(result.explanation).toContain('con-gw-auth');
    expect(result.explanation).toContain('Authorize Bearer Token');

    // Citations must include the concrete connection and endpoint objects
    expect(result.citations).toHaveLength(3);
    const connCitation = result.citations.find((c) => c.kind === 'connection');
    expect(connCitation).toBeDefined();
    expect(connCitation?.id).toBe('con-gw-auth');

    // Natural Language grounded Q&A
    const response = queryModelGroundedQA('Why does Edge API Gateway depend on Authentication Service?', context);

    expect(response.role).toBe('assistant');
    expect(response.content).toContain('con-gw-auth');
    expect(response.content).toContain('app-gateway');
    expect(response.content).toContain('app-auth');
    expect(response.citations.some((c) => c.id === 'con-gw-auth')).toBe(true);
  });

  it('2. resolves transitive multi-hop dependencies with graph path citations', () => {
    // Transitive query: Gateway -> Auth -> DB (2 hops)
    const result = resolveDependencyRationale(edgeGateway.id, primaryDb.id, context);

    expect(result.direct).toBe(false);
    expect(result.transitivePath).toBeDefined();
    expect(result.transitivePath).toHaveLength(2);
    expect(result.explanation).toContain('transitively depends on Primary Database');
    expect(result.explanation).toContain('con-gw-auth');
    expect(result.explanation).toContain('con-auth-db');

    // Citations include all objects and connections along the path
    expect(result.citations.map((c) => c.id)).toContain('app-gateway');
    expect(result.citations.map((c) => c.id)).toContain('con-gw-auth');
    expect(result.citations.map((c) => c.id)).toContain('app-auth');
    expect(result.citations.map((c) => c.id)).toContain('con-auth-db');
    expect(result.citations.map((c) => c.id)).toContain('sto-db');
  });

  it('3. reports disconnected entities gracefully', () => {
    // Reverse dependency: DB does not depend on Gateway
    const result = resolveDependencyRationale(primaryDb.id, edgeGateway.id, context);

    expect(result.direct).toBe(false);
    expect(result.connection).toBeNull();
    expect(result.explanation).toContain('No architectural dependency was found');
  });

  it('4. answers "what depends on X" citing upstream dependents', () => {
    const response = queryModelGroundedQA('What depends on Authentication Service?', context);

    expect(response.role).toBe('assistant');
    expect(response.content).toContain('1 system(s) depend on Authentication Service');
    expect(response.content).toContain('Edge API Gateway');
    expect(response.citations.some((c) => c.id === 'app-gateway')).toBe(true);
  });
});
