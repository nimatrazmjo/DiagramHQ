/**
 * DiagramHQ - Centralized API Catalog & Interface Registry (F122)
 *
 * Provides a searchable, discoverable API catalog linking endpoints directly
 * to architecture services and underlying code repositories:
 * - Multi-protocol support: REST, GraphQL, gRPC, AsyncAPI
 * - Deterministic linking: every endpoint is anchored to an architecture ObjectId + repo location
 * - Browsable facet querying: filter by service, protocol, tags, authentication, and deprecation status
 * - Deprecation lifecycle management (active, deprecated, sunset)
 *
 * Strict Acceptance Invariant:
 * - Endpoints linked to service + repo; browsable
 * - Test: create/browse API entries linked to objects.
 */

import type { ArchitectureId, ObjectId } from './ids';
import type { ModelObject } from './types';
import type { CodeLocationSpec } from './code-mapping';
import type { ApiHttpMethod, ApiParameter } from './openapi-import';

export type ApiProtocol = 'rest' | 'graphql' | 'grpc' | 'asyncapi';

export type ApiAuthRequirement = 'none' | 'bearer' | 'oauth2' | 'apiKey' | 'mtls';

export type ApiDeprecationStatus = 'active' | 'deprecated' | 'sunset';

export interface ApiResponseDefinition {
  statusCode: string;
  description: string;
  contentType?: string;
  schemaSample?: string;
}

export interface CatalogApiEntry {
  id: string;
  architectureId: ArchitectureId;
  serviceId: ObjectId;
  serviceName: string;
  protocol: ApiProtocol;
  path: string;
  method?: ApiHttpMethod;
  version: string;
  summary: string;
  description?: string;
  authScheme: ApiAuthRequirement;
  status: ApiDeprecationStatus;
  deprecationReason?: string;
  tags: string[];
  parameters: ApiParameter[];
  responses: ApiResponseDefinition[];
  repoMapping?: CodeLocationSpec;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiCatalogRegistry {
  architectureId: ArchitectureId;
  entries: CatalogApiEntry[];
  totalCount: number;
  serviceCount: number;
  updatedAt: Date;
}

export interface ApiCatalogQuery {
  search?: string;
  serviceId?: ObjectId;
  protocol?: ApiProtocol;
  status?: ApiDeprecationStatus;
  authScheme?: ApiAuthRequirement;
  tag?: string;
  offset?: number;
  limit?: number;
}

export interface ApiCatalogFacets {
  byProtocol: Record<ApiProtocol, number>;
  byStatus: Record<ApiDeprecationStatus, number>;
  byService: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
}

export interface ApiCatalogBrowseResult {
  entries: CatalogApiEntry[];
  totalMatching: number;
  facets: ApiCatalogFacets;
  offset: number;
  limit: number;
}

/**
 * Creates an empty API catalog registry for an architecture.
 */
export function createApiCatalogRegistry(
  architectureId: ArchitectureId,
  initialEntries: CatalogApiEntry[] = []
): ApiCatalogRegistry {
  const serviceIds = new Set(initialEntries.map((e) => e.serviceId));
  return {
    architectureId,
    entries: [...initialEntries],
    totalCount: initialEntries.length,
    serviceCount: serviceIds.size,
    updatedAt: new Date(),
  };
}

/**
 * Creates a validated API catalog entry linked to an architecture service and repository.
 */
export function createApiCatalogEntry(params: {
  architectureId: ArchitectureId;
  serviceId: ObjectId;
  serviceName: string;
  protocol?: ApiProtocol;
  path: string;
  method?: ApiHttpMethod;
  version?: string;
  summary: string;
  description?: string;
  authScheme?: ApiAuthRequirement;
  status?: ApiDeprecationStatus;
  tags?: string[];
  parameters?: ApiParameter[];
  responses?: ApiResponseDefinition[];
  repoMapping?: CodeLocationSpec;
}): CatalogApiEntry {
  const now = new Date();
  const protocol = params.protocol ?? 'rest';
  const methodPrefix = protocol === 'rest' && params.method ? `${params.method.toLowerCase()}_` : '';
  const cleanPath = params.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const id = `api_${methodPrefix}${cleanPath}_${Date.now().toString(36)}`;

  return {
    id,
    architectureId: params.architectureId,
    serviceId: params.serviceId,
    serviceName: params.serviceName,
    protocol,
    path: params.path,
    method: protocol === 'rest' ? params.method ?? 'GET' : undefined,
    version: params.version ?? 'v1',
    summary: params.summary,
    description: params.description,
    authScheme: params.authScheme ?? 'bearer',
    status: params.status ?? 'active',
    tags: params.tags ?? [],
    parameters: params.parameters ?? [],
    responses: params.responses ?? [{ statusCode: '200', description: 'Success' }],
    repoMapping: params.repoMapping,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Links an API catalog entry to a model object and inherits code mapping if present.
 */
export function linkApiEntryToModelObject(
  entry: CatalogApiEntry,
  modelObject: ModelObject,
  repoLocation?: CodeLocationSpec
): CatalogApiEntry {
  const now = new Date();
  const codeMapping = (modelObject.metadata?.codeMapping as {
    repo?: string;
    filePath?: string;
    provider?: 'github' | 'gitlab';
  } | undefined);

  let mergedLocation: CodeLocationSpec | undefined = repoLocation ?? entry.repoMapping;
  if (!mergedLocation && codeMapping?.repo && codeMapping?.filePath) {
    mergedLocation = {
      repositoryUrl: codeMapping.repo,
      provider: codeMapping.provider ?? 'github',
      filePath: codeMapping.filePath,
      lineStart: 1,
      lineEnd: 1,
    };
  }

  return {
    ...entry,
    serviceId: modelObject.id,
    serviceName: modelObject.name,
    repoMapping: mergedLocation,
    updatedAt: now,
  };
}

/**
 * Adds an API catalog entry to the registry.
 */
export function addApiCatalogEntry(
  registry: ApiCatalogRegistry,
  entry: CatalogApiEntry
): ApiCatalogRegistry {
  const existingIdx = registry.entries.findIndex((e) => e.id === entry.id);
  const updatedEntries = [...registry.entries];

  if (existingIdx !== -1) {
    updatedEntries[existingIdx] = entry;
  } else {
    updatedEntries.push(entry);
  }

  const serviceIds = new Set(updatedEntries.map((e) => e.serviceId));
  return {
    ...registry,
    entries: updatedEntries,
    totalCount: updatedEntries.length,
    serviceCount: serviceIds.size,
    updatedAt: new Date(),
  };
}

/**
 * Marks an API catalog entry as deprecated or sunset with a reason.
 */
export function deprecateApiEntry(
  registry: ApiCatalogRegistry,
  entryId: string,
  reason: string,
  newStatus: ApiDeprecationStatus = 'deprecated'
): ApiCatalogRegistry {
  const now = new Date();
  const updatedEntries = registry.entries.map((entry) => {
    if (entry.id === entryId) {
      return {
        ...entry,
        status: newStatus,
        deprecationReason: reason,
        updatedAt: now,
      };
    }
    return entry;
  });

  return {
    ...registry,
    entries: updatedEntries,
    updatedAt: now,
  };
}

/**
 * Browses, filters, and facets the API catalog.
 */
export function browseApiCatalog(
  registry: ApiCatalogRegistry,
  query: ApiCatalogQuery = {}
): ApiCatalogBrowseResult {
  const {
    search,
    serviceId,
    protocol,
    status,
    authScheme,
    tag,
    offset = 0,
    limit = 50,
  } = query;

  // Initialize facet aggregators
  const byProtocol: Record<ApiProtocol, number> = {
    rest: 0,
    graphql: 0,
    grpc: 0,
    asyncapi: 0,
  };
  const byStatus: Record<ApiDeprecationStatus, number> = {
    active: 0,
    deprecated: 0,
    sunset: 0,
  };
  const byService: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};

  // Compute facets across entire catalog
  for (const entry of registry.entries) {
    byProtocol[entry.protocol] = (byProtocol[entry.protocol] || 0) + 1;
    byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
    byService[entry.serviceName] = (byService[entry.serviceName] || 0) + 1;
    for (const t of entry.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }

  // Filter entries
  let filtered = registry.entries;

  if (serviceId) {
    filtered = filtered.filter((e) => e.serviceId === serviceId);
  }

  if (protocol) {
    filtered = filtered.filter((e) => e.protocol === protocol);
  }

  if (status) {
    filtered = filtered.filter((e) => e.status === status);
  }

  if (authScheme) {
    filtered = filtered.filter((e) => e.authScheme === authScheme);
  }

  if (tag) {
    filtered = filtered.filter((e) => e.tags.includes(tag));
  }

  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((e) => {
      const matchPath = e.path.toLowerCase().includes(q);
      const matchSummary = e.summary.toLowerCase().includes(q);
      const matchDesc = e.description?.toLowerCase().includes(q) ?? false;
      const matchService = e.serviceName.toLowerCase().includes(q);
      const matchMethod = e.method?.toLowerCase().includes(q) ?? false;
      return matchPath || matchSummary || matchDesc || matchService || matchMethod;
    });
  }

  const topTags = Object.entries(tagCounts)
    .map(([t, count]) => ({ tag: t, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const paginated = filtered.slice(offset, offset + limit);

  return {
    entries: paginated,
    totalMatching: filtered.length,
    facets: {
      byProtocol,
      byStatus,
      byService,
      topTags,
    },
    offset,
    limit,
  };
}
