import type { Node, Edge } from '@xyflow/react';
import type { Command, StateSetFn } from './command';

export interface DeleteEdgeCommandParams {
  edge: Edge;
  persistDeleteFn?: (edgeId: string) => Promise<void>;
  persistRestoreFn?: (edge: Edge) => Promise<void>;
}

/**
 * DeleteEdgeCommand removes an edge from the canvas and allows undo/redo.
 */
export class DeleteEdgeCommand implements Command<{ edgeId: string }> {
  readonly id: string;
  readonly name = 'DeleteEdge';

  constructor(public readonly params: DeleteEdgeCommandParams) {
    this.id = `delete-edge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async execute(): Promise<{ edgeId: string }> {
    if (this.params.persistDeleteFn) {
      await this.params.persistDeleteFn(this.params.edge.id);
    }
    return { edgeId: this.params.edge.id };
  }

  async undo(): Promise<{ edgeId: string }> {
    if (this.params.persistRestoreFn) {
      await this.params.persistRestoreFn(this.params.edge);
    }
    return { edgeId: this.params.edge.id };
  }

  applyCanvasUpdate(
    _setNodes: StateSetFn<Node>,
    setEdges: StateSetFn<Edge>,
    mode: 'execute' | 'undo',
  ): void {
    if (mode === 'undo') {
      setEdges((eds) => {
        if (eds.some((e) => e.id === this.params.edge.id)) return eds;
        return [...eds, this.params.edge];
      });
    } else {
      setEdges((eds) => eds.filter((e) => e.id !== this.params.edge.id));
    }
  }
}
