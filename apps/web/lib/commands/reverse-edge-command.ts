import type { Node, Edge } from '@xyflow/react';
import type { Command, StateSetFn } from './command';

export interface ReverseEdgeCommandParams {
  edgeId: string;
  prevSource: string;
  newSource: string;
  prevTarget: string;
  newTarget: string;
  prevSourceHandle?: string | null;
  newSourceHandle?: string | null;
  prevTargetHandle?: string | null;
  newTargetHandle?: string | null;
  persistFn?: (edgeId: string, source: string, target: string) => Promise<void>;
}

/**
 * ReverseEdgeCommand swaps the source and target of a connection edge with full undo/redo.
 */
export class ReverseEdgeCommand
  implements Command<{ edgeId: string; source: string; target: string }>
{
  readonly id: string;
  readonly name = 'ReverseEdge';

  constructor(public readonly params: ReverseEdgeCommandParams) {
    this.id = `reverse-edge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async execute(): Promise<{ edgeId: string; source: string; target: string }> {
    if (this.params.persistFn) {
      await this.params.persistFn(
        this.params.edgeId,
        this.params.newSource,
        this.params.newTarget,
      );
    }
    return {
      edgeId: this.params.edgeId,
      source: this.params.newSource,
      target: this.params.newTarget,
    };
  }

  async undo(): Promise<{ edgeId: string; source: string; target: string }> {
    if (this.params.persistFn) {
      await this.params.persistFn(
        this.params.edgeId,
        this.params.prevSource,
        this.params.prevTarget,
      );
    }
    return {
      edgeId: this.params.edgeId,
      source: this.params.prevSource,
      target: this.params.prevTarget,
    };
  }

  applyCanvasUpdate(
    _setNodes: StateSetFn<Node>,
    setEdges: StateSetFn<Edge>,
    mode: 'execute' | 'undo',
  ): void {
    const s = mode === 'undo' ? this.params.prevSource : this.params.newSource;
    const t = mode === 'undo' ? this.params.prevTarget : this.params.newTarget;
    const sh =
      mode === 'undo'
        ? this.params.prevSourceHandle
        : this.params.newSourceHandle;
    const th =
      mode === 'undo'
        ? this.params.prevTargetHandle
        : this.params.newTargetHandle;

    setEdges((eds) =>
      eds.map((e) =>
        e.id === this.params.edgeId
          ? {
              ...e,
              source: s,
              target: t,
              sourceHandle: sh ?? undefined,
              targetHandle: th ?? undefined,
              data: {
                ...(e.data as Record<string, unknown> | undefined),
                sourceHandle: sh ?? undefined,
                targetHandle: th ?? undefined,
              },
            }
          : e,
      ),
    );
  }
}
