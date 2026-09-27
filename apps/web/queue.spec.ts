import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueueNode } from './components/canvas/queue-node';
import { createId, createQueue, projectQueueToCanvas } from '@diagramhq/domain';
import React from 'react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';

const createTestNodeProps = (id: string, data: Record<string, unknown>, selected = false): NodeProps => ({
  id, data, selected, type: 'queue', zIndex: 0, isConnectable: true,
  positionAbsoluteX: 0, positionAbsoluteY: 0, dragging: false, selectable: true, deletable: true, draggable: true
});

describe('Queue UI (F027)', () => {
  it('renders queue-node', () => {
    const html = renderToString(React.createElement(ReactFlowProvider, null, React.createElement(QueueNode, createTestNodeProps('q_1', { label: 'Tasks' })))) ;
    expect(html).toContain('data-testid="queue-node"');
  });

  it('renders kafka variant', () => {
    const html = renderToString(React.createElement(ReactFlowProvider, null, React.createElement(QueueNode, createTestNodeProps('q_1', { label: 'Events', queueKind: 'kafka' })))) ;
    expect(html).toContain('border-green-600/70');
    expect(html).toContain('[Queue: Kafka]');
  });

  it('canvas projection matches node props', () => {
    const q = createQueue(createId('arch'), createId('ver'), 'TasksQ', { queueKind: 'sqs' });
    const node = projectQueueToCanvas(q);
    expect(node.type).toBe('queue');
    expect(node.data.queueKind).toBe('sqs');
  });

  it('ArchitectureModelClient placeholder', () => {
    expect(true).toBe(true);
  });
});
