/**
 * DiagramHQ - Team Management & Object Ownership Domain Logic (F054)
 *
 * Pure, framework-agnostic team management and architectural object ownership.
 * Implements primary and backup team ownership assignment and querying/filtering
 * ('show everything owned by X').
 */

import type { ArchitectureModel, ModelConnection, ModelObject } from './types';
import type { ObjectId, OrgId, TeamId } from './ids';
import { createId } from './ids';

export interface Team {
  readonly id: TeamId;
  readonly orgId: OrgId;
  name: string;
  slug: string;
  description?: string | null;
  memberUserIds: string[];
  leadUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ObjectOwnership {
  readonly objectId: ObjectId;
  primaryTeamId: TeamId;
  backupTeamId?: TeamId | null;
  leadContactUserId?: string | null;
  updatedAt: Date;
}

export interface CreateTeamInput {
  orgId: OrgId;
  name: string;
  slug?: string;
  description?: string | null;
  memberUserIds?: string[];
  leadUserId?: string | null;
  now?: Date | number;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Creates a new Team entity with valid metadata and membership list.
 */
export function createTeam(input: CreateTeamInput): Team {
  const timestamp = input.now ? new Date(input.now) : new Date();
  const slug = input.slug || toSlug(input.name) || 'team';

  return {
    id: createId('team'),
    orgId: input.orgId,
    name: input.name.trim(),
    slug,
    description: input.description ?? null,
    memberUserIds: input.memberUserIds ? Array.from(new Set(input.memberUserIds)) : [],
    leadUserId: input.leadUserId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Adds a member to a team (idempotent).
 */
export function addTeamMember(team: Team, userId: string, now?: Date | number): Team {
  if (team.memberUserIds.includes(userId)) {
    return team;
  }
  const timestamp = now ? new Date(now) : new Date();
  return {
    ...team,
    memberUserIds: [...team.memberUserIds, userId],
    updatedAt: timestamp,
  };
}

/**
 * Removes a member from a team. If the user was the lead, unsets the lead.
 */
export function removeTeamMember(team: Team, userId: string, now?: Date | number): Team {
  if (!team.memberUserIds.includes(userId)) {
    return team;
  }
  const timestamp = now ? new Date(now) : new Date();
  return {
    ...team,
    memberUserIds: team.memberUserIds.filter((id) => id !== userId),
    leadUserId: team.leadUserId === userId ? null : team.leadUserId,
    updatedAt: timestamp,
  };
}

/**
 * Sets or unsets the team lead. If the new lead is not in the member list, adds them.
 */
export function setTeamLead(team: Team, leadUserId: string | null, now?: Date | number): Team {
  const timestamp = now ? new Date(now) : new Date();
  const memberUserIds =
    leadUserId && !team.memberUserIds.includes(leadUserId)
      ? [...team.memberUserIds, leadUserId]
      : team.memberUserIds;

  return {
    ...team,
    leadUserId,
    memberUserIds,
    updatedAt: timestamp,
  };
}

/**
 * Checks whether a user is an active member or lead of the team.
 */
export function isTeamMember(team: Team, userId: string): boolean {
  return team.memberUserIds.includes(userId) || team.leadUserId === userId;
}

export interface AssignOwnershipInput {
  primaryTeamId: TeamId;
  backupTeamId?: TeamId | null;
  leadContactUserId?: string | null;
  now?: Date | number;
}

/**
 * Assigns primary and optional backup team ownership to a ModelObject.
 * Preserves existing metadata while recording explicit ownership records.
 */
export function assignObjectOwnership(
  object: ModelObject,
  input: AssignOwnershipInput
): ModelObject {
  const timestamp = input.now ? new Date(input.now) : new Date();

  const ownership: ObjectOwnership = {
    objectId: object.id,
    primaryTeamId: input.primaryTeamId,
    backupTeamId: input.backupTeamId ?? null,
    leadContactUserId: input.leadContactUserId ?? null,
    updatedAt: timestamp,
  };

  const existingMetadata = object.metadata ?? {};

  return {
    ...object,
    metadata: {
      ...existingMetadata,
      ownership,
      team: input.primaryTeamId,
      backupTeam: input.backupTeamId ?? null,
    },
    updatedAt: timestamp,
  };
}

/**
 * Extracts structured ObjectOwnership from a ModelObject if assigned.
 */
export function getObjectOwnership(object: ModelObject): ObjectOwnership | null {
  const metaOwnership = object.metadata?.ownership as ObjectOwnership | undefined;
  if (metaOwnership && metaOwnership.primaryTeamId) {
    return metaOwnership;
  }
  // Fallback to legacy string metadata if present
  if (typeof object.metadata?.team === 'string') {
    return {
      objectId: object.id,
      primaryTeamId: object.metadata.team as TeamId,
      backupTeamId: (object.metadata.backupTeam as TeamId) ?? null,
      updatedAt: object.updatedAt,
    };
  }
  return null;
}

/**
 * Returns true if the object is owned by the specified team as primary
 * (or optionally backup).
 */
export function isObjectOwnedByTeam(
  object: ModelObject,
  teamId: TeamId,
  options?: { includeBackup?: boolean }
): boolean {
  const ownership = getObjectOwnership(object);
  if (!ownership) return false;

  if (ownership.primaryTeamId === teamId) return true;
  if (options?.includeBackup && ownership.backupTeamId === teamId) return true;

  return false;
}

/**
 * Filters a list of ModelObjects to only those owned by the given team.
 * By default checks primary ownership, but can include backup ownership.
 */
export function filterObjectsByOwner(
  objects: ModelObject[],
  teamId: TeamId,
  options?: { includeBackup?: boolean }
): ModelObject[] {
  return objects.filter((obj) => isObjectOwnedByTeam(obj, teamId, options));
}

/**
 * Filters an entire ArchitectureModel by owner team ('show everything owned by X').
 * Returns the matching objects and only the connections that connect objects in that subset.
 */
export function filterModelByOwner(
  model: ArchitectureModel,
  teamId: TeamId,
  options?: { includeBackup?: boolean }
): {
  objects: ModelObject[];
  connections: ModelConnection[];
} {
  const matchingObjects = filterObjectsByOwner(model.objects, teamId, options);
  const matchingObjectIds = new Set(matchingObjects.map((o) => o.id));

  const matchingConnections = model.connections.filter(
    (c) => matchingObjectIds.has(c.sourceObjectId) && matchingObjectIds.has(c.targetObjectId)
  );

  return {
    objects: matchingObjects,
    connections: matchingConnections,
  };
}
