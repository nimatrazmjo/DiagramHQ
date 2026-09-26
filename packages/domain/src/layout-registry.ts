import type { CanvasPosition } from './canvas';
import type { AlignableNode } from './alignment';

// ----------------------------------------------------------------
// Layout-engine registry (MODULES.md #6): new engines register()
// against this interface; core code (applyLayout) iterates the
// registry instead of switching on engine names.
// ----------------------------------------------------------------

/**
 * Same shape as `AlignableNode` (id + position + optional width/height) —
 * aliased rather than redeclared so the two domain areas can't drift apart.
 */
export type LayoutNode = AlignableNode;

export interface LayoutEdge {
  source: string;
  target: string;
}

export interface LayoutOptions {
  spacingX?: number;
  spacingY?: number;
  columns?: number;
}

export type LayoutEngineName =
  | 'grid'
  | 'radial'
  | 'forceDirected'
  | 'hierarchical'
  | 'tree'
  | 'layered'
  | 'LR'
  | 'TB';

export interface LayoutEngine {
  name: LayoutEngineName;
  layout(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    options?: LayoutOptions,
  ): CanvasPosition[];
}

const registry = new Map<LayoutEngineName, LayoutEngine>();

export function registerLayoutEngine(engine: LayoutEngine): void {
  registry.set(engine.name, engine);
}

export function getLayoutEngine(name: LayoutEngineName): LayoutEngine | undefined {
  return registry.get(name);
}

export function listLayoutEngines(): LayoutEngineName[] {
  return [...registry.keys()];
}

export function applyLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  engineName: LayoutEngineName,
  options?: LayoutOptions,
): CanvasPosition[] {
  if (nodes.length === 0) return [];

  const engine = registry.get(engineName);
  if (!engine) {
    throw new Error(
      `Unknown layout engine "${engineName}". Registered: ${listLayoutEngines().join(', ') || '(none)'}`,
    );
  }

  const positions = engine.layout(nodes, edges, options);
  if (positions.length !== nodes.length) {
    // The registry is open to third-party engines (MODULES.md #6); this
    // check keeps a misbehaving one from producing an `undefined` position
    // several call frames away from here.
    throw new Error(
      `Layout engine "${engineName}" returned ${positions.length} position(s) for ${nodes.length} node(s).`,
    );
  }
  return positions;
}
