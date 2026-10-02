import { describe, it, expect } from 'vitest';
import {
  createEventCatalogRegistry,
  createEventCatalogEntry,
  addEventCatalogEntry,
  addConsumerToEventEntry,
  browseEventCatalog,
} from './event-catalog';
import { createId, type ArchitectureId, type ObjectId } from './ids';

describe('Event Catalog & Asynchronous Messaging Registry (F123)', () => {
  const archId = createId('arch') as ArchitectureId;
  const orderSvcId = createId('app') as ObjectId;
  const inventorySvcId = createId('app') as ObjectId;
  const emailSvcId = createId('app') as ObjectId;
  const fraudSvcId = createId('app') as ObjectId;

  it('creates an Event Catalog entry with producer, consumers, schema, topic, and frequency', () => {
    const entry = createEventCatalogEntry({
      architectureId: archId,
      name: 'OrderPlaced',
      topic: 'eshop.orders.v1.events',
      broker: 'kafka',
      producerServiceId: orderSvcId,
      producerServiceName: 'Order Service',
      consumerServiceIds: [inventorySvcId, emailSvcId],
      consumerServiceNames: ['Inventory Service', 'Email Notification Service'],
      schema: {
        format: 'json_schema',
        version: '1.2.0',
        fields: [
          { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
          { name: 'customerId', type: 'string', required: true },
          { name: 'totalAmount', type: 'number', required: true },
        ],
      },
      frequency: 'realtime_high',
      deliveryGuarantee: 'at_least_once',
      description: 'Emitted when a customer places an order successfully',
      tags: ['Orders', 'Checkout'],
    });

    expect(entry.id).toContain('evt_orderplaced_');
    expect(entry.name).toBe('OrderPlaced');
    expect(entry.topic).toBe('eshop.orders.v1.events');
    expect(entry.broker).toBe('kafka');
    expect(entry.producerServiceName).toBe('Order Service');
    expect(entry.consumerServiceNames).toContain('Inventory Service');
    expect(entry.consumerServiceNames).toContain('Email Notification Service');
    expect(entry.schema.version).toBe('1.2.0');
    expect(entry.schema.fields.length).toBe(3);
    expect(entry.frequency).toBe('realtime_high');
    expect(entry.deliveryGuarantee).toBe('at_least_once');
  });

  it('populates and manages registry entries across multiple producers and brokers', () => {
    let registry = createEventCatalogRegistry(archId);

    const event1 = createEventCatalogEntry({
      architectureId: archId,
      name: 'OrderPlaced',
      topic: 'eshop.orders.v1.events',
      broker: 'kafka',
      producerServiceId: orderSvcId,
      producerServiceName: 'Order Service',
      consumerServiceIds: [inventorySvcId],
      consumerServiceNames: ['Inventory Service'],
      frequency: 'realtime_high',
      description: 'Order created',
    });

    const event2 = createEventCatalogEntry({
      architectureId: archId,
      name: 'PaymentSettled',
      topic: 'eshop.payments.settled',
      broker: 'rabbitmq',
      producerServiceId: fraudSvcId,
      producerServiceName: 'Payment Gateway',
      consumerServiceIds: [orderSvcId],
      consumerServiceNames: ['Order Service'],
      frequency: 'realtime_medium',
      description: 'Payment settled',
    });

    registry = addEventCatalogEntry(registry, event1);
    registry = addEventCatalogEntry(registry, event2);

    expect(registry.totalCount).toBe(2);
    expect(registry.producerCount).toBe(2);
    expect(registry.consumerCount).toBe(2);
    expect(registry.topicCount).toBe(2);
  });

  it('subscribes an additional consumer to an existing event entry', () => {
    const initialEntry = createEventCatalogEntry({
      architectureId: archId,
      name: 'OrderPlaced',
      topic: 'eshop.orders.v1.events',
      producerServiceId: orderSvcId,
      producerServiceName: 'Order Service',
      consumerServiceIds: [inventorySvcId],
      consumerServiceNames: ['Inventory Service'],
      description: 'Order created',
    });

    const updated = addConsumerToEventEntry(
      initialEntry,
      fraudSvcId,
      'Fraud Detection Service'
    );

    expect(updated.consumerServiceIds).toContain(fraudSvcId);
    expect(updated.consumerServiceNames).toContain('Fraud Detection Service');
    expect(updated.consumerServiceIds.length).toBe(2);
  });

  it('browses Event Catalog with search, consumer filtering, and broker facets', () => {
    let registry = createEventCatalogRegistry(archId);

    const event1 = createEventCatalogEntry({
      architectureId: archId,
      name: 'OrderPlaced',
      topic: 'eshop.orders.v1.events',
      broker: 'kafka',
      producerServiceId: orderSvcId,
      producerServiceName: 'Order Service',
      consumerServiceIds: [inventorySvcId, emailSvcId],
      consumerServiceNames: ['Inventory Service', 'Email Notification Service'],
      frequency: 'realtime_high',
      description: 'Order placed by customer',
      tags: ['Orders'],
    });

    const event2 = createEventCatalogEntry({
      architectureId: archId,
      name: 'InventoryDepleted',
      topic: 'eshop.inventory.depleted',
      broker: 'kafka',
      producerServiceId: inventorySvcId,
      producerServiceName: 'Inventory Service',
      consumerServiceIds: [orderSvcId],
      consumerServiceNames: ['Order Service'],
      frequency: 'infrequent',
      description: 'Stock level reached zero',
      tags: ['Inventory', 'Alerts'],
    });

    const event3 = createEventCatalogEntry({
      architectureId: archId,
      name: 'DailySalesDigest',
      topic: 'eshop.analytics.daily_digest',
      broker: 'sqs_sns',
      producerServiceId: orderSvcId,
      producerServiceName: 'Order Service',
      consumerServiceIds: [emailSvcId],
      consumerServiceNames: ['Email Notification Service'],
      frequency: 'batch_daily',
      description: 'Aggregated sales analytics report',
      tags: ['Analytics'],
    });

    registry = addEventCatalogEntry(registry, event1);
    registry = addEventCatalogEntry(registry, event2);
    registry = addEventCatalogEntry(registry, event3);

    // 1. Text search
    const searchRes = browseEventCatalog(registry, { search: 'inventory' });
    expect(searchRes.totalMatching).toBe(2); // OrderPlaced has inventorySvc consumer, InventoryDepleted has inventory topic/producer

    // 2. Filter by consumer service
    const consumerRes = browseEventCatalog(registry, { consumerServiceId: emailSvcId });
    expect(consumerRes.totalMatching).toBe(2); // event1 and event3

    // 3. Filter by broker
    const kafkaRes = browseEventCatalog(registry, { broker: 'kafka' });
    expect(kafkaRes.totalMatching).toBe(2);

    // 4. Filter by frequency
    const dailyRes = browseEventCatalog(registry, { frequency: 'batch_daily' });
    expect(dailyRes.totalMatching).toBe(1);
    expect(dailyRes.entries[0].name).toBe('DailySalesDigest');

    // 5. Facets
    expect(searchRes.facets.byBroker.kafka).toBe(2);
    expect(searchRes.facets.byBroker.sqs_sns).toBe(1);
    expect(searchRes.facets.byFrequency.realtime_high).toBe(1);
    expect(searchRes.facets.byProducer['Order Service']).toBe(2);
  });
});
