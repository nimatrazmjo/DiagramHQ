/**
 * DiagramHQ - Database Catalog & Schema Registry (F124)
 *
 * Provides a structured, discoverable database catalog establishing the full hierarchy:
 * Database -> Schema -> Table / Collection -> Column / Field:
 * - Engine support: PostgreSQL, MySQL, SQLite, MongoDB, Redis, DynamoDB.
 * - Captures columns, primary keys, foreign key relations, nullable constraints, indices.
 * - Deterministically links databases to architecture store model objects (ObjectId) and migration files.
 * - Multi-dimensional search and schema inspection across schemas and tables.
 *
 * Strict Acceptance Invariant:
 * - Database -> schema -> table -> column
 * - Test: create/browse database entries.
 */

import type { ArchitectureId, ObjectId } from './ids';
import type { CodeLocationSpec } from './code-mapping';

export type DatabaseEngine =
  | 'postgresql'
  | 'mysql'
  | 'sqlite'
  | 'mongodb'
  | 'redis'
  | 'dynamodb'
  | 'oracle'
  | 'sqlserver';

export interface ForeignKeyRelation {
  targetTable: string;
  targetColumn: string;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique?: boolean;
  defaultValue?: string;
  foreignKey?: ForeignKeyRelation;
  description?: string;
}

export interface DatabaseIndex {
  name: string;
  columns: string[];
  isUnique: boolean;
}

export interface DatabaseTable {
  name: string;
  description?: string;
  columns: DatabaseColumn[];
  indices?: DatabaseIndex[];
  rowCountEstimate?: number;
}

export interface DatabaseSchema {
  name: string;
  tables: DatabaseTable[];
}

export interface DatabaseCatalogEntry {
  id: string;
  architectureId: ArchitectureId;
  datastoreObjectId: ObjectId;
  databaseName: string;
  engine: DatabaseEngine;
  version?: string;
  schemas: DatabaseSchema[];
  description: string;
  tags: string[];
  repoMapping?: CodeLocationSpec;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseCatalogRegistry {
  architectureId: ArchitectureId;
  databases: DatabaseCatalogEntry[];
  totalDatabases: number;
  totalTables: number;
  totalColumns: number;
  updatedAt: Date;
}

export interface DatabaseCatalogQuery {
  search?: string;
  datastoreObjectId?: ObjectId;
  engine?: DatabaseEngine;
  tag?: string;
  offset?: number;
  limit?: number;
}

export interface DatabaseCatalogBrowseResult {
  databases: DatabaseCatalogEntry[];
  totalMatching: number;
  facets: {
    byEngine: Record<DatabaseEngine, number>;
    totalTables: number;
    totalColumns: number;
  };
  offset: number;
  limit: number;
}

/**
 * Calculates aggregate stats for tables and columns across all schemas in an entry.
 */
function computeDatabaseCounts(schemas: DatabaseSchema[]): { tableCount: number; columnCount: number } {
  let tableCount = 0;
  let columnCount = 0;
  for (const s of schemas) {
    tableCount += s.tables.length;
    for (const t of s.tables) {
      columnCount += t.columns.length;
    }
  }
  return { tableCount, columnCount };
}

/**
 * Creates an empty Database Catalog registry.
 */
export function createDatabaseCatalogRegistry(
  architectureId: ArchitectureId,
  initialDatabases: DatabaseCatalogEntry[] = []
): DatabaseCatalogRegistry {
  let totalTables = 0;
  let totalColumns = 0;

  for (const db of initialDatabases) {
    const counts = computeDatabaseCounts(db.schemas);
    totalTables += counts.tableCount;
    totalColumns += counts.columnCount;
  }

  return {
    architectureId,
    databases: [...initialDatabases],
    totalDatabases: initialDatabases.length,
    totalTables,
    totalColumns,
    updatedAt: new Date(),
  };
}

/**
 * Creates a validated Database Catalog entry with strict Database -> Schema -> Table -> Column hierarchy.
 */
export function createDatabaseCatalogEntry(params: {
  architectureId: ArchitectureId;
  datastoreObjectId: ObjectId;
  databaseName: string;
  engine?: DatabaseEngine;
  version?: string;
  schemas?: DatabaseSchema[];
  description: string;
  tags?: string[];
  repoMapping?: CodeLocationSpec;
}): DatabaseCatalogEntry {
  const now = new Date();
  const cleanName = params.databaseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const id = `db_${cleanName}_${Date.now().toString(36)}`;

  const defaultSchemas: DatabaseSchema[] = params.schemas ?? [
    {
      name: 'public',
      tables: [],
    },
  ];

  return {
    id,
    architectureId: params.architectureId,
    datastoreObjectId: params.datastoreObjectId,
    databaseName: params.databaseName,
    engine: params.engine ?? 'postgresql',
    version: params.version ?? '16',
    schemas: defaultSchemas,
    description: params.description,
    tags: params.tags ?? [],
    repoMapping: params.repoMapping,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Adds a database catalog entry to the registry.
 */
export function addDatabaseCatalogEntry(
  registry: DatabaseCatalogRegistry,
  entry: DatabaseCatalogEntry
): DatabaseCatalogRegistry {
  const existingIdx = registry.databases.findIndex((d) => d.id === entry.id);
  const updatedDatabases = [...registry.databases];

  if (existingIdx !== -1) {
    updatedDatabases[existingIdx] = entry;
  } else {
    updatedDatabases.push(entry);
  }

  let totalTables = 0;
  let totalColumns = 0;
  for (const db of updatedDatabases) {
    const counts = computeDatabaseCounts(db.schemas);
    totalTables += counts.tableCount;
    totalColumns += counts.columnCount;
  }

  return {
    ...registry,
    databases: updatedDatabases,
    totalDatabases: updatedDatabases.length,
    totalTables,
    totalColumns,
    updatedAt: new Date(),
  };
}

/**
 * Adds a table to a specific schema in a database catalog entry.
 */
export function addTableToDatabase(
  entry: DatabaseCatalogEntry,
  schemaName: string,
  table: DatabaseTable
): DatabaseCatalogEntry {
  const now = new Date();
  const updatedSchemas = [...entry.schemas];
  const targetSchemaIdx = updatedSchemas.findIndex((s) => s.name === schemaName);

  if (targetSchemaIdx !== -1) {
    const schema = updatedSchemas[targetSchemaIdx];
    if (schema) {
      const existingTableIdx = schema.tables.findIndex((t) => t.name === table.name);
      const tables = [...schema.tables];
      if (existingTableIdx !== -1) {
        tables[existingTableIdx] = table;
      } else {
        tables.push(table);
      }
      updatedSchemas[targetSchemaIdx] = {
        ...schema,
        tables,
      };
    }
  } else {
    updatedSchemas.push({
      name: schemaName,
      tables: [table],
    });
  }

  return {
    ...entry,
    schemas: updatedSchemas,
    updatedAt: now,
  };
}

/**
 * Searches and browses the Database Catalog.
 */
export function browseDatabaseCatalog(
  registry: DatabaseCatalogRegistry,
  query: DatabaseCatalogQuery = {}
): DatabaseCatalogBrowseResult {
  const {
    search,
    datastoreObjectId,
    engine,
    tag,
    offset = 0,
    limit = 50,
  } = query;

  const byEngine: Record<DatabaseEngine, number> = {
    postgresql: 0,
    mysql: 0,
    sqlite: 0,
    mongodb: 0,
    redis: 0,
    dynamodb: 0,
    oracle: 0,
    sqlserver: 0,
  };

  let totalTables = 0;
  let totalColumns = 0;

  for (const db of registry.databases) {
    byEngine[db.engine] = (byEngine[db.engine] || 0) + 1;
    const counts = computeDatabaseCounts(db.schemas);
    totalTables += counts.tableCount;
    totalColumns += counts.columnCount;
  }

  let filtered = registry.databases;

  if (datastoreObjectId) {
    filtered = filtered.filter((d) => d.datastoreObjectId === datastoreObjectId);
  }

  if (engine) {
    filtered = filtered.filter((d) => d.engine === engine);
  }

  if (tag) {
    filtered = filtered.filter((d) => d.tags.includes(tag));
  }

  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((db) => {
      const matchDb = db.databaseName.toLowerCase().includes(q);
      const matchDesc = db.description.toLowerCase().includes(q);
      const matchTableOrCol = db.schemas.some((s) =>
        s.tables.some(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.columns.some((c) => c.name.toLowerCase().includes(q))
        )
      );
      return matchDb || matchDesc || matchTableOrCol;
    });
  }

  const paginated = filtered.slice(offset, offset + limit);

  return {
    databases: paginated,
    totalMatching: filtered.length,
    facets: {
      byEngine,
      totalTables,
      totalColumns,
    },
    offset,
    limit,
  };
}

/**
 * Finds all tables containing a specific column name (e.g. "tenant_id", "user_id").
 */
export function findTablesByColumn(
  registry: DatabaseCatalogRegistry,
  columnName: string
): Array<{ databaseName: string; schemaName: string; table: DatabaseTable }> {
  const matches: Array<{ databaseName: string; schemaName: string; table: DatabaseTable }> = [];
  const q = columnName.trim().toLowerCase();

  for (const db of registry.databases) {
    for (const schema of db.schemas) {
      for (const table of schema.tables) {
        if (table.columns.some((c) => c.name.toLowerCase() === q)) {
          matches.push({
            databaseName: db.databaseName,
            schemaName: schema.name,
            table,
          });
        }
      }
    }
  }

  return matches;
}
