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
  type ArchitectureModel,
  type ConnectionId,
  type ConnectionKind,
  type ModelConnection,
  type ModelObject,
  type ObjectId,
  type ObjectKind,
  type ProjectViewModelViewObject,
} from '@diagramhq/domain';

export type ModelSubscriber = (model: ArchitectureModel) => void;

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

  constructor(initialModel?: ArchitectureModel) {
    if (initialModel) {
      this.currentModel = initialModel;
    }
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
}
