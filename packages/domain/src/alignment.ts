import type { CanvasPosition } from './canvas';

// ----------------------------------------------------------------
// Shared types
// ----------------------------------------------------------------

export interface AlignableNode {
  id: string;
  position: CanvasPosition;
  width?: number;
  height?: number;
}

export type AlignAxis =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'centerH'
  | 'centerV';

// ----------------------------------------------------------------
// snapToGrid
// ----------------------------------------------------------------

/**
 * Snaps a position to the nearest grid point.
 * @param position - The {x,y} position to snap.
 * @param gridSize - Grid cell size in pixels (default 20).
 */
export function snapToGrid(
  position: CanvasPosition,
  gridSize = 20,
): CanvasPosition {
  const snap = (v: number) => Math.round(v / gridSize) * gridSize;
  return { x: snap(position.x), y: snap(position.y) };
}

function minOf(values: number[]): number {
  return values.reduce((a, b) => (b < a ? b : a));
}

function maxOf(values: number[]): number {
  return values.reduce((a, b) => (b > a ? b : a));
}

// ----------------------------------------------------------------
// alignNodes
// ----------------------------------------------------------------

/**
 * Returns a new array of positions (same order as `nodes`) after aligning
 * them along the given axis. Nodes with `width`/`height` of undefined are
 * treated as 0-dimension for the purpose of center and right/bottom edge
 * calculations.
 *
 * - left    → x = min leading edge
 * - right   → right edge = max right edge
 * - top     → y = min top edge
 * - bottom  → bottom edge = max bottom edge
 * - centerH → center each node on average horizontal center
 * - centerV → center each node on average vertical center
 */
export function alignNodes(
  nodes: AlignableNode[],
  axis: AlignAxis,
): CanvasPosition[] {
  if (nodes.length === 0) return [];

  const ws = nodes.map((n) => n.width ?? 0);
  const hs = nodes.map((n) => n.height ?? 0);

  switch (axis) {
    case 'left': {
      const targetX = minOf(nodes.map((n) => n.position.x));
      return nodes.map((n) => ({ x: targetX, y: n.position.y }));
    }

    case 'right': {
      const targetRight = maxOf(
        nodes.map((n, i) => n.position.x + (ws[i] ?? 0)),
      );
      return nodes.map((n, i) => ({
        x: targetRight - (ws[i] ?? 0),
        y: n.position.y,
      }));
    }

    case 'top': {
      const targetY = minOf(nodes.map((n) => n.position.y));
      return nodes.map((n) => ({ x: n.position.x, y: targetY }));
    }

    case 'bottom': {
      const targetBottom = maxOf(
        nodes.map((n, i) => n.position.y + (hs[i] ?? 0)),
      );
      return nodes.map((n, i) => ({
        x: n.position.x,
        y: targetBottom - (hs[i] ?? 0),
      }));
    }

    case 'centerH': {
      // Center all nodes on the average horizontal center
      const centers = nodes.map((n, i) => n.position.x + (ws[i] ?? 0) / 2);
      const targetCenterX = centers.reduce((a, b) => a + b, 0) / centers.length;
      return nodes.map((n, i) => ({
        x: targetCenterX - (ws[i] ?? 0) / 2,
        y: n.position.y,
      }));
    }

    case 'centerV': {
      const centers = nodes.map((n, i) => n.position.y + (hs[i] ?? 0) / 2);
      const targetCenterY = centers.reduce((a, b) => a + b, 0) / centers.length;
      return nodes.map((n, i) => ({
        x: n.position.x,
        y: targetCenterY - (hs[i] ?? 0) / 2,
      }));
    }
  }
}

// ----------------------------------------------------------------
// distributeNodes
// ----------------------------------------------------------------

/**
 * Distributes nodes with equal spacing between them along a given axis.
 * Nodes at the extremes stay fixed; interior nodes are evenly spaced.
 * Returns positions in the **original input order**.
 */
export function distributeNodes(
  nodes: AlignableNode[],
  axis: 'horizontal' | 'vertical',
): CanvasPosition[] {
  if (nodes.length < 3) {
    // Nothing meaningful to distribute with fewer than 3 nodes.
    return nodes.map((n) => ({ x: n.position.x, y: n.position.y }));
  }

  if (axis === 'horizontal') {
    // Sort by left edge (x)
    const sorted = [...nodes]
      .map((n, i) => ({ n, i, left: n.position.x, right: n.position.x + (n.width ?? 0) }))
      .sort((a, b) => a.left - b.left);

    const totalWidth = sorted.reduce((sum, { n }) => sum + (n.width ?? 0), 0);
    const span = sorted[sorted.length - 1]!.right - sorted[0]!.left;
    const gap = (span - totalWidth) / (nodes.length - 1);

    let cursor = sorted[0]!.left;
    const posMap = new Map<string, CanvasPosition>();
    for (const { n } of sorted) {
      posMap.set(n.id, { x: cursor, y: n.position.y });
      cursor += (n.width ?? 0) + gap;
    }

    return nodes.map((n) => posMap.get(n.id) ?? n.position);
  } else {
    // Sort by top edge (y)
    const sorted = [...nodes]
      .map((n, i) => ({ n, i, top: n.position.y, bottom: n.position.y + (n.height ?? 0) }))
      .sort((a, b) => a.top - b.top);

    const totalHeight = sorted.reduce((sum, { n }) => sum + (n.height ?? 0), 0);
    const span = sorted[sorted.length - 1]!.bottom - sorted[0]!.top;
    const gap = (span - totalHeight) / (nodes.length - 1);

    let cursor = sorted[0]!.top;
    const posMap = new Map<string, CanvasPosition>();
    for (const { n } of sorted) {
      posMap.set(n.id, { x: n.position.x, y: cursor });
      cursor += (n.height ?? 0) + gap;
    }

    return nodes.map((n) => posMap.get(n.id) ?? n.position);
  }
}
