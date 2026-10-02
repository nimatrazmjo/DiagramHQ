/**
 * DiagramHQ - Full-State Architecture Snapshots Engine (F056)
 *
 * Pure, framework-agnostic architecture full-state snapshot engine.
 * Captures all 6 dimensions of an architecture state:
 * - Objects
 * - Connections
 * - Views
 * - Flows (including steps)
 * - Metadata
 * - Documentation
 *
 * And provides deterministic restoration back to the captured state.
 */

import { createId, type ArchitectureId, type SnapshotId } from './ids';
import type { FlowWithSteps, ModelConnection, ModelObject, View } from './types';

export interface ArchitectureDocPage {
  id: string;
  title: string;
  slug: string;
  content: string; // Markdown content
  author: string;
  updatedAt: number;
}

export interface ArchitectureDocumentation {
  overview?: string | null;
  pages: ArchitectureDocPage[];
}

export interface ArchitectureFullState {
  objects: ModelObject[];
  connections: ModelConnection[];
  views: View[];
  flows: FlowWithSteps[];
  metadata: Record<string, unknown>;
  documentation: ArchitectureDocumentation;
}

export interface FullArchitectureSnapshot {
  readonly id: SnapshotId;
  readonly architectureId: ArchitectureId;
  readonly versionNumber: string;
  readonly label: string;
  readonly description?: string | null;
  readonly createdBy: string;
  readonly createdAt: number;
  readonly isImmutable: true;
  readonly state: Readonly<ArchitectureFullState>;
}

export interface CaptureSnapshotOptions {
  versionNumber: string;
  label: string;
  description?: string | null;
  createdBy: string;
  now?: number;
}

function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

/**
 * Captures a complete, immutable full-state architecture snapshot
 * across all 6 core model components: objects, connections, views, flows, metadata, documentation.
 */
export function captureFullArchitectureSnapshot(
  architectureId: ArchitectureId,
  currentState: ArchitectureFullState,
  options: CaptureSnapshotOptions
): FullArchitectureSnapshot {
  const timestamp = options.now ?? Date.now();

  // Deep clone all 6 dimensions to guarantee total isolation from subsequent mutations
  const stateSnapshot: ArchitectureFullState = {
    objects: deepClone(currentState.objects),
    connections: deepClone(currentState.connections),
    views: deepClone(currentState.views),
    flows: deepClone(currentState.flows),
    metadata: deepClone(currentState.metadata ?? {}),
    documentation: {
      overview: currentState.documentation?.overview ?? null,
      pages: deepClone(currentState.documentation?.pages ?? []),
    },
  };

  // Deep freeze state
  Object.freeze(stateSnapshot.objects);
  Object.freeze(stateSnapshot.connections);
  Object.freeze(stateSnapshot.views);
  Object.freeze(stateSnapshot.flows);
  Object.freeze(stateSnapshot.metadata);
  Object.freeze(stateSnapshot.documentation);
  Object.freeze(stateSnapshot.documentation.pages);
  Object.freeze(stateSnapshot);

  const snapshot: FullArchitectureSnapshot = Object.freeze({
    id: createId('snp'),
    architectureId,
    versionNumber: options.versionNumber.trim(),
    label: options.label.trim(),
    description: options.description ?? null,
    createdBy: options.createdBy.trim(),
    createdAt: timestamp,
    isImmutable: true,
    state: stateSnapshot,
  });

  return snapshot;
}

/**
 * Restores a captured snapshot into an active, mutable architecture state.
 * Returns fresh clones decoupled from the frozen snapshot.
 */
export function restoreFullArchitectureSnapshot(
  snapshot: FullArchitectureSnapshot
): ArchitectureFullState {
  return {
    objects: deepClone(snapshot.state.objects),
    connections: deepClone(snapshot.state.connections),
    views: deepClone(snapshot.state.views),
    flows: deepClone(snapshot.state.flows),
    metadata: deepClone(snapshot.state.metadata),
    documentation: {
      overview: snapshot.state.documentation.overview,
      pages: deepClone(snapshot.state.documentation.pages),
    },
  };
}

export interface EntityDiffSummary {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

export interface SnapshotStateDiff {
  objects: EntityDiffSummary;
  connections: EntityDiffSummary;
  views: EntityDiffSummary;
  flows: EntityDiffSummary;
  docPages: EntityDiffSummary;
}

function computeDiff(
  beforeMap: Map<string, string>,
  afterMap: Map<string, string>
): EntityDiffSummary {
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  for (const [id, afterHash] of afterMap.entries()) {
    if (!beforeMap.has(id)) {
      added += 1;
    } else if (beforeMap.get(id) === afterHash) {
      unchanged += 1;
    } else {
      modified += 1;
    }
  }

  for (const id of beforeMap.keys()) {
    if (!afterMap.has(id)) {
      removed += 1;
    }
  }

  return { added, removed, modified, unchanged };
}

/**
 * Compares two architecture states (e.g., active state vs snapshot) and computes
 * an entity diff across all 5 discrete entity collections.
 */
export function diffArchitectureStates(
  stateA: ArchitectureFullState,
  stateB: ArchitectureFullState
): SnapshotStateDiff {
  const hash = (item: unknown) => JSON.stringify(item);

  const objectsA = new Map(stateA.objects.map((o) => [o.id, hash(o)]));
  const objectsB = new Map(stateB.objects.map((o) => [o.id, hash(o)]));

  const connectionsA = new Map(stateA.connections.map((c) => [c.id, hash(c)]));
  const connectionsB = new Map(stateB.connections.map((c) => [c.id, hash(c)]));

  const viewsA = new Map(stateA.views.map((v) => [v.id, hash(v)]));
  const viewsB = new Map(stateB.views.map((v) => [v.id, hash(v)]));

  const flowsA = new Map(stateA.flows.map((f) => [f.id, hash(f)]));
  const flowsB = new Map(stateB.flows.map((f) => [f.id, hash(f)]));

  const docsA = new Map((stateA.documentation?.pages ?? []).map((p) => [p.id, hash(p)]));
  const docsB = new Map((stateB.documentation?.pages ?? []).map((p) => [p.id, hash(p)]));

  return {
    objects: computeDiff(objectsA, objectsB),
    connections: computeDiff(connectionsA, connectionsB),
    views: computeDiff(viewsA, viewsB),
    flows: computeDiff(flowsA, flowsB),
    docPages: computeDiff(docsA, docsB),
  };
}
