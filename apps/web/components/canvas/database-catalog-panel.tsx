'use client';

import React, { useState, useMemo } from 'react';
import type {
  DatabaseCatalogEntry,
  DatabaseEngine,
  DatabaseTable,
  DatabaseCatalogRegistry,
  ObjectId,
} from '@diagramhq/domain';
import { browseDatabaseCatalog } from '@diagramhq/domain';

export interface DatabaseCatalogExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  registry: DatabaseCatalogRegistry;
  onSelectTable?: (db: DatabaseCatalogEntry, schemaName: string, table: DatabaseTable) => void;
  onNavigateToDatastore?: (datastoreId: ObjectId) => void;
}

export const DatabaseCatalogExplorerModal: React.FC<DatabaseCatalogExplorerModalProps> = ({
  isOpen,
  onClose,
  registry,
  onSelectTable,
  onNavigateToDatastore,
}) => {
  const [search, setSearch] = useState<string>('');
  const [engineFilter, setEngineFilter] = useState<DatabaseEngine | 'all'>('all');
  const [selectedDbId, setSelectedDbId] = useState<string | null>(null);
  const [selectedTableInfo, setSelectedTableInfo] = useState<{
    db: DatabaseCatalogEntry;
    schemaName: string;
    table: DatabaseTable;
  } | null>(null);

  const browseResult = useMemo(() => {
    return browseDatabaseCatalog(registry, {
      search: search.trim() ? search : undefined,
      engine: engineFilter === 'all' ? undefined : engineFilter,
    });
  }, [registry, search, engineFilter]);

  if (!isOpen) return null;

  const activeDb =
    (selectedDbId
      ? browseResult.databases.find((d) => d.id === selectedDbId)
      : browseResult.databases[0]) || null;

  const getEngineBadgeClass = (engine: DatabaseEngine) => {
    switch (engine) {
      case 'postgresql':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'mysql':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'mongodb':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'redis':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'dynamodb':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Database Catalog Explorer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🗄️</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Database Catalog &amp; Schema Registry</h2>
              <p className="text-xs text-slate-500">
                Hierarchical exploration: Database → Schema → Table → Column anchored to architecture datastores.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Database Catalog"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-4 gap-4 border-b border-slate-200 bg-white px-6 py-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Databases</span>
            <span className="text-lg font-bold text-slate-900">{`${registry.totalDatabases} Databases`}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Tables / Collections</span>
            <span className="text-lg font-bold text-blue-600">{`${registry.totalTables} Tables`}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Indexed Columns</span>
            <span className="text-lg font-bold text-emerald-600">{`${registry.totalColumns} Columns`}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Engines</span>
            <span className="text-lg font-bold text-indigo-600">
              {`${Object.values(browseResult.facets.byEngine).filter((c) => c > 0).length} Types`}
            </span>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs">
          {/* Search */}
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search databases, schemas, tables, or columns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Engine filter buttons */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            {(['all', 'postgresql', 'mysql', 'mongodb', 'redis', 'dynamodb'] as const).map((eng) => (
              <button
                key={eng}
                type="button"
                onClick={() => setEngineFilter(eng)}
                className={`rounded px-2.5 py-1 text-xs font-medium uppercase transition ${
                  engineFilter === eng
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {eng}
              </button>
            ))}
          </div>
        </div>

        {/* Hierarchical Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Database Tree & Table List */}
          <div className="w-80 border-r border-slate-200 bg-slate-50/50 overflow-y-auto divide-y divide-slate-200">
            {browseResult.databases.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No databases match your query.
              </div>
            ) : (
              browseResult.databases.map((db) => (
                <div key={db.id} className="p-3">
                  <div
                    onClick={() => setSelectedDbId(db.id)}
                    className="flex items-center justify-between cursor-pointer rounded-lg p-2 hover:bg-white transition"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${getEngineBadgeClass(
                          db.engine
                        )}`}
                      >
                        {db.engine}
                      </span>
                      <span className="font-bold text-xs text-slate-900 truncate">{db.databaseName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">v{db.version}</span>
                  </div>

                  {/* Schemas & Tables */}
                  <div className="pl-4 mt-2 space-y-2">
                    {db.schemas.map((schema) => (
                      <div key={schema.name} className="space-y-1">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <span>📂</span> {schema.name}
                        </div>
                        <div className="space-y-0.5 pl-2">
                          {schema.tables.map((table) => (
                            <button
                              key={table.name}
                              type="button"
                              onClick={() => {
                                const info = { db, schemaName: schema.name, table };
                                setSelectedTableInfo(info);
                                onSelectTable?.(db, schema.name, table);
                              }}
                              className={`w-full flex items-center justify-between rounded px-2 py-1 text-xs text-left transition ${
                                selectedTableInfo?.table.name === table.name &&
                                selectedTableInfo?.db.id === db.id
                                  ? 'bg-blue-100 text-blue-900 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-200/70'
                              }`}
                            >
                              <span className="truncate">📄 {table.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {`${table.columns.length} cols`}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Table Schema View & Column Inspector */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedTableInfo ? (
              <div className="space-y-6">
                {/* Table Header */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${getEngineBadgeClass(
                          selectedTableInfo.db.engine
                        )}`}
                      >
                        {selectedTableInfo.db.engine}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 font-mono">
                        {`${selectedTableInfo.schemaName}.${selectedTableInfo.table.name}`}
                      </h3>
                    </div>
                    {selectedTableInfo.table.description && (
                      <p className="text-xs text-slate-600 mt-1">
                        {selectedTableInfo.table.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onNavigateToDatastore && (
                      <button
                        type="button"
                        onClick={() => onNavigateToDatastore(selectedTableInfo.db.datastoreObjectId)}
                        className="rounded-lg bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-medium border border-blue-200 hover:bg-blue-100 transition"
                      >
                        Focus Datastore Node
                      </button>
                    )}
                  </div>
                </div>

                {/* Repo / Migration coordinates */}
                {selectedTableInfo.db.repoMapping && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Schema Source</span>
                      <span className="font-mono text-slate-800">
                        {selectedTableInfo.db.repoMapping.filePath}:{selectedTableInfo.db.repoMapping.lineStart}
                      </span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {selectedTableInfo.db.repoMapping.repositoryUrl}
                    </span>
                  </div>
                )}

                {/* Columns Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Columns ({selectedTableInfo.table.columns.length})
                  </h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Column Name</th>
                          <th className="px-4 py-2.5">Data Type</th>
                          <th className="px-4 py-2.5">Nullable</th>
                          <th className="px-4 py-2.5">Default</th>
                          <th className="px-4 py-2.5">Foreign Key</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTableInfo.table.columns.map((col) => (
                          <tr key={col.name} className="hover:bg-slate-50/50 transition">
                            <td className="px-4 py-2.5 font-mono font-medium text-slate-900 flex items-center gap-1.5">
                              {col.isPrimaryKey && (
                                <span className="rounded bg-amber-100 text-amber-800 px-1 text-[9px] font-bold">
                                  PK
                                </span>
                              )}
                              {col.name}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-600">{col.type}</td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {col.isNullable ? (
                                <span className="text-slate-400">NULL</span>
                              ) : (
                                <span className="font-semibold text-slate-800">NOT NULL</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-500">
                              {col.defaultValue ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-blue-600 text-[11px]">
                              {col.foreignKey ? (
                                <span>{`→ ${col.foreignKey.targetTable}.${col.foreignKey.targetColumn}`}</span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeDb ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${getEngineBadgeClass(
                      activeDb.engine
                    )}`}
                  >
                    {activeDb.engine}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{activeDb.databaseName}</h3>
                </div>
                <p className="text-xs text-slate-600">{activeDb.description}</p>
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Select a table from the left pane to view its column schema and relationships.
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No database selected.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
