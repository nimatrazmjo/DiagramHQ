import { describe, it, expect } from 'vitest';
import { computeBlastRadius } from './blast-radius';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from './types';

describe('Architecture Blast-Radius Analysis Engine (F088)', () => {
  const archId = 'arch-blast-test' as ArchitectureId;
  const verId = 'ver-blast-v1' as VersionId;
  const wsId = 'ws-main' as unknown as WorkspaceId;

  /**
   * Model: Actor → WebApp → [APIGateway] → DB (store)
   *                                      → CacheService
   *
   * Failing node: APIGateway
   * Expected blast radius: Actor, WebApp (2 upstream dependents)
   * Services: 1 (WebApp is application), Databases: 0 (upstream of APIGateway),
   * CustomerFacing: 1 (Actor), Flows: 2 (Actor→WebApp, WebApp→APIGateway)
   */
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

  const mkModel = (objects: ReturnType<typeof mkObj>[], connections: ReturnType<typeof mkConn>[]): ArchitectureModel => ({
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

  it('computes blast-radius counts for a failing gateway node', () => {
    /**
     * Topology:
     *   Actor → WebApp → APIGateway → DB
     *                              → Cache
     *
     * Failing: APIGateway
     * Reverse BFS from APIGateway: WebApp (hop 1), Actor (hop 2)
     */
    const objects = [
      mkObj('actor', 'End User', 'actor'),
      mkObj('webapp', 'Web Application', 'application', { owner: 'frontend-team' }),
      mkObj('gateway', 'API Gateway', 'application', { owner: 'platform-team' }),
      mkObj('db', 'PostgreSQL DB', 'store', { owner: 'data-team' }),
      mkObj('cache', 'Redis Cache', 'store'),
    ];

    const connections = [
      mkConn('c1', 'actor', 'webapp', 'HTTPS'),
      mkConn('c2', 'webapp', 'gateway', 'REST'),
      mkConn('c3', 'gateway', 'db', 'SQL'),
      mkConn('c4', 'gateway', 'cache', 'TCP'),
    ];

    const model = mkModel(objects, connections);
    const report = computeBlastRadius(model, 'gateway' as unknown as ObjectId);

    // Target info
    expect(report.targetNodeName).toBe('API Gateway');

    // Impacted nodes: WebApp (hop 1), Actor (hop 2)
    expect(report.impactedNodes.length).toBe(2);

    const webappImpact = report.impactedNodes.find((n) => n.name === 'Web Application');
    expect(webappImpact).toBeDefined();
    expect(webappImpact!.hopCount).toBe(1);
    expect(webappImpact!.kind).toBe('application');
    expect(webappImpact!.team).toBe('frontend-team');

    const actorImpact = report.impactedNodes.find((n) => n.name === 'End User');
    expect(actorImpact).toBeDefined();
    expect(actorImpact!.hopCount).toBe(2);
    expect(actorImpact!.isCustomerFacing).toBe(true);

    // Metrics
    expect(report.metrics.impactedServiceCount).toBe(1); // WebApp (application)
    expect(report.metrics.impactedDatabaseCount).toBe(0); // DB/Cache are downstream, not upstream
    expect(report.metrics.customerFacingCount).toBe(1); // Actor
    expect(report.metrics.impactedFlowCount).toBeGreaterThanOrEqual(2); // c1, c2
    expect(report.metrics.teamCount).toBe(1); // frontend-team from WebApp
    expect(report.metrics.maxHops).toBe(2);
  });

  it('computes severity as critical when customer-facing and no fallback', () => {
    /**
     * Actor → APIGateway (failing) → PaymentService
     * Actor has no fallback; direct customer-facing impact
     */
    const objects = [
      mkObj('actor', 'Customer', 'actor'),
      mkObj('gateway', 'API Gateway', 'application'),
      mkObj('payment', 'Payment Service', 'application'),
    ];

    const connections = [
      mkConn('c1', 'actor', 'gateway', 'HTTPS'),
      mkConn('c2', 'gateway', 'payment', 'gRPC'),
    ];

    const model = mkModel(objects, connections);
    const report = computeBlastRadius(model, 'gateway' as unknown as ObjectId);

    // Customer (actor) is upstream → customer-facing impact
    expect(report.metrics.customerFacingCount).toBe(1);
    // Actor has no fallback (metadata not set) → hasCriticalPath = true
    expect(report.metrics.hasCriticalPath).toBe(true);
    expect(report.metrics.severityScore).toBe('critical');
  });

  it('returns low severity for isolated internal service with no upstream customer-facing nodes', () => {
    /**
     * BatchWorker (failing) — no upstream dependents at all (it is a leaf source)
     * ServiceA → BatchWorker
     * BatchWorker has no incoming connections, so blast radius is zero.
     *
     * Actually we want to test that when no customer-facing nodes are impacted,
     * severity is low or medium.
     * Let's use: InternalService → DataProcessor (failing)
     * No actors in model.
     */
    const objects = [
      mkObj('svc', 'Internal Service', 'application', { owner: 'backend-team' }),
      mkObj('proc', 'Data Processor', 'application'),
    ];

    const connections = [
      mkConn('c1', 'svc', 'proc', 'async'),
    ];

    const model = mkModel(objects, connections);
    const report = computeBlastRadius(model, 'proc' as unknown as ObjectId);

    // Internal Service depends on Data Processor → impacted
    expect(report.impactedNodes.length).toBe(1);
    expect(report.impactedNodes[0].name).toBe('Internal Service');

    // No actors → no customer-facing impact
    expect(report.metrics.customerFacingCount).toBe(0);
    expect(report.metrics.hasCriticalPath).toBe(false);
    // Severity: no customer-facing → low (1 service, no critical path)
    expect(report.metrics.severityScore).toBe('low');
    expect(report.metrics.impactedServiceCount).toBe(1);
    expect(report.metrics.teamCount).toBe(1); // backend-team
  });
});
