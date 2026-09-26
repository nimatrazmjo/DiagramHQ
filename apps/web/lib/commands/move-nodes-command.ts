import type { Node, Edge } from '@xyflow/react';
import type { Command, StateSetFn } from './command';

export interface NodeMoveItem {
  objectId: string;
  prevPosition: { x: number; y: number };
  newPosition: { x: number; y: number };
}

export interface MoveNodesCommandParams {
  viewId?: string;
  moves: NodeMoveItem[];
  persistFn?: (
    viewId: string,
    positions: Array<{ objectId: string; x: number; y: number }>,
  ) => Promise<void>;
}

export class MoveNodesCommand
  implements Command<Array<{ objectId: string; position: { x: number; y: number } }>>
{
  readonly id: string;
  readonly name = 'MoveNodes';

  constructor(private readonly params: MoveNodesCommandParams) {
    this.id = `move-nodes-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async execute(): Promise<Array<{ objectId: string; position: { x: number; y: number } }>> {
    if (this.params.persistFn && this.params.viewId) {
      await this.params.persistFn(
        this.params.viewId,
        this.params.moves.map((m) => ({
          objectId: m.objectId,
          x: m.newPosition.x,
          y: m.newPosition.y,
        })),
      );
    }
    return this.params.moves.map((m) => ({
      objectId: m.objectId,
      position: m.newPosition,
    }));
  }

  async undo(): Promise<Array<{ objectId: string; position: { x: number; y: number } }>> {
    if (this.params.persistFn && this.params.viewId) {
      await this.params.persistFn(
        this.params.viewId,
        this.params.moves.map((m) => ({
          objectId: m.objectId,
          x: m.prevPosition.x,
          y: m.prevPosition.y,
        })),
      );
    }
    return this.params.moves.map((m) => ({
      objectId: m.objectId,
      position: m.prevPosition,
    }));
  }

  applyCanvasUpdate(
    setNodes: StateSetFn<Node>,
    _setEdges: StateSetFn<Edge>,
    mode: 'execute' | 'undo',
  ): void {
    const map = new Map(
      this.params.moves.map((m) => [m.objectId, mode === 'undo' ? m.prevPosition : m.newPosition]),
    );
    setNodes((nds) =>
      nds.map((n) => {
        const pos = map.get(n.id);
        return pos ? { ...n, position: pos } : n;
      }),
    );
  }
}


