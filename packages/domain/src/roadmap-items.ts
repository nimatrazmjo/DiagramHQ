/**
 * DiagramHQ - Architecture Roadmap Items Domain Logic (F119)
 *
 * Pure, framework-agnostic architecture roadmap items engine.
 * Allows organizations to organize and timeline architectural evolutions
 * by quarter (e.g., 2026-Q1, 2026-Q2) and link directly to concrete
 * architecture change sets, pull requests, and affected system boundaries.
 */

import {
  createId,
  type RoadmapItemId,
  type WorkspaceId,
  type TeamId,
} from './ids';

export type RoadmapQuarter =
  | `${number}-Q1`
  | `${number}-Q2`
  | `${number}-Q3`
  | `${number}-Q4`
  | string;

export type RoadmapItemStatus = 'planned' | 'in_progress' | 'completed' | 'deferred';

export type RoadmapPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ArchitectureRoadmapItem {
  id: RoadmapItemId;
  workspaceId: WorkspaceId;
  title: string;
  quarter: RoadmapQuarter;
  status: RoadmapItemStatus;
  priority: RoadmapPriority;
  description?: string;
  linkedChangeSetIds: string[];
  ownerTeamId?: TeamId;
  targetReleaseDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoadmapItemInput {
  workspaceId: WorkspaceId;
  title: string;
  quarter: RoadmapQuarter;
  status?: RoadmapItemStatus;
  priority?: RoadmapPriority;
  description?: string;
  linkedChangeSetIds?: string[];
  ownerTeamId?: TeamId;
  targetReleaseDate?: string;
  tags?: string[];
}

export interface RoadmapProgressMetrics {
  total: number;
  completed: number;
  inProgress: number;
  planned: number;
  deferred: number;
  percentComplete: number;
}

/**
 * Creates a new Architecture Roadmap item.
 */
export function createRoadmapItem(input: CreateRoadmapItemInput): ArchitectureRoadmapItem {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Roadmap item title cannot be empty');
  }
  if (!input.quarter || input.quarter.trim().length === 0) {
    throw new Error('Roadmap item quarter cannot be empty');
  }

  const now = new Date().toISOString();

  return {
    id: createId('rdm') as RoadmapItemId,
    workspaceId: input.workspaceId,
    title: input.title.trim(),
    quarter: input.quarter.trim() as RoadmapQuarter,
    status: input.status || 'planned',
    priority: input.priority || 'medium',
    description: input.description?.trim(),
    linkedChangeSetIds: input.linkedChangeSetIds ? [...input.linkedChangeSetIds] : [],
    ownerTeamId: input.ownerTeamId,
    targetReleaseDate: input.targetReleaseDate,
    tags: input.tags ? [...input.tags] : [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Links a roadmap item directly to an architecture change set.
 */
export function linkRoadmapItemToChange(
  item: ArchitectureRoadmapItem,
  changeSetId: string
): ArchitectureRoadmapItem {
  if (!changeSetId || changeSetId.trim().length === 0) {
    throw new Error('changeSetId cannot be empty');
  }

  if (item.linkedChangeSetIds.includes(changeSetId)) {
    return item;
  }

  return {
    ...item,
    linkedChangeSetIds: [...item.linkedChangeSetIds, changeSetId],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Unlinks a roadmap item from an architecture change set.
 */
export function unlinkRoadmapItemFromChange(
  item: ArchitectureRoadmapItem,
  changeSetId: string
): ArchitectureRoadmapItem {
  return {
    ...item,
    linkedChangeSetIds: item.linkedChangeSetIds.filter((id) => id !== changeSetId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Updates the lifecycle status of a roadmap item.
 */
export function updateRoadmapItemStatus(
  item: ArchitectureRoadmapItem,
  status: RoadmapItemStatus
): ArchitectureRoadmapItem {
  return {
    ...item,
    status,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Finds all roadmap items linked to a specific architecture change set.
 */
export function getRoadmapItemsForChange(
  items: ArchitectureRoadmapItem[],
  changeSetId: string
): ArchitectureRoadmapItem[] {
  return items.filter((item) => item.linkedChangeSetIds.includes(changeSetId));
}

/**
 * Groups roadmap items by quarter in chronological order.
 */
export function groupRoadmapItemsByQuarter(
  items: ArchitectureRoadmapItem[]
): Record<string, ArchitectureRoadmapItem[]> {
  const grouped: Record<string, ArchitectureRoadmapItem[]> = {};

  const sorted = [...items].sort((a, b) => a.quarter.localeCompare(b.quarter));

  for (const item of sorted) {
    if (!grouped[item.quarter]) {
      grouped[item.quarter] = [];
    }
    grouped[item.quarter]?.push(item);
  }

  return grouped;
}

/**
 * Calculates completion metrics across roadmap items.
 */
export function calculateRoadmapProgress(
  items: ArchitectureRoadmapItem[]
): RoadmapProgressMetrics {
  const total = items.length;
  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      planned: 0,
      deferred: 0,
      percentComplete: 0,
    };
  }

  const completed = items.filter((i) => i.status === 'completed').length;
  const inProgress = items.filter((i) => i.status === 'in_progress').length;
  const planned = items.filter((i) => i.status === 'planned').length;
  const deferred = items.filter((i) => i.status === 'deferred').length;

  const percentComplete = Math.round((completed / total) * 100);

  return {
    total,
    completed,
    inProgress,
    planned,
    deferred,
    percentComplete,
  };
}
