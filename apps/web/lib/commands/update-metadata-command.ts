import type { Node, Edge } from '@xyflow/react';
import type { Command, StateSetFn } from './command';

export interface UpdateNodeMetadataCommandParams {
  viewId?: string;
  nodeId: string;
  prevData: Record<string, unknown>;
  newData: Record<string, unknown>;
  persistFn?: (
    viewId: string,
    nodeId: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
}

export class UpdateNodeMetadataCommand
  implements Command<{ nodeId: string; data: Record<string, unknown> }>
{
  readonly id: string;
  readonly name = 'UpdateNodeMetadata';

  constructor(public readonly params: UpdateNodeMetadataCommandParams) {
    this.id = `update-meta-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async execute(): Promise<{ nodeId: string; data: Record<string, unknown> }> {
    if (this.params.persistFn && this.params.viewId) {
      await this.params.persistFn(this.params.viewId, this.params.nodeId, this.params.newData);
    }
    return { nodeId: this.params.nodeId, data: this.params.newData };
  }

  async undo(): Promise<{ nodeId: string; data: Record<string, unknown> }> {
    if (this.params.persistFn && this.params.viewId) {
      await this.params.persistFn(this.params.viewId, this.params.nodeId, this.params.prevData);
    }
    return { nodeId: this.params.nodeId, data: this.params.prevData };
  }

  applyCanvasUpdate(
    setNodes: StateSetFn<Node>,
    _setEdges: StateSetFn<Edge>,
    mode: 'execute' | 'undo',
  ): void {
    const targetData = mode === 'undo' ? this.params.prevData : this.params.newData;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === this.params.nodeId
          ? {
              ...n,
              data: { ...n.data, ...targetData },
            }
          : n,
      ),
    );
  }
}
