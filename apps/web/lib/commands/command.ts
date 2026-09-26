export interface Command<T = unknown> {
  readonly id: string;
  readonly name: string;
  execute(): Promise<T>;
  undo?(): Promise<T>;
}
