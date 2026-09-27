import { describe, it, expect } from 'vitest';
import {
  createArchitectureModel,
  projectSecurityViewToCanvas,
  createId,
  type Architecture,
  type Version,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ObjectId, type ModelObject,
} from '@diagramhq/domain';

describe('Security Views (F038)', () => {
  it('renders boundaries + flags public endpoints', () => {
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

    const sysId = createId('sys') as ObjectId;
    const objects = [
      {
        id: sysId,
        architectureId: archId,
        versionId: verId,
        name: 'Public API System',
        kind: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          trustZone: 'DMZ',
          publicEndpoint: true,
          requiresAuth: true,
          encryption: 'TLS 1.3',
          hasSecrets: true,
          compliance: ['pci', 'soc2'],
        },
        position: { x: 100, y: 100 },
      },
    ];

    const model = createArchitectureModel(arch, ver, objects as ModelObject[], []);
    const { nodes } = projectSecurityViewToCanvas(model.objects, model.connections);

    expect(nodes).toHaveLength(2); // 1 group for DMZ, 1 system node
    
    const zoneNode = nodes.find((n) => n.id === 'zone-DMZ');
    expect(zoneNode).toBeDefined();
    expect(zoneNode?.type).toBe('group');
    
    const sysNode = nodes.find((n) => n.id === sysId);
    expect(sysNode?.parentId).toBe('zone-DMZ');
    expect(sysNode?.data.securityView).toBe(true);
    expect(sysNode?.data.publicEndpoint).toBe(true);
    expect(sysNode?.data.requiresAuth).toBe(true);
    expect(sysNode?.data.hasSecrets).toBe(true);
    expect(sysNode?.data.encryption).toBe('TLS 1.3');
    expect(sysNode?.data.compliance).toEqual(['pci', 'soc2']);

  });
});
