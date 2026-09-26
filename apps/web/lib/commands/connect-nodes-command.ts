import type { CanvasEdge } from '@diagramhq/domain';
import type { Node, Edge } from '@xyflow/react';
import type { Command, StateSetFn } from './command';

export interface ConnectNodesCommandParams {
  viewId?: string;
  edge: CanvasEdge;
  persistCreateFn?: (viewId: string, edge: CanvasEdge) => Promise<void>;
  persistDeleteFn?: (viewId: string, edgeId: string) => Promise<void>;
}

export class ConnectNodesCommand implements Command<CanvasEdge> {
  readonly id: string;
  readonly name = 'ConnectNodes';

  constructor(public readonly params: ConnectNodesCommandParams) {
    this.id = `connect-nodes-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async execute(): Promise<CanvasEdge> {
    if (this.params.persistCreateFn && this.params.viewId) {
      await this.params.persistCreateFn(this.params.viewId, this.params.edge);
    }
    return this.params.edge;
  }

  async undo(): Promise<CanvasEdge> {
    if (this.params.persistDeleteFn && this.params.viewId) {
      await this.params.persistDeleteFn(this.params.viewId, this.params.edge.id);
    }
    return this.params.edge;
  }

  applyCanvasUpdate(
    _setNodes: StateSetFn<Node>,
    setEdges: StateSetFn<Edge>,
    mode: 'execute' | 'undo',
  ): void {
    if (mode === 'undo') {
      setEdges((eds) => eds.filter((e) => e.id !== this.params.edge.id));
    } else {
      setEdges((eds) => {
        if (eds.some((e) => e.id === this.params.edge.id)) return eds;
        return [
          ...eds,
          {
            id: this.params.edge.id,
            source: this.params.edge.source,
            target: this.params.edge.target,
            type: this.params.edge.type ?? 'default',
            label: this.params.edge.label,
            animated: this.params.edge.animated,
            data: this.params.edge.data,
          },
        ];
      });
    }
  }
}
