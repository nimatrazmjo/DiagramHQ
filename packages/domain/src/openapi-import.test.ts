import { describe, it, expect } from 'vitest';
import {
  importOpenApiSpec,
  createEmptyApiCatalog,
  addEndpointsToCatalog,
  filterApiCatalog,
  type OpenApiImportInput,
} from './openapi-import';
import type { ObjectId, ArchitectureId } from './ids';

describe('OpenAPI Import & API Catalog (F076)', () => {
  const mockArchId = 'arch-eshop-1' as ArchitectureId;
  const mockServiceId = 'svc-orders' as ObjectId;
  const mockServiceName = 'Order Management Service';

  const sampleOpenApi3Spec = {
    openapi: '3.0.3',
    info: {
      title: 'Order Processing API',
      version: '1.4.0',
      description: 'RESTful API for order placement and fulfillment',
    },
    paths: {
      '/api/v1/orders': {
        get: {
          operationId: 'listOrders',
          summary: 'Retrieve customer orders',
          tags: ['Orders'],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'Number of orders to retrieve',
            },
            {
              name: 'status',
              in: 'query',
              required: false,
              description: 'Filter orders by payment status',
            },
          ],
          responses: {
            '200': { description: 'List of matching orders' },
            '401': { description: 'Unauthorized' },
          },
        },
        post: {
          operationId: 'createOrder',
          summary: 'Submit a new customer order',
          tags: ['Orders', 'Checkout'],
          responses: {
            '201': { description: 'Order created successfully' },
            '400': { description: 'Invalid checkout payload' },
          },
        },
      },
      '/api/v1/orders/{orderId}': {
        get: {
          operationId: 'getOrderById',
          summary: 'Fetch order details by ID',
          tags: ['Orders'],
          parameters: [
            {
              name: 'orderId',
              in: 'path',
              required: true,
              description: 'Unique UUID of order',
            },
          ],
          responses: {
            '200': { description: 'Order found' },
            '404': { description: 'Order not found' },
          },
        },
        delete: {
          operationId: 'cancelOrder',
          summary: 'Cancel an unpaid order',
          tags: ['Orders'],
          parameters: [
            {
              name: 'orderId',
              in: 'path',
              required: true,
            },
          ],
          responses: {
            '204': { description: 'Order cancelled' },
            '409': { description: 'Order already fulfilled' },
          },
        },
      },
    },
  };

  it('acceptance test: imports an OpenAPI spec and endpoints populate the API catalog linked to service', () => {
    const importInput: OpenApiImportInput = {
      specContent: JSON.stringify(sampleOpenApi3Spec),
      targetServiceId: mockServiceId,
      targetServiceName: mockServiceName,
      architectureId: mockArchId,
    };

    // 1. Import spec
    const result = importOpenApiSpec(importInput);

    expect(result.success).toBe(true);
    expect(result.specTitle).toBe('Order Processing API');
    expect(result.specVersion).toBe('3.0.3');
    expect(result.endpoints).toHaveLength(4);

    // 2. Endpoints populate the API catalog
    let catalog = createEmptyApiCatalog(mockArchId);
    expect(catalog.endpoints).toHaveLength(0);

    catalog = addEndpointsToCatalog(catalog, result.endpoints);
    expect(catalog.endpoints).toHaveLength(4);

    // 3. Verify endpoints link to the service
    for (const endpoint of catalog.endpoints) {
      expect(endpoint.serviceId).toBe(mockServiceId);
      expect(endpoint.serviceName).toBe(mockServiceName);
      expect(endpoint.architectureId).toBe(mockArchId);
    }

    // 4. Verify endpoint details
    const listEp = catalog.endpoints.find((e) => e.method === 'GET' && e.path === '/api/v1/orders');
    expect(listEp).toBeDefined();
    expect(listEp?.operationId).toBe('listOrders');
    expect(listEp?.parameters).toHaveLength(2);
    expect(listEp?.responseStatusCodes).toContain('200');
    expect(listEp?.responseStatusCodes).toContain('401');

    const getByIdEp = catalog.endpoints.find(
      (e) => e.method === 'GET' && e.path === '/api/v1/orders/{orderId}'
    );
    expect(getByIdEp).toBeDefined();
    expect(getByIdEp?.parameters[0]?.in).toBe('path');
    expect(getByIdEp?.parameters[0]?.required).toBe(true);
  });

  it('filters and browses API catalog entries by service, method, and search query', () => {
    const result = importOpenApiSpec({
      specContent: sampleOpenApi3Spec,
      targetServiceId: mockServiceId,
      targetServiceName: mockServiceName,
      architectureId: mockArchId,
    });
    const catalog = addEndpointsToCatalog(createEmptyApiCatalog(mockArchId), result.endpoints);

    // Filter by HTTP Method
    const postEndpoints = filterApiCatalog(catalog, { method: 'POST' });
    expect(postEndpoints).toHaveLength(1);
    expect(postEndpoints[0]?.operationId).toBe('createOrder');

    // Filter by tag
    const checkoutEndpoints = filterApiCatalog(catalog, { tag: 'Checkout' });
    expect(checkoutEndpoints).toHaveLength(1);
    expect(checkoutEndpoints[0]?.path).toBe('/api/v1/orders');

    // Search query matching
    const searchById = filterApiCatalog(catalog, { searchQuery: 'cancel' });
    expect(searchById).toHaveLength(1);
    expect(searchById[0]?.method).toBe('DELETE');
  });

  it('deduplicates overlapping endpoint imports in the catalog cleanly', () => {
    const result = importOpenApiSpec({
      specContent: sampleOpenApi3Spec,
      targetServiceId: mockServiceId,
      targetServiceName: mockServiceName,
      architectureId: mockArchId,
    });

    let catalog = createEmptyApiCatalog(mockArchId);
    catalog = addEndpointsToCatalog(catalog, result.endpoints);
    expect(catalog.endpoints).toHaveLength(4);

    // Re-importing same endpoints updates rather than duplicates
    catalog = addEndpointsToCatalog(catalog, result.endpoints);
    expect(catalog.endpoints).toHaveLength(4);
  });

  it('handles invalid specification documents gracefully with diagnostic message', () => {
    const result = importOpenApiSpec({
      specContent: '{ invalid json content',
      targetServiceId: mockServiceId,
      targetServiceName: mockServiceName,
      architectureId: mockArchId,
    });

    expect(result.success).toBe(false);
    expect(result.endpoints).toHaveLength(0);
    expect(result.summary).toContain('Failed to parse');
    expect(result.errors).toBeDefined();
  });
});
