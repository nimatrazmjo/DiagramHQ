import {
  alignNodes,
  distributeNodes,
  type AlignableNode,
  type AlignAxis,
  type CanvasPosition,
} from '@diagramhq/domain';
import type { Node, Edge } from '@xyflow/react';
import type { Command, StateSetFn } from './command';
import { persistPositions, type PersistPositionsFn } from './persist-positions';

export type AlignOperation =
  | { type: 'align'; axis: AlignAxis }
  | { type: 'distribute'; axis: 'horizontal' | 'vertical' };

export interface AlignNodesCommandParams {
  viewId?: string;
  nodes: AlignableNode[];
  operation: AlignOperation;
  persistFn?: PersistPositionsFn;
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

  async execute(): Promise<AlignedNodeResult[]> {
    const positions = this.computePositions();
    const results = this.params.nodes.map((n, i) => ({
      objectId: n.id,
      position: positions[i]!,
    }));
    await persistPositions(this.params.viewId, this.params.persistFn, results);
    return results;
  }

  async undo(): Promise<AlignedNodeResult[]> {
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
        : new Map(this.params.nodes.map((n, i) => [n.id, this.computePositions()[i]!]));
    setNodes((nds) =>
      nds.map((n) => {
        const pos = positions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      }),
    );
  }
}

