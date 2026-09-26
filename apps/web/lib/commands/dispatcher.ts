import type { Command } from './command';

export class CommandDispatcher {
  public history: Command[] = [];
  public undone: Command[] = [];

  async dispatch<T>(command: Command<T>): Promise<T> {
    const result = await command.execute();
    this.history.push(command as Command);
    this.undone = [];
    return result;
  }

  async undo(): Promise<void> {
    const command = this.history.pop();
    if (!command) return;
    if (command.undo) {
      await command.undo();
    }
    this.undone.push(command);
  }

  async redo(): Promise<void> {
    const command = this.undone.pop();
    if (!command) return;
    await command.execute();
    this.history.push(command);
  }

  clearHistory(): void {
    this.history = [];
    this.undone = [];
  }

  getHistory(): readonly Command[] {
    return this.history;
  }
}

export const defaultCommandDispatcher = new CommandDispatcher();
