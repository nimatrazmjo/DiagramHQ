import type { CanvasEdge, CanvasNode, ProjectViewModelViewObject } from './canvas';
import type { ModelConnection, ModelObject } from './types';
import { projectViewModelToCanvas } from './canvas';

export type PersonaMode = 'architect' | 'developer' | 'security' | 'sre' | 'data' | 'product' | 'executive' | 'auditor';

export interface PersonaNodeData {
  personaMode?: PersonaMode;
  personaView?: boolean;
  [key: string]: unknown;
}

export function projectPersonaViewToCanvas(
  objects: ModelObject[],
  connections: ModelConnection[] = [],
  viewObjects?: ProjectViewModelViewObject[],
  personaMode: PersonaMode = 'architect'
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const mappedConnections = connections.map(c => ({
    id: c.id,
    sourceId: c.sourceObjectId,
    targetId: c.targetObjectId,
    kind: c.kind,
    description: c.description,
  }));
  const baseViewModel = projectViewModelToCanvas(objects, mappedConnections, viewObjects);
  
  const nodes: CanvasNode[] = baseViewModel.nodes.map((node) => {
    return {
      ...node,
      data: {
        ...node.data,
        personaMode,
        personaView: true,
      },
    };
  });

  const edges: CanvasEdge[] = baseViewModel.edges.map((edge) => {
    return {
      ...edge,
      data: {
        ...edge.data,
        personaMode,
        personaView: true,
      }
    };
  });

  return { nodes, edges };
}
