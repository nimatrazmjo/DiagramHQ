import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  type ArchitectureId,
  type ObjectId,
  createEventCatalogRegistry,
  createEventCatalogEntry,
  addEventCatalogEntry,
} from '@diagramhq/domain';
import { EventCatalogExplorerModal } from './components/canvas/event-catalog-panel';

describe('Event Catalog Explorer Canvas UI (F123)', () => {
  const archId = 'arch-events' as ArchitectureId;
  const orderSvcId = 'svc-orders' as ObjectId;
  const inventorySvcId = 'svc-inventory' as ObjectId;
  const notificationSvcId = 'svc-notifications' as ObjectId;

  let registry = createEventCatalogRegistry(archId);

  const event1 = createEventCatalogEntry({
    architectureId: archId,
    name: 'OrderCreated',
    topic: 'eshop.orders.created',
    broker: 'kafka',
    producerServiceId: orderSvcId,
    producerServiceName: 'Order Service',
    consumerServiceIds: [inventorySvcId, notificationSvcId],
    consumerServiceNames: ['Inventory Service', 'Notification Service'],
    frequency: 'realtime_high',
    description: 'Fired when a new customer order is placed',
    tags: ['Orders', 'Checkout'],
  });

  const event2 = createEventCatalogEntry({
    architectureId: archId,
    name: 'InventoryReserved',
    topic: 'eshop.inventory.reserved',
    broker: 'rabbitmq',
    producerServiceId: inventorySvcId,
    producerServiceName: 'Inventory Service',
    consumerServiceIds: [orderSvcId],
    consumerServiceNames: ['Order Service'],
    frequency: 'realtime_medium',
    description: 'Fired when warehouse stock is reserved',
    tags: ['Inventory'],
  });

  registry = addEventCatalogEntry(registry, event1);
  registry = addEventCatalogEntry(registry, event2);

  it('renders EventCatalogExplorerModal with metrics banner and event rows', () => {
    const html = renderToString(
      <EventCatalogExplorerModal
        isOpen={true}
        onClose={vi.fn()}
        registry={registry}
        onSelectEvent={vi.fn()}
      />
    );

    expect(html).toContain('Event Catalog &amp; Message Registry');
    expect(html).toContain('2 Events');
    expect(html).toContain('2 Topics');
    expect(html).toContain('2 Services');
    expect(html).toContain('3 Subscribed');

    // Rows
    expect(html).toContain('OrderCreated');
    expect(html).toContain('eshop.orders.created');
    expect(html).toContain('InventoryReserved');
    expect(html).toContain('eshop.inventory.reserved');
    expect(html).toContain('Order Service');
    expect(html).toContain('Inventory Service');
  });

  it('renders search input, broker filter tabs, and dropdown filters', () => {
    const html = renderToString(
      <EventCatalogExplorerModal
        isOpen={true}
        onClose={vi.fn()}
        registry={registry}
      />
    );

    expect(html).toContain('Search events by name, topic, producer, or consumer...');
    expect(html).toContain('kafka');
    expect(html).toContain('rabbitmq');
    expect(html).toContain('All Producers');
    expect(html).toContain('All Frequencies');
    expect(html).toContain('Order Service');
    expect(html).toContain('Inventory Service');
  });

  it('renders null when modal is closed', () => {
    const html = renderToString(
      <EventCatalogExplorerModal
        isOpen={false}
        onClose={vi.fn()}
        registry={registry}
      />
    );
    expect(html).toBe('');
  });
});
