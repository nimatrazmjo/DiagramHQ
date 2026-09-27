import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GroupNode } from './components/canvas/group-node';
import { createId, createGroup, projectGroupToCanvas } from '@diagramhq/domain';
import React from 'react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';

const createTestNodeProps = (id: string, data: Record<string, unknown>, selected = false): NodeProps => ({
  id, data, selected, type: 'group', zIndex: 0, isConnectable: true,
  positionAbsoluteX: 0, positionAbsoluteY: 0, dragging: false, selectable: true, deletable: true, draggable: true
});

describe('Group UI (F028)', () => {
  it('renders group-node', () => {
    const html = renderToString(React.createElement(ReactFlowProvider, null, React.createElement(GroupNode, createTestNodeProps('g_1', { label: 'Group' })))) ;
    expect(html).toContain('data-testid="group-node"');
  });

  it('renders team variant', () => {
    const html = renderToString(React.createElement(ReactFlowProvider, null, React.createElement(GroupNode, createTestNodeProps('g_1', { label: 'Team', groupKind: 'team' })))) ;
    expect(html).toContain('border-blue-500/50');
    expect(html).toContain('[Group: Team]');
  });

  it('canvas projection', () => {
    const g = createGroup(createId('arch'), createId('ver'), 'Zone', { groupKind: 'zone' });
    const node = projectGroupToCanvas(g);
    expect(node.type).toBe('group');
    expect(node.data.groupKind).toBe('zone');
  });

  it('ArchitectureModelClient placeholder', () => {
    expect(true).toBe(true);
  });
});
