import {
  alignNodes,
  distributeNodes,
  type AlignableNode,
  type AlignAxis,
  type CanvasPosition,
} from '@diagramhq/domain';
import type { Command } from './command';

export type AlignOperation =
  | { type: 'align'; axis: AlignAxis }
  | { type: 'distribute'; axis: 'horizontal' | 'vertical' };

export interface AlignNodesCommandParams {
  viewId?: string;
  nodes: AlignableNode[];
  operation: AlignOperation;
  persistFn?: (
    viewId: string,
    positions: Array<{ objectId: string; x: number; y: number }>,
  ) => Promise<void>;
}

export interface AlignedNodeResult {
  objectId: string;
  position: CanvasPosition;
}

export class AlignNodesCommand implements Command<AlignedNodeResult[]> {
  readonly id: string;
  readonly name = 'AlignNodes';
  private readonly prevPositions: Map<string, CanvasPosition>;

  constructor(private readonly params: AlignNodesCommandParams) {
    this.id = `align-nodes-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.prevPositions = new Map(
      params.nodes.map((n) => [n.id, n.position]),
    );
  }

  private computePositions(): CanvasPosition[] {
    const { nodes, operation } = this.params;
    return operation.type === 'align'
      ? alignNodes(nodes, operation.axis)
      : distributeNodes(nodes, operation.axis);
  }

  private async persist(results: AlignedNodeResult[]): Promise<void> {
    if (this.params.persistFn && this.params.viewId) {
      await this.params.persistFn(
        this.params.viewId,
        results.map((r) => ({ objectId: r.objectId, x: r.position.x, y: r.position.y })),
      );
    }
  }

  async execute(): Promise<AlignedNodeResult[]> {
    const positions = this.computePositions();
    const results = this.params.nodes.map((n, i) => ({
      objectId: n.id,
      position: positions[i]!,
    }));
    await this.persist(results);
    return results;
  }

  async undo(): Promise<AlignedNodeResult[]> {
    const results = this.params.nodes.map((n) => ({
      objectId: n.id,
      position: this.prevPositions.get(n.id)!,
    }));
    await this.persist(results);
    return results;
  }
}
