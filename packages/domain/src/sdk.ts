/**
 * DiagramHQ - TypeScript Client SDK (F127)
 *
 * Strongly typed client SDK for DiagramHQ's REST and Model intelligence APIs:
 * - Architectures: CRUD, model snapshots, version navigation
 * - Model Objects: CRUD (person, system, container, component, store, actor)
 * - Model Connections: CRUD (sync/async protocols, ports, labels)
 * - Views & Projections: CRUD (C4 level 1-4, filters)
 * - Execution Flows: CRUD (steps, actors)
 * - Error hierarchy: DiagramHQApiError, AuthenticationError, NotFoundError
 * - Configurable transport: supports standard fetch, custom HTTP transport, and mock test servers
 *
 * Strict Acceptance Criteria:
 * - Typed TS SDK over the REST API (Python/Go/Java/C# later)
 * - Test: SDK CRUD round-trip against a test server.
 */

import type {
  ArchitectureId,
  ConnectionId,
  ObjectId,
  VersionId,
  WorkspaceId,
  ViewId,
  FlowId,
} from './ids';
import type {
  Architecture,
  ArchitectureModel,
  ConnectionKind,
  ModelConnection,
  ModelObject,
  ObjectKind,
  Version,
  View,
  Flow,
} from './types';

// ============================================================================
// SDK Configuration & Error Types
// ============================================================================

export interface SdkConfig {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  transport?: SdkHttpTransport;
}

export interface SdkHttpResponse<T = unknown> {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  data: T;
}

export type SdkHttpTransport = (
  url: string,
  options: {
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    headers: Record<string, string>;
    body?: string;
  }
) => Promise<{
  status: number;
  statusText?: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

export class DiagramHQApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly responseBody?: unknown
  ) {
    super(`DiagramHQ API Error [${statusCode}]: ${message}`);
    this.name = 'DiagramHQApiError';
  }
}

export class AuthenticationError extends DiagramHQApiError {
  constructor(message = 'Unauthorized: invalid or missing API authentication token') {
    super(401, message);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends DiagramHQApiError {
  constructor(resource: string, id: string) {
    super(404, `Resource "${resource}" with ID "${id}" was not found.`);
    this.name = 'NotFoundError';
  }
}

// ============================================================================
// Request Payloads DTOs
// ============================================================================

export interface CreateArchitectureInput {
  name: string;
  description?: string;
}

export interface UpdateArchitectureInput {
  name?: string;
  description?: string;
}

export interface CreateModelObjectInput {
  name: string;
  kind: ObjectKind;
  description?: string;
  parentId?: ObjectId | null;
  metadata?: Record<string, unknown>;
  position?: { x: number; y: number };
  versionId?: VersionId;
}

export interface UpdateModelObjectInput {
  name?: string;
  description?: string;
  parentId?: ObjectId | null;
  metadata?: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface CreateModelConnectionInput {
  sourceObjectId: ObjectId;
  targetObjectId: ObjectId;
  kind?: ConnectionKind;
  label?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  versionId?: VersionId;
}

export interface UpdateModelConnectionInput {
  kind?: ConnectionKind;
  label?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// DiagramHQ Client Implementation
// ============================================================================

export class DiagramHQClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly customHeaders: Record<string, string>;
  private readonly transport: SdkHttpTransport;

  constructor(config: SdkConfig = {}) {
    this.baseUrl = (config.baseUrl || 'https://api.diagramhq.com').replace(/\/+$/, '');
    this.token = config.token;
    this.timeoutMs = config.timeoutMs || 10000;
    this.maxRetries = config.maxRetries || 2;
    this.customHeaders = config.headers || {};

    if (config.transport) {
      this.transport = config.transport;
    } else if (typeof fetch !== 'undefined') {
      this.transport = async (url, options) => {
        const res = await fetch(url, options);
        return {
          status: res.status,
          statusText: res.statusText,
          json: () => res.json(),
          text: () => res.text(),
        };
      };
    } else {
      // Fallback transport
      this.transport = async () => {
        throw new Error('No HTTP transport available. Provide custom transport in SdkConfig.');
      };
    }
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.customHeaders,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const payloadString = body !== undefined ? JSON.stringify(body) : undefined;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      try {
        const response = await this.transport(url, {
          method,
          headers,
          body: payloadString,
        });

        if (response.status === 401) {
          throw new AuthenticationError();
        }

        if (response.status === 404) {
          throw new NotFoundError('Endpoint', endpoint);
        }

        if (response.status < 200 || response.status >= 300) {
          let errBody: unknown;
          try {
            errBody = await response.json();
          } catch {
            errBody = await response.text();
          }
          throw new DiagramHQApiError(
            response.status,
            `Request to ${method} ${endpoint} failed`,
            errBody
          );
        }

        if (response.status === 204) {
          return {} as T;
        }

        const data = (await response.json()) as T;
        return data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (err instanceof DiagramHQApiError && (err.statusCode < 500 || err.statusCode === 401 || err.statusCode === 404)) {
          throw err;
        }
        attempt++;
        if (attempt <= this.maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, 50 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError || new Error(`Request failed after ${this.maxRetries} retries.`);
  }

  // ==========================================================================
  // Architectures Resource
  // ==========================================================================
  public readonly architectures = {
    create: async (
      workspaceId: WorkspaceId,
      input: CreateArchitectureInput
    ): Promise<{ architecture: Architecture; version: Version }> => {
      return this.request<{ architecture: Architecture; version: Version }>(
        `/workspaces/${workspaceId}/architectures`,
        'POST',
        input
      );
    },

    get: async (id: ArchitectureId): Promise<{ architecture: Architecture }> => {
      return this.request<{ architecture: Architecture }>(`/architectures/${id}`, 'GET');
    },

    update: async (
      id: ArchitectureId,
      input: UpdateArchitectureInput
    ): Promise<{ architecture: Architecture }> => {
      return this.request<{ architecture: Architecture }>(`/architectures/${id}`, 'PATCH', input);
    },

    delete: async (id: ArchitectureId): Promise<{ success: boolean; id: string }> => {
      return this.request<{ success: boolean; id: string }>(`/architectures/${id}`, 'DELETE');
    },

    getModel: async (
      id: ArchitectureId,
      versionId?: VersionId
    ): Promise<ArchitectureModel> => {
      const q = versionId ? `?versionId=${versionId}` : '';
      return this.request<ArchitectureModel>(`/architectures/${id}/model${q}`, 'GET');
    },
  };

  // ==========================================================================
  // Model Objects Resource
  // ==========================================================================
  public readonly objects = {
    list: async (
      architectureId: ArchitectureId,
      options?: { versionId?: VersionId; kind?: ObjectKind }
    ): Promise<{ objects: ModelObject[] }> => {
      const params = new URLSearchParams();
      if (options?.versionId) params.set('versionId', options.versionId);
      if (options?.kind) params.set('kind', options.kind);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return this.request<{ objects: ModelObject[] }>(
        `/architectures/${architectureId}/objects${qs}`,
        'GET'
      );
    },

    create: async (
      architectureId: ArchitectureId,
      input: CreateModelObjectInput
    ): Promise<{ object: ModelObject }> => {
      return this.request<{ object: ModelObject }>(
        `/architectures/${architectureId}/objects`,
        'POST',
        input
      );
    },

    get: async (id: ObjectId): Promise<{ object: ModelObject }> => {
      return this.request<{ object: ModelObject }>(`/objects/${id}`, 'GET');
    },

    update: async (
      id: ObjectId,
      input: UpdateModelObjectInput
    ): Promise<{ object: ModelObject }> => {
      return this.request<{ object: ModelObject }>(`/objects/${id}`, 'PATCH', input);
    },

    delete: async (id: ObjectId): Promise<{ success: boolean; id: string }> => {
      return this.request<{ success: boolean; id: string }>(`/objects/${id}`, 'DELETE');
    },
  };

  // ==========================================================================
  // Model Connections Resource
  // ==========================================================================
  public readonly connections = {
    list: async (
      architectureId: ArchitectureId,
      options?: { versionId?: VersionId }
    ): Promise<{ connections: ModelConnection[] }> => {
      const qs = options?.versionId ? `?versionId=${options.versionId}` : '';
      return this.request<{ connections: ModelConnection[] }>(
        `/architectures/${architectureId}/connections${qs}`,
        'GET'
      );
    },

    create: async (
      architectureId: ArchitectureId,
      input: CreateModelConnectionInput
    ): Promise<{ connection: ModelConnection }> => {
      return this.request<{ connection: ModelConnection }>(
        `/architectures/${architectureId}/connections`,
        'POST',
        input
      );
    },

    get: async (id: ConnectionId): Promise<{ connection: ModelConnection }> => {
      return this.request<{ connection: ModelConnection }>(`/connections/${id}`, 'GET');
    },

    update: async (
      id: ConnectionId,
      input: UpdateModelConnectionInput
    ): Promise<{ connection: ModelConnection }> => {
      return this.request<{ connection: ModelConnection }>(`/connections/${id}`, 'PATCH', input);
    },

    delete: async (id: ConnectionId): Promise<{ success: boolean; id: string }> => {
      return this.request<{ success: boolean; id: string }>(`/connections/${id}`, 'DELETE');
    },
  };

  // ==========================================================================
  // Views Resource
  // ==========================================================================
  public readonly views = {
    list: async (architectureId: ArchitectureId): Promise<{ views: View[] }> => {
      return this.request<{ views: View[] }>(`/architectures/${architectureId}/views`, 'GET');
    },

    get: async (id: ViewId): Promise<{ view: View }> => {
      return this.request<{ view: View }>(`/views/${id}`, 'GET');
    },

    create: async (
      architectureId: ArchitectureId,
      input: { name: string; kind: string; level?: number }
    ): Promise<{ view: View }> => {
      return this.request<{ view: View }>(`/architectures/${architectureId}/views`, 'POST', input);
    },

    delete: async (id: ViewId): Promise<{ success: boolean; id: string }> => {
      return this.request<{ success: boolean; id: string }>(`/views/${id}`, 'DELETE');
    },
  };

  // ==========================================================================
  // Flows Resource
  // ==========================================================================
  public readonly flows = {
    list: async (architectureId: ArchitectureId): Promise<{ flows: Flow[] }> => {
      return this.request<{ flows: Flow[] }>(`/architectures/${architectureId}/flows`, 'GET');
    },

    get: async (id: FlowId): Promise<{ flow: Flow }> => {
      return this.request<{ flow: Flow }>(`/flows/${id}`, 'GET');
    },

    create: async (
      architectureId: ArchitectureId,
      input: { name: string; description?: string }
    ): Promise<{ flow: Flow }> => {
      return this.request<{ flow: Flow }>(`/architectures/${architectureId}/flows`, 'POST', input);
    },

    delete: async (id: FlowId): Promise<{ success: boolean; id: string }> => {
      return this.request<{ success: boolean; id: string }>(`/flows/${id}`, 'DELETE');
    },
  };
}

export function createDiagramHQClient(config?: SdkConfig): DiagramHQClient {
  return new DiagramHQClient(config);
}

// ============================================================================
// In-Memory Test Server for SDK CRUD Round-Trip Verification
// ============================================================================

export interface TestServerState {
  architectures: Map<string, Architecture>;
  versions: Map<string, Version>;
  objects: Map<string, ModelObject>;
  connections: Map<string, ModelConnection>;
  views: Map<string, View>;
  flows: Map<string, Flow>;
}

export function createMockTestServer(initialState?: Partial<TestServerState>): {
  transport: SdkHttpTransport;
  state: TestServerState;
} {
  const state: TestServerState = {
    architectures: initialState?.architectures || new Map(),
    versions: initialState?.versions || new Map(),
    objects: initialState?.objects || new Map(),
    connections: initialState?.connections || new Map(),
    views: initialState?.views || new Map(),
    flows: initialState?.flows || new Map(),
  };

  const transport: SdkHttpTransport = async (urlStr, options) => {
    const url = new URL(urlStr, 'https://api.test-server.local');
    const path = url.pathname;
    const method = options.method;
    const body = options.body ? JSON.parse(options.body) : {};

    // 1. POST /workspaces/:wsId/architectures
    const wsArchMatch = path.match(/^\/workspaces\/([^/]+)\/architectures$/);
    if (wsArchMatch && method === 'POST') {
      const wsId = wsArchMatch[1] as WorkspaceId;
      const id = `arch-${Date.now()}` as ArchitectureId;
      const verId = `ver-${Date.now()}` as VersionId;
      const now = new Date();
      const arch: Architecture = {
        id,
        workspaceId: wsId,
        name: body.name || 'New Architecture',
        description: body.description || null,
        defaultVersionId: verId,
        createdAt: now,
        updatedAt: now,
      };
      const version: Version = {
        id: verId,
        architectureId: id,
        name: 'main',
        kind: 'branch',
        status: 'draft',
        createdAt: now,
      };
      state.architectures.set(id, arch);
      state.versions.set(verId, version);
      return {
        status: 201,
        json: async () => ({ architecture: arch, version }),
        text: async () => JSON.stringify({ architecture: arch, version }),
      };
    }

    // 2. GET /architectures/:id
    const archGetMatch = path.match(/^\/architectures\/([^/]+)$/);
    if (archGetMatch && method === 'GET') {
      const archId = archGetMatch[1]!;
      const arch = state.architectures.get(archId);
      if (!arch) {
        return {
          status: 404,
          json: async () => ({ error: 'Architecture not found' }),
          text: async () => 'Architecture not found',
        };
      }
      return {
        status: 200,
        json: async () => ({ architecture: arch }),
        text: async () => JSON.stringify({ architecture: arch }),
      };
    }

    // 3. PATCH /architectures/:id
    if (archGetMatch && method === 'PATCH') {
      const archId = archGetMatch[1]!;
      const arch = state.architectures.get(archId);
      if (!arch) {
        return {
          status: 404,
          json: async () => ({ error: 'Not found' }),
          text: async () => 'Not found',
        };
      }
      const updated: Architecture = {
        ...arch,
        name: body.name ?? arch.name,
        description: body.description ?? arch.description,
        updatedAt: new Date(),
      };
      state.architectures.set(archId, updated);
      return {
        status: 200,
        json: async () => ({ architecture: updated }),
        text: async () => JSON.stringify({ architecture: updated }),
      };
    }

    // 4. POST /architectures/:id/objects
    const archObjMatch = path.match(/^\/architectures\/([^/]+)\/objects$/);
    if (archObjMatch && method === 'POST') {
      const archId = archObjMatch[1] as ArchitectureId;
      const objId = `obj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` as ObjectId;
      const now = new Date();
      const obj: ModelObject = {
        id: objId,
        architectureId: archId,
        versionId: body.versionId || ('ver-default' as VersionId),
        parentId: body.parentId || null,
        kind: body.kind || 'component',
        name: body.name || 'Component',
        description: body.description || null,
        metadata: body.metadata || {},
        position: body.position || null,
        createdAt: now,
        updatedAt: now,
      };
      state.objects.set(objId, obj);
      return {
        status: 201,
        json: async () => ({ object: obj }),
        text: async () => JSON.stringify({ object: obj }),
      };
    }

    // 5. GET /architectures/:id/objects
    if (archObjMatch && method === 'GET') {
      const archId = archObjMatch[1] as ArchitectureId;
      const objs = Array.from(state.objects.values()).filter(
        (o) => o.architectureId === archId
      );
      return {
        status: 200,
        json: async () => ({ objects: objs }),
        text: async () => JSON.stringify({ objects: objs }),
      };
    }

    // 6. GET /objects/:id
    const objItemMatch = path.match(/^\/objects\/([^/]+)$/);
    if (objItemMatch && method === 'GET') {
      const objId = objItemMatch[1]!;
      const obj = state.objects.get(objId);
      if (!obj) {
        return {
          status: 404,
          json: async () => ({ error: 'Object not found' }),
          text: async () => 'Object not found',
        };
      }
      return {
        status: 200,
        json: async () => ({ object: obj }),
        text: async () => JSON.stringify({ object: obj }),
      };
    }

    // 7. PATCH /objects/:id
    if (objItemMatch && method === 'PATCH') {
      const objId = objItemMatch[1]!;
      const obj = state.objects.get(objId);
      if (!obj) {
        return {
          status: 404,
          json: async () => ({ error: 'Object not found' }),
          text: async () => 'Object not found',
        };
      }
      const updated: ModelObject = {
        ...obj,
        name: body.name ?? obj.name,
        description: body.description ?? obj.description,
        metadata: body.metadata ? { ...obj.metadata, ...body.metadata } : obj.metadata,
        updatedAt: new Date(),
      };
      state.objects.set(objId, updated);
      return {
        status: 200,
        json: async () => ({ object: updated }),
        text: async () => JSON.stringify({ object: updated }),
      };
    }

    // 8. DELETE /objects/:id
    if (objItemMatch && method === 'DELETE') {
      const objId = objItemMatch[1]!;
      state.objects.delete(objId);
      return {
        status: 200,
        json: async () => ({ success: true, id: objId }),
        text: async () => JSON.stringify({ success: true, id: objId }),
      };
    }

    // 9. POST /architectures/:id/connections
    const archConnMatch = path.match(/^\/architectures\/([^/]+)\/connections$/);
    if (archConnMatch && method === 'POST') {
      const archId = archConnMatch[1] as ArchitectureId;
      const connId = `conn-${Date.now()}` as ConnectionId;
      const now = new Date();
      const conn: ModelConnection = {
        id: connId,
        architectureId: archId,
        versionId: body.versionId || ('ver-default' as VersionId),
        sourceObjectId: body.sourceObjectId,
        targetObjectId: body.targetObjectId,
        kind: body.kind || 'sync',
        label: body.label || null,
        description: body.description || null,
        metadata: body.metadata || {},
        createdAt: now,
        updatedAt: now,
      };
      state.connections.set(connId, conn);
      return {
        status: 201,
        json: async () => ({ connection: conn }),
        text: async () => JSON.stringify({ connection: conn }),
      };
    }

    // 10. GET /architectures/:id/connections
    if (archConnMatch && method === 'GET') {
      const archId = archConnMatch[1] as ArchitectureId;
      const conns = Array.from(state.connections.values()).filter(
        (c) => c.architectureId === archId
      );
      return {
        status: 200,
        json: async () => ({ connections: conns }),
        text: async () => JSON.stringify({ connections: conns }),
      };
    }

    // 11. DELETE /connections/:id
    const connItemMatch = path.match(/^\/connections\/([^/]+)$/);
    if (connItemMatch && method === 'DELETE') {
      const connId = connItemMatch[1]!;
      state.connections.delete(connId);
      return {
        status: 200,
        json: async () => ({ success: true, id: connId }),
        text: async () => JSON.stringify({ success: true, id: connId }),
      };
    }

    // 12. GET /architectures/:id/model
    const modelMatch = path.match(/^\/architectures\/([^/]+)\/model$/);
    if (modelMatch && method === 'GET') {
      const archId = modelMatch[1] as ArchitectureId;
      const arch = state.architectures.get(archId);
      if (!arch) {
        return {
          status: 404,
          json: async () => ({ error: 'Architecture not found' }),
          text: async () => 'Architecture not found',
        };
      }
      const version = Array.from(state.versions.values()).find(
        (v) => v.architectureId === archId
      ) || {
        id: 'ver-main' as VersionId,
        architectureId: archId,
        name: 'main',
        kind: 'branch' as const,
        status: 'draft' as const,
        createdAt: new Date(),
      };
      const objects = Array.from(state.objects.values()).filter(
        (o) => o.architectureId === archId
      );
      const connections = Array.from(state.connections.values()).filter(
        (c) => c.architectureId === archId
      );
      const model: ArchitectureModel = {
        architecture: arch,
        version,
        objects,
        connections,
      };
      return {
        status: 200,
        json: async () => model,
        text: async () => JSON.stringify(model),
      };
    }

    return {
      status: 404,
      json: async () => ({ error: 'Unknown endpoint' }),
      text: async () => 'Unknown endpoint',
    };
  };

  return { transport, state };
}
