import { describe, it, expect } from 'vitest';
import {
  createArchitectureModel,
  projectOwnershipViewToCanvas,
  createId,
  type Architecture,
  type Version,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ObjectId,
  type ModelObject,
  type ModelConnection,
  type ConnectionId,
} from '@diagramhq/domain';

describe('Ownership Views (F040)', () => {
  it('colors objects by team/owner correctly', () => {
    const archId = createId('arch') as ArchitectureId;
    const wsId = createId('ws') as WorkspaceId;
    const verId = createId('ver') as VersionId;
    
    const arch: Architecture = {
      id: archId,
      workspaceId: wsId,
      name: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ver: Version = {
      id: verId,
      architectureId: archId,
      name: 'main',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    };

    const sys1Id = createId('sys') as ObjectId;
    const sys2Id = createId('sys') as ObjectId;
    
    const objects = [
      {
        id: sys1Id,
        architectureId: archId,
        versionId: verId,
        name: 'Database',
        kind: 'store',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          team: 'platform',
          owner: 'alice@example.com',
        },
        position: { x: 100, y: 100 },
      },
      {
        id: sys2Id,
        architectureId: archId,
        versionId: verId,
        name: 'Backend API',
        kind: 'application',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          team: 'product',
          owner: 'bob@example.com',
        },
        position: { x: 300, y: 100 },
      },
    ];

    const connections = [
      {
        id: createId('con') as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: sys2Id,
        targetObjectId: sys1Id,
        kind: 'data',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    const model = createArchitectureModel(arch, ver, objects as ModelObject[], connections as ModelConnection[]);
    const { nodes, edges } = projectOwnershipViewToCanvas(model.objects, model.connections);

    expect(nodes).toHaveLength(2);
    
    const dbNode = nodes.find((n) => n.id === sys1Id);
    expect(dbNode?.data.ownershipView).toBe(true);
    expect(dbNode?.data.team).toBe('platform');
    expect(dbNode?.data.owner).toBe('alice@example.com');
    
    const apiNode = nodes.find((n) => n.id === sys2Id);
    expect(apiNode?.data.ownershipView).toBe(true);
    expect(apiNode?.data.team).toBe('product');
    expect(apiNode?.data.owner).toBe('bob@example.com');

    expect(edges).toHaveLength(1);
    expect(edges[0]?.data?.ownershipView).toBe(true);
  });
});
