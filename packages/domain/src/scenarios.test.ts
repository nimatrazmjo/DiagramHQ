import { describe, it, expect } from 'vitest';
import {
  createScenario,
  applyHypotheticalChange,
  compareScenarioWithBase,
  promoteScenarioToBranch,
} from './scenarios';
import { createMainBranch } from './branches';
import type {
  WorkspaceId,
  ArchitectureId,
  VersionId,
  ObjectId,
  ConnectionId,
} from './ids';
import type { ModelObject, ModelConnection } from './types';

describe('Architecture Scenarios & Hypothetical Comparisons (F118)', () => {
  const wsId = 'ws-test' as WorkspaceId;
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  const baseGateway: ModelObject = {
    id: 'app-gateway' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Edge API Gateway',
    kind: 'application',
    position: { x: 100, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const baseAuth: ModelObject = {
    id: 'app-auth' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Authentication Service',
    kind: 'application',
    position: { x: 300, y: 300 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const baseConn: ModelConnection = {
    id: 'con-gw-auth' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: baseGateway.id,
    targetObjectId: baseAuth.id,
    label: 'Authorize',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  it('1. Acceptance Test: create a scenario, compare without mutating main', () => {
    // 1. Base main branch with 2 objects and 1 connection
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [baseGateway, baseAuth],
      connections: [baseConn],
    });

    // Capture frozen baseline counts & reference snapshots
    const originalMainObjectCount = mainBranch.state.objects.length;
    const originalMainConnCount = mainBranch.state.connections.length;
    const originalAuthName = mainBranch.state.objects.find((o) => o.id === baseAuth.id)?.name;

    // 2. Create hypothetical what-if scenario
    let scenario = createScenario({
      name: 'Scenario A: Cloud Migration & Distributed Cache',
      hypothesis: 'Introducing Redis cache cluster will reduce auth service load by 60% and improve edge latency.',
      baseBranch: mainBranch,
      simulatedMetrics: {
        costDeltaPercent: -12,
        latencyDeltaMs: -35,
        riskScore: 'low',
        notes: 'Reduces database read IOPS significantly',
      },
    });

    expect(scenario.id.startsWith('scn_')).toBe(true);
    expect(scenario.name).toBe('Scenario A: Cloud Migration & Distributed Cache');
    expect(scenario.status).toBe('draft');
    expect(scenario.hypotheticalState.objects).toHaveLength(2);

    // 3. Apply hypothetical modifications inside scenario
    // Add Redis cache
    const redisCache: ModelObject = {
      id: 'sto-redis' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Redis Session Cache',
      kind: 'store',
      position: { x: 500, y: 300 },
      createdAt: new Date('2026-10-02'),
      updatedAt: new Date('2026-10-02'),
    };
    scenario = applyHypotheticalChange(scenario, {
      kind: 'add_object',
      object: redisCache,
    });

    // Add connection from Gateway to Redis
    const cacheConn: ModelConnection = {
      id: 'con-gw-redis' as ConnectionId,
      architectureId: archId,
      versionId: v1,
      sourceObjectId: baseGateway.id,
      targetObjectId: redisCache.id,
      label: 'Session Lookup',
      kind: 'sync',
      createdAt: new Date('2026-10-02'),
      updatedAt: new Date('2026-10-02'),
    };
    scenario = applyHypotheticalChange(scenario, {
      kind: 'add_connection',
      connection: cacheConn,
    });

    // Modify Gateway description hypothetically
    scenario = applyHypotheticalChange(scenario, {
      kind: 'modify_object',
      object: {
        ...baseGateway,
        name: 'Distributed Edge Gateway',
        description: 'Enhanced gateway with L1 caching enabled',
      },
    });

    // Scenario has 3 objects and 2 connections
    expect(scenario.hypotheticalState.objects).toHaveLength(3);
    expect(scenario.hypotheticalState.connections).toHaveLength(2);

    // 4. CRITICAL CHECK: Main branch is completely untouched (not mutated)
    expect(mainBranch.state.objects.length).toBe(originalMainObjectCount);
    expect(mainBranch.state.connections.length).toBe(originalMainConnCount);
    expect(mainBranch.state.objects.find((o) => o.id === baseAuth.id)?.name).toBe(originalAuthName);
    expect(mainBranch.state.objects.find((o) => o.id === baseGateway.id)?.name).toBe('Edge API Gateway');
    expect(mainBranch.state.objects.some((o) => o.id === redisCache.id)).toBe(false);

    // 5. Compare hypothetical scenario with main base state
    const comparison = compareScenarioWithBase(scenario, mainBranch.state);

    expect(comparison.scenarioId).toBe(scenario.id);
    expect(comparison.summary.addedObjectsCount).toBe(1);
    expect(comparison.summary.modifiedObjectsCount).toBe(1);
    expect(comparison.summary.removedObjectsCount).toBe(0);
    expect(comparison.summary.addedConnectionsCount).toBe(1);
    expect(comparison.summary.removedConnectionsCount).toBe(0);
    expect(comparison.summary.unchangedObjectsCount).toBe(1);

    expect(comparison.addedObjects[0]?.name).toBe('Redis Session Cache');
    expect(comparison.modifiedObjects[0]?.hypothetical.name).toBe('Distributed Edge Gateway');
    expect(comparison.simulatedMetrics?.costDeltaPercent).toBe(-12);
    expect(comparison.simulatedMetrics?.latencyDeltaMs).toBe(-35);

    // Verify main still has not mutated after comparison
    expect(mainBranch.state.objects.length).toBe(2);
  });

  it('2. supports removing objects hypothetically and pruning cascading connections', () => {
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [baseGateway, baseAuth],
      connections: [baseConn],
    });

    let scenario = createScenario({
      name: 'Decommission Auth Service',
      hypothesis: 'Replace bespoke auth service with third-party SaaS.',
      baseBranch: mainBranch,
    });

    scenario = applyHypotheticalChange(scenario, {
      kind: 'remove_object',
      objectId: baseAuth.id,
    });

    expect(scenario.hypotheticalState.objects).toHaveLength(1);
    expect(scenario.hypotheticalState.connections).toHaveLength(0); // cascaded dangling removal

    const comparison = compareScenarioWithBase(scenario, mainBranch.state);
    expect(comparison.summary.removedObjectsCount).toBe(1);
    expect(comparison.summary.removedConnectionsCount).toBe(1);
    expect(comparison.removedObjects[0]?.name).toBe('Authentication Service');

    // Main branch remains untouched
    expect(mainBranch.state.objects).toHaveLength(2);
    expect(mainBranch.state.connections).toHaveLength(1);
  });

  it('3. promotes proven scenario to full ArchitectureBranch', () => {
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [baseGateway],
    });

    const scenario = createScenario({
      name: 'Migrate to GraphQL Gateway',
      hypothesis: 'GraphQL federation simplifies multi-tenant query orchestration.',
      baseBranch: mainBranch,
    });

    const { branch, promotedScenario } = promoteScenarioToBranch(
      scenario,
      mainBranch,
      'feat/graphql-federation'
    );

    expect(promotedScenario.status).toBe('promoted');
    expect(branch.name).toBe('feat/graphql-federation');
    expect(branch.parentBranchId).toBe(mainBranch.id);
  });
});
