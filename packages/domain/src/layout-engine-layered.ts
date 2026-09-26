import type { CanvasPosition } from './canvas';
import {
  registerLayoutEngine,
  type LayoutEdge,
  type LayoutNode,
  type LayoutOptions,
} from './layout-registry';

/**
 * Assigns each node a layer = the longest path from any root (a node with
 * no incoming edges), via a Kahn's-algorithm-style BFS. Nodes that are part
 * of a cycle (never reach in-degree 0) fall back to layer 0 rather than
 * looping forever — layout should degrade gracefully, not crash, on cyclic
 * input.
 */
export function computeLayers(nodes: LayoutNode[], edges: LayoutEdge[]): Map<string, number> {
  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const outEdges = new Map<string, string[]>();
  const remainingInDegree = new Map<string, number>();
  for (const id of ids) {
    outEdges.set(id, []);
    remainingInDegree.set(id, 0);
  }
  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target) || e.source === e.target) continue;
    outEdges.get(e.source)!.push(e.target);
    remainingInDegree.set(e.target, (remainingInDegree.get(e.target) ?? 0) + 1);
  }

  const layer = new Map<string, number>();
  const queue: string[] = ids.filter((id) => remainingInDegree.get(id) === 0);
  const queued = new Set(queue);
  for (const id of queue) layer.set(id, 0);

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++]!;
    const currentLayer = layer.get(id)!;
    for (const next of outEdges.get(id) ?? []) {
      layer.set(next, Math.max(layer.get(next) ?? 0, currentLayer + 1));
      const remaining = (remainingInDegree.get(next) ?? 0) - 1;
      remainingInDegree.set(next, remaining);
      if (remaining <= 0 && !queued.has(next)) {
        queue.push(next);
        queued.add(next);
      }
    }
  }

  // Cycle members never reach in-degree 0 above; place them at layer 0.
  for (const id of ids) {
    if (!layer.has(id)) layer.set(id, 0);
  }
  return layer;
}

function layeredLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: LayoutOptions | undefined,
  orientation: 'TB' | 'LR',
): CanvasPosition[] {
  if (nodes.length === 0) return [];

  const maxWidth = nodes.reduce((m, n) => Math.max(m, n.width ?? 0), 160);
  const maxHeight = nodes.reduce((m, n) => Math.max(m, n.height ?? 0), 80);
  const spacingX = options?.spacingX ?? maxWidth + 60;
  const spacingY = options?.spacingY ?? maxHeight + 60;

  const layerById = computeLayers(nodes, edges);
  const byLayer = new Map<number, string[]>();
  for (const node of nodes) {
    const l = layerById.get(node.id) ?? 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(node.id);
  }

  const positionById = new Map<string, CanvasPosition>();
  for (const [layerIndex, idsInLayer] of byLayer) {
    idsInLayer.forEach((id, i) => {
      const across = i * (orientation === 'TB' ? spacingX : spacingY);
      const along = layerIndex * (orientation === 'TB' ? spacingY : spacingX);
      positionById.set(id, orientation === 'TB' ? { x: across, y: along } : { x: along, y: across });
    });
  }

  return nodes.map((n) => positionById.get(n.id) ?? { x: 0, y: 0 });
}

export function topToBottomLayout(nodes: LayoutNode[], edges: LayoutEdge[], options?: LayoutOptions): CanvasPosition[] {
  return layeredLayout(nodes, edges, options, 'TB');
}

export function leftToRightLayout(nodes: LayoutNode[], edges: LayoutEdge[], options?: LayoutOptions): CanvasPosition[] {
  return layeredLayout(nodes, edges, options, 'LR');
}

// 'hierarchical', 'tree', and 'layered' are the same longest-path layering;
// a tree is simply a DAG with no cross-branching, so the general algorithm
// already produces a correct tree layout without a separate implementation.
registerLayoutEngine({ name: 'hierarchical', layout: topToBottomLayout });
registerLayoutEngine({ name: 'tree', layout: topToBottomLayout });
registerLayoutEngine({ name: 'layered', layout: topToBottomLayout });
registerLayoutEngine({ name: 'TB', layout: topToBottomLayout });
registerLayoutEngine({ name: 'LR', layout: leftToRightLayout });
