import {
  createId,
  type ArchitectureId,
  type ObjectId,
  type VersionId,
} from './ids';
import type { ModelObject } from './types';
import type { CanvasNode } from './canvas';

export type QueueKind =
  | 'kafka'
  | 'rabbitmq'
  | 'sqs'
  | 'eventbridge'
  | 'pubsub'
  | 'nats'
  | 'queue';

export interface QueueMetadata {
  storeKind: 'queue';
  queueKind?: QueueKind | string;
  technology?: string;
  topics?: string[];
  partitions?: number;
  retentionPolicy?: string;
  [key: string]: unknown;
}

export interface QueueNodeData {
  label: string;
  queueKind?: string;
  technology?: string;
  topics?: string[];
  description?: string;
  parentId?: string;
  queueId?: string;
  [key: string]: unknown;
}

export interface CreateQueueOptions {
  parentId?: ObjectId | string;
  queueKind?: QueueKind | string;
  technology?: string;
  topics?: string[];
  partitions?: number;
  retentionPolicy?: string;
  description?: string;
  position?: { x: number; y: number };
}

export function isQueue(obj: ModelObject): boolean {
  return obj.kind === 'store' && obj.metadata?.storeKind === 'queue';
}

export function createQueue(
  architectureId: ArchitectureId,
  versionId: VersionId,
  name: string,
  options: CreateQueueOptions = {},
): ModelObject {
  const kind = options.queueKind ?? 'queue';
  return {
    id: createId('sto'),
    architectureId,
    versionId,
    parentId: (options.parentId as ObjectId) ?? null,
    kind: 'store',
    name,
    description: options.description ?? null,
    metadata: {
      storeKind: 'queue',
      queueKind: kind,
      technology: options.technology ?? '',
      topics: options.topics ?? [],
      partitions: options.partitions ?? 1,
      retentionPolicy: options.retentionPolicy ?? '',
      c4Level: 2,
      c4Kind: 'queue',
    },
    position: options.position ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export interface ProjectQueueOptions {
  x?: number;
  y?: number;
}

export function projectQueueToCanvas(
  queue: ModelObject,
  options: ProjectQueueOptions = {},
): CanvasNode {
  const x = queue.position?.x ?? options.x ?? 100;
  const y = queue.position?.y ?? options.y ?? 100;

  const nodeData: QueueNodeData = {
    label: queue.name,
    queueKind: typeof queue.metadata?.queueKind === 'string' ? queue.metadata.queueKind : 'queue',
    technology: typeof queue.metadata?.technology === 'string' && queue.metadata.technology.length > 0 ? queue.metadata.technology : undefined,
    topics: Array.isArray(queue.metadata?.topics) ? (queue.metadata.topics as string[]) : undefined,
    description: queue.description ?? undefined,
    parentId: queue.parentId ?? undefined,
    queueId: queue.id,
  };

  return {
    id: queue.id,
    type: 'queue',
    position: { x, y },
    data: nodeData,
    width: 220,
    height: 130,
  };
}
