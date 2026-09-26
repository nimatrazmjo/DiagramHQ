import type { CanvasEdge, CanvasNode } from '@diagramhq/domain';
import type { Node, Edge } from '@xyflow/react';
import type { Command, StateSetFn } from './command';

export interface DeleteNodeCommandParams {
  viewId?: string;
  node: CanvasNode;
  connectedEdges?: CanvasEdge[];
  persistDeleteFn?: (viewId: string, nodeId: string) => Promise<void>;
  persistRestoreFn?: (viewId: string, node: CanvasNode, edges: CanvasEdge[]) => Promise<void>;
}

export class DeleteNodeCommand implements Command<{ nodeId: string }> {
  readonly id: string;
  readonly name = 'DeleteNode';

  constructor(public readonly params: DeleteNodeCommandParams) {
    this.id = `delete-node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async execute(): Promise<{ nodeId: string }> {
    if (this.params.persistDeleteFn && this.params.viewId) {
      await this.params.persistDeleteFn(this.params.viewId, this.params.node.id);
    }
    return { nodeId: this.params.node.id };
  }

  async undo(): Promise<{ nodeId: string }> {
    if (this.params.persistRestoreFn && this.params.viewId) {
      await this.params.persistRestoreFn(
        this.params.viewId,
        this.params.node,
        this.params.connectedEdges ?? [],
      );
    }
    return { nodeId: this.params.node.id };
  }

  applyCanvasUpdate(
    setNodes: StateSetFn<Node>,
    setEdges: StateSetFn<Edge>,
    mode: 'execute' | 'undo',
  ): void {
    if (mode === 'undo') {
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
      if (this.params.connectedEdges && this.params.connectedEdges.length > 0) {
        setEdges((eds) => {
          const existingIds = new Set(eds.map((e) => e.id));
          const restored = this.params.connectedEdges!.filter((e) => !existingIds.has(e.id)).map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type ?? 'default',
            label: e.label,
            animated: e.animated,
            data: e.data,
          }));
          return [...eds, ...restored];
        });
      }
    } else {
      setNodes((nds) => nds.filter((n) => n.id !== this.params.node.id));
      if (this.params.connectedEdges && this.params.connectedEdges.length > 0) {
        const edgeIds = new Set(this.params.connectedEdges.map((e) => e.id));
        setEdges((eds) => eds.filter((e) => !edgeIds.has(e.id)));
      }
    }
  }
}
