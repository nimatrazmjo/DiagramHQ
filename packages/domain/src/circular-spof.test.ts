import { describe, it, expect } from 'vitest';
import {
  detectCircularDependencies,
  detectSinglePointsOfFailure,
  analyzeStructuralRisks,
  findArticulationPoints,
} from './circular-spof';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const archId = 'arch-spof-test' as ArchitectureId;
const verId = 'ver-spof-v1' as VersionId;
const wsId = 'ws-spof-main' as unknown as WorkspaceId;

function mkObj(
  id: string,
  name: string,
  kind: string = 'application',
  metadata: Record<string, unknown> = {}
) {
  return {
    id: id as unknown as ObjectId,
    architectureId: archId,
    versionId: verId,
    parentId: null,
    name,
    kind: kind as 'actor' | 'application' | 'store' | 'component' | 'system' | 'group',
    description: 'Component description for structural risk testing.',
    position: { x: 0, y: 0 },
    metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mkConn(
  id: string,
  src: string,
  tgt: string,
  label?: string,
  kind: 'sync' | 'async' | 'data' = 'sync'
) {
  return {
    id: id as unknown as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: src as unknown as ObjectId,
    targetObjectId: tgt as unknown as ObjectId,
    kind,
    label: label ?? null,
    description: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mkModel(
  objects: ReturnType<typeof mkObj>[],
  connections: ReturnType<typeof mkConn>[]
): ArchitectureModel {
  return {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'Structural Risks Test Platform',
      description: 'Platform topology used to verify circular dependencies and SPOF detection.',
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
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Circular Dependency & SPOF Detection Engine (F130)', () => {
  // Test 1: Seeded Cycle Detection
  it('detects seeded circular dependency cycle and suggests breaking edge', () => {
    const sA = mkObj('srv-a', 'Order Service');
    const sB = mkObj('srv-b', 'Payment Service');
    const sC = mkObj('srv-c', 'Notification Service');

    // sA -> sB -> sC -> sA
    const c1 = mkConn('c-ab', 'srv-a', 'srv-b', 'process payment');
    const c2 = mkConn('c-bc', 'srv-b', 'srv-c', 'trigger receipt');
    const c3 = mkConn('c-ca', 'srv-c', 'srv-a', 'update order state');

    const model = mkModel([sA, sB, sC], [c1, c2, c3]);
    const cycles = detectCircularDependencies(model);

    expect(cycles).toHaveLength(1);
    const cycle = cycles[0];
    expect(cycle.length).toBe(3);
    expect(cycle.nodeNames).toContain('Order Service');
    expect(cycle.nodeNames).toContain('Payment Service');
    expect(cycle.nodeNames).toContain('Notification Service');
    expect(cycle.isSynchronous).toBe(true);
    expect(cycle.severity).toBe('critical');
    expect(cycle.pathDescription).toContain('➔');
    expect(cycle.breakingEdgeSuggestion).toBeDefined();
    expect(cycle.breakingEdgeSuggestion?.reason).toContain('Invert dependency');
  });

  // Test 2: Seeded SPOF on fan-in
  it('flags SPOF on a high fan-in unmitigated node', () => {
    // 3 upstream services fan in to an unmitigated auth service
    const client = mkObj('client-app', 'Web Client App', 'application');
    const orders = mkObj('orders-svc', 'Order Service', 'application');
    const billing = mkObj('billing-svc', 'Billing Service', 'application');
    const authHub = mkObj('auth-hub', 'Central Auth Token Issuer', 'application', {
      ha: false,
      redundant: false,
    });

    const c1 = mkConn('c-ca', 'client-app', 'auth-hub', 'authenticate');
    const c2 = mkConn('c-oa', 'orders-svc', 'auth-hub', 'verify JWT');
    const c3 = mkConn('c-ba', 'billing-svc', 'auth-hub', 'check scope');

    const model = mkModel([client, orders, billing, authHub], [c1, c2, c3]);
    const spofs = detectSinglePointsOfFailure(model, { fanInThreshold: 2 });

    const authSpof = spofs.find((s) => s.targetId === ('auth-hub' as unknown as ObjectId));
    expect(authSpof).toBeDefined();
    expect(authSpof?.targetName).toBe('Central Auth Token Issuer');
    expect(authSpof?.inDegree).toBe(3);
    expect(authSpof?.categories).toContain('fan_in_bottleneck');
    expect(authSpof?.dependentNames).toHaveLength(3);
    expect(authSpof?.rationale).toContain('High fan-in bottleneck: 3 incoming connection(s)');
    expect(authSpof?.mitigation).toContain('Introduce load balancing with at least 2 active replicas');
  });

  // Test 3: Articulation point cut-vertex detection
  it('identifies bridge articulation point that partitions the topology', () => {
    // Cluster 1: s1 -> s2 -> bridge -> s3 -> s4
    const s1 = mkObj('s1', 'Frontend 1');
    const s2 = mkObj('s2', 'Frontend 2');
    const bridge = mkObj('bridge', 'API Gateway Proxy');
    const s3 = mkObj('s3', 'Backend 1');
    const s4 = mkObj('s4', 'Backend 2');

    const connections = [
      mkConn('c1', 's1', 's2'),
      mkConn('c2', 's2', 'bridge'),
      mkConn('c3', 'bridge', 's3'),
      mkConn('c4', 's3', 's4'),
    ];

    const model = mkModel([s1, s2, bridge, s3, s4], connections);
    const artPoints = findArticulationPoints(model.objects, model.connections);

    expect(artPoints.has('bridge' as unknown as ObjectId)).toBe(true);

    const spofs = detectSinglePointsOfFailure(model);
    const bridgeSpof = spofs.find((s) => s.targetId === ('bridge' as unknown as ObjectId));
    expect(bridgeSpof).toBeDefined();
    expect(bridgeSpof?.categories).toContain('articulation_point');
  });

  // Test 4: Unreplicated datastore SPOF
  it('identifies unmitigated single database as unreplicated store SPOF', () => {
    const app1 = mkObj('app1', 'Service One');
    const app2 = mkObj('app2', 'Service Two');
    const mainDb = mkObj('main-db', 'Primary Postgres DB', 'store', {
      ha: false,
      redundant: false,
    });

    const c1 = mkConn('c-1', 'app1', 'main-db', 'queries', 'data');
    const c2 = mkConn('c-2', 'app2', 'main-db', 'writes', 'data');

    const model = mkModel([app1, app2, mainDb], [c1, c2]);
    const spofs = detectSinglePointsOfFailure(model);

    const dbSpof = spofs.find((s) => s.targetId === ('main-db' as unknown as ObjectId));
    expect(dbSpof).toBeDefined();
    expect(dbSpof?.categories).toContain('unreplicated_store');
    expect(dbSpof?.mitigation).toContain('Deploy multi-AZ primary/replica database replication');
  });

  // Test 5: Redundant architecture eliminates SPOFs
  it('does not flag SPOF when component declares active redundancy and HA', () => {
    const app1 = mkObj('app1', 'Service One');
    const app2 = mkObj('app2', 'Service Two');
    const haCluster = mkObj('ha-cluster', 'Clustered Redis', 'store', {
      ha: true,
      redundant: true,
      replicas: 3,
      multiAz: true,
    });

    const c1 = mkConn('c-1', 'app1', 'ha-cluster');
    const c2 = mkConn('c-2', 'app2', 'ha-cluster');

    const model = mkModel([app1, app2, haCluster], [c1, c2]);
    const spofs = detectSinglePointsOfFailure(model);

    expect(spofs.find((s) => s.targetId === ('ha-cluster' as unknown as ObjectId))).toBeUndefined();
  });

  // Test 6: Comprehensive structural risk analyzer
  it('runs analyzeStructuralRisks to produce complete metrics, health score, and recommendations', () => {
    // Topology with both a cycle and an unmitigated SPOF
    const n1 = mkObj('n1', 'Service Alpha');
    const n2 = mkObj('n2', 'Service Beta');
    const n3 = mkObj('n3', 'Shared Cache', 'store');

    // Cycle n1 -> n2 -> n1
    const c12 = mkConn('c12', 'n1', 'n2');
    const c21 = mkConn('c21', 'n2', 'n1');
    // Both connect to n3 (fan-in SPOF)
    const c13 = mkConn('c13', 'n1', 'n3');
    const c23 = mkConn('c23', 'n2', 'n3');

    const model = mkModel([n1, n2, n3], [c12, c21, c13, c23]);
    const report = analyzeStructuralRisks(model);

    expect(report.cycles).toHaveLength(1);
    expect(report.spofs.length).toBeGreaterThanOrEqual(1);
    expect(report.metrics.cycleCount).toBe(1);
    expect(report.metrics.maxFanIn).toBe(2);
    expect(report.metrics.structuralHealthScore).toBeLessThan(80);
    expect(report.metrics.overallRiskLevel).toBe('critical');
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations[0]).toContain('circular dependency');
  });
});
