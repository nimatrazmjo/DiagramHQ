import type { Node, Edge } from '@xyflow/react';
import type { Command, StateSetFn } from './command';

export interface UpdateEdgeDataCommandParams {
  edgeId: string;
  prevData: Record<string, unknown>;
  newData: Record<string, unknown>;
  prevLabel?: string;
  newLabel?: string;
  persistFn?: (
    edgeId: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
}

export class UpdateEdgeDataCommand
  implements Command<{ edgeId: string; data: Record<string, unknown>; label?: string }>
{
  readonly id: string;
  readonly name = 'UpdateEdgeData';

  constructor(public readonly params: UpdateEdgeDataCommandParams) {
    this.id = `update-edge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async execute(): Promise<{ edgeId: string; data: Record<string, unknown>; label?: string }> {
    if (this.params.persistFn) {
      await this.params.persistFn(this.params.edgeId, this.params.newData);
    }
    return {
      edgeId: this.params.edgeId,
      data: this.params.newData,
      label: this.params.newLabel,
    };
  }

  async undo(): Promise<{ edgeId: string; data: Record<string, unknown>; label?: string }> {
    if (this.params.persistFn) {
      await this.params.persistFn(this.params.edgeId, this.params.prevData);
    }
    return {
      edgeId: this.params.edgeId,
      data: this.params.prevData,
      label: this.params.prevLabel,
    };
  }

  applyCanvasUpdate(
    _setNodes: StateSetFn<Node>,
    setEdges: StateSetFn<Edge>,
    mode: 'execute' | 'undo',
  ): void {
    const targetData = mode === 'undo' ? this.params.prevData : this.params.newData;
    const targetLabel = mode === 'undo' ? this.params.prevLabel : this.params.newLabel;
    setEdges((eds) =>
      eds.map((e) =>
        e.id === this.params.edgeId
          ? {
              ...e,
              label: targetLabel !== undefined ? targetLabel : e.label,
              data: { ...e.data, ...targetData },
            }
          : e,
      ),
    );
  }
}
