import {
  applyLayout,
  type CanvasPosition,
  type LayoutEdge,
  type LayoutEngineName,
  type LayoutNode,
  type LayoutOptions,
} from '@diagramhq/domain';
import type { Command } from './command';

export interface ApplyLayoutCommandParams {
  viewId?: string;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  engine: LayoutEngineName;
  options?: LayoutOptions;
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
    const positions = applyLayout(
      this.params.nodes,
      this.params.edges,
      this.params.engine,
      this.params.options,
    );
    const results = this.params.nodes.map((n, i) => ({
      objectId: n.id,
      position: positions[i]!,
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
