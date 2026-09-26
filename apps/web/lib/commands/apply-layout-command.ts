import type { CanvasPosition, LayoutNode } from '@diagramhq/domain';
import type { Command } from './command';

export interface ApplyLayoutCommandParams {
  viewId?: string;
  nodes: LayoutNode[];
  /** Precomputed positions, same order as `nodes`. Computed once by the
   * caller (e.g. for an immediate optimistic UI update) — the command only
   * persists/reverts them, it never re-runs the layout engine. Layout math
   * can be expensive (e.g. force-directed's O(n^2) iterations), so it must
   * not be paid for twice per click. */
  positions: CanvasPosition[];
  persistFn?: (
    viewId: string,
    positions: Array<{ objectId: string; x: number; y: number }>,
  ) => Promise<void>;
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
    this.id = `apply-layout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.prevPositions = new Map(params.nodes.map((n) => [n.id, n.position]));
  }

  private async persist(results: LayoutNodeResult[]): Promise<void> {
    if (this.params.persistFn && this.params.viewId) {
      await this.params.persistFn(
        this.params.viewId,
        results.map((r) => ({ objectId: r.objectId, x: r.position.x, y: r.position.y })),
      );
    }
  }

  async execute(): Promise<LayoutNodeResult[]> {
    const results = this.params.nodes.map((n, i) => ({
      objectId: n.id,
      position: this.params.positions[i]!,
    }));
    await this.persist(results);
    return results;
  }

  async undo(): Promise<LayoutNodeResult[]> {
    const results = this.params.nodes.map((n) => ({
      objectId: n.id,
      position: this.prevPositions.get(n.id)!,
    }));
    await this.persist(results);
    return results;
  }
}
