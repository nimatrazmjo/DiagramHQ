import type { ArchitectureId, ObjectId, OrgId, VersionId } from './ids';

export class InvariantViolationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'InvariantViolationError';
  }
}

export class TenantAccessDeniedError extends Error {
  constructor(message = 'Cross-tenant access denied') {
    super(message);
    this.name = 'TenantAccessDeniedError';
  }
}

/**
 * Invariant 1: A connection joins two distinct objects; self-loops are invalid.
 */
export function canConnect(sourceId: ObjectId, targetId: ObjectId): boolean {
  return sourceId !== targetId;
}

export interface ConnectionValidationInput {
  architectureId: ArchitectureId;
  versionId: VersionId;
  source: {
    id: ObjectId;
    architectureId: ArchitectureId;
    versionId: VersionId;
  };
  target: {
    id: ObjectId;
    architectureId: ArchitectureId;
    versionId: VersionId;
  };
}

/**
 * Invariant 2: A connection's source and target must exist in the same architecture + version.
 * Cross-architecture or cross-version references are forbidden.
 */
export function validateConnection(input: ConnectionValidationInput): {
  valid: boolean;
  reason?: string;
} {
  if (!canConnect(input.source.id, input.target.id)) {
    return { valid: false, reason: 'Self-connection is not allowed' };
  }

  if (
    input.source.architectureId !== input.architectureId ||
    input.target.architectureId !== input.architectureId
  ) {
    return {
      valid: false,
      reason: 'Connection endpoints must belong to the same architecture as the connection',
    };
  }

  if (
    input.source.versionId !== input.versionId ||
    input.target.versionId !== input.versionId
  ) {
    return {
      valid: false,
      reason: 'Connection endpoints must belong to the same version as the connection',
    };
  }

  return { valid: true };
}

/**
 * Invariant 3: parent_id may not create a cycle (no object can contain its own ancestor).
 */
export function hasParentCycle(
  objectId: ObjectId,
  candidateParentId: ObjectId | null | undefined,
  getParent: (id: ObjectId) => ObjectId | null | undefined,
): boolean {
  if (!candidateParentId) return false;
  if (objectId === candidateParentId) return true;

  let currentId: ObjectId | null | undefined = candidateParentId;
  const visited = new Set<ObjectId>([objectId]);

  while (currentId) {
    if (visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);
    currentId = getParent(currentId);
  }

  return false;
}

/**
 * Invariant 5: A view's objects must resolve to the same architecture as the view.
 */
export function validateViewObject(
  view: { architectureId: ArchitectureId },
  object: { architectureId: ArchitectureId },
): boolean {
  return view.architectureId === object.architectureId;
}

/**
 * Tenant Isolation Invariant: Every query and mutation is strictly scoped to the tenant (organization).
 * Access to entities across different organizations is denied.
 */
export function assertTenantAccess(
  entityOrgId: OrgId | string,
  currentOrgId: OrgId | string,
): void {
  if (entityOrgId !== currentOrgId) {
    throw new TenantAccessDeniedError(
      `Tenant access denied: entity belongs to org '${entityOrgId}' but active context is '${currentOrgId}'`,
    );
  }
}
