import type {
  Architecture,
  ArchitectureModel,
  ModelConnection,
  ModelObject,
  Version,
} from './types';
import type { ConnectionId, ObjectId } from './ids';
import {
  canConnect,
  hasParentCycle,
  InvariantViolationError,
  validateConnection,
} from './invariants';

/**
 * Creates an immutable ArchitectureModel snapshot entity.
 */
export function createArchitectureModel(
  architecture: Architecture,
  version: Version,
  objects: ModelObject[] = [],
  connections: ModelConnection[] = [],
): ArchitectureModel {
  return {
    architecture,
    version,
    objects: [...objects],
    connections: [...connections],
  };
}

/**
 * Adds a ModelObject to the ArchitectureModel.
 * Throws InvariantViolationError if the object's architectureId/versionId mismatch
 * or if an object with the same ID already exists.
 */
export function addModelObject(
  model: ArchitectureModel,
  object: ModelObject,
): ArchitectureModel {
  if (object.architectureId !== model.architecture.id) {
    throw new InvariantViolationError(
      `Object architectureId '${object.architectureId}' does not match model architectureId '${model.architecture.id}'`,
      'ARCHITECTURE_MISMATCH',
    );
  }
  if (object.versionId !== model.version.id) {
    throw new InvariantViolationError(
      `Object versionId '${object.versionId}' does not match model versionId '${model.version.id}'`,
      'VERSION_MISMATCH',
    );
  }
  if (model.objects.some((o) => o.id === object.id)) {
    throw new InvariantViolationError(
      `Object with id '${object.id}' already exists in architecture model`,
      'DUPLICATE_OBJECT_ID',
    );
  }

  // Validate parent cycle if parentId is provided
  if (object.parentId) {
    const parent = model.objects.find((o) => o.id === object.parentId);
    if (!parent) {
      throw new InvariantViolationError(
        `Parent object '${object.parentId}' not found in architecture model`,
        'PARENT_NOT_FOUND',
      );
    }
    const getParent = (id: ObjectId) =>
      model.objects.find((o) => o.id === id)?.parentId;
    if (hasParentCycle(object.id, object.parentId, getParent)) {
      throw new InvariantViolationError(
        `Parent assignment creates a cyclic reference for object '${object.id}'`,
        'PARENT_CYCLE',
      );
    }
  }

  return {
    ...model,
    objects: [...model.objects, object],
  };
}

/**
 * Updates a ModelObject in the ArchitectureModel.
 * Throws InvariantViolationError if object is not found or if update creates a parent cycle.
 */
export function updateModelObject(
  model: ArchitectureModel,
  id: ObjectId | string,
  patch: Partial<Omit<ModelObject, 'id' | 'architectureId' | 'versionId'>>,
): ArchitectureModel {
  const index = model.objects.findIndex((o) => o.id === id);
  if (index === -1) {
    throw new InvariantViolationError(
      `Object with id '${id}' not found in architecture model`,
      'OBJECT_NOT_FOUND',
    );
  }

  const existing = model.objects[index]!;
  const updated: ModelObject = {
    ...existing,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date(),
  };

  if (updated.parentId) {
    const parent = model.objects.find((o) => o.id === updated.parentId);
    if (!parent) {
      throw new InvariantViolationError(
        `Parent object '${updated.parentId}' not found in architecture model`,
        'PARENT_NOT_FOUND',
      );
    }
    const getParent = (objId: ObjectId) => {
      if (objId === updated.id) return updated.parentId;
      return model.objects.find((o) => o.id === objId)?.parentId;
    };
    if (hasParentCycle(updated.id, updated.parentId, getParent)) {
      throw new InvariantViolationError(
        `Parent assignment creates a cyclic reference for object '${updated.id}'`,
        'PARENT_CYCLE',
      );
    }
  }

  const nextObjects = [...model.objects];
  nextObjects[index] = updated;

  return {
    ...model,
    objects: nextObjects,
  };
}

/**
 * Removes a ModelObject from the ArchitectureModel and cascades
 * deletion of any connections connected to this object (Invariant 4).
 */
export function removeModelObject(
  model: ArchitectureModel,
  id: ObjectId | string,
): ArchitectureModel {
  const nextObjects = model.objects.filter((o) => o.id !== id);
  const nextConnections = model.connections.filter(
    (c) => c.sourceObjectId !== id && c.targetObjectId !== id,
  );

  return {
    ...model,
    objects: nextObjects,
    connections: nextConnections,
  };
}

/**
 * Adds a ModelConnection to the ArchitectureModel.
 * Enforces Invariants 1 & 2: distinct objects, matching architecture/version,
 * and both endpoints must exist in the model.
 */
export function addModelConnection(
  model: ArchitectureModel,
  connection: ModelConnection,
): ArchitectureModel {
  if (connection.architectureId !== model.architecture.id) {
    throw new InvariantViolationError(
      `Connection architectureId '${connection.architectureId}' does not match model architectureId '${model.architecture.id}'`,
      'ARCHITECTURE_MISMATCH',
    );
  }
  if (connection.versionId !== model.version.id) {
    throw new InvariantViolationError(
      `Connection versionId '${connection.versionId}' does not match model versionId '${model.version.id}'`,
      'VERSION_MISMATCH',
    );
  }
  if (!canConnect(connection.sourceObjectId, connection.targetObjectId)) {
    throw new InvariantViolationError(
      'Self-connection is not allowed in architecture model',
      'SELF_CONNECTION_FORBIDDEN',
    );
  }
  if (model.connections.some((c) => c.id === connection.id)) {
    throw new InvariantViolationError(
      `Connection with id '${connection.id}' already exists in architecture model`,
      'DUPLICATE_CONNECTION_ID',
    );
  }

  const source = model.objects.find((o) => o.id === connection.sourceObjectId);
  const target = model.objects.find((o) => o.id === connection.targetObjectId);

  if (!source) {
    throw new InvariantViolationError(
      `Source object '${connection.sourceObjectId}' not found in architecture model`,
      'SOURCE_OBJECT_NOT_FOUND',
    );
  }
  if (!target) {
    throw new InvariantViolationError(
      `Target object '${connection.targetObjectId}' not found in architecture model`,
      'TARGET_OBJECT_NOT_FOUND',
    );
  }

  const validation = validateConnection({
    architectureId: model.architecture.id,
    versionId: model.version.id,
    source,
    target,
  });
  if (!validation.valid) {
    throw new InvariantViolationError(
      validation.reason ?? 'Invalid connection endpoints',
      'INVALID_CONNECTION_ENDPOINTS',
    );
  }

  return {
    ...model,
    connections: [...model.connections, connection],
  };
}

/**
 * Updates a ModelConnection in the ArchitectureModel.
 */
export function updateModelConnection(
  model: ArchitectureModel,
  id: ConnectionId | string,
  patch: Partial<Omit<ModelConnection, 'id' | 'architectureId' | 'versionId' | 'sourceObjectId' | 'targetObjectId'>>,
): ArchitectureModel {
  const index = model.connections.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new InvariantViolationError(
      `Connection with id '${id}' not found in architecture model`,
      'CONNECTION_NOT_FOUND',
    );
  }

  const existing = model.connections[index]!;
  const updated: ModelConnection = {
    ...existing,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date(),
  };

  const nextConnections = [...model.connections];
  nextConnections[index] = updated;

  return {
    ...model,
    connections: nextConnections,
  };
}

/**
 * Removes a ModelConnection from the ArchitectureModel.
 */
export function removeModelConnection(
  model: ArchitectureModel,
  id: ConnectionId | string,
): ArchitectureModel {
  return {
    ...model,
    connections: model.connections.filter((c) => c.id !== id),
  };
}

/**
 * Validates the full integrity of an ArchitectureModel snapshot.
 */
export function validateArchitectureModel(model: ArchitectureModel): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (model.version.architectureId !== model.architecture.id) {
    errors.push(
      `Version architectureId '${model.version.architectureId}' does not match architecture id '${model.architecture.id}'`,
    );
  }

  const objectMap = new Map<string, ModelObject>();
  for (const obj of model.objects) {
    if (objectMap.has(obj.id)) {
      errors.push(`Duplicate object ID: '${obj.id}'`);
    }
    objectMap.set(obj.id, obj);

    if (obj.architectureId !== model.architecture.id) {
      errors.push(
        `Object '${obj.id}' architectureId '${obj.architectureId}' does not match '${model.architecture.id}'`,
      );
    }
    if (obj.versionId !== model.version.id) {
      errors.push(
        `Object '${obj.id}' versionId '${obj.versionId}' does not match '${model.version.id}'`,
      );
    }
  }

  // Validate parent hierarchy
  const getParent = (id: ObjectId) => objectMap.get(id)?.parentId;
  for (const obj of model.objects) {
    if (obj.parentId) {
      if (!objectMap.has(obj.parentId)) {
        errors.push(
          `Object '${obj.id}' references non-existent parent '${obj.parentId}'`,
        );
      } else if (hasParentCycle(obj.id, obj.parentId, getParent)) {
        errors.push(
          `Object '${obj.id}' has a cyclic parent reference to '${obj.parentId}'`,
        );
      }
    }
  }

  // Validate connections
  const connIds = new Set<string>();
  for (const conn of model.connections) {
    if (connIds.has(conn.id)) {
      errors.push(`Duplicate connection ID: '${conn.id}'`);
    }
    connIds.add(conn.id);

    if (conn.architectureId !== model.architecture.id) {
      errors.push(
        `Connection '${conn.id}' architectureId '${conn.architectureId}' does not match '${model.architecture.id}'`,
      );
    }
    if (conn.versionId !== model.version.id) {
      errors.push(
        `Connection '${conn.id}' versionId '${conn.versionId}' does not match '${model.version.id}'`,
      );
    }
    if (!canConnect(conn.sourceObjectId, conn.targetObjectId)) {
      errors.push(
        `Connection '${conn.id}' connects object '${conn.sourceObjectId}' to itself`,
      );
    }
    if (!objectMap.has(conn.sourceObjectId)) {
      errors.push(
        `Connection '${conn.id}' references non-existent source object '${conn.sourceObjectId}'`,
      );
    }
    if (!objectMap.has(conn.targetObjectId)) {
      errors.push(
        `Connection '${conn.id}' references non-existent target object '${conn.targetObjectId}'`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Checks whether two ArchitectureModel snapshots represent an identical model.
 * Compares architecture metadata, version identity, and the exact set of objects
 * and connections independent of array ordering.
 */
export function isModelIdentical(
  a: ArchitectureModel,
  b: ArchitectureModel,
): boolean {
  if (a.architecture.id !== b.architecture.id) return false;
  if (a.architecture.name !== b.architecture.name) return false;
  if (a.architecture.description !== b.architecture.description) return false;
  if (a.version.id !== b.version.id) return false;
  if (a.version.kind !== b.version.kind) return false;

  if (a.objects.length !== b.objects.length) return false;
  if (a.connections.length !== b.connections.length) return false;

  // Compare objects
  const aObjMap = new Map(a.objects.map((o) => [o.id, o]));
  for (const bObj of b.objects) {
    const aObj = aObjMap.get(bObj.id);
    if (!aObj) return false;
    if (aObj.name !== bObj.name) return false;
    if (aObj.kind !== bObj.kind) return false;
    if (aObj.description !== bObj.description) return false;
    if (aObj.parentId !== bObj.parentId) return false;
    if (JSON.stringify(aObj.metadata ?? {}) !== JSON.stringify(bObj.metadata ?? {})) {
      return false;
    }
  }

  // Compare connections
  const aConnMap = new Map(a.connections.map((c) => [c.id, c]));
  for (const bConn of b.connections) {
    const aConn = aConnMap.get(bConn.id);
    if (!aConn) return false;
    if (aConn.sourceObjectId !== bConn.sourceObjectId) return false;
    if (aConn.targetObjectId !== bConn.targetObjectId) return false;
    if (aConn.kind !== bConn.kind) return false;
    if (aConn.label !== bConn.label) return false;
    if (aConn.description !== bConn.description) return false;
    if (JSON.stringify(aConn.metadata ?? {}) !== JSON.stringify(bConn.metadata ?? {})) {
      return false;
    }
  }

  return true;
}
