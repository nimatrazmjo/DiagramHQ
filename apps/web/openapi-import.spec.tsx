import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  type ObjectId,
  type ArchitectureId,
  createEmptyApiCatalog,
  addEndpointsToCatalog,
  importOpenApiSpec,
} from '@diagramhq/domain';
import {
  OpenApiImportModal,
  ApiCatalogDrawer,
} from './components/canvas/openapi-import-panel';

describe('OpenAPI Import and API Catalog Canvas UI (F076)', () => {
  const mockArchId = 'arch-eshop-web' as ArchitectureId;
  const mockServices = [
    { id: 'svc-orders' as ObjectId, name: 'Order Service' },
    { id: 'svc-billing' as ObjectId, name: 'Billing Service' },
  ];

  const sampleSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Customer Orders API',
      version: '1.0.0',
    },
    paths: {
      '/api/v1/orders': {
        get: {
          summary: 'List customer orders',
          operationId: 'listOrders',
          tags: ['Orders'],
          responses: { '200': { description: 'Success' } },
        },
        post: {
          summary: 'Create customer order',
          operationId: 'createOrder',
          tags: ['Orders'],
          responses: { '201': { description: 'Created' } },
        },
      },
    },
  };

  it('renders OpenApiImportModal with target service selector, spec input, and submit action', () => {
    const onClose = vi.fn();
    const onImportSuccess = vi.fn();

    const html = renderToString(
      <OpenApiImportModal
        isOpen={true}
        onClose={onClose}
        services={mockServices}
        architectureId={mockArchId}
        onImportSuccess={onImportSuccess}
      />
    );

    expect(html).toContain('Import OpenAPI Specification');
    expect(html).toContain('Order Service');
    expect(html).toContain('Billing Service');
    expect(html).toContain('data-testid="openapi-import-modal"');
    expect(html).toContain('data-testid="openapi-spec-input"');
    expect(html).toContain('Import Endpoints into API Catalog');
  });

  it('renders ApiCatalogDrawer with imported endpoints, method badges, and search filtering', () => {
    const importResult = importOpenApiSpec({
      specContent: sampleSpec,
      targetServiceId: mockServices[0]!.id,
      targetServiceName: mockServices[0]!.name,
      architectureId: mockArchId,
    });

    const catalog = addEndpointsToCatalog(
      createEmptyApiCatalog(mockArchId),
      importResult.endpoints
    );

    const onClose = vi.fn();
    const onSelect = vi.fn();

    const html = renderToString(
      <ApiCatalogDrawer
        isOpen={true}
        onClose={onClose}
        catalog={catalog}
        onSelectEndpoint={onSelect}
      />
    );

    expect(html).toContain('Architecture API Catalog');
    expect(html).toContain('2 endpoints');
    expect(html).toContain('/api/v1/orders');
    expect(html).toContain('GET');
    expect(html).toContain('POST');
    expect(html).toContain('Order Service');
    expect(html).toContain('List customer orders');
    expect(html).toContain('data-testid="api-catalog-drawer"');
    expect(html).toContain('data-testid="api-search-input"');
  });

  it('returns null when modals are closed', () => {
    const modalHtml = renderToString(
      <OpenApiImportModal
        isOpen={false}
        onClose={() => {}}
        services={mockServices}
        architectureId={mockArchId}
      />
    );
    expect(modalHtml).toBe('');

    const catalog = createEmptyApiCatalog(mockArchId);
    const drawerHtml = renderToString(
      <ApiCatalogDrawer
        isOpen={false}
        onClose={() => {}}
        catalog={catalog}
      />
    );
    expect(drawerHtml).toBe('');
  });
});
