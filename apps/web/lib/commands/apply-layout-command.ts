import type { CanvasPosition, LayoutNode } from '@diagramhq/domain';
import type { Node, Edge } from '@xyflow/react';
import type { Command, StateSetFn } from './command';
import { persistPositions, type PersistPositionsFn } from './persist-positions';

export interface ApplyLayoutCommandParams {
  viewId?: string;
  nodes: LayoutNode[];
  /** Precomputed positions, same order as `nodes`. Computed once by the
   * caller (e.g. for an immediate optimistic UI update) — the command only
   * persists/reverts them, it never re-runs the layout engine. Layout math
   * can be expensive (e.g. force-directed's O(n^2) iterations), so it must
   * not be paid for twice per click. */
  positions: CanvasPosition[];
  persistFn?: PersistPositionsFn;
}

export interface LayoutNodeResult {
  objectId: string;
  position: CanvasPosition;
}

export class ApplyLayoutCommand implements Command<LayoutNodeResult[]> {
  readonly id: string;
  readonly name = 'ApplyLayout';
  private readonly prevPositions: Map<string, CanvasPosition>;

  constructor(private readonly params: ApplyLayoutCommandParams) {
    if (params.positions.length !== params.nodes.length) {
      throw new Error(
        `ApplyLayoutCommand: received ${params.positions.length} position(s) for ${params.nodes.length} node(s).`,
      );
    }
    this.id = `apply-layout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.prevPositions = new Map(params.nodes.map((n) => [n.id, n.position]));
  }

  async execute(): Promise<LayoutNodeResult[]> {
    const results = this.params.nodes.map((n, i) => ({
      objectId: n.id,
      position: this.params.positions[i]!,
    }));
    await persistPositions(this.params.viewId, this.params.persistFn, results);
    return results;
  }

  async undo(): Promise<LayoutNodeResult[]> {
    const results = this.params.nodes.map((n) => ({
      objectId: n.id,
      position: this.prevPositions.get(n.id)!,
    }));
    await persistPositions(this.params.viewId, this.params.persistFn, results);
    return results;
  }

  applyCanvasUpdate(
    setNodes: StateSetFn<Node>,
    _setEdges: StateSetFn<Edge>,
    mode: 'execute' | 'undo',
  ): void {
    const positions =
      mode === 'undo'
        ? this.prevPositions
        : new Map(this.params.nodes.map((n, i) => [n.id, this.params.positions[i]!]));
    setNodes((nds) =>
      nds.map((n) => {
        const pos = positions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      }),
    );
  }
}

