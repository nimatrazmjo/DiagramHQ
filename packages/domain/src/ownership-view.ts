import type { CanvasEdge, CanvasNode, ProjectViewModelViewObject } from './canvas';
import type { ModelConnection, ModelObject } from './types';
import { projectViewModelToCanvas } from './canvas';

export interface OwnershipNodeData {
  team?: string;
  owner?: string;
  ownershipView?: boolean;
  [key: string]: unknown;
}

export function projectOwnershipViewToCanvas(
  objects: ModelObject[],
  connections: ModelConnection[] = [],
  viewObjects?: ProjectViewModelViewObject[],
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
    const obj = objects.find((o) => o.id === node.id);
    if (!obj) return node;

    const team = typeof obj.metadata?.team === 'string' ? obj.metadata.team : undefined;
    const owner = typeof obj.metadata?.owner === 'string' ? obj.metadata.owner : undefined;

    return {
      ...node,
      data: {
        ...node.data,
        team,
        owner,
        ownershipView: true,
      },
    };
  });

  const edges: CanvasEdge[] = baseViewModel.edges.map((edge) => {
    return {
      ...edge,
      data: {
        ...edge.data,
        ownershipView: true,
      }
    };
  });

  return { nodes, edges };
}
