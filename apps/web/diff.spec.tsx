import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  computeVisualArchitectureDiff,
  type ArchitectureDiffInput,
  type ModelObject,
  type ModelConnection,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
} from '@diagramhq/domain';
import { DiffLegend, VisualDiffViewer } from './components/canvas/visual-diff-viewer';

describe('Architecture Visual Diff Integration & UI (F058)', () => {
  const archId = 'arch-demo' as ArchitectureId;
  const v1Id = 'v1' as VersionId;
  const v2Id = 'v2' as VersionId;

  // Seeded changes
  const objUnchanged: ModelObject = {
    id: 'app-gateway' as ObjectId,
    architectureId: archId,
    versionId: v1Id,
    name: 'API Gateway',
    kind: 'application',
    position: { x: 50, y: 50 },
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const objMovedV1: ModelObject = {
    id: 'app-cache' as ObjectId,
    architectureId: archId,
    versionId: v1Id,
    name: 'Redis Cache',
    kind: 'store',
    position: { x: 100, y: 100 },
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const objMovedV2: ModelObject = {
    ...objMovedV1,
    versionId: v2Id,
    position: { x: 400, y: 500 }, // Moved!
  };

  const objModifiedV1: ModelObject = {
    id: 'app-auth' as ObjectId,
    architectureId: archId,
    versionId: v1Id,
    name: 'Simple Auth',
    kind: 'application',
    position: { x: 200, y: 200 },
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const objModifiedV2: ModelObject = {
    ...objModifiedV1,
    versionId: v2Id,
    name: 'Enterprise OAuth2 Auth', // Modified!
  };

  const objRemovedV1: ModelObject = {
    id: 'app-worker' as ObjectId,
    architectureId: archId,
    versionId: v1Id,
    name: 'Legacy Batch Worker',
    kind: 'application',
    position: { x: 300, y: 300 },
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const objAddedV2: ModelObject = {
    id: 'app-billing' as ObjectId,
    architectureId: archId,
    versionId: v2Id,
    name: 'Billing Microservice',
    kind: 'application',
    position: { x: 600, y: 600 },
    createdAt: new Date('2026-10-02T00:00:00Z'),
    updatedAt: new Date('2026-10-02T00:00:00Z'),
  };

  const conn1: ModelConnection = {
    id: 'con-1' as ConnectionId,
    architectureId: archId,
    versionId: v1Id,
    sourceObjectId: objUnchanged.id,
    targetObjectId: objMovedV1.id,
    label: 'TCP Cache',
    kind: 'sync',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const v1Input: ArchitectureDiffInput = {
    objects: [objUnchanged, objMovedV1, objModifiedV1, objRemovedV1],
    connections: [conn1],
  };

  const v2Input: ArchitectureDiffInput = {
    objects: [objUnchanged, objMovedV2, objModifiedV2, objAddedV2],
    connections: [conn1],
  };

  it('1. Acceptance Test: diff matches seeded changes with semantic colors', () => {
    const diffResult = computeVisualArchitectureDiff(v1Input, v2Input);

    expect(diffResult.counts.added).toBe(1);
    expect(diffResult.counts.modified).toBe(1);
    expect(diffResult.counts.removed).toBe(1);
    expect(diffResult.counts.moved).toBe(1);
    expect(diffResult.counts.unchanged).toBe(2); // objUnchanged + conn1

    // Added: green (#10b981)
    const added = diffResult.objects.find((o) => o.id === objAddedV2.id);
    expect(added?.changeType).toBe('added');
    expect(added?.color).toBe('#10b981');

    // Modified: amber (#f59e0b)
    const modified = diffResult.objects.find((o) => o.id === objModifiedV2.id);
    expect(modified?.changeType).toBe('modified');
    expect(modified?.color).toBe('#f59e0b');

    // Removed: rose (#f43f5e)
    const removed = diffResult.objects.find((o) => o.id === objRemovedV1.id);
    expect(removed?.changeType).toBe('removed');
    expect(removed?.color).toBe('#f43f5e');

    // Moved: purple (#8b5cf6)
    const moved = diffResult.objects.find((o) => o.id === objMovedV2.id);
    expect(moved?.changeType).toBe('moved');
    expect(moved?.color).toBe('#8b5cf6');
  });

  it('2. renders <DiffLegend /> with category badges and prefixed counts', () => {
    const diffResult = computeVisualArchitectureDiff(v1Input, v2Input);
    const html = renderToString(<DiffLegend diff={diffResult} />);

    expect(html).toContain('Diff Legend');
    expect(html).toContain('All (4)');
    expect(html).toContain('+1');
    expect(html).toContain('~1');
    expect(html).toContain('-1');
    expect(html).toContain('↕1');
  });

  it('3. renders <VisualDiffViewer /> with comparison headers and entity change details', () => {
    const diffResult = computeVisualArchitectureDiff(v1Input, v2Input);
    const onClose = vi.fn();

    const html = renderToString(
      <VisualDiffViewer
        diff={diffResult}
        sourceLabel="v1.0.0"
        targetLabel="v2.0.0"
        onClose={onClose}
      />
    );

    expect(html).toContain('Architecture Diff');
    expect(html).toContain('v1.0.0 → v2.0.0');
    expect(html).toContain('Billing Microservice');
    expect(html).toContain('Enterprise OAuth2 Auth');
    expect(html).toContain('Legacy Batch Worker');
    expect(html).toContain('Redis Cache');
    expect(html).toContain('Position: (100, 100) → (400, 500)');
    expect(html).toContain('name: Simple Auth → Enterprise OAuth2 Auth');
  });
});
