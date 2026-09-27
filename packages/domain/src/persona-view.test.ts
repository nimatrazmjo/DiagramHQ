import { describe, it, expect } from 'vitest';
import { projectPersonaViewToCanvas } from './persona-view';
import type { ModelObject } from './types';

describe('Persona View Projection', () => {
  it('adds persona properties to nodes and edges', () => {
    const objects: ModelObject[] = [
      {
        id: 'sys-1',
        architectureId: 'arch-1',
        versionId: 'v-1',
        name: 'System 1',
        kind: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = projectPersonaViewToCanvas(objects, [], [], 'security');

    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].data.personaView).toBe(true);
    expect(result.nodes[0].data.personaMode).toBe('security');
  });
});
