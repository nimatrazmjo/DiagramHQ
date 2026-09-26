import type { Command } from './command';

export interface MoveNodeCommandParams {
  id?: string;
  viewId?: string;
  objectId: string;
  prevPosition: { x: number; y: number };
  newPosition: { x: number; y: number };
  persistFn?: (viewId: string, objectId: string, position: { x: number; y: number }) => Promise<void>;
}

export class MoveNodeCommand implements Command<{ x: number; y: number }> {
  readonly id: string;
  readonly name = 'MoveNode';
  readonly viewId?: string;
  readonly objectId: string;
  readonly prevPosition: { x: number; y: number };
  readonly newPosition: { x: number; y: number };
  readonly persistFn?: (viewId: string, objectId: string, position: { x: number; y: number }) => Promise<void>;

  constructor(params: MoveNodeCommandParams) {
    this.id =
      params.id ??
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `move-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    this.viewId = params.viewId;
    this.objectId = params.objectId;
    this.prevPosition = params.prevPosition;
    this.newPosition = params.newPosition;
    this.persistFn = params.persistFn;
  }

  async execute(): Promise<{ x: number; y: number }> {
    if (this.persistFn && this.viewId) {
      await this.persistFn(this.viewId, this.objectId, this.newPosition);
    }
    return this.newPosition;
  }

  async undo(): Promise<{ x: number; y: number }> {
    if (this.persistFn && this.viewId) {
      await this.persistFn(this.viewId, this.objectId, this.prevPosition);
    }
    return this.prevPosition;
  }
}
