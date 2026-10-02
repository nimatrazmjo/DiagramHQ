import { describe, it, expect } from 'vitest';
import {
  createApiCatalogRegistry,
  createApiCatalogEntry,
  addApiCatalogEntry,
  linkApiEntryToModelObject,
  deprecateApiEntry,
  browseApiCatalog,
} from './api-catalog';
import { createId, type ArchitectureId, type ObjectId, type VersionId } from './ids';
import type { ModelObject } from './types';

describe('Centralized API Catalog & Interface Registry (F122)', () => {
  const archId = createId('arch') as ArchitectureId;
  const verId = createId('ver') as VersionId;
  const ordersServiceId = createId('app') as ObjectId;
  const billingServiceId = createId('app') as ObjectId;

  it('creates an API catalog entry with service and repository linkage', () => {
    const entry = createApiCatalogEntry({
      architectureId: archId,
      serviceId: ordersServiceId,
      serviceName: 'Orders Service',
      protocol: 'rest',
      path: '/api/v1/orders',
      method: 'POST',
      summary: 'Place new customer order',
      authScheme: 'bearer',
      tags: ['Orders', 'Checkout'],
      repoMapping: {
        repositoryUrl: 'https://github.com/acme/orders-service',
        provider: 'github',
        filePath: 'src/controllers/order.controller.ts',
        lineStart: 45,
        lineEnd: 70,
      },
    });

    expect(entry.id).toContain('api_post_');
    expect(entry.serviceId).toBe(ordersServiceId);
    expect(entry.serviceName).toBe('Orders Service');
    expect(entry.path).toBe('/api/v1/orders');
    expect(entry.method).toBe('POST');
    expect(entry.status).toBe('active');
    expect(entry.repoMapping?.repositoryUrl).toBe('https://github.com/acme/orders-service');
    expect(entry.repoMapping?.filePath).toBe('src/controllers/order.controller.ts');
  });

  it('populates and manages registry entries across multiple services and protocols', () => {
    let registry = createApiCatalogRegistry(archId);

    const restEntry = createApiCatalogEntry({
      architectureId: archId,
      serviceId: ordersServiceId,
      serviceName: 'Orders Service',
      protocol: 'rest',
      path: '/api/v1/orders',
      method: 'GET',
      summary: 'List orders',
      tags: ['Orders'],
    });

    const graphqlEntry = createApiCatalogEntry({
      architectureId: archId,
      serviceId: ordersServiceId,
      serviceName: 'Orders Service',
      protocol: 'graphql',
      path: 'Query.orderById',
      summary: 'Query single order by ID',
      tags: ['Orders'],
    });

    const grpcEntry = createApiCatalogEntry({
      architectureId: archId,
      serviceId: billingServiceId,
      serviceName: 'Billing Service',
      protocol: 'grpc',
      path: 'BillingRpc/ProcessInvoice',
      summary: 'Process customer billing invoice',
      tags: ['Billing'],
    });

    registry = addApiCatalogEntry(registry, restEntry);
    registry = addApiCatalogEntry(registry, graphqlEntry);
    registry = addApiCatalogEntry(registry, grpcEntry);

    expect(registry.totalCount).toBe(3);
    expect(registry.serviceCount).toBe(2);
  });

  it('links an existing catalog entry to a model object and inherits code mapping', () => {
    const mockModelObject: ModelObject = {
      id: ordersServiceId,
      architectureId: archId,
      versionId: verId,
      kind: 'application',
      name: 'Order Fulfillment Core',
      metadata: {
        codeMapping: {
          repo: 'fulfillment-repo',
          filePath: 'services/order.ts',
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const initialEntry = createApiCatalogEntry({
      architectureId: archId,
      serviceId: createId('app') as ObjectId,
      serviceName: 'Draft Service',
      path: '/v2/fulfill',
      summary: 'Fulfill order',
    });

    const linked = linkApiEntryToModelObject(initialEntry, mockModelObject);

    expect(linked.serviceId).toBe(ordersServiceId);
    expect(linked.serviceName).toBe('Order Fulfillment Core');
    expect(linked.repoMapping?.repositoryUrl).toBe('fulfillment-repo');
    expect(linked.repoMapping?.filePath).toBe('services/order.ts');
  });

  it('marks an API catalog entry as deprecated or sunset with deprecation rationale', () => {
    let registry = createApiCatalogRegistry(archId);
    const entry = createApiCatalogEntry({
      architectureId: archId,
      serviceId: ordersServiceId,
      serviceName: 'Orders Service',
      path: '/api/v0/legacy-checkout',
      method: 'POST',
      summary: 'Legacy checkout API',
    });
    registry = addApiCatalogEntry(registry, entry);

    registry = deprecateApiEntry(
      registry,
      entry.id,
      'Migrated to /api/v1/checkout GraphQL mutation',
      'deprecated'
    );

    const updated = registry.entries.find((e) => e.id === entry.id);
    expect(updated?.status).toBe('deprecated');
    expect(updated?.deprecationReason).toContain('GraphQL mutation');
  });

  it('browses API catalog with multi-dimensional filtering, search, and facets', () => {
    let registry = createApiCatalogRegistry(archId);

    const entry1 = createApiCatalogEntry({
      architectureId: archId,
      serviceId: ordersServiceId,
      serviceName: 'Orders Service',
      protocol: 'rest',
      path: '/api/v1/orders',
      method: 'GET',
      summary: 'List customer orders',
      tags: ['Orders', 'E-Commerce'],
    });

    const entry2 = createApiCatalogEntry({
      architectureId: archId,
      serviceId: ordersServiceId,
      serviceName: 'Orders Service',
      protocol: 'rest',
      path: '/api/v1/orders',
      method: 'POST',
      summary: 'Create customer order',
      tags: ['Orders'],
    });

    const entry3 = createApiCatalogEntry({
      architectureId: archId,
      serviceId: billingServiceId,
      serviceName: 'Billing Service',
      protocol: 'grpc',
      path: 'Billing/ChargeCard',
      summary: 'Charge payment credit card',
      tags: ['Payments', 'Billing'],
    });

    registry = addApiCatalogEntry(registry, entry1);
    registry = addApiCatalogEntry(registry, entry2);
    registry = addApiCatalogEntry(registry, entry3);

    // 1. Text search
    const searchRes = browseApiCatalog(registry, { search: 'credit card' });
    expect(searchRes.totalMatching).toBe(1);
    expect(searchRes.entries[0].summary).toBe('Charge payment credit card');

    // 2. Service filter
    const serviceRes = browseApiCatalog(registry, { serviceId: ordersServiceId });
    expect(serviceRes.totalMatching).toBe(2);

    // 3. Protocol filter
    const grpcRes = browseApiCatalog(registry, { protocol: 'grpc' });
    expect(grpcRes.totalMatching).toBe(1);

    // 4. Tag filter
    const tagRes = browseApiCatalog(registry, { tag: 'E-Commerce' });
    expect(tagRes.totalMatching).toBe(1);

    // 5. Facets check
    expect(searchRes.facets.byProtocol.rest).toBe(2);
    expect(searchRes.facets.byProtocol.grpc).toBe(1);
    expect(searchRes.facets.byService['Orders Service']).toBe(2);
    expect(searchRes.facets.byService['Billing Service']).toBe(1);
  });
});
