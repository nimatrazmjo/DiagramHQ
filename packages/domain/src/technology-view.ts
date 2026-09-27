import type { CanvasEdge, CanvasNode, ProjectViewModelViewObject } from './canvas';
import type { ModelConnection, ModelObject, Technology } from './types';
import { projectViewModelToCanvas } from './canvas';

export interface TechnologyNodeData {
  technologies?: Technology[];
  technologyView?: boolean;
  [key: string]: unknown;
}

export function projectTechnologyViewToCanvas(
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

    const technologies = Array.isArray(obj.metadata?.technologies) 
      ? obj.metadata.technologies as Technology[] 
      : [];

    return {
      ...node,
      data: {
        ...node.data,
        technologies,
        technologyView: true,
      },
    };
  });

  const edges: CanvasEdge[] = baseViewModel.edges.map((edge) => {
    return {
      ...edge,
      data: {
        ...edge.data,
        technologyView: true,
      }
    };
  });

  return { nodes, edges };
}
