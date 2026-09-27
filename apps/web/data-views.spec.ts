import { describe, it, expect } from 'vitest';
import {
  createArchitectureModel,
  projectDataViewToCanvas,
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

describe('Data Views (F039)', () => {
  it('highlights classified data and flows', () => {
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
          dataClassification: 'restricted',
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
          dataClassification: 'confidential',
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
        metadata: {
          dataClassification: 'restricted',
        },
      }
    ];

    const model = createArchitectureModel(arch, ver, objects as ModelObject[], connections as ModelConnection[]);
    const { nodes, edges } = projectDataViewToCanvas(model.objects, model.connections);

    expect(nodes).toHaveLength(2);
    
    const dbNode = nodes.find((n) => n.id === sys1Id);
    expect(dbNode?.data.dataView).toBe(true);
    expect(dbNode?.data.dataClassification).toBe('restricted');
    
    const apiNode = nodes.find((n) => n.id === sys2Id);
    expect(apiNode?.data.dataView).toBe(true);
    expect(apiNode?.data.dataClassification).toBe('confidential');

    expect(edges).toHaveLength(1);
    expect(edges[0]?.animated).toBe(true);
    expect(edges[0]?.data?.dataClassification).toBe('restricted');
    expect(edges[0]?.data?.dataView).toBe(true);
  });
});
