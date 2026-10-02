/**
 * DiagramHQ - Event Catalog & Asynchronous Messaging Registry (F123)
 *
 * Provides a searchable, discoverable event catalog for event-driven systems:
 * - Producers, consumers, topic/channel names, event schemas, and frequency.
 * - Brokers: Kafka, RabbitMQ, SQS/SNS, EventBridge, NATS, Redis Streams.
 * - Schemas: JSON Schema, Avro, Protobuf, CloudEvents.
 * - Multi-dimensional search and browsing anchored to C4 architecture services.
 *
 * Strict Acceptance Invariant:
 * - Producer, consumers, schema, topic, frequency
 * - Test: create/browse event entries.
 */

import type { ArchitectureId, ObjectId, ConnectionId } from './ids';
import type { CodeLocationSpec } from './code-mapping';

export type EventBrokerType =
  | 'kafka'
  | 'rabbitmq'
  | 'sqs_sns'
  | 'eventbridge'
  | 'nats'
  | 'redis_streams'
  | 'google_pubsub'
  | 'custom';

export type SchemaFormat = 'json_schema' | 'avro' | 'protobuf' | 'cloud_events' | 'thrift';

export type EventFrequency =
  | 'realtime_high'
  | 'realtime_medium'
  | 'batch_hourly'
  | 'batch_daily'
  | 'infrequent';

export type EventDeliveryGuarantee = 'at_least_once' | 'at_most_once' | 'exactly_once';

export interface EventSchemaField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface EventSchemaDefinition {
  format: SchemaFormat;
  version: string;
  rawSchema?: string;
  fields: EventSchemaField[];
}

export interface EventCatalogEntry {
  id: string;
  architectureId: ArchitectureId;
  name: string;
  topic: string;
  broker: EventBrokerType;
  producerServiceId: ObjectId;
  producerServiceName: string;
  consumerServiceIds: ObjectId[];
  consumerServiceNames: string[];
  schema: EventSchemaDefinition;
  frequency: EventFrequency;
  deliveryGuarantee: EventDeliveryGuarantee;
  description: string;
  tags: string[];
  connectionId?: ConnectionId;
  repoMapping?: CodeLocationSpec;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventCatalogRegistry {
  architectureId: ArchitectureId;
  entries: EventCatalogEntry[];
  totalCount: number;
  producerCount: number;
  consumerCount: number;
  topicCount: number;
  updatedAt: Date;
}

export interface EventCatalogQuery {
  search?: string;
  producerServiceId?: ObjectId;
  consumerServiceId?: ObjectId;
  broker?: EventBrokerType;
  frequency?: EventFrequency;
  tag?: string;
  offset?: number;
  limit?: number;
}

export interface EventCatalogFacets {
  byBroker: Record<EventBrokerType, number>;
  byFrequency: Record<EventFrequency, number>;
  byProducer: Record<string, number>;
  topTopics: Array<{ topic: string; count: number }>;
}

export interface EventCatalogBrowseResult {
  entries: EventCatalogEntry[];
  totalMatching: number;
  facets: EventCatalogFacets;
  offset: number;
  limit: number;
}

/**
 * Creates an empty Event Catalog registry for an architecture.
 */
export function createEventCatalogRegistry(
  architectureId: ArchitectureId,
  initialEntries: EventCatalogEntry[] = []
): EventCatalogRegistry {
  const producers = new Set(initialEntries.map((e) => e.producerServiceId));
  const consumers = new Set(initialEntries.flatMap((e) => e.consumerServiceIds));
  const topics = new Set(initialEntries.map((e) => e.topic));

  return {
    architectureId,
    entries: [...initialEntries],
    totalCount: initialEntries.length,
    producerCount: producers.size,
    consumerCount: consumers.size,
    topicCount: topics.size,
    updatedAt: new Date(),
  };
}

/**
 * Creates a validated Event Catalog entry linking producer, consumers, schema, topic, and frequency.
 */
export function createEventCatalogEntry(params: {
  architectureId: ArchitectureId;
  name: string;
  topic: string;
  broker?: EventBrokerType;
  producerServiceId: ObjectId;
  producerServiceName: string;
  consumerServiceIds?: ObjectId[];
  consumerServiceNames?: string[];
  schema?: Partial<EventSchemaDefinition>;
  frequency?: EventFrequency;
  deliveryGuarantee?: EventDeliveryGuarantee;
  description: string;
  tags?: string[];
  connectionId?: ConnectionId;
  repoMapping?: CodeLocationSpec;
}): EventCatalogEntry {
  const now = new Date();
  const cleanName = params.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const id = `evt_${cleanName}_${Date.now().toString(36)}`;

  const schema: EventSchemaDefinition = {
    format: params.schema?.format ?? 'json_schema',
    version: params.schema?.version ?? '1.0.0',
    rawSchema: params.schema?.rawSchema,
    fields: params.schema?.fields ?? [
      { name: 'eventId', type: 'string', required: true, description: 'Unique event UUID' },
      { name: 'timestamp', type: 'string', required: true, description: 'ISO 8601 emission timestamp' },
    ],
  };

  return {
    id,
    architectureId: params.architectureId,
    name: params.name,
    topic: params.topic,
    broker: params.broker ?? 'kafka',
    producerServiceId: params.producerServiceId,
    producerServiceName: params.producerServiceName,
    consumerServiceIds: params.consumerServiceIds ?? [],
    consumerServiceNames: params.consumerServiceNames ?? [],
    schema,
    frequency: params.frequency ?? 'realtime_medium',
    deliveryGuarantee: params.deliveryGuarantee ?? 'at_least_once',
    description: params.description,
    tags: params.tags ?? [],
    connectionId: params.connectionId,
    repoMapping: params.repoMapping,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Adds an event entry to the registry and updates aggregate statistics.
 */
export function addEventCatalogEntry(
  registry: EventCatalogRegistry,
  entry: EventCatalogEntry
): EventCatalogRegistry {
  const existingIdx = registry.entries.findIndex((e) => e.id === entry.id);
  const updatedEntries = [...registry.entries];

  if (existingIdx !== -1) {
    updatedEntries[existingIdx] = entry;
  } else {
    updatedEntries.push(entry);
  }

  const producers = new Set(updatedEntries.map((e) => e.producerServiceId));
  const consumers = new Set(updatedEntries.flatMap((e) => e.consumerServiceIds));
  const topics = new Set(updatedEntries.map((e) => e.topic));

  return {
    ...registry,
    entries: updatedEntries,
    totalCount: updatedEntries.length,
    producerCount: producers.size,
    consumerCount: consumers.size,
    topicCount: topics.size,
    updatedAt: new Date(),
  };
}

/**
 * Registers an additional consumer service subscription on an event entry.
 */
export function addConsumerToEventEntry(
  entry: EventCatalogEntry,
  consumerServiceId: ObjectId,
  consumerServiceName: string
): EventCatalogEntry {
  if (entry.consumerServiceIds.includes(consumerServiceId)) {
    return entry;
  }

  return {
    ...entry,
    consumerServiceIds: [...entry.consumerServiceIds, consumerServiceId],
    consumerServiceNames: [...entry.consumerServiceNames, consumerServiceName],
    updatedAt: new Date(),
  };
}

/**
 * Browses, filters, and facets the Event Catalog.
 */
export function browseEventCatalog(
  registry: EventCatalogRegistry,
  query: EventCatalogQuery = {}
): EventCatalogBrowseResult {
  const {
    search,
    producerServiceId,
    consumerServiceId,
    broker,
    frequency,
    tag,
    offset = 0,
    limit = 50,
  } = query;

  const byBroker: Record<EventBrokerType, number> = {
    kafka: 0,
    rabbitmq: 0,
    sqs_sns: 0,
    eventbridge: 0,
    nats: 0,
    redis_streams: 0,
    google_pubsub: 0,
    custom: 0,
  };

  const byFrequency: Record<EventFrequency, number> = {
    realtime_high: 0,
    realtime_medium: 0,
    batch_hourly: 0,
    batch_daily: 0,
    infrequent: 0,
  };

  const byProducer: Record<string, number> = {};
  const topicCounts: Record<string, number> = {};

  for (const entry of registry.entries) {
    byBroker[entry.broker] = (byBroker[entry.broker] || 0) + 1;
    byFrequency[entry.frequency] = (byFrequency[entry.frequency] || 0) + 1;
    byProducer[entry.producerServiceName] = (byProducer[entry.producerServiceName] || 0) + 1;
    topicCounts[entry.topic] = (topicCounts[entry.topic] || 0) + 1;
  }

  let filtered = registry.entries;

  if (producerServiceId) {
    filtered = filtered.filter((e) => e.producerServiceId === producerServiceId);
  }

  if (consumerServiceId) {
    filtered = filtered.filter((e) => e.consumerServiceIds.includes(consumerServiceId));
  }

  if (broker) {
    filtered = filtered.filter((e) => e.broker === broker);
  }

  if (frequency) {
    filtered = filtered.filter((e) => e.frequency === frequency);
  }

  if (tag) {
    filtered = filtered.filter((e) => e.tags.includes(tag));
  }

  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((e) => {
      const matchName = e.name.toLowerCase().includes(q);
      const matchTopic = e.topic.toLowerCase().includes(q);
      const matchDesc = e.description.toLowerCase().includes(q);
      const matchProducer = e.producerServiceName.toLowerCase().includes(q);
      const matchConsumer = e.consumerServiceNames.some((c) => c.toLowerCase().includes(q));
      return matchName || matchTopic || matchDesc || matchProducer || matchConsumer;
    });
  }

  const topTopics = Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const paginated = filtered.slice(offset, offset + limit);

  return {
    entries: paginated,
    totalMatching: filtered.length,
    facets: {
      byBroker,
      byFrequency,
      byProducer,
      topTopics,
    },
    offset,
    limit,
  };
}
