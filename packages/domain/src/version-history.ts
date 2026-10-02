/**
 * DiagramHQ - Version History & Snapshot Immutability Engine (F055)
 *
 * Pure, framework-agnostic architecture version history.
 * Manages mutable live editable architecture versions alongside immutable numbered snapshots.
 * Guarantees that snapshot data remains frozen and immutable even as live edits proceed.
 */

import { createId, type ArchitectureId, type SnapshotId, type VersionId } from './ids';
import type { ModelConnection, ModelObject } from './types';

export class SnapshotImmutableError extends Error {
  readonly snapshotId: SnapshotId;

  constructor(snapshotId: SnapshotId, message?: string) {
    super(
      message ||
        `SnapshotImmutableError: Snapshot '${snapshotId}' is frozen/immutable and cannot be modified.`
    );
    this.name = 'SnapshotImmutableError';
    this.snapshotId = snapshotId;
  }
}

export interface LiveArchitectureVersion {
  readonly id: VersionId;
  readonly architectureId: ArchitectureId;
  name: string;
  isLive: true;
  objects: ModelObject[];
  connections: ModelConnection[];
  updatedAt: number;
}

export interface NumberedSnapshot {
  readonly id: SnapshotId;
  readonly architectureId: ArchitectureId;
  readonly liveVersionId: VersionId;
  readonly versionNumber: string; // e.g., "v1.0", "v1.1", "1.0.0"
  readonly label: string;
  readonly description?: string | null;
  readonly createdBy: string;
  readonly createdAt: number;
  readonly isImmutable: true;
  readonly snapshotData: Readonly<{
    objects: ReadonlyArray<ModelObject>;
    connections: ReadonlyArray<ModelConnection>;
    metadata?: Readonly<Record<string, unknown>>;
  }>;
}

export interface CreateNumberedSnapshotInput {
  versionNumber: string;
  label: string;
  description?: string | null;
  createdBy: string;
  metadata?: Record<string, unknown>;
  now?: number;
}

/**
 * Creates an initial live architecture version.
 */
export function createLiveVersion(
  architectureId: ArchitectureId,
  versionId: VersionId,
  name = 'main (live)',
  initialObjects: ModelObject[] = [],
  initialConnections: ModelConnection[] = [],
  now?: number
): LiveArchitectureVersion {
  return {
    id: versionId,
    architectureId,
    name,
    isLive: true,
    objects: [...initialObjects],
    connections: [...initialConnections],
    updatedAt: now ?? Date.now(),
  };
}

/**
 * Creates an immutable numbered snapshot capturing the exact state of a live version.
 * Clones and deeply freezes the snapshot data to prevent accidental mutations.
 */
export function createNumberedSnapshot(
  liveVersion: LiveArchitectureVersion,
  input: CreateNumberedSnapshotInput
): NumberedSnapshot {
  const timestamp = input.now ?? Date.now();

  // Deep clone objects and connections to decouple snapshot from live reference
  const clonedObjects = liveVersion.objects.map((obj) =>
    Object.freeze({
      ...obj,
      metadata: obj.metadata ? Object.freeze({ ...obj.metadata }) : undefined,
    })
  );

  const clonedConnections = liveVersion.connections.map((conn) =>
    Object.freeze({
      ...conn,
      metadata: conn.metadata ? Object.freeze({ ...conn.metadata }) : undefined,
    })
  );

  const snapshotData = Object.freeze({
    objects: Object.freeze(clonedObjects),
    connections: Object.freeze(clonedConnections),
    metadata: input.metadata ? Object.freeze({ ...input.metadata }) : undefined,
  });

  const snapshot: NumberedSnapshot = Object.freeze({
    id: createId('snp'),
    architectureId: liveVersion.architectureId,
    liveVersionId: liveVersion.id,
    versionNumber: input.versionNumber.trim(),
    label: input.label.trim(),
    description: input.description ?? null,
    createdBy: input.createdBy.trim(),
    createdAt: timestamp,
    isImmutable: true,
    snapshotData,
  });

  return snapshot;
}

/**
 * Applies a mutation to the live editable version.
 * Does not affect any existing snapshots.
 */
export function mutateLiveVersion(
  liveVersion: LiveArchitectureVersion,
  mutator: (draft: LiveArchitectureVersion) => void,
  now?: number
): LiveArchitectureVersion {
  // Execute mutator on live version
  mutator(liveVersion);
  liveVersion.updatedAt = now ?? Date.now();
  return liveVersion;
}

/**
 * Asserts that a version is editable.
 * If passed an immutable snapshot, immediately throws SnapshotImmutableError.
 */
export function assertVersionEditable(version: LiveArchitectureVersion | NumberedSnapshot): void {
  if ('isImmutable' in version && version.isImmutable) {
    throw new SnapshotImmutableError(version.id);
  }
}

/**
 * Filters and sorts snapshots for a specific architecture.
 */
export function listArchitectureSnapshots(
  snapshots: NumberedSnapshot[],
  architectureId: ArchitectureId,
  sortOrder: 'asc' | 'desc' = 'desc'
): NumberedSnapshot[] {
  const filtered = snapshots.filter((s) => s.architectureId === architectureId);
  return filtered.sort((a, b) =>
    sortOrder === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
  );
}

/**
 * Finds a snapshot by its version number (e.g. 'v1.0').
 */
export function findSnapshotByVersionNumber(
  snapshots: NumberedSnapshot[],
  architectureId: ArchitectureId,
  versionNumber: string
): NumberedSnapshot | null {
  const normalized = versionNumber.trim().toLowerCase();
  return (
    snapshots.find(
      (s) =>
        s.architectureId === architectureId &&
        s.versionNumber.trim().toLowerCase() === normalized
    ) ?? null
  );
}

/**
 * Restores a snapshot into a new or target live architecture version.
 */
export function restoreSnapshotToLive(
  snapshot: NumberedSnapshot,
  targetLiveVersionId: VersionId,
  liveName = 'main (restored)',
  now?: number
): LiveArchitectureVersion {
  const timestamp = now ?? Date.now();

  const restoredObjects: ModelObject[] = snapshot.snapshotData.objects.map((obj) => ({
    ...obj,
    versionId: targetLiveVersionId,
    metadata: obj.metadata ? { ...obj.metadata } : undefined,
  }));

  const restoredConnections: ModelConnection[] = snapshot.snapshotData.connections.map(
    (conn) => ({
      ...conn,
      versionId: targetLiveVersionId,
      metadata: conn.metadata ? { ...conn.metadata } : undefined,
    })
  );

  return {
    id: targetLiveVersionId,
    architectureId: snapshot.architectureId,
    name: liveName,
    isLive: true,
    objects: restoredObjects,
    connections: restoredConnections,
    updatedAt: timestamp,
  };
}
