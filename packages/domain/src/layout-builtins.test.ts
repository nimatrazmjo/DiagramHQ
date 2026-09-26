import { describe, expect, it } from 'vitest';
import {
  applyLayout,
  listLayoutEngines,
  type LayoutEdge,
  type LayoutEngineName,
  type LayoutNode,
} from './layout-registry';
import { gridLayout } from './layout-engine-grid';
import { computeLayers, topToBottomLayout, leftToRightLayout } from './layout-engine-layered';
import { radialLayout } from './layout-engine-radial';
import { forceDirectedLayout } from './layout-engine-force-directed';

function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function assertNoOverlap(nodes: LayoutNode[], positions: { x: number; y: number }[]): void {
  const boxes = nodes.map((n, i) => ({
    x: positions[i]!.x,
    y: positions[i]!.y,
    w: n.width ?? 160,
    h: n.height ?? 80,
  }));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(boxesOverlap(boxes[i]!, boxes[j]!)).toBe(false);
    }
  }
}

// Sample graph: a small DAG with varied node sizes and a stray cycle, to
// exercise both the happy path and the "don't crash on cycles" fallback.
const sampleNodes: LayoutNode[] = [
  { id: 'root', position: { x: 0, y: 0 }, width: 180, height: 90 },
  { id: 'a', position: { x: 10, y: 10 }, width: 140, height: 60 },
  { id: 'b', position: { x: 20, y: 20 }, width: 200, height: 100 },
  { id: 'c', position: { x: 30, y: 30 }, width: 120, height: 70 },
  { id: 'd', position: { x: 40, y: 40 }, width: 160, height: 80 },
  { id: 'e', position: { x: 50, y: 50 }, width: 160, height: 80 },
  { id: 'f', position: { x: 60, y: 60 }, width: 160, height: 80 },
  { id: 'g', position: { x: 70, y: 70 }, width: 160, height: 80 },
];

const sampleEdges: LayoutEdge[] = [
  { source: 'root', target: 'a' },
  { source: 'root', target: 'b' },
  { source: 'a', target: 'c' },
  { source: 'a', target: 'd' },
  { source: 'b', target: 'e' },
  { source: 'b', target: 'f' },
  { source: 'f', target: 'g' },
  { source: 'g', target: 'f' }, // stray cycle: must not hang or crash
];

describe('Built-in layout engines (F015) — no-overlap acceptance test', () => {
  it('every registered engine lays out the sample graph with zero bbox overlap', () => {
    const names = listLayoutEngines();
    expect(names.length).toBeGreaterThanOrEqual(8);

    for (const name of names as LayoutEngineName[]) {
      const positions = applyLayout(sampleNodes, sampleEdges, name);
      expect(positions).toHaveLength(sampleNodes.length);
      assertNoOverlap(sampleNodes, positions);
    }
  });

  it('every registered engine also handles a single isolated node', () => {
    const single: LayoutNode[] = [{ id: 'only', position: { x: 5, y: 5 }, width: 100, height: 50 }];
    for (const name of listLayoutEngines() as LayoutEngineName[]) {
      expect(() => applyLayout(single, [], name)).not.toThrow();
    }
  });
});

describe('gridLayout', () => {
  it('arranges nodes row-major with the given column count', () => {
    const nodes: LayoutNode[] = [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: 0, y: 0 } },
      { id: 'c', position: { x: 0, y: 0 } },
    ];
    const result = gridLayout(nodes, [], { spacingX: 100, spacingY: 50, columns: 2 });
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 50 },
    ]);
  });
});

describe('computeLayers', () => {
  it('assigns roots to layer 0 and children to layer = longest path from a root', () => {
    const nodes: LayoutNode[] = [
      { id: 'root', position: { x: 0, y: 0 } },
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: 0, y: 0 } },
    ];
    const edges: LayoutEdge[] = [
      { source: 'root', target: 'a' },
      { source: 'a', target: 'b' },
    ];
    const layers = computeLayers(nodes, edges);
    expect(layers.get('root')).toBe(0);
    expect(layers.get('a')).toBe(1);
    expect(layers.get('b')).toBe(2);
  });

  it('falls back cycle members to layer 0 instead of looping forever', () => {
    const nodes: LayoutNode[] = [
      { id: 'x', position: { x: 0, y: 0 } },
      { id: 'y', position: { x: 0, y: 0 } },
    ];
    const edges: LayoutEdge[] = [
      { source: 'x', target: 'y' },
      { source: 'y', target: 'x' },
    ];
    const layers = computeLayers(nodes, edges);
    expect(layers.get('x')).toBe(0);
    expect(layers.get('y')).toBe(0);
  });
});

describe('topToBottomLayout / leftToRightLayout', () => {
  const nodes: LayoutNode[] = [
    { id: 'root', position: { x: 0, y: 0 }, width: 100, height: 50 },
    { id: 'child', position: { x: 0, y: 0 }, width: 100, height: 50 },
  ];
  const edges: LayoutEdge[] = [{ source: 'root', target: 'child' }];

  it('TB places later layers strictly below earlier ones', () => {
    const [rootPos, childPos] = topToBottomLayout(nodes, edges);
    expect(childPos!.y).toBeGreaterThan(rootPos!.y);
  });

  it('LR places later layers strictly to the right of earlier ones', () => {
    const [rootPos, childPos] = leftToRightLayout(nodes, edges);
    expect(childPos!.x).toBeGreaterThan(rootPos!.x);
  });
});

describe('radialLayout', () => {
  it('places a single root at the center', () => {
    const nodes: LayoutNode[] = [
      { id: 'root', position: { x: 0, y: 0 }, width: 100, height: 50 },
      { id: 'a', position: { x: 0, y: 0 }, width: 100, height: 50 },
      { id: 'b', position: { x: 0, y: 0 }, width: 100, height: 50 },
    ];
    const edges: LayoutEdge[] = [
      { source: 'root', target: 'a' },
      { source: 'root', target: 'b' },
    ];
    const [rootPos, aPos, bPos] = radialLayout(nodes, edges);
    expect(rootPos).toEqual({ x: 0, y: 0 });
    const distA = Math.hypot(aPos!.x, aPos!.y);
    const distB = Math.hypot(bPos!.x, bPos!.y);
    expect(distA).toBeGreaterThan(0);
    expect(distB).toBeGreaterThan(0);
  });
});

describe('forceDirectedLayout', () => {
  it('is deterministic given the same input', () => {
    const result1 = forceDirectedLayout(sampleNodes, sampleEdges);
    const result2 = forceDirectedLayout(sampleNodes, sampleEdges);
    expect(result1).toEqual(result2);
  });

  it('pulls connected nodes closer together than an unconnected pair, on average', () => {
    const nodes: LayoutNode[] = [
      { id: 'a', position: { x: 0, y: 0 }, width: 100, height: 50 },
      { id: 'b', position: { x: 0, y: 0 }, width: 100, height: 50 },
      { id: 'c', position: { x: 0, y: 0 }, width: 100, height: 50 },
    ];
    // a-b connected; c isolated.
    const edges: LayoutEdge[] = [{ source: 'a', target: 'b' }];
    const [a, b, c] = forceDirectedLayout(nodes, edges);
    const distAB = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    const distAC = Math.hypot(a!.x - c!.x, a!.y - c!.y);
    expect(distAB).toBeLessThan(distAC);
  });
});
