import type { CanvasPosition } from './canvas';
import {
  registerLayoutEngine,
  type LayoutEdge,
  type LayoutNode,
  type LayoutOptions,
} from './layout-registry';

/**
 * DFS-based back-edge detection (standard cycle-breaking for Sugiyama-style
 * layering, the same approach tools like dagre use): any edge that closes a
 * cycle — points back to a node still on the current DFS path — is a back
 * edge. Removing back edges leaves a DAG, so the longest-path layering below
 * can give every node a real layer instead of falling back to a placeholder
 * for anything cyclic or downstream of a cycle.
 */
function findBackEdgeIndices(nodes: LayoutNode[], edges: LayoutEdge[]): Set<number> {
  const idSet = new Set(nodes.map((n) => n.id));
  const adjacency = new Map<string, Array<{ target: string; edgeIndex: number }>>();
  for (const n of nodes) adjacency.set(n.id, []);
  edges.forEach((e, edgeIndex) => {
    if (!idSet.has(e.source) || !idSet.has(e.target) || e.source === e.target) return;
    adjacency.get(e.source)!.push({ target: e.target, edgeIndex });
  });

  const UNVISITED = 0;
  const ON_STACK = 1;
  const DONE = 2;
  const state = new Map<string, number>(nodes.map((n) => [n.id, UNVISITED]));
  const backEdgeIndices = new Set<number>();

  const stack: Array<{ id: string; nextChild: number }> = [];
  for (const start of nodes) {
    if (state.get(start.id) !== UNVISITED) continue;
    stack.push({ id: start.id, nextChild: 0 });
    state.set(start.id, ON_STACK);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const children = adjacency.get(frame.id) ?? [];
      if (frame.nextChild >= children.length) {
        state.set(frame.id, DONE);
        stack.pop();
        continue;
      }
      const { target, edgeIndex } = children[frame.nextChild]!;
      frame.nextChild++;
      const targetState = state.get(target);
      if (targetState === ON_STACK) {
        backEdgeIndices.add(edgeIndex);
      } else if (targetState === UNVISITED) {
        state.set(target, ON_STACK);
        stack.push({ id: target, nextChild: 0 });
      }
    }
  }
  return backEdgeIndices;
}

/**
 * Assigns each node a layer = the longest path from any root (a node with
 * no incoming edges), via a Kahn's-algorithm-style BFS over the graph with
 * back edges removed. Because that's guaranteed acyclic, every node reaches
 * in-degree 0 eventually — the layer-0 fallback below only exists as a
 * defensive backstop and should never actually trigger.
 */
export function computeLayers(nodes: LayoutNode[], edges: LayoutEdge[]): Map<string, number> {
  const backEdgeIndices = findBackEdgeIndices(nodes, edges);
  const idSet = new Set(nodes.map((n) => n.id));
  const ids = nodes.map((n) => n.id);
  const outEdges = new Map<string, string[]>();
  const remainingInDegree = new Map<string, number>();
  for (const id of ids) {
    outEdges.set(id, []);
    remainingInDegree.set(id, 0);
  }
  edges.forEach((e, edgeIndex) => {
    if (backEdgeIndices.has(edgeIndex)) return;
    if (!idSet.has(e.source) || !idSet.has(e.target) || e.source === e.target) return;
    outEdges.get(e.source)!.push(e.target);
    remainingInDegree.set(e.target, (remainingInDegree.get(e.target) ?? 0) + 1);
  });

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

  // Defensive backstop only — with back edges removed the graph is acyclic,
  // so every node should already have a layer at this point.
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
