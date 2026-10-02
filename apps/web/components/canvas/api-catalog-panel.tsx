'use client';

import React, { useState, useMemo } from 'react';
import type {
  CatalogApiEntry,
  ApiProtocol,
  ApiDeprecationStatus,
  ApiCatalogRegistry,
  ObjectId,
} from '@diagramhq/domain';
import { browseApiCatalog } from '@diagramhq/domain';

export interface ApiCatalogExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  registry: ApiCatalogRegistry;
  onSelectEntry?: (entry: CatalogApiEntry) => void;
  onNavigateToService?: (serviceId: ObjectId) => void;
  onOpenImportModal?: () => void;
}

export const ApiCatalogExplorerModal: React.FC<ApiCatalogExplorerModalProps> = ({
  isOpen,
  onClose,
  registry,
  onSelectEntry,
  onNavigateToService,
  onOpenImportModal,
}) => {
  const [search, setSearch] = useState<string>('');
  const [protocolFilter, setProtocolFilter] = useState<ApiProtocol | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ApiDeprecationStatus | 'all'>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [activeEntry, setActiveEntry] = useState<CatalogApiEntry | null>(null);

  const browseResult = useMemo(() => {
    return browseApiCatalog(registry, {
      search: search.trim() ? search : undefined,
      protocol: protocolFilter === 'all' ? undefined : protocolFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
    });
  }, [registry, search, protocolFilter, statusFilter]);

  const displayedEntries = useMemo(() => {
    if (serviceFilter === 'all') return browseResult.entries;
    return browseResult.entries.filter((e) => e.serviceName === serviceFilter);
  }, [browseResult.entries, serviceFilter]);

  if (!isOpen) return null;

  const services = Array.from(new Set(registry.entries.map((e) => e.serviceName)));

  const getMethodBadgeClass = (method?: string, protocol?: ApiProtocol) => {
    if (protocol === 'graphql') return 'bg-pink-100 text-pink-800 border-pink-200';
    if (protocol === 'grpc') return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    if (protocol === 'asyncapi') return 'bg-amber-100 text-amber-800 border-amber-200';

    switch (method?.toUpperCase()) {
      case 'GET':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'POST':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PUT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PATCH':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div
      role="dialog"
      aria-label="API Catalog Explorer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🌐</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">API Catalog & Interface Registry</h2>
              <p className="text-xs text-slate-500">
                Discoverable REST, GraphQL, and gRPC endpoints anchored to architecture models & code.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenImportModal && (
              <button
                type="button"
                onClick={onOpenImportModal}
                className="rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 text-xs font-medium border border-indigo-200 transition"
              >
                + Import OpenAPI Spec
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close API Catalog"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-4 gap-4 border-b border-slate-200 bg-white px-6 py-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Total Endpoints</span>
            <span className="text-lg font-bold text-slate-900">{`${registry.totalCount} APIs`}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Hosting Services</span>
            <span className="text-lg font-bold text-indigo-600">{`${registry.serviceCount} Services`}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Active APIs</span>
            <span className="text-lg font-bold text-emerald-600">
              {`${browseResult.facets.byStatus.active || 0} Active`}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Deprecated</span>
            <span className="text-lg font-bold text-amber-600">
              {`${browseResult.facets.byStatus.deprecated || 0} Deprecated`}
            </span>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs">
          {/* Search */}
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search by endpoint path, summary, or method..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Protocol filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            {(['all', 'rest', 'graphql', 'grpc'] as const).map((proto) => (
              <button
                key={proto}
                type="button"
                onClick={() => setProtocolFilter(proto)}
                className={`rounded px-2.5 py-1 text-xs font-medium uppercase transition ${
                  protocolFilter === proto
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {proto}
              </button>
            ))}
          </div>

          {/* Service filter */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Services</option>
            {services.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApiDeprecationStatus | 'all')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="deprecated">Deprecated</option>
            <option value="sunset">Sunset</option>
          </select>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {displayedEntries.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
                <span className="text-3xl mb-2">🔍</span>
                <p className="text-sm font-medium">No API endpoints match your criteria</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing filters or search query.</p>
              </div>
            ) : (
              displayedEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => {
                    setActiveEntry(entry);
                    onSelectEntry?.(entry);
                  }}
                  className={`flex items-start justify-between p-4 cursor-pointer transition hover:bg-slate-50 ${
                    activeEntry?.id === entry.id ? 'bg-indigo-50/60' : ''
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${getMethodBadgeClass(
                          entry.method,
                          entry.protocol
                        )}`}
                      >
                        {entry.protocol === 'rest' ? entry.method : entry.protocol}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-900 truncate">
                        {entry.path}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-medium">
                        {entry.version}
                      </span>
                      {entry.status === 'deprecated' && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          Deprecated
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 truncate">{entry.summary}</p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        📦 {entry.serviceName}
                      </span>
                      {entry.repoMapping && (
                        <span className="inline-flex items-center gap-1 font-mono text-slate-500">
                          📁 {entry.repoMapping.filePath}:{entry.repoMapping.lineStart}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        🔑 {entry.authScheme}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-1">
                    {entry.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Side Inspector Drawer */}
          {activeEntry && (
            <div className="w-80 border-l border-slate-200 bg-slate-50/50 p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase mb-1.5 ${getMethodBadgeClass(
                      activeEntry.method,
                      activeEntry.protocol
                    )}`}
                  >
                    {activeEntry.protocol === 'rest' ? activeEntry.method : activeEntry.protocol}
                  </span>
                  <h4 className="font-mono text-xs font-bold text-slate-900 break-all">
                    {activeEntry.path}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveEntry(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Summary</span>
                <p className="text-slate-800 font-medium mt-0.5">{activeEntry.summary}</p>
                {activeEntry.description && (
                  <p className="text-slate-500 mt-1">{activeEntry.description}</p>
                )}
              </div>

              {activeEntry.deprecationReason && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-amber-800">
                  <span className="font-semibold block">⚠️ Deprecation Rationale:</span>
                  <p className="mt-0.5">{activeEntry.deprecationReason}</p>
                </div>
              )}

              <div className="space-y-1.5 border-t border-slate-200 pt-3">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hosting Architecture Service</span>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{activeEntry.serviceName}</span>
                  {onNavigateToService && (
                    <button
                      type="button"
                      onClick={() => onNavigateToService(activeEntry.serviceId)}
                      className="text-indigo-600 hover:underline text-[11px]"
                    >
                      Focus Node
                    </button>
                  )}
                </div>
              </div>

              {activeEntry.repoMapping && (
                <div className="space-y-1 border-t border-slate-200 pt-3">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Repository Location</span>
                  <p className="font-mono text-[11px] text-slate-700 break-all">
                    {activeEntry.repoMapping.repositoryUrl}
                  </p>
                  <p className="font-mono text-[10px] text-slate-500">
                    {activeEntry.repoMapping.filePath}:{activeEntry.repoMapping.lineStart}-{activeEntry.repoMapping.lineEnd}
                  </p>
                </div>
              )}

              {activeEntry.parameters.length > 0 && (
                <div className="space-y-1.5 border-t border-slate-200 pt-3">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Parameters</span>
                  <div className="space-y-1">
                    {activeEntry.parameters.map((p) => (
                      <div key={p.name} className="flex justify-between font-mono text-[11px] bg-white p-1.5 rounded border border-slate-100">
                        <span className="text-slate-800">{p.name}</span>
                        <span className="text-slate-400">{p.in}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeEntry.responses.length > 0 && (
                <div className="space-y-1.5 border-t border-slate-200 pt-3">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Responses</span>
                  <div className="space-y-1">
                    {activeEntry.responses.map((r) => (
                      <div key={r.statusCode} className="flex justify-between text-[11px] bg-white p-1.5 rounded border border-slate-100">
                        <span className="font-mono font-bold text-slate-800">{r.statusCode}</span>
                        <span className="text-slate-500 truncate max-w-[160px]">{r.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
