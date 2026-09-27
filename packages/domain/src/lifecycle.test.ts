import { describe, it, expect } from 'vitest';
import { isValidLifecycleTransition, createLifecycleTransition, getLifecycleBadgeColor, LIFECYCLE_STATES } from './lifecycle';

describe('lifecycle domain', () => {
  it('valid transition future->live succeeds', () => {
    expect(isValidLifecycleTransition('future', 'live')).toBe(true);
  });

  it('invalid transition future->removed throws', () => {
    expect(() => createLifecycleTransition('future', 'removed')).toThrow();
  });

  it('getLifecycleBadgeColor returns correct class for live', () => {
    expect(getLifecycleBadgeColor('live')).toContain('green');
  });

  it('LIFECYCLE_STATES has all 4 states', () => {
    expect(LIFECYCLE_STATES).toHaveLength(4);
    expect(LIFECYCLE_STATES).toContain('future');
    expect(LIFECYCLE_STATES).toContain('live');
    expect(LIFECYCLE_STATES).toContain('deprecated');
    expect(LIFECYCLE_STATES).toContain('removed');
  });
});
