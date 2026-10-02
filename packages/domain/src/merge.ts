/**
 * DiagramHQ - Architecture Branch Merge & Conflict Engine (F061)
 *
 * Pure, framework-agnostic architecture 3-way branch merge engine.
 * Supports:
 * - 3-way merge between base ancestor, source branch, and target branch (main)
 * - Precise conflict detection on identical object IDs (both_modified, both_added, modify_delete)
 * - Conflict resolution strategies ('theirs' / source, 'ours' / target, 'manual')
 * - Complete state synthesis updating main branch while setting source branch to 'merged'
 */

import type { ObjectId, ConnectionId } from './ids';
import type { ModelObject, ModelConnection } from './types';
import type { ArchitectureBranch, BranchState } from './branches';
import { cloneBranchState } from './branches';

export type MergeConflictType = 'both_modified' | 'both_added' | 'modify_delete';

export interface ArchitectureMergeConflict {
  entityId: ObjectId | ConnectionId;
  entityKind: 'object' | 'connection';
  entityName: string;
  conflictType: MergeConflictType;
  baseValue?: ModelObject | ModelConnection | null;
  sourceValue?: ModelObject | ModelConnection | null;
  targetValue?: ModelObject | ModelConnection | null;
  conflictingFields: string[];
}

export type ConflictResolutionStrategy = 'theirs' | 'ours';

export interface ManualResolutionChoice {
  entityId: string;
  chosenValue: 'source' | 'target';
}

export interface MergeResult {
  success: boolean;
  hasConflicts: boolean;
  conflicts: ArchitectureMergeConflict[];
  mergedBranch?: ArchitectureBranch;
  mergedSourceBranch?: ArchitectureBranch;
}

function areObjectsEqual(o1?: ModelObject | null, o2?: ModelObject | null): boolean {
  if (!o1 && !o2) return true;
  if (!o1 || !o2) return false;
  return (
    o1.name === o2.name &&
    o1.kind === o2.kind &&
    o1.description === o2.description &&
    o1.parentId === o2.parentId &&
    o1.position?.x === o2.position?.x &&
    o1.position?.y === o2.position?.y
  );
}

function areConnectionsEqual(c1?: ModelConnection | null, c2?: ModelConnection | null): boolean {
  if (!c1 && !c2) return true;
  if (!c1 || !c2) return false;
  return (
    c1.label === c2.label &&
    c1.kind === c2.kind &&
    c1.sourceObjectId === c2.sourceObjectId &&
    c1.targetObjectId === c2.targetObjectId
  );
}

/**
 * Detects 3-way merge conflicts between base ancestor, source branch, and target branch.
 */
export function detectMergeConflicts(
  baseState: BranchState,
  sourceBranch: ArchitectureBranch,
  targetBranch: ArchitectureBranch
): ArchitectureMergeConflict[] {
  const conflicts: ArchitectureMergeConflict[] = [];

  const baseObjMap = new Map<ObjectId, ModelObject>(baseState.objects.map((o) => [o.id, o]));
  const sourceObjMap = new Map<ObjectId, ModelObject>(sourceBranch.state.objects.map((o) => [o.id, o]));
  const targetObjMap = new Map<ObjectId, ModelObject>(targetBranch.state.objects.map((o) => [o.id, o]));

  const allObjectIds = new Set<ObjectId>([
    ...baseObjMap.keys(),
    ...sourceObjMap.keys(),
    ...targetObjMap.keys(),
  ]);

  for (const id of allObjectIds) {
    const baseObj = baseObjMap.get(id);
    const sourceObj = sourceObjMap.get(id);
    const targetObj = targetObjMap.get(id);

    // Case 1: Both added with same ID but different attributes
    if (!baseObj && sourceObj && targetObj) {
      if (!areObjectsEqual(sourceObj, targetObj)) {
        conflicts.push({
          entityId: id,
          entityKind: 'object',
          entityName: sourceObj.name || targetObj.name,
          conflictType: 'both_added',
          baseValue: null,
          sourceValue: sourceObj,
          targetValue: targetObj,
          conflictingFields: ['name', 'kind', 'description'],
        });
      }
      continue;
    }

    // Case 2: One modified, one deleted
    if (baseObj) {
      const sourceModified = sourceObj && !areObjectsEqual(baseObj, sourceObj);
      const targetModified = targetObj && !areObjectsEqual(baseObj, targetObj);
      const sourceDeleted = !sourceObj;
      const targetDeleted = !targetObj;

      if ((sourceModified && targetDeleted) || (targetModified && sourceDeleted)) {
        conflicts.push({
          entityId: id,
          entityKind: 'object',
          entityName: baseObj.name,
          conflictType: 'modify_delete',
          baseValue: baseObj,
          sourceValue: sourceObj || null,
          targetValue: targetObj || null,
          conflictingFields: ['lifecycle'],
        });
        continue;
      }

      // Case 3: Both modified on the same object ID
      if (sourceObj && targetObj && sourceModified && targetModified) {
        if (!areObjectsEqual(sourceObj, targetObj)) {
          const conflictingFields: string[] = [];
          if (sourceObj.name !== targetObj.name) conflictingFields.push('name');
          if (sourceObj.kind !== targetObj.kind) conflictingFields.push('kind');
          if (sourceObj.description !== targetObj.description) conflictingFields.push('description');
          if (
            sourceObj.position?.x !== targetObj.position?.x ||
            sourceObj.position?.y !== targetObj.position?.y
          ) {
            conflictingFields.push('position');
          }

          conflicts.push({
            entityId: id,
            entityKind: 'object',
            entityName: sourceObj.name,
            conflictType: 'both_modified',
            baseValue: baseObj,
            sourceValue: sourceObj,
            targetValue: targetObj,
            conflictingFields,
          });
        }
      }
    }
  }

  // Check connections conflicts
  const baseConnMap = new Map<ConnectionId, ModelConnection>(baseState.connections.map((c) => [c.id, c]));
  const sourceConnMap = new Map<ConnectionId, ModelConnection>(sourceBranch.state.connections.map((c) => [c.id, c]));
  const targetConnMap = new Map<ConnectionId, ModelConnection>(targetBranch.state.connections.map((c) => [c.id, c]));

  const allConnIds = new Set<ConnectionId>([
    ...baseConnMap.keys(),
    ...sourceConnMap.keys(),
    ...targetConnMap.keys(),
  ]);

  for (const id of allConnIds) {
    const baseConn = baseConnMap.get(id);
    const sourceConn = sourceConnMap.get(id);
    const targetConn = targetConnMap.get(id);

    if (baseConn && sourceConn && targetConn) {
      const sourceMod = !areConnectionsEqual(baseConn, sourceConn);
      const targetMod = !areConnectionsEqual(baseConn, targetConn);
      if (sourceMod && targetMod && !areConnectionsEqual(sourceConn, targetConn)) {
        conflicts.push({
          entityId: id,
          entityKind: 'connection',
          entityName: sourceConn.label || targetConn.label || 'Connection',
          conflictType: 'both_modified',
          baseValue: baseConn,
          sourceValue: sourceConn,
          targetValue: targetConn,
          conflictingFields: ['label', 'kind'],
        });
      }
    }
  }

  return conflicts;
}

export interface MergeOptions {
  strategy?: ConflictResolutionStrategy;
  manualResolutions?: ManualResolutionChoice[];
}

/**
 * Executes 3-way merge of sourceBranch onto targetBranch (main).
 */
export function mergeBranchOntoMain(
  baseState: BranchState,
  sourceBranch: ArchitectureBranch,
  targetBranch: ArchitectureBranch,
  options?: MergeOptions
): MergeResult {
  const conflicts = detectMergeConflicts(baseState, sourceBranch, targetBranch);

  if (conflicts.length > 0 && !options?.strategy && (!options?.manualResolutions || options.manualResolutions.length === 0)) {
    return {
      success: false,
      hasConflicts: true,
      conflicts,
    };
  }

  const manualMap = new Map<string, 'source' | 'target'>(
    (options?.manualResolutions || []).map((m) => [m.entityId, m.chosenValue])
  );

  const baseObjMap = new Map<ObjectId, ModelObject>(baseState.objects.map((o) => [o.id, o]));
  const sourceObjMap = new Map<ObjectId, ModelObject>(sourceBranch.state.objects.map((o) => [o.id, o]));
  const targetObjMap = new Map<ObjectId, ModelObject>(targetBranch.state.objects.map((o) => [o.id, o]));

  const mergedObjects: ModelObject[] = [];
  const allObjectIds = new Set<ObjectId>([
    ...baseObjMap.keys(),
    ...sourceObjMap.keys(),
    ...targetObjMap.keys(),
  ]);

  for (const id of allObjectIds) {
    const baseObj = baseObjMap.get(id);
    const sourceObj = sourceObjMap.get(id);
    const targetObj = targetObjMap.get(id);

    const hasConflict = conflicts.some((c) => c.entityId === id);

    if (hasConflict) {
      const manualChoice = manualMap.get(id);
      if (manualChoice === 'source') {
        if (sourceObj) mergedObjects.push(sourceObj);
      } else if (manualChoice === 'target') {
        if (targetObj) mergedObjects.push(targetObj);
      } else if (options?.strategy === 'theirs') {
        if (sourceObj) mergedObjects.push(sourceObj);
      } else {
        // Default ours (target)
        if (targetObj) mergedObjects.push(targetObj);
      }
      continue;
    }

    // Clean 3-way logic
    if (!baseObj) {
      // Added
      if (sourceObj) mergedObjects.push(sourceObj);
      else if (targetObj) mergedObjects.push(targetObj);
    } else {
      const sourceChanged = !areObjectsEqual(baseObj, sourceObj);
      const targetChanged = !areObjectsEqual(baseObj, targetObj);

      if (sourceChanged && !targetChanged) {
        if (sourceObj) mergedObjects.push(sourceObj);
      } else if (targetChanged && !sourceChanged) {
        if (targetObj) mergedObjects.push(targetObj);
      } else if (sourceObj && targetObj) {
        mergedObjects.push(targetObj);
      }
    }
  }

  // Connections merge
  const baseConnMap = new Map<ConnectionId, ModelConnection>(baseState.connections.map((c) => [c.id, c]));
  const sourceConnMap = new Map<ConnectionId, ModelConnection>(sourceBranch.state.connections.map((c) => [c.id, c]));
  const targetConnMap = new Map<ConnectionId, ModelConnection>(targetBranch.state.connections.map((c) => [c.id, c]));

  const mergedConnections: ModelConnection[] = [];
  const allConnIds = new Set<ConnectionId>([
    ...baseConnMap.keys(),
    ...sourceConnMap.keys(),
    ...targetConnMap.keys(),
  ]);

  const validObjectIds = new Set(mergedObjects.map((o) => o.id));

  for (const id of allConnIds) {
    const baseConn = baseConnMap.get(id);
    const sourceConn = sourceConnMap.get(id);
    const targetConn = targetConnMap.get(id);

    let candidateConn: ModelConnection | null = null;
    if (!baseConn) {
      if (sourceConn) candidateConn = sourceConn;
      else if (targetConn) candidateConn = targetConn;
    } else {
      const sourceChanged = !areConnectionsEqual(baseConn, sourceConn);
      const targetChanged = !areConnectionsEqual(baseConn, targetConn);

      if (sourceChanged && !targetChanged) {
        candidateConn = sourceConn || null;
      } else {
        candidateConn = targetConn || null;
      }
    }

    // Retain only if both endpoints exist in mergedObjects
    if (
      candidateConn &&
      validObjectIds.has(candidateConn.sourceObjectId) &&
      validObjectIds.has(candidateConn.targetObjectId)
    ) {
      mergedConnections.push(candidateConn);
    }
  }

  // Synthesize merged branch state
  const mergedState: BranchState = {
    ...cloneBranchState(targetBranch.state),
    objects: mergedObjects,
    connections: mergedConnections,
  };

  const now = new Date().toISOString();
  const updatedTargetBranch: ArchitectureBranch = {
    ...targetBranch,
    state: mergedState,
    updatedAt: now,
  };

  const updatedSourceBranch: ArchitectureBranch = {
    ...sourceBranch,
    status: 'merged',
    updatedAt: now,
  };

  return {
    success: true,
    hasConflicts: false,
    conflicts: [],
    mergedBranch: updatedTargetBranch,
    mergedSourceBranch: updatedSourceBranch,
  };
}
