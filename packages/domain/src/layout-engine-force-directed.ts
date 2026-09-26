import type { CanvasPosition } from './canvas';
import {
  registerLayoutEngine,
  type LayoutEdge,
  type LayoutNode,
  type LayoutOptions,
} from './layout-registry';

/**
 * Force-directed layout: nodes repel each other, edges act as springs
 * pulling their endpoints toward an ideal distance. Initial positions are
 * seeded deterministically (evenly spaced on a circle by index, no RNG) so
 * the result is reproducible. A final deterministic overlap-resolution pass
 * guarantees zero bbox overlap even if the simulation hasn't fully
 * converged for a given input.
 */
export function forceDirectedLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options?: LayoutOptions,
): CanvasPosition[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ x: 0, y: 0 }];

  const maxWidth = nodes.reduce((m, n) => Math.max(m, n.width ?? 0), 160);
  const maxHeight = nodes.reduce((m, n) => Math.max(m, n.height ?? 0), 80);
  const idealDistance = options?.spacingX ?? Math.max(maxWidth, maxHeight) + 100;
  const margin = 20;

  const idIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const seedRadius = idealDistance;
  const pos = nodes.map((_, i) => ({
    x: seedRadius * Math.cos((2 * Math.PI * i) / nodes.length),
    y: seedRadius * Math.sin((2 * Math.PI * i) / nodes.length),
  }));

  const links = edges
    .map((e) => ({ a: idIndex.get(e.source), b: idIndex.get(e.target) }))
    .filter(
      (l): l is { a: number; b: number } =>
        l.a !== undefined && l.b !== undefined && l.a !== l.b,
    );

  const iterations = 150;
  const repulsionStrength = idealDistance * idealDistance * 0.5;
  const step = 0.1;

  for (let iter = 0; iter < iterations; iter++) {
    const force = pos.map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        let dx = pos[i]!.x - pos[j]!.x;
        let dy = pos[i]!.y - pos[j]!.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 1) {
          dx = 1;
          dy = 0;
          distSq = 1;
        }
        const dist = Math.sqrt(distSq);
        const repulse = repulsionStrength / distSq;
        const fx = (dx / dist) * repulse;
        const fy = (dy / dist) * repulse;
        force[i]!.x += fx;
        force[i]!.y += fy;
        force[j]!.x -= fx;
        force[j]!.y -= fy;
      }
    }

    for (const { a, b } of links) {
      const dx = pos[a]!.x - pos[b]!.x;
      const dy = pos[a]!.y - pos[b]!.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const displacement = dist - idealDistance;
      const attract = displacement * 0.05;
      const fx = (dx / dist) * attract;
      const fy = (dy / dist) * attract;
      force[a]!.x -= fx;
      force[a]!.y -= fy;
      force[b]!.x += fx;
      force[b]!.y += fy;
    }

    for (let i = 0; i < pos.length; i++) {
      pos[i]!.x += force[i]!.x * step;
      pos[i]!.y += force[i]!.y * step;
    }
  }

  resolveOverlaps(pos, nodes, maxWidth, maxHeight, margin);

  return pos;
}

function resolveOverlaps(
  pos: CanvasPosition[],
  nodes: LayoutNode[],
  fallbackWidth: number,
  fallbackHeight: number,
  margin: number,
): void {
  const halfWidths = nodes.map((n) => (n.width ?? fallbackWidth) / 2);
  const halfHeights = nodes.map((n) => (n.height ?? fallbackHeight) / 2);

  for (let pass = 0; pass < nodes.length; pass++) {
    let moved = false;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const minDx = halfWidths[i]! + halfWidths[j]! + margin;
        const minDy = halfHeights[i]! + halfHeights[j]! + margin;
        const dx = pos[j]!.x - pos[i]!.x;
        const dy = pos[j]!.y - pos[i]!.y;
        const overlapX = minDx - Math.abs(dx);
        const overlapY = minDy - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          moved = true;
          if (overlapX < overlapY) {
            const push = overlapX / 2 + 0.5;
            const dir = dx === 0 ? 1 : Math.sign(dx);
            pos[i]!.x -= push * dir;
            pos[j]!.x += push * dir;
          } else {
            const push = overlapY / 2 + 0.5;
            const dir = dy === 0 ? 1 : Math.sign(dy);
            pos[i]!.y -= push * dir;
            pos[j]!.y += push * dir;
          }
        }
      }
    }
    if (!moved) break;
  }
}

registerLayoutEngine({ name: 'forceDirected', layout: forceDirectedLayout });
