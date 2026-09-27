import { describe, expect, it } from 'vitest';
import {
  createQueue,
  isQueue,
  projectQueueToCanvas,
} from './queue';
import type { ModelObject } from './types';

describe('Queue Domain (F027)', () => {
  it('creates Kafka queue with topics', () => {
    const q = createQueue('arch_1', 'ver_1', 'EventsQueue', {
      queueKind: 'kafka',
      technology: 'Confluent Kafka',
      topics: ['user_events', 'system_events'],
    });
    expect(q.kind).toBe('store');
    expect(q.id.startsWith('sto_')).toBe(true);
    expect(q.metadata?.storeKind).toBe('queue');
    expect(q.metadata?.queueKind).toBe('kafka');
    expect(q.metadata?.technology).toBe('Confluent Kafka');
    expect(q.metadata?.topics).toEqual(['user_events', 'system_events']);
  });

  it('creates standalone queue', () => {
    const q = createQueue('arch_1', 'ver_1', 'TaskQueue');
    expect(q.parentId).toBeNull();
    expect(q.metadata?.storeKind).toBe('queue');
    expect(q.metadata?.queueKind).toBe('queue');
  });

  it('discriminates non-queue', () => {
    const q = createQueue('arch_1', 'ver_1', 'Q');
    expect(isQueue(q)).toBe(true);
    
    expect(isQueue({ kind: 'store' } as unknown as ModelObject)).toBe(false);
    expect(isQueue({ kind: 'store', metadata: { storeKind: 'other' } } as unknown as ModelObject)).toBe(false);
  });

  it('projects to canvas', () => {
    const q = createQueue('arch_1', 'ver_1', 'KafkaCluster', {
      queueKind: 'kafka',
      technology: 'Kafka',
      topics: ['a', 'b'],
      position: { x: 10, y: 20 },
    });
    const node = projectQueueToCanvas(q);
    expect(node.type).toBe('queue');
    expect(node.width).toBe(220);
    expect(node.height).toBe(130);
    expect(node.position).toEqual({ x: 10, y: 20 });
    expect(node.data.label).toBe('KafkaCluster');
    expect(node.data.queueKind).toBe('kafka');
    expect(node.data.topics).toEqual(['a', 'b']);
    expect(node.data.queueId).toBe(q.id);
  });
});
