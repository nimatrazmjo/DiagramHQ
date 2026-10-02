import { describe, it, expect } from 'vitest';
import {
  computeVisualArchitectureDiff,
  DEFAULT_DIFF_COLORS,
  type ArchitectureDiffInput,
} from './diff';
import type {
  ArchitectureId,
  ConnectionId,
  ObjectId,
  VersionId,
} from './ids';
import type { ModelObject, ModelConnection } from './types';

describe('Architecture Visual Diff Engine (F058)', () => {
  const archId = 'arch-diff-test' as ArchitectureId;
  const ver1Id = 'ver-v1' as VersionId;
  const ver2Id = 'ver-v2' as VersionId;

  it('1. Acceptance Test: diff matches seeded changes (added, modified, removed, moved with colors)', () => {
    // Seeded objects for v1
    const objUnchangedV1: ModelObject = {
      id: 'app-unchanged' as ObjectId,
      architectureId: archId,
      versionId: ver1Id,
      name: 'Unchanged Core API',
      kind: 'application',
      position: { x: 50, y: 50 },
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const objMovedV1: ModelObject = {
      id: 'app-moved' as ObjectId,
      architectureId: archId,
      versionId: ver1Id,
      name: 'Redis Cache',
      kind: 'store',
      position: { x: 100, y: 100 },
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const objModifiedV1: ModelObject = {
      id: 'app-modified' as ObjectId,
      architectureId: archId,
      versionId: ver1Id,
      name: 'Legacy Auth Service',
      kind: 'application',
      position: { x: 200, y: 200 },
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const objRemovedV1: ModelObject = {
      id: 'app-removed' as ObjectId,
      architectureId: archId,
      versionId: ver1Id,
      name: 'Deprecated Monolith Worker',
      kind: 'application',
      position: { x: 300, y: 300 },
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    // Connections for v1
    const connModV1: ModelConnection = {
      id: 'con-mod' as ConnectionId,
      architectureId: archId,
      versionId: ver1Id,
      sourceObjectId: objUnchangedV1.id,
      targetObjectId: objModifiedV1.id,
      label: 'HTTP/1.1 REST',
      kind: 'sync',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const connRemovedV1: ModelConnection = {
      id: 'con-removed' as ConnectionId,
      architectureId: archId,
      versionId: ver1Id,
      sourceObjectId: objModifiedV1.id,
      targetObjectId: objRemovedV1.id,
      label: 'Raw TCP',
      kind: 'sync',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    // Seeded objects for v2
    const objUnchangedV2: ModelObject = {
      ...objUnchangedV1,
      versionId: ver2Id,
    };

    const objMovedV2: ModelObject = {
      ...objMovedV1,
      versionId: ver2Id,
      position: { x: 450, y: 600 }, // ONLY position changed -> moved
    };

    const objModifiedV2: ModelObject = {
      ...objModifiedV1,
      versionId: ver2Id,
      name: 'Modern OAuth2 / OIDC Service', // attribute changed -> modified
    };

    const objAddedV2: ModelObject = {
      id: 'app-added' as ObjectId,
      architectureId: archId,
      versionId: ver2Id,
      name: 'Kafka Event Bus',
      kind: 'store',
      position: { x: 600, y: 250 },
      createdAt: new Date('2026-10-02T00:00:00Z'),
      updatedAt: new Date('2026-10-02T00:00:00Z'),
    };

    // Connections for v2
    const connModV2: ModelConnection = {
      ...connModV1,
      versionId: ver2Id,
      label: 'gRPC / HTTP/2', // label changed -> modified
    };

    const connAddedV2: ModelConnection = {
      id: 'con-added' as ConnectionId,
      architectureId: archId,
      versionId: ver2Id,
      sourceObjectId: objModifiedV2.id,
      targetObjectId: objAddedV2.id,
      label: 'Produce Events',
      kind: 'async',
      createdAt: new Date('2026-10-02T00:00:00Z'),
      updatedAt: new Date('2026-10-02T00:00:00Z'),
    };

    const v1Input: ArchitectureDiffInput = {
      objects: [objUnchangedV1, objMovedV1, objModifiedV1, objRemovedV1],
      connections: [connModV1, connRemovedV1],
    };

    const v2Input: ArchitectureDiffInput = {
      objects: [objUnchangedV2, objMovedV2, objModifiedV2, objAddedV2],
      connections: [connModV2, connAddedV2],
    };

    const result = computeVisualArchitectureDiff(v1Input, v2Input);

    // 1. Verify counts
    expect(result.counts.added).toBe(2);      // objAddedV2 + connAddedV2
    expect(result.counts.removed).toBe(2);    // objRemovedV1 + connRemovedV1
    expect(result.counts.moved).toBe(1);      // objMovedV2
    expect(result.counts.modified).toBe(2);   // objModifiedV2 + connModV2
    expect(result.counts.unchanged).toBe(1);  // objUnchangedV2
    expect(result.counts.totalChanges).toBe(7);

    // 2. Verify individual items and colors
    const addedObj = result.objects.find((o) => o.id === objAddedV2.id);
    expect(addedObj?.changeType).toBe('added');
    expect(addedObj?.color).toBe(DEFAULT_DIFF_COLORS.added);

    const movedObj = result.objects.find((o) => o.id === objMovedV2.id);
    expect(movedObj?.changeType).toBe('moved');
    expect(movedObj?.color).toBe(DEFAULT_DIFF_COLORS.moved);
    expect(movedObj?.previousPosition).toEqual({ x: 100, y: 100 });
    expect(movedObj?.currentPosition).toEqual({ x: 450, y: 600 });

    const modifiedObj = result.objects.find((o) => o.id === objModifiedV2.id);
    expect(modifiedObj?.changeType).toBe('modified');
    expect(modifiedObj?.color).toBe(DEFAULT_DIFF_COLORS.modified);
    expect(modifiedObj?.previousName).toBe('Legacy Auth Service');
    expect(modifiedObj?.currentName).toBe('Modern OAuth2 / OIDC Service');

    const removedObj = result.objects.find((o) => o.id === objRemovedV1.id);
    expect(removedObj?.changeType).toBe('removed');
    expect(removedObj?.color).toBe(DEFAULT_DIFF_COLORS.removed);

    const unchangedObj = result.objects.find((o) => o.id === objUnchangedV2.id);
    expect(unchangedObj?.changeType).toBe('unchanged');
    expect(unchangedObj?.color).toBe(DEFAULT_DIFF_COLORS.unchanged);

    // 3. Verify connections
    const addedConn = result.connections.find((c) => c.id === connAddedV2.id);
    expect(addedConn?.changeType).toBe('added');
    expect(addedConn?.color).toBe(DEFAULT_DIFF_COLORS.added);

    const modConn = result.connections.find((c) => c.id === connModV2.id);
    expect(modConn?.changeType).toBe('modified');
    expect(modConn?.color).toBe(DEFAULT_DIFF_COLORS.modified);

    const remConn = result.connections.find((c) => c.id === connRemovedV1.id);
    expect(remConn?.changeType).toBe('removed');
    expect(remConn?.color).toBe(DEFAULT_DIFF_COLORS.removed);
  });

  it('2. supports custom diff color themes', () => {
    const customColors = {
      added: '#00ff00',
      modified: '#ffff00',
      removed: '#ff0000',
      moved: '#00ffff',
    };

    const obj1: ModelObject = {
      id: 'app-1' as ObjectId,
      architectureId: archId,
      versionId: ver1Id,
      name: 'App',
      kind: 'application',
      position: { x: 0, y: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const obj2: ModelObject = {
      ...obj1,
      position: { x: 50, y: 50 },
    };

    const diff = computeVisualArchitectureDiff(
      { objects: [obj1], connections: [] },
      { objects: [obj2], connections: [] },
      customColors
    );

    expect(diff.objects[0].changeType).toBe('moved');
    expect(diff.objects[0].color).toBe('#00ffff');
  });

  it('3. handles identical empty architectures', () => {
    const diff = computeVisualArchitectureDiff(
      { objects: [], connections: [] },
      { objects: [], connections: [] }
    );

    expect(diff.counts.totalChanges).toBe(0);
    expect(diff.counts.added).toBe(0);
    expect(diff.counts.modified).toBe(0);
    expect(diff.counts.removed).toBe(0);
    expect(diff.counts.moved).toBe(0);
  });
});
