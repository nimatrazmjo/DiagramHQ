import type { CanvasPosition } from './canvas';
import {
  registerLayoutEngine,
  type LayoutEdge,
  type LayoutNode,
  type LayoutOptions,
} from './layout-registry';

/** Simple row-major grid layout. Ignores edges entirely. */
export function gridLayout(
  nodes: LayoutNode[],
  _edges: LayoutEdge[],
  options?: LayoutOptions,
): CanvasPosition[] {
  if (nodes.length === 0) return [];

  const maxWidth = nodes.reduce((m, n) => Math.max(m, n.width ?? 0), 160);
  const maxHeight = nodes.reduce((m, n) => Math.max(m, n.height ?? 0), 80);
  const spacingX = options?.spacingX ?? maxWidth + 60;
  const spacingY = options?.spacingY ?? maxHeight + 60;
  const columns = options?.columns ?? Math.ceil(Math.sqrt(nodes.length));

  return nodes.map((_, i) => ({
    x: (i % columns) * spacingX,
    y: Math.floor(i / columns) * spacingY,
  }));
}

registerLayoutEngine({ name: 'grid', layout: gridLayout });
