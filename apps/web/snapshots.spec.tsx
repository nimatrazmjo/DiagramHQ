/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  captureFullArchitectureSnapshot,
  restoreFullArchitectureSnapshot,
  diffArchitectureStates,
} from '@diagramhq/domain';
import type {
  ArchitectureFullState,
  ArchitectureId,
  ConnectionId,
  FlowId,
  ModelConnection,
  ModelObject,
  ObjectId,
  VersionId,
  View,
  ViewId,
} from '@diagramhq/domain';
import {
  SnapshotDetailsModal,
  SnapshotDiffModal,
} from './components/canvas';

describe('Architecture Snapshots Integration & UI (F056)', () => {
  const ARCH_ID = 'arch-payments-core' as ArchitectureId;
  const VER_ID = 'ver-v1' as VersionId;

  const buildInitialState = (): ArchitectureFullState => {
    const gateway: ModelObject = {
      id: 'app-gateway' as ObjectId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      kind: 'application',
      name: 'API Gateway',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const auth: ModelObject = {
      id: 'app-auth' as ObjectId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      kind: 'application',
      name: 'Auth Service',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const conn: ModelConnection = {
      id: 'conn-gw-auth' as ConnectionId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      sourceObjectId: gateway.id,
      targetObjectId: auth.id,
      kind: 'sync',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const view: View = {
      id: 'vw-containers' as ViewId,
      architectureId: ARCH_ID,
      name: 'Container Diagram L2',
      kind: 'container',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    return {
      objects: [gateway, auth],
      connections: [conn],
      views: [view],
      flows: [
        {
          id: 'flw-login' as FlowId,
          architectureId: ARCH_ID,
          name: 'Authentication Flow',
          type: 'api_flow',
          steps: [
            {
              id: 'step-1',
              flowId: 'flw-login' as FlowId,
              connectionId: conn.id,
              stepIndex: 1,
            },
          ],
          createdAt: new Date('2026-10-01T00:00:00Z'),
          updatedAt: new Date('2026-10-01T00:00:00Z'),
        },
      ],
      metadata: {
        environment: 'production',
        sla: '99.99%',
      },
      documentation: {
        overview: 'Full architecture overview and disaster recovery runbook',
        pages: [
          {
            id: 'page-dr',
            title: 'Disaster Recovery Runbook',
            slug: 'disaster-recovery',
            content: '# Disaster Recovery: Restore from snapshot within 5 minutes',
            author: 'SRE Team',
            updatedAt: 1_700_900_000_000,
          },
        ],
      },
    };
  };

  it('1. Acceptance Test: a snapshot restores to the captured state', () => {
    // 1. Capture snapshot of initial state across all 6 dimensions
    const initial = buildInitialState();
    const snapshot = captureFullArchitectureSnapshot(ARCH_ID, initial, {
      versionNumber: 'v1.4.0',
      label: 'Production Baseline v1.4.0',
      description: 'Golden release with complete documentation and flows',
      createdBy: 'chief-architect',
      now: 1_700_950_000_000,
    });

    expect(snapshot.id).toMatch(/^snp_/);
    expect(snapshot.versionNumber).toBe('v1.4.0');
    expect(snapshot.isImmutable).toBe(true);

    // 2. Introduce destructive changes in active working state
    const modifiedState = buildInitialState();
    modifiedState.objects[0]!.name = 'Corrupted Service';
    modifiedState.objects.pop(); // delete Auth Service
    modifiedState.connections = []; // delete all connections
    modifiedState.flows = []; // delete flows
    modifiedState.documentation.pages[0]!.content = 'Tampered runbook';

    // Verify modified state differs from baseline
    expect(modifiedState.objects.length).toBe(1);
    expect(modifiedState.connections.length).toBe(0);

    // 3. Restore from snapshot
    const restored = restoreFullArchitectureSnapshot(snapshot);

    // 4. Assert restored state matches initial captured state in all 6 dimensions
    expect(restored.objects.length).toBe(2);
    expect(restored.objects[0]?.name).toBe('API Gateway');
    expect(restored.objects[1]?.name).toBe('Auth Service');

    expect(restored.connections.length).toBe(1);
    expect(restored.connections[0]?.id).toBe('conn-gw-auth');

    expect(restored.views.length).toBe(1);
    expect(restored.views[0]?.name).toBe('Container Diagram L2');

    expect(restored.flows.length).toBe(1);
    expect(restored.flows[0]?.name).toBe('Authentication Flow');

    expect(restored.metadata.environment).toBe('production');
    expect(restored.metadata.sla).toBe('99.99%');

    expect(restored.documentation.pages.length).toBe(1);
    expect(restored.documentation.pages[0]?.title).toBe('Disaster Recovery Runbook');
    expect(restored.documentation.pages[0]?.content).toContain('Restore from snapshot within 5 minutes');
  });

  it('2. renders <SnapshotDetailsModal /> with 6-dimension metrics and restore button', () => {
    const initial = buildInitialState();
    const snapshot = captureFullArchitectureSnapshot(ARCH_ID, initial, {
      versionNumber: 'v1.4.0',
      label: 'Production Core Baseline',
      createdBy: 'user-sre',
    });

    const html = renderToString(
      <SnapshotDetailsModal
        isOpen={true}
        snapshot={snapshot}
        onClose={() => {}}
        onRestore={() => {}}
      />
    );

    expect(html).toContain('data-testid="snapshot-details-modal"');
    expect(html).toContain('v1.4.0 · Production Core Baseline');
    expect(html).toContain('data-testid="metric-objects"');
    expect(html).toContain('data-testid="metric-connections"');
    expect(html).toContain('data-testid="metric-views"');
    expect(html).toContain('data-testid="metric-flows"');
    expect(html).toContain('data-testid="metric-docs"');
    expect(html).toContain('data-testid="metric-metadata"');
    expect(html).toContain('data-testid="snapshot-modal-restore-btn"');
    expect(html).toContain('Restore This Snapshot');
  });

  it('3. renders <SnapshotDiffModal /> showing entity diff counts', () => {
    const stateA = buildInitialState();
    const stateB = buildInitialState();
    stateB.objects.push({
      id: 'app-billing' as ObjectId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      kind: 'application',
      name: 'Billing Service',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const diff = diffArchitectureStates(stateA, stateB);

    const html = renderToString(
      <SnapshotDiffModal
        isOpen={true}
        diff={diff}
        onClose={() => {}}
      />
    );

    expect(html).toContain('data-testid="snapshot-diff-modal"');
    expect(html).toContain('Snapshot Comparison Diff');
    expect(html).toContain('+1'); // 1 object added
  });
});
