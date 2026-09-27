import { describe, it, expect } from 'vitest';
import {
  createArchitectureModel,
  projectPersonaViewToCanvas,
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
  type PersonaMode,
} from '@diagramhq/domain';

describe('Persona Modes (F115)', () => {
  const archId = createId('arch') as ArchitectureId;
  const wsId = createId('ws') as WorkspaceId;
  const verId = createId('ver') as VersionId;

  const arch: Architecture = {
    id: archId,
    workspaceId: wsId,
    name: 'Test Architecture',
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

  const objects: ModelObject[] = [
    {
      id: sys1Id,
      architectureId: archId,
      versionId: verId,
      name: 'Payment Service',
      kind: 'application',
      createdAt: new Date(),
      updatedAt: new Date(),
      position: { x: 100, y: 100 },
    },
    {
      id: sys2Id,
      architectureId: archId,
      versionId: verId,
      name: 'Postgres DB',
      kind: 'store',
      createdAt: new Date(),
      updatedAt: new Date(),
      position: { x: 300, y: 100 },
    },
  ];

  const connections: ModelConnection[] = [
    {
      id: createId('con') as ConnectionId,
      architectureId: archId,
      versionId: verId,
      sourceObjectId: sys1Id,
      targetObjectId: sys2Id,
      kind: 'data',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const PERSONA_MODES: PersonaMode[] = [
    'architect',
    'developer',
    'security',
    'sre',
    'data',
    'product',
    'executive',
    'auditor',
  ];

  it('switching persona re-scopes the render: all 8 personas produce personaView=true on nodes', () => {
    const model = createArchitectureModel(arch, ver, objects, connections);

    for (const mode of PERSONA_MODES) {
      const { nodes, edges } = projectPersonaViewToCanvas(
        model.objects,
        model.connections,
        undefined,
        mode
      );

      expect(nodes).toHaveLength(2);
      expect(edges).toHaveLength(1);

      for (const node of nodes) {
        expect(node.data.personaView).toBe(true);
        expect(node.data.personaMode).toBe(mode);
      }

      for (const edge of edges) {
        expect(edge.data?.personaView).toBe(true);
        expect(edge.data?.personaMode).toBe(mode);
      }
    }
  });

  it('a persona re-scopes the render without changing the model', () => {
    const model = createArchitectureModel(arch, ver, objects, connections);

    const { nodes: secNodes } = projectPersonaViewToCanvas(
      model.objects,
      model.connections,
      undefined,
      'security'
    );
    const { nodes: devNodes } = projectPersonaViewToCanvas(
      model.objects,
      model.connections,
      undefined,
      'developer'
    );

    // Same number of nodes for any persona (model unchanged)
    expect(secNodes).toHaveLength(model.objects.length);
    expect(devNodes).toHaveLength(model.objects.length);

    // Persona mode differs between projections
    expect(secNodes[0]?.data.personaMode).toBe('security');
    expect(devNodes[0]?.data.personaMode).toBe('developer');

    // Underlying model objects are not mutated
    expect(model.objects).toHaveLength(2);
    expect(model.connections).toHaveLength(1);
    // personaMode is never set on the raw model objects
    expect(Object.prototype.hasOwnProperty.call(model.objects[0], 'personaMode')).toBe(false);
  });

  it('default persona is architect when no mode is specified', () => {
    const model = createArchitectureModel(arch, ver, objects, connections);

    const { nodes } = projectPersonaViewToCanvas(model.objects, model.connections);

    expect(nodes[0]?.data.personaMode).toBe('architect');
    expect(nodes[0]?.data.personaView).toBe(true);
  });
});
