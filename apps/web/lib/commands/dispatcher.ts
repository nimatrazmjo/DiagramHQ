import type { Command } from './command';

export class CommandDispatcher {
  public history: Command[] = [];
  public undone: Command[] = [];
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  canRedo(): boolean {
    return this.undone.length > 0;
  }

  peekUndo(): Command | undefined {
    return this.history[this.history.length - 1];
  }

  peekRedo(): Command | undefined {
    return this.undone[this.undone.length - 1];
  }

  async dispatch<T>(command: Command<T>): Promise<T> {
    const result = await command.execute();
    this.history.push(command as Command);
    this.undone = [];
    this.notify();
    return result;
  }

  async undo(): Promise<Command | undefined> {
    const command = this.history.pop();
    if (!command) return undefined;
    try {
      if (command.undo) {
        await command.undo();
      }
      this.undone.push(command);
      this.notify();
      return command;
    } catch (error) {
      this.history.push(command);
      this.notify();
      throw error;
    }
  }

  async redo(): Promise<Command | undefined> {
    const command = this.undone.pop();
    if (!command) return undefined;
    try {
      await command.execute();
      this.history.push(command);
      this.notify();
      return command;
    } catch (error) {
      this.undone.push(command);
      this.notify();
      throw error;
    }
  }

  clearHistory(): void {
    this.history = [];
    this.undone = [];
    this.notify();
  }

  getHistory(): readonly Command[] {
    return this.history;
  }

  getUndone(): readonly Command[] {
    return this.undone;
  }
}

export const defaultCommandDispatcher = new CommandDispatcher();

