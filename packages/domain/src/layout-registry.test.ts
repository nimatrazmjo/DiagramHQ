import { describe, expect, it } from 'vitest';
import {
  applyLayout,
  getLayoutEngine,
  listLayoutEngines,
  registerLayoutEngine,
  type LayoutEngine,
} from './layout-registry';
import './layout-builtins';

describe('Layout-engine registry (F015, MODULES.md #6)', () => {
  it('returns [] for an empty node list without needing a valid engine name', () => {
    expect(applyLayout([], [], 'grid')).toEqual([]);
  });

  it('throws a descriptive error for an unregistered engine name', () => {
    // @ts-expect-error intentionally invalid engine name for the error-path test
    expect(() => applyLayout([{ id: 'a', position: { x: 0, y: 0 } }], [], 'doesNotExist')).toThrow(
      /Unknown layout engine/,
    );
  });

  it('a new engine can register() without editing the registry core', () => {
    const engine: LayoutEngine = {
      // @ts-expect-error test-only engine name outside the built-in union
      name: 'custom-test-engine',
      layout: (nodes) => nodes.map(() => ({ x: 1, y: 2 })),
    };
    registerLayoutEngine(engine);
    // @ts-expect-error test-only engine name
    expect(getLayoutEngine('custom-test-engine')).toBe(engine);
    // @ts-expect-error test-only engine name
    expect(listLayoutEngines()).toContain('custom-test-engine');
  });

  it('lists all 8 built-in engines once layout-builtins is imported', () => {
    const names = listLayoutEngines();
    for (const expected of [
      'grid',
      'radial',
      'forceDirected',
      'hierarchical',
      'tree',
      'layered',
      'LR',
      'TB',
    ]) {
      expect(names).toContain(expected);
    }
  });
});
