'use client';

import React, { useState, useMemo } from 'react';
import {
  type ApiCatalog,
  type ApiCatalogEndpoint,
  type ApiHttpMethod,
  type ObjectId,
  type ArchitectureId,
  importOpenApiSpec,
  filterApiCatalog,
} from '@diagramhq/domain';

export interface OpenApiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Array<{ id: ObjectId; name: string }>;
  architectureId: ArchitectureId;
  onImportSuccess?: (endpoints: ApiCatalogEndpoint[]) => void;
}

export function OpenApiImportModal({
  isOpen,
  onClose,
  services,
  architectureId,
  onImportSuccess,
}: OpenApiImportModalProps): React.JSX.Element | null {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    services[0]?.id || 'svc-default'
  );
  const [specInput, setSpecInput] = useState<string>(() =>
    JSON.stringify(
      {
        openapi: '3.0.0',
        info: {
          title: 'Sample Service API',
          version: '1.0.0',
        },
        paths: {
          '/api/v1/resources': {
            get: {
              summary: 'List available resources',
              operationId: 'listResources',
              responses: { '200': { description: 'Success' } },
            },
            post: {
              summary: 'Create resource item',
              operationId: 'createResource',
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      },
      null,
      2
    )
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessSummary(null);

    const targetService = services.find((s) => s.id === selectedServiceId) || {
      id: selectedServiceId as ObjectId,
      name: 'Selected Service',
    };

    const result = importOpenApiSpec({
      specContent: specInput,
      targetServiceId: targetService.id,
      targetServiceName: targetService.name,
      architectureId,
    });

    if (!result.success || result.endpoints.length === 0) {
      setErrorMessage(result.errors?.[0] || 'No valid endpoints found in OpenAPI specification.');
      return;
    }

    setSuccessSummary(result.summary);
    if (onImportSuccess) {
      onImportSuccess(result.endpoints);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      data-testid="openapi-import-modal"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">📑</span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Import OpenAPI Specification
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Populate API catalog endpoints and link them directly to architecture services.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleImport} className="p-6 space-y-4 text-xs">
          <div>
            <label
              htmlFor="target-service-select"
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Target Architecture Service
            </label>
            <select
              id="target-service-select"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
              data-testid="target-service-select"
            >
              {services.length === 0 ? (
                <option value="svc-default">Default Service</option>
              ) : (
                services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="openapi-content-textarea"
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              OpenAPI Document (JSON or YAML)
            </label>
            <textarea
              id="openapi-content-textarea"
              rows={9}
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              placeholder="Paste OpenAPI 3.x / Swagger 2.x JSON or YAML specification..."
              required
              className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="openapi-spec-input"
            />
          </div>

          {errorMessage && (
            <div
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs"
              data-testid="import-error-banner"
            >
              {errorMessage}
            </div>
          )}

          {successSummary && (
            <div
              className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs"
              data-testid="import-success-banner"
            >
              {successSummary}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
              data-testid="submit-import-button"
            >
              Import Endpoints into API Catalog
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface ApiCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: ApiCatalog;
  onSelectEndpoint?: (endpoint: ApiCatalogEndpoint) => void;
}

export function ApiCatalogDrawer({
  isOpen,
  onClose,
  catalog,
  onSelectEndpoint,
}: ApiCatalogDrawerProps): React.JSX.Element | null {
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEndpoints = useMemo(() => {
    return filterApiCatalog(catalog, {
      method: selectedMethod === 'ALL' ? undefined : (selectedMethod as ApiHttpMethod),
      searchQuery,
    });
  }, [catalog, selectedMethod, searchQuery]);

  if (!isOpen) return null;

  const methodColorClass = (method: ApiHttpMethod) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200';
      case 'POST':
        return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200';
      case 'PUT':
        return 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      data-testid="api-catalog-drawer"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌐</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Architecture API Catalog
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {`${catalog.endpoints.length} endpoints`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Discoverable REST API endpoints indexed from services and OpenAPI specifications.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Toolbar Filter */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMethod(m)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition-colors ${
                  selectedMethod === m
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
                data-testid={`method-filter-${m.toLowerCase()}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 md:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by path, summary..."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="api-search-input"
            />
          </div>
        </div>

        {/* Endpoints List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5" data-testid="endpoint-list">
          {filteredEndpoints.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No API endpoints match the selected criteria.
            </div>
          ) : (
            filteredEndpoints.map((ep) => (
              <div
                key={ep.id}
                onClick={() => onSelectEndpoint && onSelectEndpoint(ep)}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                data-testid={`endpoint-card-${ep.id}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${methodColorClass(
                        ep.method
                      )}`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {ep.path}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {ep.serviceName}
                    </span>
                  </div>
                  {ep.summary && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {ep.summary}
                    </p>
                  )}
                  {ep.parameters.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono pt-0.5">
                      <span>Parameters:</span>
                      {ep.parameters.map((p) => (
                        <span
                          key={p.name}
                          className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {p.name} ({p.in})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 font-mono text-[11px] text-slate-400 shrink-0">
                  <span className="text-[10px] text-slate-500">
                    {ep.responseStatusCodes.join(', ') || '200'}
                  </span>
                  {ep.operationId && (
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">
                      {ep.operationId}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs">
          <span className="text-slate-500">
            {`Showing ${filteredEndpoints.length} of ${catalog.endpoints.length} cataloged endpoint(s)`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
