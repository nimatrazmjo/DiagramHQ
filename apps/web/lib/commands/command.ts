import type { Node, Edge } from '@xyflow/react';

export type StateSetFn<T> = (update: T[] | ((current: T[]) => T[])) => void;

export interface Command<T = unknown> {
  readonly id: string;
  readonly name: string;
  execute(): Promise<T>;
  undo?(): Promise<T>;
  applyCanvasUpdate?(
    setNodes: StateSetFn<Node>,
    setEdges: StateSetFn<Edge>,
    mode: 'execute' | 'undo',
  ): void;
}


