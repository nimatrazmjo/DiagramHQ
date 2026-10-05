import type { CanvasNode, CanvasEdge } from '@diagramhq/domain';

export type C4Level = 1 | 2 | 3;

/**
 * Resolves the C4 Level for a canvas node based on explicit level data or shape kind.
 * Level 1: System Context (systems, external systems, actors/persons)
 * Level 2: Containers & Applications (services, databases, queues, apps)
 * Level 3: Components (modules, controllers, repositories, internal logic)
 */
export function getNodeC4Level(node: CanvasNode): C4Level {
  if (node.data?.c4Level === 1 || node.data?.c4Level === 2 || node.data?.c4Level === 3) {
    return node.data.c4Level as C4Level;
  }
  const kind = (node.data?.kind ?? node.type) as string;
  if (
    kind === 'system' ||
    kind === 'actor' ||
    kind === 'person' ||
    node.type === 'c4Context'
  ) {
    return 1;
  }
  if (
    kind === 'application' ||
    kind === 'app' ||
    kind === 'store' ||
    kind === 'database' ||
    kind === 'queue' ||
    node.type === 'c4Container'
  ) {
    return 2;
  }
  if (kind === 'component' || node.type === 'c4Component') {
    return 3;
  }
  return 1;
}

/**
 * Filters a list of canvas nodes according to the active C4 level and active parent container/system.
 */
export function filterNodesByC4Level(
  nodes: CanvasNode[],
  level: C4Level,
  activeParentId: string | null,
): CanvasNode[] {
  return nodes.filter((node) => {
    const nodeLvl = getNodeC4Level(node);

    if (level === 1) {
      return nodeLvl === 1;
    }

    if (level === 2) {
      if (nodeLvl !== 2) return false;
      if (activeParentId) {
        return node.data?.parentId === activeParentId;
      }
      return true;
    }

    if (level === 3) {
      if (nodeLvl !== 3) return false;
      if (activeParentId) {
        return node.data?.parentId === activeParentId;
      }
      return true;
    }

    return true;
  });
}

/**
 * Filters canvas edges so that only edges with both source and target in visible nodes are returned.
 */
export function filterEdgesByVisibleNodes(
  edges: CanvasEdge[],
  visibleNodeIds: Set<string>,
): CanvasEdge[] {
  return edges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target),
  );
}
