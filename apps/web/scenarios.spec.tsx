import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createMainBranch,
  createScenario,
  applyHypotheticalChange,
  compareScenarioWithBase,
  type ScenarioComparison,
  type ModelObject,
  type ModelConnection,
  type WorkspaceId,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
} from '@diagramhq/domain';
import { ScenarioBadge, ScenarioComparisonModal } from './components/canvas/scenario-modal';

describe('Architecture Scenarios Integration & UI (F118)', () => {
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
    // 1. Establish base main branch
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [baseGateway, baseAuth],
      connections: [baseConn],
    });

    const initialMainObjectCount = mainBranch.state.objects.length;
    const initialMainConnectionCount = mainBranch.state.connections.length;
    const initialGatewayName = mainBranch.state.objects.find((o) => o.id === baseGateway.id)?.name;

    // 2. Create scenario
    let scenario = createScenario({
      name: 'Serverless Edge Architecture',
      hypothesis: 'Migrating edge proxy to Cloudflare Workers reduces infrastructure maintenance.',
      baseBranch: mainBranch,
      simulatedMetrics: {
        costDeltaPercent: -25,
        latencyDeltaMs: -40,
        riskScore: 'medium',
      },
    });

    // 3. Apply hypothetical changes inside scenario
    const serverlessWorker: ModelObject = {
      id: 'app-worker' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Cloudflare Worker Edge',
      kind: 'application',
      position: { x: 150, y: 150 },
      createdAt: new Date('2026-10-02'),
      updatedAt: new Date('2026-10-02'),
    };
    scenario = applyHypotheticalChange(scenario, {
      kind: 'add_object',
      object: serverlessWorker,
    });

    // Remove legacy gateway hypothetically
    scenario = applyHypotheticalChange(scenario, {
      kind: 'remove_object',
      objectId: baseGateway.id,
    });

    // Scenario has changed
    expect(scenario.hypotheticalState.objects).toHaveLength(2); // auth + worker
    expect(scenario.hypotheticalState.connections).toHaveLength(0); // connection pruned

    // 4. Invariant assertion: Main branch is completely unmodified
    expect(mainBranch.state.objects.length).toBe(initialMainObjectCount);
    expect(mainBranch.state.connections.length).toBe(initialMainConnectionCount);
    expect(mainBranch.state.objects.find((o) => o.id === baseGateway.id)?.name).toBe(initialGatewayName);
    expect(mainBranch.state.objects.some((o) => o.id === serverlessWorker.id)).toBe(false);

    // 5. Compare scenario with base
    const comparison = compareScenarioWithBase(scenario, mainBranch.state);
    expect(comparison.summary.addedObjectsCount).toBe(1);
    expect(comparison.summary.removedObjectsCount).toBe(1);
    expect(comparison.summary.removedConnectionsCount).toBe(1);
    expect(comparison.addedObjects[0]?.name).toBe('Cloudflare Worker Edge');
    expect(comparison.removedObjects[0]?.name).toBe('Edge API Gateway');

    // Confirm main remains untouched after comparison
    expect(mainBranch.state.objects.length).toBe(2);
  });

  it('2. renders <ScenarioBadge /> with name, status, and cost metrics', () => {
    const mainBranch = createMainBranch(wsId, archId, { objects: [baseGateway] });
    const scenario = createScenario({
      name: 'Multi-Region Replicas',
      hypothesis: 'Cross-region read replicas reduce APAC latency.',
      baseBranch: mainBranch,
      simulatedMetrics: {
        costDeltaPercent: 18,
        latencyDeltaMs: -85,
        riskScore: 'low',
      },
    });

    const onClick = vi.fn();
    const html = renderToString(<ScenarioBadge scenario={scenario} onClick={onClick} />);

    expect(html).toContain('Multi-Region Replicas');
    expect(html).toContain('draft');
    expect(html).toContain('+18% cost');
  });

  it('3. renders <ScenarioComparisonModal /> with hypothesis, stats, and impact cards', () => {
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [baseGateway, baseAuth],
      connections: [baseConn],
    });

    const scenario = createScenario({
      name: 'Event-Driven Decoupling',
      hypothesis: 'Introduce Kafka to decouple order ingestion from billing.',
      baseBranch: mainBranch,
      simulatedMetrics: {
        costDeltaPercent: -10,
        latencyDeltaMs: -15,
        riskScore: 'medium',
        notes: 'Provides high throughput resilience during traffic spikes.',
      },
    });

    const mockComparison: ScenarioComparison = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      hypothesis: scenario.hypothesis,
      summary: {
        addedObjectsCount: 1,
        modifiedObjectsCount: 1,
        removedObjectsCount: 0,
        addedConnectionsCount: 2,
        removedConnectionsCount: 1,
        unchangedObjectsCount: 1,
      },
      addedObjects: [
        {
          id: 'sto-kafka' as ObjectId,
          architectureId: archId,
          versionId: v1,
          name: 'Kafka Event Broker',
          kind: 'store',
          position: { x: 400, y: 200 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      modifiedObjects: [
        {
          base: baseGateway,
          hypothetical: { ...baseGateway, name: 'Async Ingestion Gateway' },
          changedFields: ['name'],
        },
      ],
      removedObjects: [],
      addedConnections: [],
      removedConnections: [baseConn],
      simulatedMetrics: scenario.simulatedMetrics,
    };

    const onClose = vi.fn();
    const onPromote = vi.fn();

    const html = renderToString(
      <ScenarioComparisonModal
        isOpen={true}
        onClose={onClose}
        scenario={scenario}
        comparison={mockComparison}
        onPromote={onPromote}
      />
    );

    expect(html).toContain('Hypothetical Scenario: Event-Driven Decoupling');
    expect(html).toContain('Introduce Kafka to decouple order ingestion');
    expect(html).toContain('+1');
    expect(html).toContain('~1');
    expect(html).toContain('-10%');
    expect(html).toContain('-15ms');
    expect(html).toContain('medium');
    expect(html).toContain('Promote to Branch');

    // Closed state renders empty
    const closedHtml = renderToString(
      <ScenarioComparisonModal
        isOpen={false}
        onClose={onClose}
        scenario={scenario}
        comparison={mockComparison}
      />
    );
    expect(closedHtml).toBe('');
  });
});
