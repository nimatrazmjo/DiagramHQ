/**
 * DiagramHQ - Architecture Changes & Impact Analysis Engine (F059)
 *
 * Pure, framework-agnostic architecture change sets and impact analysis.
 * Computes:
 * - Direct change lists: added, modified, removed (objects & connections)
 * - Affected sets & counts:
 *   - Affected objects: direct changes + connection endpoints + connected dependencies
 *   - Affected flows: flows traversing affected connections or objects
 *   - Affected teams: teams owning affected objects (via ownership records or metadata)
 */

import type { ObjectId, ConnectionId, FlowId, TeamId } from './ids';
import type { ModelObject, ModelConnection, FlowWithSteps } from './types';
import type { ObjectOwnership, Team } from './teams';

export type ChangeEntityKind = 'object' | 'connection';

export interface ArchitectureEntityRef {
  id: string;
  name: string;
  kind: ChangeEntityKind;
  details?: string;
}

export interface ArchitectureChangeLists {
  added: ArchitectureEntityRef[];
  modified: ArchitectureEntityRef[];
  removed: ArchitectureEntityRef[];
  totalDirectChanges: number;
}

export interface AffectedSets {
  affectedObjectIds: ObjectId[];
  affectedFlowIds: FlowId[];
  affectedTeamIds: TeamId[];
  counts: {
    objects: number;
    flows: number;
    teams: number;
  };
}

export interface ArchitectureChangeSet {
  id: string;
  title: string;
  description?: string;
  changes: ArchitectureChangeLists;
  affected: AffectedSets;
  createdAt: string;
}

export interface ComputeChangeSetInput {
  id?: string;
  title?: string;
  description?: string;
  baseObjects: ModelObject[];
  targetObjects: ModelObject[];
  baseConnections: ModelConnection[];
  targetConnections: ModelConnection[];
  flows?: FlowWithSteps[];
  ownerships?: ObjectOwnership[];
  teams?: Team[];
}

/**
 * Computes the architecture change set and downstream affected sets.
 */
export function computeArchitectureChangeSet(
  input: ComputeChangeSetInput
): ArchitectureChangeSet {
  const baseObjMap = new Map<ObjectId, ModelObject>(input.baseObjects.map((o) => [o.id, o]));
  const targetObjMap = new Map<ObjectId, ModelObject>(input.targetObjects.map((o) => [o.id, o]));

  const baseConnMap = new Map<ConnectionId, ModelConnection>(
    input.baseConnections.map((c) => [c.id, c])
  );
  const targetConnMap = new Map<ConnectionId, ModelConnection>(
    input.targetConnections.map((c) => [c.id, c])
  );

  const added: ArchitectureEntityRef[] = [];
  const modified: ArchitectureEntityRef[] = [];
  const removed: ArchitectureEntityRef[] = [];

  const directChangedObjectIds = new Set<ObjectId>();
  const directChangedConnectionIds = new Set<ConnectionId>();

  // 1. Objects diff
  for (const targetObj of input.targetObjects) {
    const baseObj = baseObjMap.get(targetObj.id);
    if (!baseObj) {
      added.push({
        id: targetObj.id,
        name: targetObj.name,
        kind: 'object',
        details: `Added ${targetObj.kind}`,
      });
      directChangedObjectIds.add(targetObj.id);
    } else {
      const isModified =
        baseObj.name !== targetObj.name ||
        baseObj.kind !== targetObj.kind ||
        baseObj.description !== targetObj.description ||
        baseObj.parentId !== targetObj.parentId;

      if (isModified) {
        modified.push({
          id: targetObj.id,
          name: targetObj.name,
          kind: 'object',
          details: `Modified ${targetObj.kind} properties`,
        });
        directChangedObjectIds.add(targetObj.id);
      }
    }
  }

  for (const baseObj of input.baseObjects) {
    if (!targetObjMap.has(baseObj.id)) {
      removed.push({
        id: baseObj.id,
        name: baseObj.name,
        kind: 'object',
        details: `Removed ${baseObj.kind}`,
      });
      directChangedObjectIds.add(baseObj.id);
    }
  }

  // 2. Connections diff
  for (const targetConn of input.targetConnections) {
    const baseConn = baseConnMap.get(targetConn.id);
    if (!baseConn) {
      added.push({
        id: targetConn.id,
        name: targetConn.label || 'Connection',
        kind: 'connection',
        details: 'Added connection',
      });
      directChangedConnectionIds.add(targetConn.id);
    } else {
      const isModified =
        baseConn.label !== targetConn.label ||
        baseConn.kind !== targetConn.kind ||
        baseConn.sourceObjectId !== targetConn.sourceObjectId ||
        baseConn.targetObjectId !== targetConn.targetObjectId;

      if (isModified) {
        modified.push({
          id: targetConn.id,
          name: targetConn.label || 'Connection',
          kind: 'connection',
          details: 'Modified connection attributes',
        });
        directChangedConnectionIds.add(targetConn.id);
      }
    }
  }

  for (const baseConn of input.baseConnections) {
    if (!targetConnMap.has(baseConn.id)) {
      removed.push({
        id: baseConn.id,
        name: baseConn.label || 'Connection',
        kind: 'connection',
        details: 'Removed connection',
      });
      directChangedConnectionIds.add(baseConn.id);
    }
  }

  // 3. Compute Affected Objects
  // Direct changed objects + source and target of all changed connections
  const affectedObjectIdsSet = new Set<ObjectId>(directChangedObjectIds);

  const checkConnectionEndpoints = (c: ModelConnection) => {
    if (directChangedConnectionIds.has(c.id)) {
      affectedObjectIdsSet.add(c.sourceObjectId);
      affectedObjectIdsSet.add(c.targetObjectId);
    }
  };

  input.baseConnections.forEach(checkConnectionEndpoints);
  input.targetConnections.forEach(checkConnectionEndpoints);

  const affectedObjectIds = Array.from(affectedObjectIdsSet);

  // 4. Compute Affected Flows
  // Flows whose steps traverse any changed connection OR connect between affected objects
  const affectedFlowIdsSet = new Set<FlowId>();
  const flows = input.flows || [];

  for (const flow of flows) {
    const touchesChangedConnection = flow.steps.some((step) =>
      directChangedConnectionIds.has(step.connectionId)
    );

    if (touchesChangedConnection) {
      affectedFlowIdsSet.add(flow.id as FlowId);
      continue;
    }

    // Check if step connection links to affected objects
    const allKnownConns = [...input.baseConnections, ...input.targetConnections];
    const connMap = new Map<ConnectionId, ModelConnection>(allKnownConns.map((c) => [c.id, c]));

    const touchesAffectedObject = flow.steps.some((step) => {
      const conn = connMap.get(step.connectionId);
      if (!conn) return false;
      return (
        affectedObjectIdsSet.has(conn.sourceObjectId) ||
        affectedObjectIdsSet.has(conn.targetObjectId)
      );
    });

    if (touchesAffectedObject) {
      affectedFlowIdsSet.add(flow.id as FlowId);
    }
  }

  const affectedFlowIds = Array.from(affectedFlowIdsSet);

  // 5. Compute Affected Teams
  // Teams that own any affected object
  const affectedTeamIdsSet = new Set<TeamId>();

  // Check explicit ObjectOwnership records
  if (input.ownerships) {
    for (const ownership of input.ownerships) {
      if (affectedObjectIdsSet.has(ownership.objectId)) {
        affectedTeamIdsSet.add(ownership.primaryTeamId);
        if (ownership.backupTeamId) {
          affectedTeamIdsSet.add(ownership.backupTeamId);
        }
      }
    }
  }

  // Also check object metadata (e.g. metadata.ownerTeamId or metadata.teamId)
  const allObjects = [...input.baseObjects, ...input.targetObjects];
  for (const obj of allObjects) {
    if (affectedObjectIdsSet.has(obj.id)) {
      const metaTeamId = (obj.metadata?.ownerTeamId || obj.metadata?.teamId) as TeamId | undefined;
      if (metaTeamId) {
        affectedTeamIdsSet.add(metaTeamId);
      }
    }
  }

  const affectedTeamIds = Array.from(affectedTeamIdsSet);

  const totalDirectChanges = added.length + modified.length + removed.length;

  return {
    id: input.id || 'cs_generated',
    title: input.title || 'Architecture Change Set',
    description: input.description,
    changes: {
      added,
      modified,
      removed,
      totalDirectChanges,
    },
    affected: {
      affectedObjectIds,
      affectedFlowIds,
      affectedTeamIds,
      counts: {
        objects: affectedObjectIds.length,
        flows: affectedFlowIds.length,
        teams: affectedTeamIds.length,
      },
    },
    createdAt: new Date().toISOString(),
  };
}
