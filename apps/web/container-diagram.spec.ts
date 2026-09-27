import { describe, it, expect } from 'vitest';
import {
  createContainerViewOptions,
  isContainerView,
  getViewLevelLabel,
} from '@diagramhq/domain';

describe('Container Diagram View in Web (F033)', () => {
  it('creates Container view options', () => {
    const opts = createContainerViewOptions('Order Containers View');
    expect(opts.kind).toBe('container');
    expect(opts.name).toBe('Order Containers View');
  });

  it('correctly discriminates Container views', () => {
    expect(isContainerView({ kind: 'container' })).toBe(true);
    expect(isContainerView({ kind: 'context' })).toBe(false);
  });

  it('returns Level 2 label for container kind', () => {
    expect(getViewLevelLabel('container')).toBe('Level 2 — Container');
  });
});
