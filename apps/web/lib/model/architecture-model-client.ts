import {
  addModelConnection,
  addModelObject,
  createId,
  isModelIdentical,
  projectViewModelToCanvas,
  removeModelConnection,
  removeModelObject,
  updateModelConnection,
  updateModelObject,
  type ArchitectureId,
  type ArchitectureModel,
  type ConnectionId,
  type ConnectionKind,
  type ModelConnection,
  type ModelObject,
  type ObjectId,
  type ObjectKind,
  type ProjectViewModelViewObject,
  type CanvasNode,
  type CanvasEdge,
  type VersionId,
  type View,
} from '@diagramhq/domain';

export type ModelSubscriber = (model: ArchitectureModel) => void;

export function mapCanvasKindToModelKind(kind?: string): ObjectKind {
  switch (kind) {
    case 'system':
      return 'system';
    case 'service':
    case 'application':
      return 'application';
    case 'database':
    case 'queue':
    case 'store':
      return 'store';
    case 'component':
      return 'component';
    case 'actor':
    case 'person':
      return 'actor';
    case 'group':
    case 'boundary':
      return 'group';
    default:
      return 'application';
  }
}

export function mapModelKindToCanvasKind(kind: ObjectKind, originalKind?: string): string {
  if (originalKind) return originalKind;
  switch (kind) {
    case 'system':
      return 'system';
    case 'application':
      return 'service';
    case 'store':
      return 'database';
    case 'component':
      return 'component';
    case 'actor':
      return 'actor';
    case 'group':
      return 'group';
    default:
      return 'service';
  }
}

export function mapCanvasNodeToModelObject(
  node: CanvasNode,
  architectureId: string,
  versionId: string,
): ModelObject {
  return {
    id: node.id as unknown as ObjectId,
    architectureId: architectureId as unknown as ArchitectureId,
    versionId: versionId as unknown as VersionId,
    kind: mapCanvasKindToModelKind(node.data?.kind),
    name: node.data?.label || node.id,
    description: node.data?.description ?? null,
    parentId: (node.data?.parentId as unknown as ObjectId) ?? null,
    metadata: {
      technology: node.data?.technology,
      originalKind: node.data?.kind,
      c4Level: node.data?.c4Level,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function mapCanvasEdgeToModelConnection(
  edge: CanvasEdge,
  architectureId: string,
  versionId: string,
): ModelConnection {
  return {
    id: edge.id as unknown as ConnectionId,
    architectureId: architectureId as unknown as ArchitectureId,
    versionId: versionId as unknown as VersionId,
    sourceObjectId: edge.source as unknown as ObjectId,
    targetObjectId: edge.target as unknown as ObjectId,
    kind: (edge.data?.kind as unknown as ConnectionKind) || 'sync',
    label: edge.label ?? null,
    description: typeof edge.data?.description === 'string' ? edge.data.description : null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function mapModelObjectToCanvasNode(
  obj: ModelObject,
  position?: { x: number; y: number },
): CanvasNode {
  const meta = obj.metadata && typeof obj.metadata === 'object' ? (obj.metadata as Record<string, unknown>) : {};
  const originalKind = typeof meta.originalKind === 'string' ? meta.originalKind : undefined;
  const technology = typeof meta.technology === 'string' ? meta.technology : undefined;
  const c4Level = typeof meta.c4Level === 'number' ? (meta.c4Level as 1 | 2 | 3) : undefined;

  return {
    id: obj.id,
    type: 'customNode',
    position: position ?? { x: 100, y: 100 },
    data: {
      label: obj.name,
      kind: mapModelKindToCanvasKind(obj.kind, originalKind),
      technology: technology ?? '',
      description: obj.description ?? '',
      c4Level: c4Level ?? (obj.kind === 'system' || obj.kind === 'actor' ? 1 : obj.kind === 'component' ? 3 : 2),
      parentId: obj.parentId ?? null,
    },
  };
}

export function mapModelConnectionToCanvasEdge(conn: ModelConnection): CanvasEdge {
  return {
    id: conn.id,
    source: conn.sourceObjectId,
    target: conn.targetObjectId,
    label: conn.label ?? '',
    data: {
      kind: conn.kind,
      description: conn.description ?? '',
    },
  };
}

export interface CreateObjectInput {
  name: string;
  kind: ObjectKind;
  description?: string;
  parentId?: ObjectId | string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateConnectionInput {
  sourceObjectId: ObjectId | string;
  targetObjectId: ObjectId | string;
  kind?: ConnectionKind;
  label?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * ArchitectureModelClient manages the client-side lifecycle of an ArchitectureModel
 * independent of any diagram or view (DEC-001 / ADR-0001, Layer Boundary Rule 4).
 *
 * Implements optimistic writes with guaranteed rollback on mutation error.
 */
export class ArchitectureModelClient {
  private currentModel: ArchitectureModel | null = null;
  private readonly subscribers = new Set<ModelSubscriber>();
  private architectureId: string | null = null;
  private viewId: string | null = null;

  constructor(
    initialModel?: ArchitectureModel,
    options?: { architectureId?: string; viewId?: string },
  ) {
    if (initialModel) {
      this.currentModel = initialModel;
    }
    if (options?.architectureId) {
      this.architectureId = options.architectureId;
    }
    if (options?.viewId) {
      this.viewId = options.viewId;
    }
  }

  getArchitectureId(): string | null {
    return this.architectureId;
  }

  setArchitectureId(id: string | null): void {
    this.architectureId = id;
  }

  getViewId(): string | null {
    return this.viewId;
  }

  setViewId(id: string | null): void {
    this.viewId = id;
  }

  /**
   * Loads a full model snapshot and projects it to CanvasNodes and CanvasEdges
   * using the provided viewObject positions.
   */
  loadFromModel(
    model: ArchitectureModel,
    viewObjects?: Array<{ objectId: string; positionX: number; positionY: number }>,
  ): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
    this.currentModel = model;
    this.architectureId = model.architecture.id;
    this.notify();

    const posMap = new Map<string, { x: number; y: number }>();
    if (viewObjects) {
      for (const vo of viewObjects) {
        posMap.set(vo.objectId, { x: vo.positionX, y: vo.positionY });
      }
    }

    const nodes: CanvasNode[] = model.objects.map((obj) =>
      mapModelObjectToCanvasNode(obj, posMap.get(obj.id)),
    );
    const edges: CanvasEdge[] = model.connections.map((conn) =>
      mapModelConnectionToCanvasEdge(conn),
    );

    return { nodes, edges };
  }

  /** Gets the active architecture model snapshot. */
  getModel(): ArchitectureModel | null {
    return this.currentModel;
  }

  /** Sets the active architecture model snapshot and notifies subscribers. */
  setModel(model: ArchitectureModel): void {
    this.currentModel = model;
    this.notify();
  }

  /** Subscribes to model state changes. Returns an unsubscribe function. */
  subscribe(subscriber: ModelSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private notify(): void {
    if (this.currentModel) {
      for (const subscriber of this.subscribers) {
        subscriber(this.currentModel);
      }
    }
  }

  private snapshot(): ArchitectureModel {
    if (!this.currentModel) {
      throw new Error('Cannot perform mutation: No active architecture model loaded');
    }
    // Deep clone array references for rollback safety
    return {
      architecture: { ...this.currentModel.architecture },
      version: { ...this.currentModel.version },
      objects: [...this.currentModel.objects],
      connections: [...this.currentModel.connections],
    };
  }

  /**
   * Optimistically creates a model object and calls the persist function.
   * If persist fails or throws, rolls back to the prior model snapshot.
   */
  async createObject(
    input: CreateObjectInput,
    persistFn?: (optimisticObj: ModelObject) => Promise<ModelObject>,
  ): Promise<ModelObject> {
    const priorSnapshot = this.snapshot();

    const prefix =
      input.kind === 'system'
        ? 'sys'
        : input.kind === 'application'
          ? 'app'
          : input.kind === 'store'
            ? 'sto'
            : input.kind === 'component'
              ? 'cmp'
              : input.kind === 'actor'
                ? 'act'
                : 'grp';

    const optimisticObj: ModelObject = {
      id: createId(prefix),
      architectureId: priorSnapshot.architecture.id,
      versionId: priorSnapshot.version.id,
      kind: input.kind,
      name: input.name,
      description: input.description ?? null,
      parentId: (input.parentId as ObjectId) ?? null,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 1. Optimistic write
    this.currentModel = addModelObject(priorSnapshot, optimisticObj);
    this.notify();

    // 2. Persist with rollback on failure
    if (persistFn) {
      try {
        const confirmed = await persistFn(optimisticObj);
        // Replace optimistic object with server-confirmed object
        this.currentModel = {
          ...this.currentModel,
          objects: this.currentModel.objects.map((o) =>
            o.id === optimisticObj.id ? confirmed : o,
          ),
        };
        this.notify();
        return confirmed;
      } catch (error) {
        // Rollback on error
        this.currentModel = priorSnapshot;
        this.notify();
        throw error;
      }
    }

    return optimisticObj;
  }

  /**
   * Optimistically updates a model object and calls the persist function.
   * If persist fails or throws, rolls back to the prior model snapshot.
   */
  async updateObject(
    id: ObjectId | string,
    patch: Partial<Omit<ModelObject, 'id' | 'architectureId' | 'versionId'>>,
    persistFn?: (id: ObjectId | string, patch: Partial<ModelObject>) => Promise<ModelObject>,
  ): Promise<ModelObject> {
    const priorSnapshot = this.snapshot();

    // 1. Optimistic write
    this.currentModel = updateModelObject(priorSnapshot, id, patch);
    this.notify();

    // 2. Persist with rollback on failure
    if (persistFn) {
      try {
        const confirmed = await persistFn(id, patch);
        this.currentModel = {
          ...this.currentModel,
          objects: this.currentModel.objects.map((o) =>
            o.id === id ? confirmed : o,
          ),
        };
        this.notify();
        return confirmed;
      } catch (error) {
        // Rollback
        this.currentModel = priorSnapshot;
        this.notify();
        throw error;
      }
    }

    const updated = this.currentModel.objects.find((o) => o.id === id);
    if (!updated) {
      throw new Error(`Object with id '${id}' not found after update`);
    }
    return updated;
  }

  /**
   * Optimistically removes a model object (and cascades attached connections).
   * If persist fails or throws, rolls back to the prior model snapshot.
   */
  async deleteObject(
    id: ObjectId | string,
    persistFn?: (id: ObjectId | string) => Promise<void>,
  ): Promise<void> {
    const priorSnapshot = this.snapshot();

    // 1. Optimistic write (removes object and its connections)
    this.currentModel = removeModelObject(priorSnapshot, id);
    this.notify();

    // 2. Persist with rollback on failure
    if (persistFn) {
      try {
        await persistFn(id);
      } catch (error) {
        // Rollback
        this.currentModel = priorSnapshot;
        this.notify();
        throw error;
      }
    }
  }

  /**
   * Optimistically creates a model connection between two objects.
   * If persist fails or throws, rolls back to the prior model snapshot.
   */
  async createConnection(
    input: CreateConnectionInput,
    persistFn?: (optimisticConn: ModelConnection) => Promise<ModelConnection>,
  ): Promise<ModelConnection> {
    const priorSnapshot = this.snapshot();

    const optimisticConn: ModelConnection = {
      id: createId('con'),
      architectureId: priorSnapshot.architecture.id,
      versionId: priorSnapshot.version.id,
      sourceObjectId: input.sourceObjectId as ObjectId,
      targetObjectId: input.targetObjectId as ObjectId,
      kind: input.kind ?? 'sync',
      label: input.label ?? null,
      description: input.description ?? null,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 1. Optimistic write
    this.currentModel = addModelConnection(priorSnapshot, optimisticConn);
    this.notify();

    // 2. Persist with rollback on failure
    if (persistFn) {
      try {
        const confirmed = await persistFn(optimisticConn);
        this.currentModel = {
          ...this.currentModel,
          connections: this.currentModel.connections.map((c) =>
            c.id === optimisticConn.id ? confirmed : c,
          ),
        };
        this.notify();
        return confirmed;
      } catch (error) {
        // Rollback
        this.currentModel = priorSnapshot;
        this.notify();
        throw error;
      }
    }

    return optimisticConn;
  }

  /**
   * Optimistically updates a model connection.
   * If persist fails or throws, rolls back to the prior model snapshot.
   */
  async updateConnection(
    id: ConnectionId | string,
    patch: Partial<Omit<ModelConnection, 'id' | 'architectureId' | 'versionId' | 'sourceObjectId' | 'targetObjectId'>>,
    persistFn?: (id: ConnectionId | string, patch: Partial<ModelConnection>) => Promise<ModelConnection>,
  ): Promise<ModelConnection> {
    const priorSnapshot = this.snapshot();

    // 1. Optimistic write
    this.currentModel = updateModelConnection(priorSnapshot, id, patch);
    this.notify();

    // 2. Persist with rollback on failure
    if (persistFn) {
      try {
        const confirmed = await persistFn(id, patch);
        this.currentModel = {
          ...this.currentModel,
          connections: this.currentModel.connections.map((c) =>
            c.id === id ? confirmed : c,
          ),
        };
        this.notify();
        return confirmed;
      } catch (error) {
        // Rollback
        this.currentModel = priorSnapshot;
        this.notify();
        throw error;
      }
    }

    const updated = this.currentModel.connections.find((c) => c.id === id);
    if (!updated) {
      throw new Error(`Connection with id '${id}' not found after update`);
    }
    return updated;
  }

  /**
   * Optimistically removes a model connection.
   * If persist fails or throws, rolls back to the prior model snapshot.
   */
  async deleteConnection(
    id: ConnectionId | string,
    persistFn?: (id: ConnectionId | string) => Promise<void>,
  ): Promise<void> {
    const priorSnapshot = this.snapshot();

    // 1. Optimistic write
    this.currentModel = removeModelConnection(priorSnapshot, id);
    this.notify();

    // 2. Persist with rollback on failure
    if (persistFn) {
      try {
        await persistFn(id);
      } catch (error) {
        // Rollback
        this.currentModel = priorSnapshot;
        this.notify();
        throw error;
      }
    }
  }

  /**
   * Projects the architecture model to canvas nodes and edges using viewObjects positions.
   * This bridges the domain model to the UI canvas without placing domain models in Zustand.
   */
  toCanvasProjection(viewObjects: ProjectViewModelViewObject[] = []) {
    if (!this.currentModel) {
      return { nodes: [], edges: [] };
    }

    return projectViewModelToCanvas({
      objects: this.currentModel.objects.map((o) => ({
        id: o.id,
        name: o.name,
        kind: o.kind,
        description: o.description,
        parentId: o.parentId,
      })),
      connections: this.currentModel.connections.map((c) => ({
        id: c.id,
        sourceId: c.sourceObjectId,
        targetId: c.targetObjectId,
        kind: c.kind,
        description: c.description ?? c.label,
      })),
      viewObjects,
    });
  }

  /** Checks if the current model is identical to another model snapshot. */
  isIdenticalTo(otherModel: ArchitectureModel): boolean {
    if (!this.currentModel) return false;
    return isModelIdentical(this.currentModel, otherModel);
  }

  /**
   * Projects the model to canvas nodes and edges for a SPECIFIC view.
   * Only includes objects that are members of that view (using their per-view layout position).
   * Only includes connections whose source and target are both in the view.
   */
  projectToView(
    viewObjects: Array<{ objectId: string; positionX: number; positionY: number }>,
  ): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
    if (!this.currentModel) {
      return { nodes: [], edges: [] };
    }

    const posMap = new Map<string, { x: number; y: number }>();
    const memberIds = new Set<string>();
    for (const vo of viewObjects) {
      posMap.set(vo.objectId, { x: vo.positionX, y: vo.positionY });
      memberIds.add(vo.objectId);
    }

    // Canvas nodes for objects present in this view
    const nodes: CanvasNode[] = this.currentModel.objects
      .filter((obj) => memberIds.has(obj.id))
      .map((obj) => mapModelObjectToCanvasNode(obj, posMap.get(obj.id)));

    // Canvas edges for connections where both endpoints are visible in this view
    const edges: CanvasEdge[] = this.currentModel.connections
      .filter((conn) => memberIds.has(conn.sourceObjectId) && memberIds.has(conn.targetObjectId))
      .map((conn) => mapModelConnectionToCanvasEdge(conn));

    return { nodes, edges };
  }

  /**
   * Fetches all views belonging to an architecture.
   */
  async fetchViews(architectureId: string): Promise<View[]> {
    try {
      const res = await fetch(`/architectures/${architectureId}/views`);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.views) ? data.views : [];
      }
    } catch (err) {
      console.warn('Failed to fetch views:', err);
    }
    return [];
  }

  /**
   * Creates a new view for an architecture.
   */
  async createView(
    architectureId: string,
    input: { name: string; kind?: string; level?: number; description?: string },
  ): Promise<View | null> {
    try {
      const res = await fetch(`/architectures/${architectureId}/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = await res.json();
        return data.view || null;
      }
    } catch (err) {
      console.warn('Failed to create view:', err);
    }
    return null;
  }

  /**
   * Deletes a view. Keeps all model objects intact.
   */
  async deleteView(viewId: string): Promise<boolean> {
    try {
      const res = await fetch(`/views/${viewId}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete view:', err);
      return false;
    }
  }

  /**
   * Fetches view object memberships and layout positions for a view.
   */
  async fetchViewObjects(
    viewId: string,
  ): Promise<Array<{ viewId: string; objectId: string; positionX: number; positionY: number }>> {
    try {
      const res = await fetch(`/views/${viewId}/objects`);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.viewObjects) ? data.viewObjects : [];
      }
    } catch (err) {
      console.warn('Failed to fetch view objects:', err);
    }
    return [];
  }

  /**
   * Adds an existing model object to a view with optional position.
   */
  async addObjectToView(
    viewId: string,
    objectId: string,
    position?: { x: number; y: number },
  ): Promise<boolean> {
    try {
      const res = await fetch(`/views/${viewId}/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId, position: position || { x: 100, y: 100 } }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to add object to view:', err);
      return false;
    }
  }

  /**
   * Removes an object from a view without deleting it from the model.
   */
  async removeObjectFromView(viewId: string, objectId: string): Promise<boolean> {
    try {
      const res = await fetch(`/views/${viewId}/objects/${objectId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to remove object from view:', err);
      return false;
    }
  }

  /**
   * Batch persists layout positions for objects in a view.
   */
  async saveViewPositions(
    viewId: string,
    positions: Array<{ objectId: string; x: number; y: number }>,
  ): Promise<boolean> {
    try {
      const res = await fetch(`/views/${viewId}/objects/positions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to save view positions:', err);
      return false;
    }
  }
}
