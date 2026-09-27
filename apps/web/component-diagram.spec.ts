import { describe, it, expect } from 'vitest';
import {
  createComponentViewOptions,
  isComponentView,
  getViewLevelLabel,
} from '@diagramhq/domain';

describe('Component Diagram View in Web (F034)', () => {
  it('creates Component view options', () => {
    const opts = createComponentViewOptions('Order Service Components');
    expect(opts.kind).toBe('component');
    expect(opts.name).toBe('Order Service Components');
  });

  it('correctly discriminates Component views', () => {
    expect(isComponentView({ kind: 'component' })).toBe(true);
    expect(isComponentView({ kind: 'container' })).toBe(false);
    expect(isComponentView({ kind: 'context' })).toBe(false);
  });

  it('returns Level 3 label for component kind', () => {
    expect(getViewLevelLabel('component')).toBe('Level 3 — Component');
  });
});
