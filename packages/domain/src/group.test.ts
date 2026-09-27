import { describe, expect, it } from 'vitest';
import {
  createGroup,
  isGroup,
  projectGroupToCanvas,
} from './group';
import type { ModelObject } from './types';

describe('Group Domain (F028)', () => {
  it('creates group with kind and color', () => {
    const g = createGroup('arch_1', 'ver_1', 'Backend Team', {
      groupKind: 'team',
      color: '#ff0000',
    });
    expect(g.kind).toBe('group');
    expect(g.id.startsWith('grp_')).toBe(true);
    expect(g.metadata?.groupKind).toBe('team');
    expect(g.metadata?.color).toBe('#ff0000');
  });

  it('creates standalone group', () => {
    const g = createGroup('arch_1', 'ver_1', 'Boundary');
    expect(g.parentId).toBeNull();
    expect(g.metadata?.groupKind).toBe('group');
  });

  it('discriminates non-group', () => {
    const g = createGroup('arch_1', 'ver_1', 'G');
    expect(isGroup(g)).toBe(true);
    
    expect(isGroup({ kind: 'component' } as unknown as ModelObject)).toBe(false);
  });

  it('projects to canvas', () => {
    const g = createGroup('arch_1', 'ver_1', 'Network Zone', {
      groupKind: 'zone',
      position: { x: 100, y: 150 },
    });
    const node = projectGroupToCanvas(g, { childCount: 5 });
    expect(node.type).toBe('group');
    expect(node.width).toBe(300);
    expect(node.height).toBe(200);
    expect(node.position).toEqual({ x: 100, y: 150 });
    expect(node.data.label).toBe('Network Zone');
    expect(node.data.groupKind).toBe('zone');
    expect(node.data.childCount).toBe(5);
    expect(node.data.groupId).toBe(g.id);
  });
});
