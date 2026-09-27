import { describe, it, expect } from 'vitest';
import {
  createContextViewOptions,
  createContainerViewOptions,
  createComponentViewOptions,
  createDynamicViewOptions,
  isContextView,
  isContainerView,
  isComponentView,
  isDynamicView,
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

  it('createComponentViewOptions produces correct options', () => {
    const opts = createComponentViewOptions('Auth Service Components', { containerId: 'app-1' });
    expect(opts.kind).toBe('component');
    expect(opts.name).toBe('Auth Service Components');
    expect(opts.filter).toEqual({ containerId: 'app-1' });
  });

  it('detects view kinds correctly', () => {
    const ctx = { kind: 'context' };
    const cnt = { kind: 'container' };
    const cmp = { kind: 'component' };
    
    expect(isContextView(ctx)).toBe(true);
    expect(isContextView(cnt)).toBe(false);
    
    expect(isContainerView(cnt)).toBe(true);
    expect(isContainerView(ctx)).toBe(false);

    expect(isComponentView(cmp)).toBe(true);
    expect(isComponentView(cnt)).toBe(false);
  });

  it('getViewLevelLabel returns correct labels', () => {
    expect(getViewLevelLabel('context')).toBe('Level 1 — Context');
    expect(getViewLevelLabel('container')).toBe('Level 2 — Container');
    expect(getViewLevelLabel('component')).toBe('Level 3 — Component');
    expect(getViewLevelLabel('custom')).toBe('Custom View');
  });

  it('createDynamicViewOptions and isDynamicView work correctly', () => {
    const opts = createDynamicViewOptions('Production AWS Services', {
      environment: 'production',
      cloud: 'AWS',
    });
    expect(opts.name).toBe('Production AWS Services');
    expect(opts.kind).toBe('custom');
    expect(opts.filter).toEqual({
      environment: 'production',
      cloud: 'AWS',
    });

    expect(isDynamicView(opts)).toBe(true);
    expect(isDynamicView({ filter: {} })).toBe(false);
    expect(isDynamicView({})).toBe(false);
  });
});
