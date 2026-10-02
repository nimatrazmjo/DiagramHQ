/**
 * DiagramHQ - AI Natural-Language Editing Domain Logic (F064)
 *
 * Framework-agnostic natural-language architectural editing engine.
 * Interprets natural language edit commands into explicit, reviewable proposals:
 * - Explicit added / modified / removed change sets
 * - Clear human-in-the-loop Apply / Reject lifecycle (never silent commits)
 * - Guarantees model immutability on rejection
 * - Invariant validation on proposal application
 */

import {
  createId,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
} from './ids';
import type { ModelObject, ModelConnection, ObjectKind } from './types';

export interface NLEditChanges {
  added: {
    objects: ModelObject[];
    connections: ModelConnection[];
  };
  modified: {
    objects: ModelObject[];
    connections: ModelConnection[];
  };
  removed: {
    objectIds: ObjectId[];
    connectionIds: ConnectionId[];
  };
}

export interface NLEditProposal {
  id: string;
  instruction: string;
  rationale: string;
  status: 'proposed' | 'applied' | 'rejected';
  changes: NLEditChanges;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateEditProposalInput {
  instruction: string;
  architectureId: ArchitectureId;
  versionId: VersionId;
  currentObjects: ModelObject[];
  currentConnections: ModelConnection[];
}

/**
 * Finds an object in the model matching an identifier or name substring.
 */
function findObjectByNameOrId(query: string, objects: ModelObject[]): ModelObject | undefined {
  const normalized = query.trim().toLowerCase();
  return objects.find(
    (o) =>
      o.id.toLowerCase() === normalized ||
      o.name.toLowerCase() === normalized ||
      o.name.toLowerCase().includes(normalized)
  );
}

/**
 * Derives C4 ObjectKind from a name or technology keyword.
 */
function inferKindFromName(name: string): ObjectKind {
  const lower = name.toLowerCase();
  if (
    lower.includes('redis') ||
    lower.includes('cache') ||
    lower.includes('database') ||
    lower.includes('db') ||
    lower.includes('postgres') ||
    lower.includes('mongo') ||
    lower.includes('storage') ||
    lower.includes('s3')
  ) {
    return 'store';
  }
  if (lower.includes('user') || lower.includes('client') || lower.includes('actor') || lower.includes('customer')) {
    return 'actor';
  }
  if (lower.includes('external') || lower.includes('stripe') || lower.includes('third party') || lower.includes('saas')) {
    return 'system';
  }
  return 'application';
}

/**
 * Generates an explicit, non-destructive edit proposal from a natural-language instruction.
 */
export function generateEditProposal(input: GenerateEditProposalInput): NLEditProposal {
  const { instruction, architectureId, versionId, currentObjects, currentConnections } = input;
  const trimmed = instruction.trim();

  if (!trimmed) {
    throw new Error('Instruction cannot be empty');
  }

  const now = new Date();
  const isoNow = now.toISOString();

  const changes: NLEditChanges = {
    added: { objects: [], connections: [] },
    modified: { objects: [], connections: [] },
    removed: { objectIds: [], connectionIds: [] },
  };

  let rationale = '';

  // Pattern 1: "Add [Entity] between [A] and [B]" / "Insert [Entity] between [A] and [B]"
  const betweenMatch = trimmed.match(/(?:add|insert)\s+(.+?)\s+between\s+(.+?)\s+and\s+(.+?)(?:\.|$)/i);
  if (betweenMatch && betweenMatch[1] && betweenMatch[2] && betweenMatch[3]) {
    const rawEntityName = betweenMatch[1].trim();
    const rawNodeA = betweenMatch[2].trim();
    const rawNodeB = betweenMatch[3].trim();

    const nodeA = findObjectByNameOrId(rawNodeA, currentObjects);
    const nodeB = findObjectByNameOrId(rawNodeB, currentObjects);

    if (!nodeA) {
      throw new Error(`Cannot find source object '${rawNodeA}' in current architecture`);
    }
    if (!nodeB) {
      throw new Error(`Cannot find target object '${rawNodeB}' in current architecture`);
    }

    const newObjId = createId('sto') as ObjectId;
    const kind = inferKindFromName(rawEntityName);

    // Compute midpoint position safely
    const posAX = nodeA.position?.x ?? 100;
    const posAY = nodeA.position?.y ?? 100;
    const posBX = nodeB.position?.x ?? 500;
    const posBY = nodeB.position?.y ?? 500;
    const midX = Math.round((posAX + posBX) / 2);
    const midY = Math.round((posAY + posBY) / 2);

    const newObject: ModelObject = {
      id: newObjId,
      architectureId,
      versionId,
      name: rawEntityName,
      kind,
      description: `${rawEntityName} inserted between ${nodeA.name} and ${nodeB.name}`,
      position: { x: midX, y: midY },
      createdAt: now,
      updatedAt: now,
    };
    changes.added.objects.push(newObject);

    // Find any direct connection from A to B or B to A to rewire
    const existingConn = currentConnections.find(
      (c) =>
        (c.sourceObjectId === nodeA.id && c.targetObjectId === nodeB.id) ||
        (c.sourceObjectId === nodeB.id && c.targetObjectId === nodeA.id)
    );

    if (existingConn) {
      changes.removed.connectionIds.push(existingConn.id);
    }

    // Connect nodeA -> newObject
    const connAtoNew: ModelConnection = {
      id: createId('con') as ConnectionId,
      architectureId,
      versionId,
      sourceObjectId: nodeA.id,
      targetObjectId: newObject.id,
      label: 'Send Request',
      description: `Traffic routed from ${nodeA.name} through ${newObject.name}`,
      kind: 'sync',
      createdAt: now,
      updatedAt: now,
    };
    changes.added.connections.push(connAtoNew);

    // Connect newObject -> nodeB
    const connNewToB: ModelConnection = {
      id: createId('con') as ConnectionId,
      architectureId,
      versionId,
      sourceObjectId: newObject.id,
      targetObjectId: nodeB.id,
      label: 'Forward / Cache Miss',
      description: `Forwarded operations from ${newObject.name} to ${nodeB.name}`,
      kind: 'sync',
      createdAt: now,
      updatedAt: now,
    };
    changes.added.connections.push(connNewToB);

    rationale = `Proposing insertion of '${newObject.name}' between '${nodeA.name}' and '${nodeB.name}'. Replaces direct link with intermediate cached/brokered connections.`;
  }
  // Pattern 2: "Remove [X]" / "Delete [X]"
  else if (trimmed.match(/^(?:remove|delete)\s+(.+?)(?:\.|$)/i)) {
    const removeMatch = trimmed.match(/^(?:remove|delete)\s+(.+?)(?:\.|$)/i);
    const targetName = removeMatch ? removeMatch[1]?.trim() ?? '' : '';
    const targetObj = findObjectByNameOrId(targetName, currentObjects);

    if (!targetObj) {
      throw new Error(`Cannot find object to remove matching '${targetName}'`);
    }

    changes.removed.objectIds.push(targetObj.id);

    // Find all incident connections to remove
    const incidentConns = currentConnections.filter(
      (c) => c.sourceObjectId === targetObj.id || c.targetObjectId === targetObj.id
    );
    for (const c of incidentConns) {
      changes.removed.connectionIds.push(c.id);
    }

    rationale = `Proposing removal of '${targetObj.name}' (${targetObj.id}) and ${incidentConns.length} dependent connection(s).`;
  }
  // Pattern 3: "Rename [X] to [Y]"
  else if (trimmed.match(/^(?:rename)\s+(.+?)\s+to\s+(.+?)(?:\.|$)/i)) {
    const renameMatch = trimmed.match(/^(?:rename)\s+(.+?)\s+to\s+(.+?)(?:\.|$)/i);
    const oldName = renameMatch ? renameMatch[1]?.trim() ?? '' : '';
    const newName = renameMatch ? renameMatch[2]?.trim() ?? '' : '';
    const targetObj = findObjectByNameOrId(oldName, currentObjects);

    if (!targetObj) {
      throw new Error(`Cannot find object to rename matching '${oldName}'`);
    }

    const modifiedObj: ModelObject = {
      ...targetObj,
      name: newName,
      updatedAt: now,
    };
    changes.modified.objects.push(modifiedObj);

    rationale = `Proposing renaming object '${targetObj.name}' (${targetObj.id}) to '${newName}'.`;
  }
  // Pattern 4: Generic "Add [X]"
  else if (trimmed.match(/^(?:add|create)\s+(.+?)(?:\.|$)/i)) {
    const addMatch = trimmed.match(/^(?:add|create)\s+(.+?)(?:\.|$)/i);
    const entityName = addMatch ? addMatch[1]?.trim() ?? 'New Service' : 'New Service';
    const kind = inferKindFromName(entityName);

    const newObj: ModelObject = {
      id: createId('app') as ObjectId,
      architectureId,
      versionId,
      name: entityName,
      kind,
      description: `Newly added ${entityName}`,
      position: { x: 300, y: 300 },
      createdAt: now,
      updatedAt: now,
    };
    changes.added.objects.push(newObj);
    rationale = `Proposing creation of new ${kind} '${entityName}'.`;
  } else {
    throw new Error(`Unrecognized architectural edit instruction: '${trimmed}'`);
  }

  return {
    id: `nl_prop_${Date.now()}`,
    instruction: trimmed,
    rationale,
    status: 'proposed',
    changes,
    createdAt: isoNow,
    updatedAt: isoNow,
  };
}

/**
 * Applies an edit proposal to the live model, verifying integrity invariants.
 */
export function applyEditProposal(
  proposal: NLEditProposal,
  currentObjects: ModelObject[],
  currentConnections: ModelConnection[]
): {
  updatedObjects: ModelObject[];
  updatedConnections: ModelConnection[];
  appliedProposal: NLEditProposal;
} {
  if (proposal.status === 'applied') {
    throw new Error('Proposal has already been applied');
  }

  const removedObjSet = new Set(proposal.changes.removed.objectIds);
  const removedConnSet = new Set(proposal.changes.removed.connectionIds);

  // 1. Filter out removed objects
  let updatedObjects = currentObjects.filter((o) => !removedObjSet.has(o.id));

  // 2. Apply modified objects
  const modifiedObjMap = new Map(proposal.changes.modified.objects.map((o) => [o.id, o]));
  updatedObjects = updatedObjects.map((o) => modifiedObjMap.get(o.id) ?? o);

  // 3. Append added objects (verifying ID uniqueness)
  const existingObjIds = new Set(updatedObjects.map((o) => o.id));
  for (const obj of proposal.changes.added.objects) {
    if (existingObjIds.has(obj.id)) {
      throw new Error(`Cannot apply proposal: Object '${obj.id}' already exists`);
    }
    updatedObjects.push(obj);
    existingObjIds.add(obj.id);
  }

  // 4. Filter out removed connections
  let updatedConnections = currentConnections.filter((c) => !removedConnSet.has(c.id));

  // 5. Apply modified connections
  const modifiedConnMap = new Map(proposal.changes.modified.connections.map((c) => [c.id, c]));
  updatedConnections = updatedConnections.map((c) => modifiedConnMap.get(c.id) ?? c);

  // 6. Append added connections
  const existingConnIds = new Set(updatedConnections.map((c) => c.id));
  for (const conn of proposal.changes.added.connections) {
    if (existingConnIds.has(conn.id)) {
      throw new Error(`Cannot apply proposal: Connection '${conn.id}' already exists`);
    }
    updatedConnections.push(conn);
    existingConnIds.add(conn.id);
  }

  // 7. Validate connection integrity invariants (no self-loops, all endpoints exist)
  for (const conn of updatedConnections) {
    if (conn.sourceObjectId === conn.targetObjectId) {
      throw new Error(`Cannot apply proposal: Self-connection not allowed on '${conn.id}'`);
    }
    if (!existingObjIds.has(conn.sourceObjectId) || !existingObjIds.has(conn.targetObjectId)) {
      throw new Error(
        `Cannot apply proposal: Connection '${conn.id}' references non-existent endpoints (${conn.sourceObjectId} -> ${conn.targetObjectId})`
      );
    }
  }

  const appliedProposal: NLEditProposal = {
    ...proposal,
    status: 'applied',
    updatedAt: new Date().toISOString(),
  };

  return {
    updatedObjects,
    updatedConnections,
    appliedProposal,
  };
}

/**
 * Rejects an edit proposal with an optional rationale. Does NOT mutate the model.
 */
export function rejectEditProposal(
  proposal: NLEditProposal,
  reason = 'Rejected by architect review'
): NLEditProposal {
  return {
    ...proposal,
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: new Date().toISOString(),
  };
}
