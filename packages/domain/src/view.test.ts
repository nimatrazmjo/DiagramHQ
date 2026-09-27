import { describe, it, expect } from 'vitest';
import {
  createContextViewOptions,
  createContainerViewOptions,
  isContextView,
  isContainerView,
  getViewLevelLabel,
} from './view';

describe('View Domain Helpers', () => {
  it('createContextViewOptions produces correct options', () => {
    const opts = createContextViewOptions('My Context');
    expect(opts.kind).toBe('context');
    expect(opts.name).toBe('My Context');
  });

  it('createContainerViewOptions produces correct options', () => {
    const opts = createContainerViewOptions('My Container', { app: 1 });
    expect(opts.kind).toBe('container');
    expect(opts.name).toBe('My Container');
    expect(opts.filter).toEqual({ app: 1 });
  });

  it('detects view kinds correctly', () => {
    const ctx = { kind: 'context' };
    const cnt = { kind: 'container' };
    
    expect(isContextView(ctx)).toBe(true);
    expect(isContextView(cnt)).toBe(false);
    
    expect(isContainerView(cnt)).toBe(true);
    expect(isContainerView(ctx)).toBe(false);
  });

  it('getViewLevelLabel returns correct labels', () => {
    expect(getViewLevelLabel('context')).toBe('Level 1 — Context');
    expect(getViewLevelLabel('container')).toBe('Level 2 — Container');
    expect(getViewLevelLabel('custom')).toBe('Custom View');
  });
});
