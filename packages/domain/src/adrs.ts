/**
 * DiagramHQ - Architecture Decision Records (ADR) Domain Logic (F117)
 *
 * Pure, framework-agnostic Architecture Decision Record (ADR) system.
 * Supports:
 * - Structured decision records: title, status, context, decision, consequences, alternatives
 * - Polymorphic attachment to objects, connections, changes, and versions
 * - Historical query of all ADRs attached to a specific architecture object
 */

import { createId, type DecisionId, type ObjectId, type ConnectionId, type VersionId } from './ids';

export type ADRStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'rejected'
  | 'superseded'
  | 'deprecated';

export type ADRAttachmentTargetType = 'object' | 'connection' | 'change' | 'version';

export interface ADRAttachment {
  targetType: ADRAttachmentTargetType;
  targetId: string;
  attachedAt: string;
}

export interface ADRAuthor {
  id: string;
  name: string;
  email?: string;
}

export interface ArchitectureDecisionRecord {
  id: DecisionId;
  number: number;
  title: string;
  status: ADRStatus;
  context: string;
  decision: string;
  consequences: string;
  alternatives: string[];
  attachments: ADRAttachment[];
  author?: ADRAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface CreateADRInput {
  number?: number;
  title: string;
  status?: ADRStatus;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string[];
  attachments?: Array<{
    targetType: ADRAttachmentTargetType;
    targetId: string;
  }>;
  author?: ADRAuthor;
}

let adrSequence = 0;

/**
 * Creates a new Architecture Decision Record with structured attributes.
 */
export function createADR(input: CreateADRInput): ArchitectureDecisionRecord {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('ADR title cannot be empty');
  }
  if (!input.context || input.context.trim().length === 0) {
    throw new Error('ADR context cannot be empty');
  }
  if (!input.decision || input.decision.trim().length === 0) {
    throw new Error('ADR decision cannot be empty');
  }

  adrSequence += 1;
  const now = new Date().toISOString();

  const attachments: ADRAttachment[] = (input.attachments || []).map((a) => ({
    targetType: a.targetType,
    targetId: a.targetId,
    attachedAt: now,
  }));

  return {
    id: createId('dec') as DecisionId,
    number: input.number || adrSequence,
    title: input.title.trim(),
    status: input.status || 'proposed',
    context: input.context.trim(),
    decision: input.decision.trim(),
    consequences: input.consequences.trim(),
    alternatives: input.alternatives || [],
    attachments,
    author: input.author,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Attaches an ADR to an architecture entity (object, connection, change, or version).
 */
export function attachADRToEntity(
  adr: ArchitectureDecisionRecord,
  target: { targetType: ADRAttachmentTargetType; targetId: string }
): ArchitectureDecisionRecord {
  const alreadyAttached = adr.attachments.some(
    (a) => a.targetType === target.targetType && a.targetId === target.targetId
  );

  if (alreadyAttached) {
    return adr;
  }

  const now = new Date().toISOString();
  return {
    ...adr,
    attachments: [
      ...adr.attachments,
      {
        targetType: target.targetType,
        targetId: target.targetId,
        attachedAt: now,
      },
    ],
    updatedAt: now,
  };
}

/**
 * Detaches an ADR from a specific entity.
 */
export function detachADRFromEntity(
  adr: ArchitectureDecisionRecord,
  targetId: string
): ArchitectureDecisionRecord {
  return {
    ...adr,
    attachments: adr.attachments.filter((a) => a.targetId !== targetId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Updates the lifecycle status of an ADR.
 */
export function updateADRStatus(
  adr: ArchitectureDecisionRecord,
  status: ADRStatus
): ArchitectureDecisionRecord {
  return {
    ...adr,
    status,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves the full decision history attached to an architectural object.
 */
export function getADRHistoryForObject(
  adrs: ArchitectureDecisionRecord[],
  objectId: ObjectId
): ArchitectureDecisionRecord[] {
  return adrs
    .filter((adr) =>
      adr.attachments.some(
        (a) => a.targetType === 'object' && a.targetId === objectId
      )
    )
    .sort((a, b) => a.number - b.number);
}

/**
 * Retrieves all ADRs attached to a specific version.
 */
export function getADRsForVersion(
  adrs: ArchitectureDecisionRecord[],
  versionId: VersionId
): ArchitectureDecisionRecord[] {
  return adrs.filter((adr) =>
    adr.attachments.some(
      (a) => a.targetType === 'version' && a.targetId === versionId
    )
  );
}

/**
 * Retrieves all ADRs attached to a specific connection.
 */
export function getADRsForConnection(
  adrs: ArchitectureDecisionRecord[],
  connectionId: ConnectionId
): ArchitectureDecisionRecord[] {
  return adrs.filter((adr) =>
    adr.attachments.some(
      (a) => a.targetType === 'connection' && a.targetId === connectionId
    )
  );
}
