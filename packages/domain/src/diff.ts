/**
 * DiagramHQ - Architecture Visual Diff Engine (F058)
 *
 * Pure, framework-agnostic architecture diff engine.
 * Accurately diffs two architecture versions or branches across:
 * - Added (new entities in v2)
 * - Modified (entity attributes/metadata changed)
 * - Removed (entities in v1 deleted in v2)
 * - Moved (entity position changed without attribute modification)
 * - Unchanged (identical)
 *
 * Assigns standardized semantic color codes for visual canvas overlay.
 */

import type { ObjectId, ConnectionId } from './ids';
import type { ModelObject, ModelConnection } from './types';

export type DiffChangeType = 'added' | 'modified' | 'removed' | 'moved' | 'unchanged';

export interface DiffColorTheme {
  added: string;
  modified: string;
  removed: string;
  moved: string;
  unchanged: string;
}

export const DEFAULT_DIFF_COLORS: DiffColorTheme = {
  added: '#10b981',    // Emerald-500
  modified: '#f59e0b', // Amber-500
  removed: '#f43f5e',  // Rose-500
  moved: '#8b5cf6',    // Purple-500
  unchanged: '#64748b', // Slate-500
};

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface ObjectDiffItem {
  id: ObjectId;
  name: string;
  changeType: DiffChangeType;
  color: string;
  previousPosition?: { x: number; y: number } | null;
  currentPosition?: { x: number; y: number } | null;
  previousName?: string;
  currentName?: string;
  fieldChanges: FieldChange[];
}

export interface ConnectionDiffItem {
  id: ConnectionId;
  label?: string | null;
  changeType: DiffChangeType;
  color: string;
  sourceObjectId: ObjectId;
  targetObjectId: ObjectId;
  fieldChanges: FieldChange[];
}

export interface ArchitectureDiffInput {
  objects: ModelObject[];
  connections: ModelConnection[];
  metadata?: Record<string, unknown>;
}

export interface VisualArchitectureDiffResult {
  objects: ObjectDiffItem[];
  connections: ConnectionDiffItem[];
  counts: {
    added: number;
    modified: number;
    removed: number;
    moved: number;
    unchanged: number;
    totalChanges: number;
  };
  colors: DiffColorTheme;
}

/**
 * Checks if two positions are equal.
 */
function positionsEqual(
  p1?: { x: number; y: number } | null,
  p2?: { x: number; y: number } | null
): boolean {
  if (!p1 && !p2) return true;
  if (!p1 || !p2) return false;
  return p1.x === p2.x && p1.y === p2.y;
}

/**
 * Computes semantic visual diff between two architecture versions.
 */
export function computeVisualArchitectureDiff(
  v1: ArchitectureDiffInput,
  v2: ArchitectureDiffInput,
  customColors?: Partial<DiffColorTheme>
): VisualArchitectureDiffResult {
  const colors: DiffColorTheme = {
    ...DEFAULT_DIFF_COLORS,
    ...customColors,
  };

  const v1ObjectMap = new Map<ObjectId, ModelObject>(v1.objects.map((o) => [o.id, o]));
  const v2ObjectMap = new Map<ObjectId, ModelObject>(v2.objects.map((o) => [o.id, o]));

  const objectDiffs: ObjectDiffItem[] = [];

  // Check objects in v2 (added, modified, moved, or unchanged)
  for (const obj2 of v2.objects) {
    const obj1 = v1ObjectMap.get(obj2.id);

    if (!obj1) {
      // Added
      objectDiffs.push({
        id: obj2.id,
        name: obj2.name,
        changeType: 'added',
        color: colors.added,
        currentPosition: obj2.position,
        currentName: obj2.name,
        fieldChanges: [{ field: 'entity', from: null, to: 'created' }],
      });
    } else {
      const fieldChanges: FieldChange[] = [];

      if (obj1.name !== obj2.name) {
        fieldChanges.push({ field: 'name', from: obj1.name, to: obj2.name });
      }
      if (obj1.kind !== obj2.kind) {
        fieldChanges.push({ field: 'kind', from: obj1.kind, to: obj2.kind });
      }
      if (obj1.description !== obj2.description) {
        fieldChanges.push({ field: 'description', from: obj1.description, to: obj2.description });
      }
      if (obj1.parentId !== obj2.parentId) {
        fieldChanges.push({ field: 'parentId', from: obj1.parentId, to: obj2.parentId });
      }

      const posChanged = !positionsEqual(obj1.position, obj2.position);
      if (posChanged) {
        fieldChanges.push({ field: 'position', from: obj1.position, to: obj2.position });
      }

      let changeType: DiffChangeType = 'unchanged';
      if (fieldChanges.length > 0) {
        // If ONLY position changed, it is 'moved'
        if (posChanged && fieldChanges.length === 1) {
          changeType = 'moved';
        } else {
          changeType = 'modified';
        }
      }

      objectDiffs.push({
        id: obj2.id,
        name: obj2.name,
        changeType,
        color: colors[changeType],
        previousPosition: obj1.position,
        currentPosition: obj2.position,
        previousName: obj1.name,
        currentName: obj2.name,
        fieldChanges,
      });
    }
  }

  // Check objects in v1 that are no longer in v2 (removed)
  for (const obj1 of v1.objects) {
    if (!v2ObjectMap.has(obj1.id)) {
      objectDiffs.push({
        id: obj1.id,
        name: obj1.name,
        changeType: 'removed',
        color: colors.removed,
        previousPosition: obj1.position,
        previousName: obj1.name,
        fieldChanges: [{ field: 'entity', from: 'exists', to: null }],
      });
    }
  }

  // Connections diff
  const v1ConnMap = new Map<ConnectionId, ModelConnection>(v1.connections.map((c) => [c.id, c]));
  const v2ConnMap = new Map<ConnectionId, ModelConnection>(v2.connections.map((c) => [c.id, c]));

  const connectionDiffs: ConnectionDiffItem[] = [];

  for (const conn2 of v2.connections) {
    const conn1 = v1ConnMap.get(conn2.id);

    if (!conn1) {
      connectionDiffs.push({
        id: conn2.id,
        label: conn2.label,
        changeType: 'added',
        color: colors.added,
        sourceObjectId: conn2.sourceObjectId,
        targetObjectId: conn2.targetObjectId,
        fieldChanges: [{ field: 'entity', from: null, to: 'created' }],
      });
    } else {
      const fieldChanges: FieldChange[] = [];
      if (conn1.label !== conn2.label) {
        fieldChanges.push({ field: 'label', from: conn1.label, to: conn2.label });
      }
      if (conn1.kind !== conn2.kind) {
        fieldChanges.push({ field: 'kind', from: conn1.kind, to: conn2.kind });
      }
      if (conn1.sourceObjectId !== conn2.sourceObjectId) {
        fieldChanges.push({ field: 'sourceObjectId', from: conn1.sourceObjectId, to: conn2.sourceObjectId });
      }
      if (conn1.targetObjectId !== conn2.targetObjectId) {
        fieldChanges.push({ field: 'targetObjectId', from: conn1.targetObjectId, to: conn2.targetObjectId });
      }

      const changeType: DiffChangeType = fieldChanges.length > 0 ? 'modified' : 'unchanged';
      connectionDiffs.push({
        id: conn2.id,
        label: conn2.label,
        changeType,
        color: colors[changeType],
        sourceObjectId: conn2.sourceObjectId,
        targetObjectId: conn2.targetObjectId,
        fieldChanges,
      });
    }
  }

  for (const conn1 of v1.connections) {
    if (!v2ConnMap.has(conn1.id)) {
      connectionDiffs.push({
        id: conn1.id,
        label: conn1.label,
        changeType: 'removed',
        color: colors.removed,
        sourceObjectId: conn1.sourceObjectId,
        targetObjectId: conn1.targetObjectId,
        fieldChanges: [{ field: 'entity', from: 'exists', to: null }],
      });
    }
  }

  // Compute counts
  const allItems = [...objectDiffs, ...connectionDiffs];
  const counts = {
    added: allItems.filter((i) => i.changeType === 'added').length,
    modified: allItems.filter((i) => i.changeType === 'modified').length,
    removed: allItems.filter((i) => i.changeType === 'removed').length,
    moved: allItems.filter((i) => i.changeType === 'moved').length,
    unchanged: allItems.filter((i) => i.changeType === 'unchanged').length,
    totalChanges: allItems.filter((i) => i.changeType !== 'unchanged').length,
  };

  return {
    objects: objectDiffs,
    connections: connectionDiffs,
    counts,
    colors,
  };
}
