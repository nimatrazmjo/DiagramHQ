import { describe, expect, it } from 'vitest';
import { type ObjectId, type ConnectionId, type ArchitectureId, type VersionId, type WorkspaceId } from './ids';
import type { ArchitectureModel } from './types';
import {
  detectDependencyCycles,
  findDependencyPaths,
  analyzeArchitectureDependencies,
} from './dependency-graph';

describe('Architecture Dependency Analysis Engine (F087)', () => {
  const architectureId = 'arch-dep-test' as ArchitectureId;
  const versionId = 'ver-dep-v1' as VersionId;
  const workspaceId = 'ws-test' as WorkspaceId;

  const createBaseModel = (): ArchitectureModel => ({
    architecture: {
      id: architectureId,
      workspaceId,
      name: 'Dependency Test Architecture',
      defaultVersionId: versionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: versionId,
      architectureId,
      name: 'v1.0.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [],
    connections: [],
  });

  // ==========================================================================
  // Acceptance Test 1: Cyclic dependency detected
  // ==========================================================================
  it('detects cyclic dependencies across services (A -> B -> C -> A)', () => {
    const model = createBaseModel();

    const nodeA = 'obj_svc_a' as unknown as ObjectId;
    const nodeB = 'obj_svc_b' as unknown as ObjectId;
    const nodeC = 'obj_svc_c' as unknown as ObjectId;

    model.objects = [
      {
        id: nodeA,
        architectureId,
        versionId,
        parentId: null,
        name: 'Service A',
        kind: 'application',
        description: 'First microservice',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: nodeB,
        architectureId,
        versionId,
        parentId: null,
        name: 'Service B',
        kind: 'application',
        description: 'Second microservice',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: nodeC,
        architectureId,
        versionId,
        parentId: null,
        name: 'Service C',
        kind: 'application',
        description: 'Third microservice',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    model.connections = [
      // A -> B
      {
        id: 'conn_a_b' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: nodeA,
        targetObjectId: nodeB,
        label: 'Calls B',
        kind: 'sync',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // B -> C
      {
        id: 'conn_b_c' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: nodeB,
        targetObjectId: nodeC,
        label: 'Calls C',
        kind: 'sync',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // C -> A (Creates cycle!)
      {
        id: 'conn_c_a' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: nodeC,
        targetObjectId: nodeA,
        label: 'Calls A',
        kind: 'sync',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const cycles = detectDependencyCycles(model.objects, model.connections);

    expect(cycles.length).toBeGreaterThanOrEqual(1);
    const cycle = cycles[0];
    expect(cycle.length).toBe(3);
    expect(cycle.nodeNames).toContain('Service A');
    expect(cycle.nodeNames).toContain('Service B');
    expect(cycle.nodeNames).toContain('Service C');
    expect(cycle.pathDescription).toContain('Service A');
  });

  // ==========================================================================
  // Acceptance Test 2: Indirect path found
  // ==========================================================================
  it('discovers indirect and transitive dependency paths (A -> B -> C -> D)', () => {
    const model = createBaseModel();

    const nodeA = 'obj_frontend' as unknown as ObjectId;
    const nodeB = 'obj_gateway' as unknown as ObjectId;
    const nodeC = 'obj_order_svc' as unknown as ObjectId;
    const nodeD = 'obj_orders_db' as unknown as ObjectId;

    model.objects = [
      {
        id: nodeA,
        architectureId,
        versionId,
        parentId: null,
        name: 'Web Frontend',
        kind: 'application',
        description: 'Next.js App',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: nodeB,
        architectureId,
        versionId,
        parentId: null,
        name: 'API Gateway',
        kind: 'application',
        description: 'Kong Gateway',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: nodeC,
        architectureId,
        versionId,
        parentId: null,
        name: 'Orders Service',
        kind: 'application',
        description: 'Go Microservice',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: nodeD,
        architectureId,
        versionId,
        parentId: null,
        name: 'Orders Database',
        kind: 'store',
        description: 'PostgreSQL Datastore',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    model.connections = [
      // A -> B
      {
        id: 'conn_1' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: nodeA,
        targetObjectId: nodeB,
        label: 'HTTP',
        kind: 'sync',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // B -> C
      {
        id: 'conn_2' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: nodeB,
        targetObjectId: nodeC,
        label: 'gRPC',
        kind: 'sync',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // C -> D
      {
        id: 'conn_3' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: nodeC,
        targetObjectId: nodeD,
        label: 'SQL',
        kind: 'data',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Find paths from Web Frontend (A) to Orders Database (D)
    const paths = findDependencyPaths(model, nodeA, nodeD);

    expect(paths.length).toBe(1);
    const path = paths[0];
    expect(path.isIndirect).toBe(true);
    expect(path.hopCount).toBe(3);
    expect(path.nodeNames).toEqual(['Web Frontend', 'API Gateway', 'Orders Service', 'Orders Database']);
    expect(path.edges.length).toBe(3);
  });

  // ==========================================================================
  // Test 3: Filters: direct/indirect/runtime/compile-time/data/external
  // ==========================================================================
  it('filters graph by direct, indirect, runtime, compile-time, data, and external categories', () => {
    const model = createBaseModel();

    const actor = 'obj_actor' as unknown as ObjectId;
    const app = 'obj_app' as unknown as ObjectId;
    const lib = 'obj_lib' as unknown as ObjectId;
    const db = 'obj_db' as unknown as ObjectId;

    model.objects = [
      {
        id: actor,
        architectureId,
        versionId,
        parentId: null,
        name: 'Shopper',
        kind: 'actor',
        description: 'External Customer',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: app,
        architectureId,
        versionId,
        parentId: null,
        name: 'Backend API',
        kind: 'application',
        description: 'Server application',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: lib,
        architectureId,
        versionId,
        parentId: null,
        name: 'Shared Types SDK',
        kind: 'component',
        description: 'TypeScript compile-time package',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: db,
        architectureId,
        versionId,
        parentId: null,
        name: 'PostgreSQL Datastore',
        kind: 'store',
        description: 'Relational DB',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    model.connections = [
      // 1. External dependency: Shopper -> Backend API
      {
        id: 'conn_ext' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: actor,
        targetObjectId: app,
        label: 'Visits',
        kind: 'sync',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 2. Compile-time dependency: Backend API -> Shared Types SDK
      {
        id: 'conn_compile' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: app,
        targetObjectId: lib,
        label: 'Imports',
        kind: 'dependency',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 3. Data dependency: Backend API -> PostgreSQL Datastore
      {
        id: 'conn_data' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: app,
        targetObjectId: db,
        label: 'Reads/Writes',
        kind: 'data',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Filter by type: direct
    const directReport = analyzeArchitectureDependencies(model, { type: 'direct' });
    expect(directReport.edges.every((e) => e.type === 'direct')).toBe(true);
    expect(directReport.metrics.directDependencyCount).toBe(3);

    // Filter by category: external
    const extReport = analyzeArchitectureDependencies(model, { category: 'external' });
    expect(extReport.edges.every((e) => e.category === 'external')).toBe(true);
    expect(extReport.edges.length).toBeGreaterThanOrEqual(1);
    expect(extReport.edges[0].sourceName).toBe('Shopper');

    // Filter by category: compile-time
    const compileReport = analyzeArchitectureDependencies(model, { category: 'compile-time' });
    expect(compileReport.edges.every((e) => e.category === 'compile-time')).toBe(true);
    expect(compileReport.edges.length).toBe(1);
    expect(compileReport.edges[0].targetName).toBe('Shared Types SDK');

    // Filter by category: data
    const dataReport = analyzeArchitectureDependencies(model, { category: 'data' });
    expect(dataReport.edges.every((e) => e.category === 'data')).toBe(true);
    expect(dataReport.edges.length).toBe(1);
    expect(dataReport.edges[0].targetName).toBe('PostgreSQL Datastore');

    // Filter by indirect dependencies
    const indirectReport = analyzeArchitectureDependencies(model, { type: 'indirect' });
    expect(indirectReport.edges.every((e) => e.type === 'indirect')).toBe(true);
    // Shopper -> Backend API -> Datastore and Shopper -> Backend API -> SDK are indirect reachabilities!
    expect(indirectReport.metrics.indirectDependencyCount).toBeGreaterThanOrEqual(1);
  });
});
