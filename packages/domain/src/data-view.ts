import type { CanvasEdge, CanvasNode, ProjectViewModelViewObject } from './canvas';
import type { ModelConnection, ModelObject } from './types';
import { projectViewModelToCanvas } from './canvas';

export interface DataNodeData {
  dataClassification?: string;
  dataView?: boolean;
  [key: string]: unknown;
}

export function projectDataViewToCanvas(
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

    const dataClassification = obj.metadata?.dataClassification as string | undefined;

    return {
      ...node,
      data: {
        ...node.data,
        dataClassification,
        dataView: true,
      },
    };
  });

  const edges: CanvasEdge[] = baseViewModel.edges.map((edge) => {
    const conn = connections.find((c) => c.id === edge.id);
    const dataClassification = conn?.metadata?.dataClassification as string | undefined;
    const isDataFlow = conn?.kind === 'data' || dataClassification;
    
    return {
      ...edge,
      animated: isDataFlow ? true : edge.animated,
      data: {
        ...edge.data,
        dataClassification,
        dataView: true,
      }
    };
  });

  return { nodes, edges };
}
