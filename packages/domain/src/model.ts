import type { ObjectId } from './ids';

/** Built-in C4 object kinds. Extended via the object-type registry (F112). */
export type ObjectKind = 'system' | 'application' | 'store' | 'component' | 'actor' | 'group';

export interface ModelObject {
  readonly id: ObjectId;
  readonly kind: ObjectKind;
  name: string;
}

export interface Connection {
  readonly sourceId: ObjectId;
  readonly targetId: ObjectId;
}

/**
 * Domain invariant: a connection joins two distinct objects; self-loops are invalid.
 * Pure and framework-free so the API, the canvas, and model-as-code enforce the
 * same rule rather than re-implementing it three times (single source of truth).
 */
export function canConnect(sourceId: ObjectId, targetId: ObjectId): boolean {
  return sourceId !== targetId;
}
