import { describe, it, expect } from 'vitest';
import { simulateFailure, getAffectedConnections } from './failure-simulation';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from './types';

describe('Architecture Failure Simulation Engine (F089)', () => {
  const archId = 'arch-sim-test' as ArchitectureId;
  const verId = 'ver-sim-v1' as VersionId;
  const wsId = 'ws-main' as unknown as WorkspaceId;

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

  const mkConn = (id: string, src: string, tgt: string, label?: string) => ({
    id: id as unknown as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: src as unknown as ObjectId,
    targetObjectId: tgt as unknown as ObjectId,
    kind: 'sync' as const,
    label: label ?? null,
    description: null,
    metadata: {},
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
      name: 'Test Platform',
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

  /**
   * Model:
   *   Actor → WebApp → APIGateway → PostgresDB (store)
   *                              → CacheService (has fallback)
   *
   * Test: simulate PostgresDB outage
   * Expected:
   * - PostgresDB: down
   * - APIGateway: degraded (depends on DB, no fallback)
   * - WebApp: degraded (depends on APIGateway which is degraded)
   * - Actor: degraded (depends on WebApp which is degraded)
   * - CacheService: healthy (not upstream of DB)
   */
  const webModel = mkModel(
    [
      mkObj('actor', 'End User', 'actor'),
      mkObj('webapp', 'Web Application', 'application', { owner: 'frontend' }),
      mkObj('gateway', 'API Gateway', 'application'),
      mkObj('db', 'PostgreSQL DB', 'store'),
      mkObj('cache', 'Redis Cache', 'store', { hasFallback: true }),
    ],
    [
      mkConn('c1', 'actor', 'webapp', 'HTTPS'),
      mkConn('c2', 'webapp', 'gateway', 'REST'),
      mkConn('c3', 'gateway', 'db', 'SQL'),
      mkConn('c4', 'gateway', 'cache', 'TCP'),
    ]
  );

  it('simulates a DB outage: downstream nodes flagged, fallbacks distinguished', () => {
    const report = simulateFailure(webModel, {
      downedNodeIds: ['db' as unknown as ObjectId],
      reason: 'disk failure',
    });

    // DB is down
    const dbImpact = report.nodeImpacts.find((n) => n.nodeName === 'PostgreSQL DB');
    expect(dbImpact).toBeDefined();
    expect(dbImpact!.status).toBe('down');
    expect(dbImpact!.isDirectlyDowned).toBe(true);

    // API Gateway is degraded (depends on DB, no fallback)
    const gatewayImpact = report.nodeImpacts.find((n) => n.nodeName === 'API Gateway');
    expect(gatewayImpact).toBeDefined();
    expect(gatewayImpact!.status).toBe('degraded');
    expect(gatewayImpact!.hasFallback).toBe(false);

    // WebApp is degraded (upstream of gateway)
    const webappImpact = report.nodeImpacts.find((n) => n.nodeName === 'Web Application');
    expect(webappImpact).toBeDefined();
    expect(webappImpact!.status).toBe('degraded');

    // Actor is also flagged (upstream of webapp)
    const actorImpact = report.nodeImpacts.find((n) => n.nodeName === 'End User');
    expect(actorImpact).toBeDefined();
    expect(actorImpact!.status).toBe('degraded');

    // Cache is healthy (not upstream of DB — DB has no dependents that cache relies on)
    const cacheImpact = report.nodeImpacts.find((n) => n.nodeName === 'Redis Cache');
    expect(cacheImpact).toBeDefined();
    expect(cacheImpact!.status).toBe('healthy');

    // Metrics
    expect(report.metrics.totalDownedNodes).toBe(1);
    expect(report.metrics.totalDegradedNodes).toBeGreaterThanOrEqual(2); // gateway, webapp, actor
    expect(report.metrics.impactedCustomerFacingCount).toBeGreaterThanOrEqual(1); // actor
    expect(report.metrics.hasFullOutage).toBe(true); // actor (customer-facing) is degraded
  });

  it('distinguishes fallback vs no-fallback nodes in simulation', () => {
    /**
     * Model: Actor → App → [PrimaryDB (no fallback), BackupDB (has fallback)]
     * Simulate PrimaryDB failure:
     * - App: has no fallback → degraded
     * BUT if we make App have fallback → it becomes 'fallback' status
     */
    const model = mkModel(
      [
        mkObj('actor', 'Customer', 'actor'),
        mkObj('app', 'Payment App', 'application', { hasFallback: true }),
        mkObj('primary', 'Primary DB', 'store'),
        mkObj('backup', 'Backup DB', 'store'),
      ],
      [
        mkConn('c1', 'actor', 'app', 'HTTPS'),
        mkConn('c2', 'app', 'primary', 'SQL'),
        mkConn('c3', 'app', 'backup', 'SQL'),
      ]
    );

    const report = simulateFailure(model, {
      downedNodeIds: ['primary' as unknown as ObjectId],
    });

    // PrimaryDB is down
    const primaryImpact = report.nodeImpacts.find((n) => n.nodeName === 'Primary DB');
    expect(primaryImpact!.status).toBe('down');

    // Payment App has fallback → 'fallback' status, NOT 'degraded'
    const appImpact = report.nodeImpacts.find((n) => n.nodeName === 'Payment App');
    expect(appImpact).toBeDefined();
    expect(appImpact!.status).toBe('fallback');
    expect(appImpact!.hasFallback).toBe(true);

    // Metrics
    expect(report.metrics.totalFallbackNodes).toBeGreaterThanOrEqual(1);
    expect(report.metrics.totalDownedNodes).toBe(1);
  });

  it('getAffectedConnections returns only connections touching downed/degraded nodes', () => {
    const report = simulateFailure(webModel, {
      downedNodeIds: ['db' as unknown as ObjectId],
    });

    const affected = getAffectedConnections(webModel, report);

    // All connections should be affected (gateway→db, gateway→cache is NOT, but gateway is degraded so c2,c3 are)
    // c3: gateway→db (gateway is degraded, db is down) → affected
    // c2: webapp→gateway (both degraded) → affected
    // c1: actor→webapp (both degraded) → affected
    // c4: gateway→cache (gateway is degraded) → affected
    expect(affected.length).toBeGreaterThanOrEqual(3);

    // c3 (gateway→db) is definitely affected
    const affectedIds = new Set(affected.map((c) => c.id as string));
    expect(affectedIds.has('c3')).toBe(true);
    expect(affectedIds.has('c2')).toBe(true);
  });
});
