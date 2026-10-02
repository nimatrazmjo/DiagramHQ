/**
 * DiagramHQ - Continuous Repository Synchronization & Freshness Engine (F077)
 *
 * Keeps architecture models fresh and continuously synchronized with remote codebases:
 * - Re-scans on a schedule or via remote git webhook triggers (push, pull_request_merged).
 * - Compares code state against the active architecture model.
 * - Detects added, modified, and removed components, datastores, APIs, and dependencies.
 * - Generates reviewable sync proposals with concrete evidence diffs.
 * - Directly feeds architectural drift detection (F084).
 * - Enforces model refresh without silent, ungrounded mutations.
 */

import type {
  ArchitectureId,
  VersionId,
  ObjectId,
  ConnectionId,
} from './ids';
import type {
  ObjectKind,
  ConnectionKind,
  ModelObject,
  ModelConnection,
  ArchitectureModel,
} from './types';
import {
  scanGitHubRepository,
  type GitHubFile,
  type GitHubScanResult,
  type DetectedArchitectureObject,
  type DetectedConnection,
} from './github-scanner';
import type { AIEvidence } from './ai-confidence';

export type SyncTrigger = 'schedule' | 'webhook' | 'manual';

export type WebhookEventKind = 'push' | 'pull_request_merged' | 'release';

export interface WebhookPayload {
  event: WebhookEventKind;
  ref: string;
  commitSha: string;
  pusher?: string;
  timestamp?: string;
}

export interface SyncScheduleConfig {
  intervalMinutes: number;
  cron?: string;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

export interface RepoSyncConfig {
  id: string;
  provider: 'github' | 'gitlab';
  owner: string;
  repo: string;
  branch: string;
  targetArchitectureId: ArchitectureId;
  targetVersionId: VersionId;
  schedule?: SyncScheduleConfig;
  autoApplyProposals?: boolean;
  feedDrift?: boolean;
  lastSyncedCommitSha?: string;
  lastSyncedAt?: Date;
}

export type SyncStatus = 'idle' | 'running' | 'completed' | 'failed' | 'drift_detected';

export type DriftItemKind =
  | 'code_added_not_in_model'
  | 'model_object_removed_from_code'
  | 'contract_drift'
  | 'dependency_added'
  | 'dependency_removed';

export interface SyncDriftItem {
  id: string;
  entityName: string;
  entityKind: ObjectKind | 'connection';
  driftKind: DriftItemKind;
  severity: 'low' | 'medium' | 'high';
  evidence: AIEvidence[];
  message: string;
  detectedAt: Date;
}

export interface SyncDriftReport {
  hasDrift: boolean;
  totalDriftCount: number;
  highSeverityCount: number;
  items: SyncDriftItem[];
  feedDate: Date;
  recommendedAction: 'update_model' | 'create_change_request' | 'ignore';
}

export interface SyncChangeSummary {
  addedObjects: DetectedArchitectureObject[];
  modifiedObjects: Array<{
    currentObject: ModelObject;
    updatedTechnologies: string[];
    evidence: AIEvidence[];
  }>;
  removedObjectIds: ObjectId[];
  addedConnections: DetectedConnection[];
  removedConnectionIds: ConnectionId[];
}

export interface RepoSyncResult {
  syncId: string;
  configId: string;
  trigger: SyncTrigger;
  webhook?: WebhookPayload;
  commitSha: string;
  status: SyncStatus;
  scanResult: GitHubScanResult;
  driftReport: SyncDriftReport;
  changeSummary: SyncChangeSummary;
  modelUpdated: boolean;
  refreshedModel?: ArchitectureModel;
  syncedAt: Date;
}

/**
 * Creates a repository synchronization configuration.
 */
export function createRepoSyncConfig(params: {
  provider?: 'github' | 'gitlab';
  owner: string;
  repo: string;
  branch?: string;
  targetArchitectureId: ArchitectureId;
  targetVersionId: VersionId;
  intervalMinutes?: number;
  autoApplyProposals?: boolean;
  feedDrift?: boolean;
}): RepoSyncConfig {
  const intervalMinutes = params.intervalMinutes ?? 60;
  const now = new Date();
  const nextRunAt = new Date(now.getTime() + intervalMinutes * 60 * 1000);

  return {
    id: `sync_${params.owner}_${params.repo}_${Date.now().toString(36)}`,
    provider: params.provider ?? 'github',
    owner: params.owner,
    repo: params.repo,
    branch: params.branch ?? 'main',
    targetArchitectureId: params.targetArchitectureId,
    targetVersionId: params.targetVersionId,
    schedule: {
      intervalMinutes,
      cron: intervalMinutes === 60 ? '0 * * * *' : `*/${intervalMinutes} * * * *`,
      enabled: true,
      lastRunAt: undefined,
      nextRunAt,
    },
    autoApplyProposals: params.autoApplyProposals ?? false,
    feedDrift: params.feedDrift ?? true,
    lastSyncedCommitSha: undefined,
    lastSyncedAt: undefined,
  };
}

/**
 * Computes whether a scheduled synchronization is currently due.
 */
export function isSyncDue(schedule?: SyncScheduleConfig, currentTime = new Date()): boolean {
  if (!schedule || !schedule.enabled) return false;
  if (!schedule.nextRunAt) return true;
  return currentTime.getTime() >= schedule.nextRunAt.getTime();
}

/**
 * Computes next sync timestamp given interval in minutes.
 */
export function computeNextSyncTime(intervalMinutes: number, fromTime = new Date()): Date {
  return new Date(fromTime.getTime() + intervalMinutes * 60 * 1000);
}

/**
 * Evaluates architectural drift between detected code entities and an existing model (F084 feeder).
 */
export function evaluateRepoSyncDrift(
  scanResult: GitHubScanResult,
  currentModel?: ArchitectureModel
): SyncDriftReport {
  const driftItems: SyncDriftItem[] = [];
  const now = new Date();

  if (!currentModel || currentModel.objects.length === 0) {
    // If no existing model, every detected object is new code not yet in model
    for (const obj of scanResult.proposedObjects) {
      driftItems.push({
        id: `drift_${obj.name}_${Math.random().toString(36).slice(2, 6)}`,
        entityName: obj.name,
        entityKind: obj.kind,
        driftKind: 'code_added_not_in_model',
        severity: obj.category === 'database' || obj.category === 'service' ? 'high' : 'medium',
        evidence: obj.evidence,
        message: `Discovered new ${obj.category} "${obj.name}" in repository codebase not represented in architecture model.`,
        detectedAt: now,
      });
    }
  } else {
    const modelObjectNames = new Set(currentModel.objects.map((o) => o.name.toLowerCase()));
    const detectedObjectNames = new Set(scanResult.proposedObjects.map((o) => o.name.toLowerCase()));

    // 1. Code added not in model
    for (const detected of scanResult.proposedObjects) {
      if (!modelObjectNames.has(detected.name.toLowerCase())) {
        driftItems.push({
          id: `drift_add_${detected.name}_${Math.random().toString(36).slice(2, 6)}`,
          entityName: detected.name,
          entityKind: detected.kind,
          driftKind: 'code_added_not_in_model',
          severity: detected.category === 'database' ? 'high' : 'medium',
          evidence: detected.evidence,
          message: `Discovered new ${detected.category} "${detected.name}" in repository codebase that is missing from architecture model.`,
          detectedAt: now,
        });
      }
    }

    // 2. Model object removed from code (for objects linked to this repo)
    for (const modelObj of currentModel.objects) {
      // Check if this model object is marked for this repo or is an app/store/component
      const repoMeta = modelObj.metadata?.codeMapping as { repo?: string } | undefined;
      const isLinkedToRepo = repoMeta?.repo === scanResult.repo.repo;

      if (isLinkedToRepo && !detectedObjectNames.has(modelObj.name.toLowerCase())) {
        driftItems.push({
          id: `drift_rem_${modelObj.name}_${Math.random().toString(36).slice(2, 6)}`,
          entityName: modelObj.name,
          entityKind: modelObj.kind,
          driftKind: 'model_object_removed_from_code',
          severity: 'high',
          evidence: [],
          message: `Architecture model contains "${modelObj.name}", but it is no longer detected in the synchronized repository codebase.`,
          detectedAt: now,
        });
      }
    }
  }

  const highSeverityCount = driftItems.filter((i) => i.severity === 'high').length;
  const hasDrift = driftItems.length > 0;
  const recommendedAction: 'update_model' | 'create_change_request' | 'ignore' =
    highSeverityCount > 0 ? 'create_change_request' : hasDrift ? 'update_model' : 'ignore';

  return {
    hasDrift,
    totalDriftCount: driftItems.length,
    highSeverityCount,
    items: driftItems,
    feedDate: now,
    recommendedAction,
  };
}

/**
 * Triggers a repository synchronization run.
 * Statically analyzes current files, detects changes & architectural drift,
 * and optionally updates the architecture model.
 */
export function triggerRepoSync(params: {
  config: RepoSyncConfig;
  files: GitHubFile[];
  trigger: SyncTrigger;
  webhook?: WebhookPayload;
  currentModel?: ArchitectureModel;
  autoApply?: boolean;
}): RepoSyncResult {
  const commitSha =
    params.webhook?.commitSha ??
    params.config.lastSyncedCommitSha ??
    `commit_${Date.now().toString(36)}`;

  // Run the static repository scanner
  const scanResult = scanGitHubRepository({
    repo: {
      owner: params.config.owner,
      repo: params.config.repo,
      branch: params.config.branch,
      commitSha,
    },
    files: params.files,
  });

  // Evaluate architectural drift
  const driftReport = evaluateRepoSyncDrift(scanResult, params.currentModel);

  // Compute change summary
  const existingNames = new Set(
    params.currentModel ? params.currentModel.objects.map((o) => o.name.toLowerCase()) : []
  );

  const addedObjects = scanResult.proposedObjects.filter(
    (o) => !existingNames.has(o.name.toLowerCase())
  );

  const modifiedObjects: Array<{
    currentObject: ModelObject;
    updatedTechnologies: string[];
    evidence: AIEvidence[];
  }> = [];

  if (params.currentModel) {
    for (const obj of params.currentModel.objects) {
      const match = scanResult.proposedObjects.find(
        (p) => p.name.toLowerCase() === obj.name.toLowerCase()
      );
      if (match && match.technologies.length > 0) {
        const currentTech = (obj.metadata?.technologies as string[]) || [];
        const hasNewTech = match.technologies.some((t) => !currentTech.includes(t));
        if (hasNewTech) {
          modifiedObjects.push({
            currentObject: obj,
            updatedTechnologies: Array.from(new Set([...currentTech, ...match.technologies])),
            evidence: match.evidence,
          });
        }
      }
    }
  }

  // Model object removals
  const removedObjectIds: ObjectId[] = [];
  if (params.currentModel) {
    const detectedNames = new Set(scanResult.proposedObjects.map((p) => p.name.toLowerCase()));
    for (const obj of params.currentModel.objects) {
      const meta = obj.metadata?.codeMapping as { repo?: string } | undefined;
      if (meta?.repo === params.config.repo && !detectedNames.has(obj.name.toLowerCase())) {
        removedObjectIds.push(obj.id);
      }
    }
  }

  const changeSummary: SyncChangeSummary = {
    addedObjects,
    modifiedObjects,
    removedObjectIds,
    addedConnections: scanResult.proposedConnections,
    removedConnectionIds: [],
  };

  const shouldAutoApply = params.autoApply ?? params.config.autoApplyProposals ?? false;
  let refreshedModel: ArchitectureModel | undefined;
  let modelUpdated = false;

  if (shouldAutoApply && params.currentModel) {
    refreshedModel = applySyncToModel(params.currentModel, {
      config: params.config,
      commitSha,
      changeSummary,
    });
    modelUpdated = true;
  }

  const now = new Date();
  const status: SyncStatus = driftReport.hasDrift ? 'drift_detected' : 'completed';

  return {
    syncId: `sync_run_${Date.now().toString(36)}`,
    configId: params.config.id,
    trigger: params.trigger,
    webhook: params.webhook,
    commitSha,
    status,
    scanResult,
    driftReport,
    changeSummary,
    modelUpdated,
    refreshedModel,
    syncedAt: now,
  };
}

/**
 * Applies repository synchronization changes to update an architecture model.
 */
export function applySyncToModel(
  currentModel: ArchitectureModel,
  params: {
    config: RepoSyncConfig;
    commitSha: string;
    changeSummary: SyncChangeSummary;
  }
): ArchitectureModel {
  const now = new Date();
  const objects: ModelObject[] = [...currentModel.objects];
  const connections: ModelConnection[] = [...currentModel.connections];

  // 1. Add newly discovered objects
  for (const added of params.changeSummary.addedObjects) {
    const newObj: ModelObject = {
      id: added.id,
      architectureId: currentModel.architecture.id,
      versionId: currentModel.version.id,
      kind: added.kind,
      name: added.name,
      description: added.description,
      metadata: {
        category: added.category,
        technologies: added.technologies,
        codeMapping: {
          provider: params.config.provider,
          owner: params.config.owner,
          repo: params.config.repo,
          branch: params.config.branch,
          commitSha: params.commitSha,
        },
        aiEvidence: added.evidence,
        confidence: added.confidence,
        syncedAt: now.toISOString(),
      },
      position: { x: 100 + objects.length * 160, y: 200 },
      createdAt: now,
      updatedAt: now,
    };
    objects.push(newObj);
  }

  // 2. Update modified objects
  for (const mod of params.changeSummary.modifiedObjects) {
    const idx = objects.findIndex((o) => o.id === mod.currentObject.id);
    const existing = objects[idx];
    if (idx !== -1 && existing) {
      const existingMeta = existing.metadata || {};
      const existingEvidence = (existingMeta.aiEvidence as AIEvidence[]) || [];
      objects[idx] = {
        ...existing,
        metadata: {
          ...existingMeta,
          technologies: mod.updatedTechnologies,
          aiEvidence: [...existingEvidence, ...mod.evidence],
          updatedViaSyncAt: now.toISOString(),
        },
        updatedAt: now,
      };
    }
  }

  // 3. Mark or prune removed objects
  if (params.changeSummary.removedObjectIds.length > 0) {
    const removedSet = new Set(params.changeSummary.removedObjectIds);
    for (let i = 0; i < objects.length; i++) {
      const targetObj = objects[i];
      if (targetObj && removedSet.has(targetObj.id)) {
        objects[i] = {
          ...targetObj,
          metadata: {
            ...targetObj.metadata,
            syncStatus: 'missing_in_code',
            flaggedDriftAt: now.toISOString(),
          },
          updatedAt: now,
        };
      }
    }
  }

  // 4. Add new connections
  for (const conn of params.changeSummary.addedConnections) {
    const existing = connections.find(
      (c) => c.sourceObjectId === conn.sourceObjectId && c.targetObjectId === conn.targetObjectId
    );
    if (!existing) {
      const newConn: ModelConnection = {
        id: conn.id,
        architectureId: currentModel.architecture.id,
        versionId: currentModel.version.id,
        sourceObjectId: conn.sourceObjectId,
        targetObjectId: conn.targetObjectId,
        kind: 'sync' as ConnectionKind,
        label: conn.label || conn.protocol,
        description: `Discovered connection via repository sync (${conn.protocol})`,
        metadata: {
          protocol: conn.protocol,
          aiEvidence: conn.evidence,
          confidence: conn.confidence,
          syncedAt: now.toISOString(),
        },
        createdAt: now,
        updatedAt: now,
      };
      connections.push(newConn);
    }
  }

  return {
    ...currentModel,
    objects,
    connections,
    architecture: {
      ...currentModel.architecture,
      updatedAt: now,
    },
  };
}
