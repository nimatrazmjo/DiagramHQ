import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  type ArchitectureId,
  type ObjectId,
  createDatabaseCatalogRegistry,
  createDatabaseCatalogEntry,
  addDatabaseCatalogEntry,
} from '@diagramhq/domain';
import { DatabaseCatalogExplorerModal } from './components/canvas/database-catalog-panel';

describe('Database Catalog Explorer Canvas UI (F124)', () => {
  const archId = 'arch-db' as ArchitectureId;
  const dbStoreId = 'sto-orders-pg' as ObjectId;

  let registry = createDatabaseCatalogRegistry(archId);

  const db1 = createDatabaseCatalogEntry({
    architectureId: archId,
    datastoreObjectId: dbStoreId,
    databaseName: 'orders_db',
    engine: 'postgresql',
    version: '16',
    description: 'PostgreSQL transactional store',
    schemas: [
      {
        name: 'public',
        tables: [
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false },
              { name: 'customer_id', type: 'uuid', isPrimaryKey: false, isNullable: false },
              { name: 'amount', type: 'numeric(10,2)', isPrimaryKey: false, isNullable: false },
            ],
          },
          {
            name: 'order_items',
            columns: [
              { name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false },
              { name: 'order_id', type: 'uuid', isPrimaryKey: false, isNullable: false },
            ],
          },
        ],
      },
    ],
  });

  registry = addDatabaseCatalogEntry(registry, db1);

  it('renders DatabaseCatalogExplorerModal with metrics banner and database tree', () => {
    const html = renderToString(
      <DatabaseCatalogExplorerModal
        isOpen={true}
        onClose={vi.fn()}
        registry={registry}
        onSelectTable={vi.fn()}
      />
    );

    expect(html).toContain('Database Catalog &amp; Schema Registry');
    expect(html).toContain('1 Databases');
    expect(html).toContain('2 Tables');
    expect(html).toContain('5 Columns');

    // Tree elements
    expect(html).toContain('orders_db');
    expect(html).toContain('public');
    expect(html).toContain('orders');
    expect(html).toContain('order_items');
    expect(html).toContain('3 cols');
    expect(html).toContain('2 cols');
  });

  it('renders search input and engine filter buttons', () => {
    const html = renderToString(
      <DatabaseCatalogExplorerModal
        isOpen={true}
        onClose={vi.fn()}
        registry={registry}
      />
    );

    expect(html).toContain('Search databases, schemas, tables, or columns...');
    expect(html).toContain('postgresql');
    expect(html).toContain('mysql');
    expect(html).toContain('mongodb');
    expect(html).toContain('redis');
  });

  it('renders null when modal is closed', () => {
    const html = renderToString(
      <DatabaseCatalogExplorerModal
        isOpen={false}
        onClose={vi.fn()}
        registry={registry}
      />
    );
    expect(html).toBe('');
  });
});
