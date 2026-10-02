import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  type ArchitectureId,
  type ObjectId,
  createApiCatalogRegistry,
  createApiCatalogEntry,
  addApiCatalogEntry,
  deprecateApiEntry,
} from '@diagramhq/domain';
import { ApiCatalogExplorerModal } from './components/canvas/api-catalog-panel';

describe('API Catalog Explorer Canvas UI (F122)', () => {
  const archId = 'arch-eshop' as ArchitectureId;
  const ordersServiceId = 'svc-orders' as ObjectId;
  const billingServiceId = 'svc-billing' as ObjectId;

  let registry = createApiCatalogRegistry(archId);

  const entry1 = createApiCatalogEntry({
    architectureId: archId,
    serviceId: ordersServiceId,
    serviceName: 'Orders Service',
    protocol: 'rest',
    path: '/api/v1/orders',
    method: 'GET',
    summary: 'List customer orders',
    tags: ['Orders', 'Checkout'],
    repoMapping: {
      repositoryUrl: 'https://github.com/acme/orders-service',
      provider: 'github',
      filePath: 'src/controllers/order.controller.ts',
      lineStart: 25,
      lineEnd: 50,
    },
  });

  const entry2 = createApiCatalogEntry({
    architectureId: archId,
    serviceId: ordersServiceId,
    serviceName: 'Orders Service',
    protocol: 'graphql',
    path: 'Query.orderById',
    summary: 'Query single order by ID',
    tags: ['Orders'],
  });

  const entry3 = createApiCatalogEntry({
    architectureId: archId,
    serviceId: billingServiceId,
    serviceName: 'Billing Service',
    protocol: 'grpc',
    path: 'Billing/ProcessInvoice',
    summary: 'Process payment billing invoice',
    tags: ['Billing'],
  });

  registry = addApiCatalogEntry(registry, entry1);
  registry = addApiCatalogEntry(registry, entry2);
  registry = addApiCatalogEntry(registry, entry3);
  registry = deprecateApiEntry(
    registry,
    entry2.id,
    'Migrated to REST v2 API',
    'deprecated'
  );

  it('renders ApiCatalogExplorerModal with metrics banner and endpoint list', () => {
    const html = renderToString(
      <ApiCatalogExplorerModal
        isOpen={true}
        onClose={vi.fn()}
        registry={registry}
        onSelectEntry={vi.fn()}
      />
    );

    expect(html).toContain('API Catalog &amp; Interface Registry');
    expect(html).toContain('3 APIs');
    expect(html).toContain('2 Services');
    expect(html).toContain('2 Active');
    expect(html).toContain('1 Deprecated');

    // Endpoint rows
    expect(html).toContain('/api/v1/orders');
    expect(html).toContain('Query.orderById');
    expect(html).toContain('Billing/ProcessInvoice');
    expect(html).toContain('Orders Service');
    expect(html).toContain('Billing Service');
    expect(html).toContain('Deprecated');
  });

  it('renders search input, protocol filter tabs, and service filter dropdown', () => {
    const html = renderToString(
      <ApiCatalogExplorerModal
        isOpen={true}
        onClose={vi.fn()}
        registry={registry}
      />
    );

    expect(html).toContain('Search by endpoint path, summary, or method...');
    expect(html).toContain('rest');
    expect(html).toContain('graphql');
    expect(html).toContain('grpc');
    expect(html).toContain('All Services');
    expect(html).toContain('Orders Service');
    expect(html).toContain('Billing Service');
  });

  it('renders null when modal is closed', () => {
    const html = renderToString(
      <ApiCatalogExplorerModal
        isOpen={false}
        onClose={vi.fn()}
        registry={registry}
      />
    );
    expect(html).toBe('');
  });
});
