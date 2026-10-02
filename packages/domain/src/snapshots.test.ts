import { describe, it, expect } from 'vitest';
import type {
  ArchitectureId,
  ConnectionId,
  FlowId,
  ModelConnection,
  ModelObject,
  ObjectId,
  VersionId,
  View,
  ViewId,
} from './';
import type { ArchitectureFullState } from './snapshots';
import {
  captureFullArchitectureSnapshot,
  restoreFullArchitectureSnapshot,
  diffArchitectureStates,
} from './snapshots';
import type { FlowWithSteps } from './types';

describe('Architecture Snapshots Domain Engine (F056)', () => {
  const ARCH_ID = 'arch-demo' as ArchitectureId;
  const VER_ID = 'ver-v1' as VersionId;

  const createSampleState = (): ArchitectureFullState => {
    const obj1: ModelObject = {
      id: 'app-gateway' as ObjectId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      kind: 'application',
      name: 'API Gateway',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const obj2: ModelObject = {
      id: 'app-auth' as ObjectId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      kind: 'application',
      name: 'Auth Service',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const conn1: ModelConnection = {
      id: 'conn-1' as ConnectionId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      sourceObjectId: obj1.id,
      targetObjectId: obj2.id,
      kind: 'sync',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const view1: View = {
      id: 'view-c4-context' as ViewId,
      architectureId: ARCH_ID,
      name: 'Context Diagram',
      kind: 'context',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const flow1: FlowWithSteps = {
      id: 'flow-auth' as FlowId,
      architectureId: ARCH_ID,
      name: 'User Login Flow',
      type: 'user_journey',
      steps: [
        {
          id: 'step-1',
          flowId: 'flow-auth' as FlowId,
          connectionId: conn1.id,
          stepIndex: 1,
        },
      ],
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    return {
      objects: [obj1, obj2],
      connections: [conn1],
      views: [view1],
      flows: [flow1],
      metadata: {
        environment: 'production',
        complianceTier: 'SOC2-Type-II',
      },
      documentation: {
        overview: 'Master Production Core Architecture Overview',
        pages: [
          {
            id: 'doc-security',
            title: 'Security Architecture',
            slug: 'security-architecture',
            content: '# Zero-Trust mTLS between all microservices',
            author: 'Chief Architect',
            updatedAt: 1_700_900_000_000,
          },
        ],
      },
    };
  };

  it('1. captures all 6 architecture dimensions into an immutable snapshot', () => {
    const state = createSampleState();

    const snapshot = captureFullArchitectureSnapshot(ARCH_ID, state, {
      versionNumber: 'v1.4.0',
      label: 'Production Release 1.4',
      description: 'Golden master with complete security docs and flows',
      createdBy: 'user-architect-lead',
      now: 1_700_900_100_000,
    });

    expect(snapshot.id).toMatch(/^snp_/);
    expect(snapshot.versionNumber).toBe('v1.4.0');
    expect(snapshot.isImmutable).toBe(true);
    expect(snapshot.state.objects.length).toBe(2);
    expect(snapshot.state.connections.length).toBe(1);
    expect(snapshot.state.views.length).toBe(1);
    expect(snapshot.state.flows.length).toBe(1);
    expect(snapshot.state.metadata.complianceTier).toBe('SOC2-Type-II');
    expect(snapshot.state.documentation.pages[0]?.title).toBe('Security Architecture');
  });

  it('2. Acceptance Test: a snapshot restores to the captured state', () => {
    const initialState = createSampleState();

    // 1. Capture snapshot of initial state
    const snapshot = captureFullArchitectureSnapshot(ARCH_ID, initialState, {
      versionNumber: 'v1.0.0',
      label: 'Pre-Incident Baseline',
      createdBy: 'user-sre',
    });

    // 2. Perform extensive mutations on active working state
    const activeWorkingState = createSampleState();
    // Mutate object name
    activeWorkingState.objects[0]!.name = 'Corrupted Gateway';
    // Remove second object
    activeWorkingState.objects.pop();
    // Clear connections
    activeWorkingState.connections.length = 0;
    // Modify doc page
    activeWorkingState.documentation.pages[0]!.content = 'Tampered content';

    // 3. Restore the snapshot
    const restoredState = restoreFullArchitectureSnapshot(snapshot);

    // 4. Assert restored state exactly matches the original captured state in all 6 dimensions
    expect(restoredState.objects.length).toBe(2);
    expect(restoredState.objects[0]?.name).toBe('API Gateway');
    expect(restoredState.objects[1]?.name).toBe('Auth Service');

    expect(restoredState.connections.length).toBe(1);
    expect(restoredState.connections[0]?.id).toBe('conn-1');

    expect(restoredState.views.length).toBe(1);
    expect(restoredState.views[0]?.name).toBe('Context Diagram');

    expect(restoredState.flows.length).toBe(1);
    expect(restoredState.flows[0]?.name).toBe('User Login Flow');

    expect(restoredState.metadata.environment).toBe('production');
    expect(restoredState.documentation.pages[0]?.content).toBe(
      '# Zero-Trust mTLS between all microservices'
    );
  });

  it('3. snapshot state throws when direct mutation is attempted on frozen arrays', () => {
    const state = createSampleState();
    const snapshot = captureFullArchitectureSnapshot(ARCH_ID, state, {
      versionNumber: 'v1.0',
      label: 'Freeze check',
      createdBy: 'alice',
    });

    expect(() => {
      // @ts-expect-error - testing runtime freeze on snapshot objects
      snapshot.state.objects.push({ id: 'bad' });
    }).toThrow(TypeError);
  });

  it('4. diffs architecture states accurately across all dimensions', () => {
    const stateA = createSampleState();
    const stateB = createSampleState();

    // Modify state B
    stateB.objects[0]!.name = 'Modified Gateway';
    stateB.objects.push({
      id: 'app-redis' as ObjectId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      kind: 'store',
      name: 'Redis Cache',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const diff = diffArchitectureStates(stateA, stateB);

    expect(diff.objects.added).toBe(1); // Redis Cache added
    expect(diff.objects.modified).toBe(1); // Gateway modified
    expect(diff.objects.unchanged).toBe(1); // Auth unchanged
    expect(diff.objects.removed).toBe(0);

    expect(diff.connections.unchanged).toBe(1);
    expect(diff.views.unchanged).toBe(1);
    expect(diff.flows.unchanged).toBe(1);
    expect(diff.docPages.unchanged).toBe(1);
  });
});
