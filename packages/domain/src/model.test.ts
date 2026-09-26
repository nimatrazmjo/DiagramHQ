import { describe, expect, it } from 'vitest';
import { createId } from './ids';
import { canConnect } from './model';

describe('canConnect', () => {
  it('allows a connection between two distinct objects', () => {
    expect(canConnect(createId('sys'), createId('app'))).toBe(true);
  });

  it('rejects a self-connection', () => {
    const id = createId('sys');
    expect(canConnect(id, id)).toBe(false);
  });
});
