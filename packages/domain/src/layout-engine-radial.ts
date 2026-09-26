import type { CanvasPosition } from './canvas';
import { computeLayers } from './layout-engine-layered';
import {
  registerLayoutEngine,
  type LayoutEdge,
  type LayoutNode,
  type LayoutOptions,
} from './layout-registry';

/**
 * Concentric-ring layout: rings come from the same longest-path-from-root
 * layering used by the layered engine. Each ring's radius is the larger of
 * (a) enough to keep it clear of the previous ring, and (b) enough
 * circumference to give every node on the ring its own arc without
 * overlapping its neighbors.
 */
export function radialLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options?: LayoutOptions,
): CanvasPosition[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ x: 0, y: 0 }];

  const maxWidth = nodes.reduce((m, n) => Math.max(m, n.width ?? 0), 160);
  const maxHeight = nodes.reduce((m, n) => Math.max(m, n.height ?? 0), 80);
  const nodeSpan = Math.max(maxWidth, maxHeight) + 60;
  const ringSpacing = options?.spacingY ?? nodeSpan * 1.5;

  const ringById = computeLayers(nodes, edges);
  const byRing = new Map<number, string[]>();
  for (const node of nodes) {
    const ring = ringById.get(node.id) ?? 0;
    if (!byRing.has(ring)) byRing.set(ring, []);
    byRing.get(ring)!.push(node.id);
  }

  const ringIndices = [...byRing.keys()].sort((a, b) => a - b);
  const radiusByRing = new Map<number, number>();
  let previousRadius = 0;
  for (const ring of ringIndices) {
    const count = byRing.get(ring)!.length;
    const isSingleCenterNode = ring === ringIndices[0] && count === 1;
    let radius: number;
    if (isSingleCenterNode) {
      radius = 0;
    } else {
      const minRadiusForSpacing = (count * nodeSpan) / (2 * Math.PI);
      radius = Math.max(previousRadius + ringSpacing, minRadiusForSpacing, ringSpacing);
    }
    radiusByRing.set(ring, radius);
    previousRadius = radius;
  }

  const positionById = new Map<string, CanvasPosition>();
  for (const ring of ringIndices) {
    const idsInRing = byRing.get(ring)!;
    const radius = radiusByRing.get(ring)!;
    idsInRing.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / idsInRing.length;
      positionById.set(id, {
        x: Math.round(radius * Math.cos(angle)),
        y: Math.round(radius * Math.sin(angle)),
      });
    });
  }

  return nodes.map((n) => positionById.get(n.id) ?? { x: 0, y: 0 });
}

registerLayoutEngine({ name: 'radial', layout: radialLayout });
