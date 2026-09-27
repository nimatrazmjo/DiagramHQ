import type { CanvasEdge, CanvasNode, ProjectViewModelViewObject } from './canvas';
import type { ModelConnection, ModelObject } from './types';
import { projectViewModelToCanvas } from './canvas';

export interface SecurityNodeData {
  trustZone?: string;
  publicEndpoint?: boolean;
  requiresAuth?: boolean;
  encryption?: string;
  hasSecrets?: boolean;
  compliance?: string[];
  [key: string]: unknown;
}

export function projectSecurityViewToCanvas(
  objects: ModelObject[],
  connections: ModelConnection[] = [],
  viewObjects?: ProjectViewModelViewObject[],
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  // Extract security zones
  const zones = new Set<string>();
  objects.forEach((obj) => {
    const zone = obj.metadata?.trustZone as string | undefined;
    if (zone) zones.add(zone);
  });

  // Base projection
  const mappedConnections = connections.map(c => ({
    id: c.id,
    sourceId: c.sourceObjectId,
    targetId: c.targetObjectId,
    kind: c.kind,
    description: c.description,
  }));
  const baseViewModel = projectViewModelToCanvas(objects, mappedConnections, viewObjects);
  
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = baseViewModel.edges;

  // Create boundary nodes for zones
  let yOffset = -100;
  Array.from(zones).forEach((zoneName) => {
    nodes.push({
      id: `zone-${zoneName}`,
      type: 'group',
      position: { x: -50, y: yOffset },
      data: {
        label: zoneName,
        kind: 'boundary',
      },
      width: 600,
      height: 400,
    });
    yOffset += 450;
  });

  // Annotate objects
  baseViewModel.nodes.forEach((node) => {
    const obj = objects.find((o) => o.id === node.id);
    if (!obj) {
      nodes.push(node);
      return;
    }

    const zone = obj.metadata?.trustZone as string | undefined;
    const parentId = zone ? `zone-${zone}` : node.parentId;
    
    // Default position adjustment if placed in a zone without explicit coordinates
    let position = { ...node.position };
    if (zone && !node.parentId) {
       // Just shift it down to fit in the box if it wasn't placed
       position = { x: position.x + 100, y: (position.y % 300) + 50 };
    }

    const securityData: SecurityNodeData = {
      trustZone: zone,
      publicEndpoint: obj.metadata?.publicEndpoint === true,
      requiresAuth: obj.metadata?.requiresAuth === true,
      encryption: typeof obj.metadata?.encryption === 'string' ? obj.metadata.encryption : undefined,
      hasSecrets: obj.metadata?.hasSecrets === true,
      compliance: Array.isArray(obj.metadata?.compliance) ? obj.metadata.compliance : undefined,
    };

    nodes.push({
      ...node,
      parentId,
      position,
      data: {
        ...node.data,
        ...securityData,
        securityView: true,
      },
    });
  });

  return { nodes, edges };
}
