import { describe, it, expect } from 'vitest';
import {
  createContextViewOptions,
  isContextView,
  getViewLevelLabel,
} from '@diagramhq/domain';

describe('Context Diagram View in Web (F032)', () => {
  it('creates Context view options', () => {
    const opts = createContextViewOptions('System Context View');
    expect(opts.kind).toBe('context');
    expect(opts.name).toBe('System Context View');
  });

  it('correctly discriminates Context views', () => {
    expect(isContextView({ kind: 'context' })).toBe(true);
    expect(isContextView({ kind: 'container' })).toBe(false);
  });

  it('returns Level 1 label for context kind', () => {
    expect(getViewLevelLabel('context')).toBe('Level 1 — Context');
  });
});
