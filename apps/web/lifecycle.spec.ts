import { describe, it, expect } from 'vitest';
import {
  getLifecycleBadgeColor,
  isValidLifecycleTransition,
  createLifecycleTransition,
} from '@diagramhq/domain';

describe('Lifecycle Domain in Web', () => {
  it('getLifecycleBadgeColor returns green class for live', () => {
    expect(getLifecycleBadgeColor('live')).toContain('green');
  });

  it('isValidLifecycleTransition correctly validates transitions', () => {
    expect(isValidLifecycleTransition('future', 'live')).toBe(true);
    expect(isValidLifecycleTransition('live', 'future')).toBe(false);
  });

  it('createLifecycleTransition creates proper transition object', () => {
    const transition = createLifecycleTransition('future', 'live', 'User1');
    expect(transition.from).toBe('future');
    expect(transition.to).toBe('live');
    expect(transition.by).toBe('User1');
    expect(transition.at).toBeDefined();
  });
});
