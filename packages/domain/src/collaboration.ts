/**
 * Real-time collaboration engine with deterministic conflict resolution (F048).
 * Pure domain implementation without framework dependencies.
 */
import {
  addModelConnection,
  addModelObject,
  removeModelConnection,
  removeModelObject,
  updateModelConnection,
  updateModelObject,
} from './architecture-model';
import type { ProjectViewModelViewObject } from './canvas';
import { createId, type ArchitectureId, type ConnectionId, type ObjectId } from './ids';
import type { ArchitectureModel, ModelConnection, ModelObject } from './types';

export type CollabOperationType =
  | 'upsert_object'
  | 'delete_object'
  | 'upsert_connection'
  | 'delete_connection'
  | 'update_object_position';

export interface CollabOperation<TPayload = Record<string, unknown>> {
  readonly id: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly userName: string;
  readonly architectureId: ArchitectureId;
  readonly type: CollabOperationType;
  readonly payload: TPayload;
  readonly lamportClock: number;
  readonly timestamp: number;
}

export interface LamportTag {
  readonly lamportClock: number;
  readonly timestamp: number;
  readonly sessionId: string;
}

export interface CollabSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly userName: string;
  readonly architectureId: ArchitectureId;
  readonly model: ArchitectureModel;
  readonly viewObjects: ProjectViewModelViewObject[];
  readonly clock: number;
  readonly appliedOpIds: Set<string>;
  readonly operationLog: CollabOperation[];
  readonly fieldTags: Map<string, LamportTag>;
  readonly conflictCount: number;
}

export interface CreateCollabSessionParams {
  sessionId?: string;
  userId: string;
  userName: string;
  initialModel: ArchitectureModel;
  initialViewObjects?: ProjectViewModelViewObject[];
}

/**
 * Deterministically compares two Lamport timestamps for Last-Write-Wins (LWW).
 * Returns > 0 if A wins, < 0 if B wins, 0 if identical.
 */
export function compareLamport(a: LamportTag, b: LamportTag): number {
  if (a.lamportClock !== b.lamportClock) {
    return a.lamportClock - b.lamportClock;
  }
  if (a.timestamp !== b.timestamp) {
    return a.timestamp - b.timestamp;
  }
  return a.sessionId.localeCompare(b.sessionId);
}

/**
 * Initializes a new collaborative editing session on an ArchitectureModel.
 */
export function createCollabSession({
  sessionId = createId('usr'),
  userId,
  userName,
  initialModel,
  initialViewObjects = [],
}: CreateCollabSessionParams): CollabSession {
  return {
    sessionId,
    userId,
    userName,
    architectureId: initialModel.architecture.id,
    model: initialModel,
    viewObjects: [...initialViewObjects],
    clock: 0,
    appliedOpIds: new Set<string>(),
    operationLog: [],
    fieldTags: new Map<string, LamportTag>(),
    conflictCount: 0,
  };
}

/**
 * Creates and applies a local operation to the session, advancing the Lamport clock.
 */
export function applyLocalOperation(
  session: CollabSession,
  opInput: {
    type: CollabOperationType;
    payload: Record<string, unknown>;
  },
): { session: CollabSession; operation: CollabOperation } {
  const nextClock = session.clock + 1;
  const now = Date.now();
  const opId = `op_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  const operation: CollabOperation = {
    id: opId,
    sessionId: session.sessionId,
    userId: session.userId,
    userName: session.userName,
    architectureId: session.architectureId,
    type: opInput.type,
    payload: opInput.payload,
    lamportClock: nextClock,
    timestamp: now,
  };

  const updatedSession = applyOperationToState(
    {
      ...session,
      clock: nextClock,
    },
    operation,
    false,
  );

  return {
    session: updatedSession.session,
    operation,
  };
}

/**
 * Applies a remote operation received from a peer, resolving conflicts deterministically.
 */
export function applyRemoteOperation(
  session: CollabSession,
  operation: CollabOperation,
): { session: CollabSession; accepted: boolean; conflictResolved: boolean } {
  // Idempotency: skip if already applied
  if (session.appliedOpIds.has(operation.id)) {
    return { session, accepted: false, conflictResolved: false };
  }

  // Lamport clock sync: clock = max(local, remote) + 1
  const syncedClock = Math.max(session.clock, operation.lamportClock) + 1;

  const res = applyOperationToState(
    {
      ...session,
      clock: syncedClock,
    },
    operation,
    true,
  );

  return {
    session: res.session,
    accepted: true,
    conflictResolved: res.conflictResolved,
  };
}

/**
 * Bidirectionally synchronizes two collaborative sessions, ensuring full convergence.
 */
export function syncSessions(
  clientA: CollabSession,
  clientB: CollabSession,
): { clientA: CollabSession; clientB: CollabSession } {
  let nextA = clientA;
  let nextB = clientB;

  // Deliver A's operations to B
  for (const op of clientA.operationLog) {
    if (!nextB.appliedOpIds.has(op.id)) {
      const res = applyRemoteOperation(nextB, op);
      nextB = res.session;
    }
  }

  // Deliver B's operations to A
  for (const op of clientB.operationLog) {
    if (!nextA.appliedOpIds.has(op.id)) {
      const res = applyRemoteOperation(nextA, op);
      nextA = res.session;
    }
  }

  return { clientA: nextA, clientB: nextB };
}

function applyOperationToState(
  session: CollabSession,
  op: CollabOperation,
  isRemote: boolean,
): { session: CollabSession; conflictResolved: boolean } {
  let nextModel = session.model;
  let nextViewObjects = [...session.viewObjects];
  const nextFieldTags = new Map(session.fieldTags);
  const nextAppliedIds = new Set(session.appliedOpIds).add(op.id);
  const nextLog = [...session.operationLog, op];
  let conflictResolved = false;

  const currentTag: LamportTag = {
    lamportClock: op.lamportClock,
    timestamp: op.timestamp,
    sessionId: op.sessionId,
  };

  switch (op.type) {
    case 'upsert_object': {
      const rawObj = op.payload as unknown as ModelObject;
      const objectId = rawObj.id;
      const existing = nextModel.objects.find((o) => o.id === objectId);

      if (!existing) {
        // Add object
        nextModel = addModelObject(nextModel, rawObj);
        for (const key of Object.keys(rawObj)) {
          nextFieldTags.set(`obj:${objectId}:${key}`, currentTag);
        }
      } else {
        // Field-level LWW merge
        const patch: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(rawObj)) {
          if (key === 'id' || key === 'architectureId' || key === 'versionId') continue;
          const tagKey = `obj:${objectId}:${key}`;
          const prevTag = nextFieldTags.get(tagKey);

          if (!prevTag || compareLamport(currentTag, prevTag) > 0) {
            patch[key] = val;
            nextFieldTags.set(tagKey, currentTag);
            if (prevTag && isRemote) {
              conflictResolved = true;
            }
          }
        }
        if (Object.keys(patch).length > 0) {
          nextModel = updateModelObject(nextModel, objectId, patch);
        }
      }
      break;
    }

    case 'delete_object': {
      const objectId = (op.payload as { objectId: string }).objectId as ObjectId;
      const tagKey = `obj:${objectId}:__deleted`;
      const prevTag = nextFieldTags.get(tagKey);

      if (!prevTag || compareLamport(currentTag, prevTag) > 0) {
        nextFieldTags.set(tagKey, currentTag);
        nextModel = removeModelObject(nextModel, objectId);
        nextViewObjects = nextViewObjects.filter((vo) => vo.objectId !== objectId);
        if (prevTag && isRemote) {
          conflictResolved = true;
        }
      }
      break;
    }

    case 'upsert_connection': {
      const rawConn = op.payload as unknown as ModelConnection;
      const connectionId = rawConn.id;
      const existing = nextModel.connections.find((c) => c.id === connectionId);

      if (!existing) {
        // Only add connection if both source and target objects exist in the model
        const srcExists = nextModel.objects.some((o) => o.id === rawConn.sourceObjectId);
        const tgtExists = nextModel.objects.some((o) => o.id === rawConn.targetObjectId);
        if (srcExists && tgtExists) {
          nextModel = addModelConnection(nextModel, rawConn);
          for (const key of Object.keys(rawConn)) {
            nextFieldTags.set(`conn:${connectionId}:${key}`, currentTag);
          }
        }
      } else {
        const patch: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(rawConn)) {
          if (
            key === 'id' ||
            key === 'architectureId' ||
            key === 'versionId' ||
            key === 'sourceObjectId' ||
            key === 'targetObjectId'
          ) {
            continue;
          }
          const tagKey = `conn:${connectionId}:${key}`;
          const prevTag = nextFieldTags.get(tagKey);

          if (!prevTag || compareLamport(currentTag, prevTag) > 0) {
            patch[key] = val;
            nextFieldTags.set(tagKey, currentTag);
            if (prevTag && isRemote) {
              conflictResolved = true;
            }
          }
        }
        if (Object.keys(patch).length > 0) {
          nextModel = updateModelConnection(nextModel, connectionId, patch);
        }
      }
      break;
    }

    case 'delete_connection': {
      const connId = (op.payload as { connectionId: string }).connectionId as ConnectionId;
      const tagKey = `conn:${connId}:__deleted`;
      const prevTag = nextFieldTags.get(tagKey);

      if (!prevTag || compareLamport(currentTag, prevTag) > 0) {
        nextFieldTags.set(tagKey, currentTag);
        nextModel = removeModelConnection(nextModel, connId);
        if (prevTag && isRemote) {
          conflictResolved = true;
        }
      }
      break;
    }

    case 'update_object_position': {
      const { objectId, x, y } = op.payload as { objectId: string; x: number; y: number };
      const tagKey = `pos:${objectId}`;
      const prevTag = nextFieldTags.get(tagKey);

      if (!prevTag || compareLamport(currentTag, prevTag) > 0) {
        nextFieldTags.set(tagKey, currentTag);
        const idx = nextViewObjects.findIndex((vo) => vo.objectId === objectId);
        if (idx !== -1) {
          nextViewObjects[idx] = {
            ...nextViewObjects[idx]!,
            x,
            y,
            position: { x, y },
          };
        } else {
          nextViewObjects.push({
            objectId,
            x,
            y,
            position: { x, y },
          });
        }
        if (prevTag && isRemote) {
          conflictResolved = true;
        }
      }
      break;
    }
  }

  return {
    session: {
      ...session,
      model: nextModel,
      viewObjects: nextViewObjects,
      appliedOpIds: nextAppliedIds,
      operationLog: nextLog,
      fieldTags: nextFieldTags,
      conflictCount: conflictResolved ? session.conflictCount + 1 : session.conflictCount,
    },
    conflictResolved,
  };
}
