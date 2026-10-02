import { describe, it, expect } from 'vitest';
import {
  createDatabaseCatalogRegistry,
  createDatabaseCatalogEntry,
  addDatabaseCatalogEntry,
  addTableToDatabase,
  browseDatabaseCatalog,
  findTablesByColumn,
} from './database-catalog';
import { createId, type ArchitectureId, type ObjectId } from './ids';

describe('Database Catalog & Data Schema Registry (F124)', () => {
  const archId = createId('arch') as ArchitectureId;
  const dbStoreId = createId('sto') as ObjectId;
  const analyticsDbId = createId('sto') as ObjectId;

  it('creates a Database Catalog entry adhering to Database -> Schema -> Table -> Column hierarchy', () => {
    const entry = createDatabaseCatalogEntry({
      architectureId: archId,
      datastoreObjectId: dbStoreId,
      databaseName: 'orders_db',
      engine: 'postgresql',
      version: '16.1',
      description: 'Primary transactional order storage',
      schemas: [
        {
          name: 'public',
          tables: [
            {
              name: 'orders',
              description: 'Customer order headers',
              columns: [
                { name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false },
                { name: 'customer_id', type: 'uuid', isPrimaryKey: false, isNullable: false },
                { name: 'total_amount', type: 'numeric(12,2)', isPrimaryKey: false, isNullable: false },
                { name: 'status', type: 'varchar(32)', isPrimaryKey: false, isNullable: false, defaultValue: "'pending'" },
                { name: 'created_at', type: 'timestamp with time zone', isPrimaryKey: false, isNullable: false },
              ],
            },
            {
              name: 'order_items',
              description: 'Line items belonging to an order',
              columns: [
                { name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false },
                {
                  name: 'order_id',
                  type: 'uuid',
                  isPrimaryKey: false,
                  isNullable: false,
                  foreignKey: { targetTable: 'orders', targetColumn: 'id' },
                },
                { name: 'sku', type: 'varchar(64)', isPrimaryKey: false, isNullable: false },
                { name: 'quantity', type: 'integer', isPrimaryKey: false, isNullable: false },
              ],
            },
          ],
        },
      ],
      repoMapping: {
        repositoryUrl: 'https://github.com/acme/orders-service',
        provider: 'github',
        filePath: 'prisma/schema.prisma',
        lineStart: 1,
        lineEnd: 50,
      },
    });

    expect(entry.id).toContain('db_orders_db_');
    expect(entry.databaseName).toBe('orders_db');
    expect(entry.engine).toBe('postgresql');
    expect(entry.schemas.length).toBe(1);
    expect(entry.schemas[0].name).toBe('public');
    expect(entry.schemas[0].tables.length).toBe(2);

    const ordersTable = entry.schemas[0].tables[0];
    expect(ordersTable.name).toBe('orders');
    expect(ordersTable.columns.length).toBe(5);
    expect(ordersTable.columns[0].isPrimaryKey).toBe(true);

    const orderItemsTable = entry.schemas[0].tables[1];
    expect(orderItemsTable.columns[1].foreignKey?.targetTable).toBe('orders');
  });

  it('populates and tracks registry statistics across tables and columns', () => {
    let registry = createDatabaseCatalogRegistry(archId);

    const db1 = createDatabaseCatalogEntry({
      architectureId: archId,
      datastoreObjectId: dbStoreId,
      databaseName: 'orders_db',
      schemas: [
        {
          name: 'public',
          tables: [
            {
              name: 'orders',
              columns: [
                { name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false },
                { name: 'tenant_id', type: 'uuid', isPrimaryKey: false, isNullable: false },
              ],
            },
          ],
        },
      ],
      description: 'Order db',
    });

    const db2 = createDatabaseCatalogEntry({
      architectureId: archId,
      datastoreObjectId: analyticsDbId,
      databaseName: 'analytics_warehouse',
      engine: 'postgresql',
      schemas: [
        {
          name: 'reporting',
          tables: [
            {
              name: 'daily_metrics',
              columns: [
                { name: 'date', type: 'date', isPrimaryKey: true, isNullable: false },
                { name: 'revenue', type: 'numeric(14,2)', isPrimaryKey: false, isNullable: false },
                { name: 'tenant_id', type: 'uuid', isPrimaryKey: false, isNullable: false },
              ],
            },
          ],
        },
      ],
      description: 'Analytics db',
    });

    registry = addDatabaseCatalogEntry(registry, db1);
    registry = addDatabaseCatalogEntry(registry, db2);

    expect(registry.totalDatabases).toBe(2);
    expect(registry.totalTables).toBe(2);
    expect(registry.totalColumns).toBe(5);
  });

  it('adds a new table to a schema in an existing database entry', () => {
    const entry = createDatabaseCatalogEntry({
      architectureId: archId,
      datastoreObjectId: dbStoreId,
      databaseName: 'orders_db',
      description: 'Order db',
    });

    const updated = addTableToDatabase(entry, 'public', {
      name: 'customers',
      description: 'Customer accounts table',
      columns: [
        { name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false },
        { name: 'email', type: 'varchar(255)', isPrimaryKey: false, isNullable: false },
      ],
    });

    const publicSchema = updated.schemas.find((s) => s.name === 'public');
    expect(publicSchema?.tables.length).toBe(1);
    expect(publicSchema?.tables[0].name).toBe('customers');
    expect(publicSchema?.tables[0].columns.length).toBe(2);
  });

  it('finds tables across multiple databases matching a specific column name', () => {
    const db1 = createDatabaseCatalogEntry({
      architectureId: archId,
      datastoreObjectId: dbStoreId,
      databaseName: 'orders_db',
      schemas: [
        {
          name: 'public',
          tables: [
            {
              name: 'orders',
              columns: [
                { name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false },
                { name: 'tenant_id', type: 'uuid', isPrimaryKey: false, isNullable: false },
              ],
            },
          ],
        },
      ],
      description: 'Orders DB',
    });

    const db2 = createDatabaseCatalogEntry({
      architectureId: archId,
      datastoreObjectId: analyticsDbId,
      databaseName: 'analytics_db',
      schemas: [
        {
          name: 'reporting',
          tables: [
            {
              name: 'financial_reports',
              columns: [
                { name: 'report_id', type: 'uuid', isPrimaryKey: true, isNullable: false },
                { name: 'tenant_id', type: 'uuid', isPrimaryKey: false, isNullable: false },
              ],
            },
          ],
        },
      ],
      description: 'Analytics DB',
    });

    const registry = createDatabaseCatalogRegistry(archId, [db1, db2]);

    const matching = findTablesByColumn(registry, 'tenant_id');
    expect(matching.length).toBe(2);
    expect(matching.map((m) => m.table.name)).toContain('orders');
    expect(matching.map((m) => m.table.name)).toContain('financial_reports');
  });

  it('browses database catalog with search query and engine filtering', () => {
    const db1 = createDatabaseCatalogEntry({
      architectureId: archId,
      datastoreObjectId: dbStoreId,
      databaseName: 'orders_pg',
      engine: 'postgresql',
      schemas: [
        {
          name: 'public',
          tables: [{ name: 'invoices', columns: [{ name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false }] }],
        },
      ],
      description: 'PostgreSQL primary store',
    });

    const db2 = createDatabaseCatalogEntry({
      architectureId: archId,
      datastoreObjectId: analyticsDbId,
      databaseName: 'cache_redis',
      engine: 'redis',
      schemas: [{ name: 'keyspace', tables: [] }],
      description: 'Redis in-memory store',
    });

    const registry = createDatabaseCatalogRegistry(archId, [db1, db2]);

    // Search by table name
    const searchRes = browseDatabaseCatalog(registry, { search: 'invoices' });
    expect(searchRes.totalMatching).toBe(1);
    expect(searchRes.databases[0].databaseName).toBe('orders_pg');

    // Filter by engine
    const redisRes = browseDatabaseCatalog(registry, { engine: 'redis' });
    expect(redisRes.totalMatching).toBe(1);
    expect(redisRes.databases[0].databaseName).toBe('cache_redis');

    // Facets
    expect(searchRes.facets.byEngine.postgresql).toBe(1);
    expect(searchRes.facets.byEngine.redis).toBe(1);
  });
});
