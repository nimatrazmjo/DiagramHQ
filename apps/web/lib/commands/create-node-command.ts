import type { CanvasNode } from '@diagramhq/domain';
import type { Node, Edge } from '@xyflow/react';
import type { Command, StateSetFn } from './command';

export interface CreateNodeCommandParams {
  viewId?: string;
  node: CanvasNode;
  persistCreateFn?: (viewId: string, node: CanvasNode) => Promise<void>;
  persistDeleteFn?: (viewId: string, nodeId: string) => Promise<void>;
}

export class CreateNodeCommand implements Command<CanvasNode> {
  readonly id: string;
  readonly name = 'CreateNode';

  constructor(public readonly params: CreateNodeCommandParams) {
    this.id = `create-node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async execute(): Promise<CanvasNode> {
    if (this.params.persistCreateFn && this.params.viewId) {
      await this.params.persistCreateFn(this.params.viewId, this.params.node);
    }
    return this.params.node;
  }

  async undo(): Promise<CanvasNode> {
    if (this.params.persistDeleteFn && this.params.viewId) {
      await this.params.persistDeleteFn(this.params.viewId, this.params.node.id);
    }
    return this.params.node;
  }

  applyCanvasUpdate(
    setNodes: StateSetFn<Node>,
    _setEdges: StateSetFn<Edge>,
    mode: 'execute' | 'undo',
  ): void {
    if (mode === 'undo') {
      setNodes((nds) => nds.filter((n) => n.id !== this.params.node.id));
    } else {
      setNodes((nds) => {
        if (nds.some((n) => n.id === this.params.node.id)) return nds;
        return [
          ...nds,
          {
            id: this.params.node.id,
            type: this.params.node.type,
            position: { ...this.params.node.position },
            data: { ...this.params.node.data },
            ...(this.params.node.width != null ? { width: this.params.node.width } : {}),
            ...(this.params.node.height != null ? { height: this.params.node.height } : {}),
          },
        ];
      });
    }
  }
}
