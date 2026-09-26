import type { CanvasPosition } from './canvas';

// ----------------------------------------------------------------
// Layout-engine registry (MODULES.md #6): new engines register()
// against this interface; core code (applyLayout) iterates the
// registry instead of switching on engine names.
// ----------------------------------------------------------------

export interface LayoutNode {
  id: string;
  position: CanvasPosition;
  width?: number;
  height?: number;
}

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
  return engine.layout(nodes, edges, options);
}
