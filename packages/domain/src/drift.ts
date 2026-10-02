/**
 * DiagramHQ - Architecture Drift & Governance Engine (F084)
 *
 * Compares documented architecture against actual imported/discovered infrastructure
 * and code state:
 * - Surfaces the delta: unmanaged resources, missing resources, attribute mismatches,
 *   undocumented connections, missing connections.
 * - Categorizes severity: critical, high, medium, low, informational.
 * - Provides three canonical actions:
 *   1. Update Model: Directly reconciles actual infrastructure into documented model.
 *   2. Ignore: Suppresses drift items with recorded reasoning.
 *   3. Create Change Request: Formulates drift delta into an Architecture Pull Request (PR)
 *      with visual diff, change set, risk scoring, and affected systems.
 * - Retains grounded evidence: git commits, cloud ARNs, K8s manifests, or Terraform state.
 *
 * Strict Acceptance Criteria:
 * - Compare documented vs imported/actual; surface the delta
 * - Actions: Update Model / Ignore / Create Change Request
 * - Test: seeded drift detected; create-change-request produces a PR.
 */

import {
  type ArchitectureId,
  type PullRequestId,
} from './ids';
import type { ModelObject, ModelConnection, ArchitectureModel } from './types';
import { computeVisualArchitectureDiff } from './diff';
import { computeArchitectureChangeSet } from './changes';
import {
  createArchitecturePullRequest,
  type ArchitecturePullRequest,
  type PullRequestUser,
} from './pull-requests';

// ============================================================================
// Types
// ============================================================================

export type DriftType =
  | 'unmanaged_resource'
  | 'missing_resource'
  | 'attribute_mismatch'
  | 'undocumented_connection'
  | 'missing_connection';

export type DriftSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type DriftStatus = 'detected' | 'reconciled' | 'ignored' | 'pr_created';

export interface DriftEvidence {
  sourceType: 'cloud_discovery' | 'git_scan' | 'kubernetes_manifest' | 'terraform' | 'manual';
  sourceRef: string; // e.g. ARN, repo file:line, cluster UID
  detectedAt: string;
  confidence: number; // 0.0 - 1.0
  details?: string;
}

export interface AttributeDiff {
  attribute: string;
  documentedValue: unknown;
  actualValue: unknown;
}

export interface DriftItem {
  id: string;
  type: DriftType;
  severity: DriftSeverity;
  status: DriftStatus;
  title: string;
  description: string;
  targetType: 'object' | 'connection';
  documentedEntity?: {
    id: string;
    name: string;
    kind?: string;
    metadata?: Record<string, unknown>;
  } | null;
  actualEntity?: {
    id: string;
    name: string;
    kind?: string;
    metadata?: Record<string, unknown>;
  } | null;
  attributeDiffs?: AttributeDiff[];
  evidence: DriftEvidence;
  ignoreReason?: string;
  pullRequestId?: PullRequestId;
  detectedAt: string;
}

export interface DriftDeltaSummary {
  totalDriftItems: number;
  unmanagedCount: number;
  missingCount: number;
  attributeMismatchCount: number;
  undocumentedConnectionCount: number;
  missingConnectionCount: number;
  bySeverity: Record<DriftSeverity, number>;
}

export interface ArchitectureDriftReport {
  reportId: string;
  architectureId: ArchitectureId;
  driftItems: DriftItem[];
  summary: DriftDeltaSummary;
  generatedAt: string;
}

// ============================================================================
// Drift Detection Engine
// ============================================================================

/**
 * Compares documented architecture model against actual imported infrastructure
 * or code discovery state to surface the delta.
 */
export function detectArchitectureDrift(params: {
  architectureId: ArchitectureId;
  documentedModel: ArchitectureModel;
  actualModel: ArchitectureModel;
}): ArchitectureDriftReport {
  const { architectureId, documentedModel, actualModel } = params;
  const now = new Date().toISOString();
  const driftItems: DriftItem[] = [];

  const documentedObjectMap = new Map<string, ModelObject>();
  for (const obj of documentedModel.objects) {
    documentedObjectMap.set(obj.id, obj);
    // Also index by normalized name for fuzzy matching
    documentedObjectMap.set(`name:${obj.name.toLowerCase()}`, obj);
  }

  const actualObjectMap = new Map<string, ModelObject>();
  for (const obj of actualModel.objects) {
    actualObjectMap.set(obj.id, obj);
    actualObjectMap.set(`name:${obj.name.toLowerCase()}`, obj);
  }

  // 1. Detect unmanaged actual resources & attribute mismatches
  for (const actualObj of actualModel.objects) {
    const documentedObj =
      documentedObjectMap.get(actualObj.id) ||
      documentedObjectMap.get(`name:${actualObj.name.toLowerCase()}`);

    if (!documentedObj) {
      // Unmanaged resource: detected in live infra/code but absent from documented architecture
      const evidenceRef =
        (actualObj.metadata?.['arn'] as string) ||
        (actualObj.metadata?.['resourceId'] as string) ||
        (actualObj.metadata?.['filePath'] as string) ||
        actualObj.id;

      driftItems.push({
        id: `drift_unm_${actualObj.id}`,
        type: 'unmanaged_resource',
        severity: actualObj.kind === 'store' ? 'high' : 'medium',
        status: 'detected',
        title: `Unmanaged ${actualObj.kind}: ${actualObj.name}`,
        description: `Discovered live ${actualObj.kind} "${actualObj.name}" in infrastructure/code that is not in the documented architecture model.`,
        targetType: 'object',
        documentedEntity: null,
        actualEntity: {
          id: actualObj.id,
          name: actualObj.name,
          kind: actualObj.kind,
          metadata: actualObj.metadata,
        },
        evidence: {
          sourceType: (actualObj.metadata?.['cloudProvider'] ? 'cloud_discovery' : 'git_scan'),
          sourceRef: evidenceRef,
          detectedAt: now,
          confidence: 0.95,
          details: `Discovered during automated scan of ${actualObj.metadata?.['cloudProvider'] || 'codebase'}`,
        },
        detectedAt: now,
      });
    } else {
      // Object exists in both: check attribute diffs (technology, runtime, environment, region)
      const diffs: AttributeDiff[] = [];
      const docMeta = documentedObj.metadata || {};
      const actMeta = actualObj.metadata || {};

      const keysToCheck = ['technology', 'runtime', 'region', 'environment', 'status', 'version'];
      for (const k of keysToCheck) {
        if (actMeta[k] && docMeta[k] && actMeta[k] !== docMeta[k]) {
          diffs.push({
            attribute: k,
            documentedValue: docMeta[k],
            actualValue: actMeta[k],
          });
        }
      }

      if (diffs.length > 0) {
        driftItems.push({
          id: `drift_att_${actualObj.id}`,
          type: 'attribute_mismatch',
          severity: diffs.some((d) => d.attribute === 'status' && d.actualValue === 'stopped')
            ? 'high'
            : 'low',
          status: 'detected',
          title: `Attribute drift on ${actualObj.name}`,
          description: `Discovered ${diffs.length} attribute differences between documented and live state for "${actualObj.name}".`,
          targetType: 'object',
          documentedEntity: {
            id: documentedObj.id,
            name: documentedObj.name,
            kind: documentedObj.kind,
            metadata: documentedObj.metadata,
          },
          actualEntity: {
            id: actualObj.id,
            name: actualObj.name,
            kind: actualObj.kind,
            metadata: actualObj.metadata,
          },
          attributeDiffs: diffs,
          evidence: {
            sourceType: 'cloud_discovery',
            sourceRef: (actMeta['arn'] as string) || actualObj.id,
            detectedAt: now,
            confidence: 0.98,
          },
          detectedAt: now,
        });
      }
    }
  }

  // 2. Detect missing resources (in documented model but gone from live infrastructure)
  for (const docObj of documentedModel.objects) {
    const actualObj =
      actualObjectMap.get(docObj.id) || actualObjectMap.get(`name:${docObj.name.toLowerCase()}`);

    if (!actualObj) {
      driftItems.push({
        id: `drift_mis_${docObj.id}`,
        type: 'missing_resource',
        severity: docObj.kind === 'store' ? 'critical' : 'high',
        status: 'detected',
        title: `Missing ${docObj.kind}: ${docObj.name}`,
        description: `Documented ${docObj.kind} "${docObj.name}" was not found in actual cloud accounts or code repositories. May be decommissioned.`,
        targetType: 'object',
        documentedEntity: {
          id: docObj.id,
          name: docObj.name,
          kind: docObj.kind,
          metadata: docObj.metadata,
        },
        actualEntity: null,
        evidence: {
          sourceType: 'cloud_discovery',
          sourceRef: (docObj.metadata?.['arn'] as string) || docObj.id,
          detectedAt: now,
          confidence: 0.9,
          details: 'Resource absent from full account discovery inventory',
        },
        detectedAt: now,
      });
    }
  }

  // 3. Detect connection drift (undocumented connections & missing connections)
  const docConnKey = (c: ModelConnection) =>
    `${c.sourceObjectId}->${c.targetObjectId}:${c.label || ''}`;

  const documentedConnMap = new Map<string, ModelConnection>();
  for (const c of documentedModel.connections) {
    documentedConnMap.set(docConnKey(c), c);
  }

  const actualConnMap = new Map<string, ModelConnection>();
  for (const c of actualModel.connections) {
    actualConnMap.set(docConnKey(c), c);
  }

  for (const actConn of actualModel.connections) {
    if (!documentedConnMap.has(docConnKey(actConn))) {
      driftItems.push({
        id: `drift_conn_unm_${actConn.id}`,
        type: 'undocumented_connection',
        severity: 'medium',
        status: 'detected',
        title: `Undocumented connection: ${actConn.label || 'interaction'}`,
        description: `Actual communication link from ${actConn.sourceObjectId} to ${actConn.targetObjectId} is not captured in the documented model.`,
        targetType: 'connection',
        documentedEntity: null,
        actualEntity: {
          id: actConn.id,
          name: actConn.label || 'connection',
          kind: actConn.kind,
          metadata: actConn.metadata,
        },
        evidence: {
          sourceType: 'git_scan',
          sourceRef: (actConn.metadata?.['sourceRef'] as string) || actConn.id,
          detectedAt: now,
          confidence: 0.92,
        },
        detectedAt: now,
      });
    }
  }

  for (const docConn of documentedModel.connections) {
    if (!actualConnMap.has(docConnKey(docConn))) {
      driftItems.push({
        id: `drift_conn_mis_${docConn.id}`,
        type: 'missing_connection',
        severity: 'low',
        status: 'detected',
        title: `Unused/missing connection: ${docConn.label || 'interaction'}`,
        description: `Documented link from ${docConn.sourceObjectId} to ${docConn.targetObjectId} had no observed runtime traffic or code references.`,
        targetType: 'connection',
        documentedEntity: {
          id: docConn.id,
          name: docConn.label || 'connection',
          kind: docConn.kind,
          metadata: docConn.metadata,
        },
        actualEntity: null,
        evidence: {
          sourceType: 'cloud_discovery',
          sourceRef: docConn.id,
          detectedAt: now,
          confidence: 0.85,
        },
        detectedAt: now,
      });
    }
  }

  const summary: DriftDeltaSummary = {
    totalDriftItems: driftItems.length,
    unmanagedCount: driftItems.filter((d) => d.type === 'unmanaged_resource').length,
    missingCount: driftItems.filter((d) => d.type === 'missing_resource').length,
    attributeMismatchCount: driftItems.filter((d) => d.type === 'attribute_mismatch').length,
    undocumentedConnectionCount: driftItems.filter((d) => d.type === 'undocumented_connection').length,
    missingConnectionCount: driftItems.filter((d) => d.type === 'missing_connection').length,
    bySeverity: {
      critical: driftItems.filter((d) => d.severity === 'critical').length,
      high: driftItems.filter((d) => d.severity === 'high').length,
      medium: driftItems.filter((d) => d.severity === 'medium').length,
      low: driftItems.filter((d) => d.severity === 'low').length,
      informational: driftItems.filter((d) => d.severity === 'informational').length,
    },
  };

  return {
    reportId: `drift_rep_${Date.now().toString(36)}`,
    architectureId,
    driftItems,
    summary,
    generatedAt: now,
  };
}

// ============================================================================
// Drift Actions: Update Model / Ignore / Create Change Request
// ============================================================================

/**
 * Action 1: Update Model
 * Directly reconciles the actual state into the documented architecture model.
 */
export function reconcileDriftDirectly(params: {
  documentedModel: ArchitectureModel;
  actualModel: ArchitectureModel;
  driftItemIdsToReconcile: string[];
  report: ArchitectureDriftReport;
}): ArchitectureModel {
  const { documentedModel, actualModel, driftItemIdsToReconcile, report } = params;
  const reconcileSet = new Set(driftItemIdsToReconcile);

  const updatedObjects: ModelObject[] = [...documentedModel.objects];
  const updatedConnections: ModelConnection[] = [...documentedModel.connections];

  for (const item of report.driftItems) {
    if (!reconcileSet.has(item.id)) continue;

    item.status = 'reconciled';

    if (item.type === 'unmanaged_resource' && item.actualEntity) {
      const actObj = actualModel.objects.find((o) => o.id === item.actualEntity?.id);
      if (actObj && !updatedObjects.some((o) => o.id === actObj.id)) {
        updatedObjects.push({ ...actObj });
      }
    } else if (item.type === 'missing_resource' && item.documentedEntity) {
      const idx = updatedObjects.findIndex((o) => o.id === item.documentedEntity?.id);
      if (idx !== -1) {
        updatedObjects.splice(idx, 1);
      }
    } else if (item.type === 'attribute_mismatch' && item.actualEntity && item.documentedEntity) {
      const idx = updatedObjects.findIndex((o) => o.id === item.documentedEntity?.id);
      if (idx !== -1 && updatedObjects[idx]) {
        const existing = updatedObjects[idx]!;
        const actObj = actualModel.objects.find((o) => o.id === item.actualEntity?.id);
        updatedObjects[idx] = {
          ...existing,
          description: actObj?.description ?? existing.description,
          metadata: {
            ...(existing.metadata || {}),
            ...(item.actualEntity.metadata || {}),
          },
          updatedAt: new Date(),
        };
      }
    } else if (item.type === 'undocumented_connection' && item.actualEntity) {
      const actConn = actualModel.connections.find((c) => c.id === item.actualEntity?.id);
      if (actConn && !updatedConnections.some((c) => c.id === actConn.id)) {
        updatedConnections.push({ ...actConn });
      }
    } else if (item.type === 'missing_connection' && item.documentedEntity) {
      const idx = updatedConnections.findIndex((c) => c.id === item.documentedEntity?.id);
      if (idx !== -1) {
        updatedConnections.splice(idx, 1);
      }
    }
  }

  return {
    architecture: documentedModel.architecture,
    version: documentedModel.version,
    objects: updatedObjects,
    connections: updatedConnections,
  };
}

/**
 * Action 2: Ignore
 * Suppresses a detected drift item with an audit reason.
 */
export function ignoreDriftItem(
  report: ArchitectureDriftReport,
  driftItemId: string,
  reason: string,
): DriftItem | null {
  const item = report.driftItems.find((d) => d.id === driftItemId);
  if (!item) return null;

  item.status = 'ignored';
  item.ignoreReason = reason;
  return item;
}

/**
 * Action 3: Create Change Request (PR)
 * Produces an ArchitecturePullRequest from the drift items for review and merge workflows.
 */
export function createChangeRequestFromDrift(params: {
  report: ArchitectureDriftReport;
  documentedModel: ArchitectureModel;
  actualModel: ArchitectureModel;
  driftItemIds?: string[];
  author: PullRequestUser;
  title?: string;
  description?: string;
  sourceBranch?: string;
  targetBranch?: string;
}): ArchitecturePullRequest {
  const {
    report,
    documentedModel,
    actualModel,
    driftItemIds,
    author,
    title = `Reconcile Architecture Drift (${report.summary.totalDriftItems} items)`,
    description = `Automated Change Request to synchronize documented architecture with live cloud/code state.`,
    sourceBranch = 'drift-reconciliation',
    targetBranch = 'main',
  } = params;

  // Selected drift items or all detected items
  const itemsToInclude = driftItemIds
    ? report.driftItems.filter((d) => driftItemIds.includes(d.id))
    : report.driftItems.filter((d) => d.status === 'detected');

  // Compute target architecture model representing the reconciled state
  const reconciledModel = reconcileDriftDirectly({
    documentedModel,
    actualModel,
    driftItemIdsToReconcile: itemsToInclude.map((i) => i.id),
    report,
  });

  // Compute visual diff between documented and reconciled models
  const diff = computeVisualArchitectureDiff(
    { objects: documentedModel.objects, connections: documentedModel.connections },
    { objects: reconciledModel.objects, connections: reconciledModel.connections },
  );

  // Compute change set and affected systems/teams
  const changeSet = computeArchitectureChangeSet({
    title,
    description,
    baseObjects: documentedModel.objects,
    targetObjects: reconciledModel.objects,
    baseConnections: documentedModel.connections,
    targetConnections: reconciledModel.connections,
  });

  // Create the reviewable pull request
  const pr = createArchitecturePullRequest({
    title,
    description: `${description}\n\nIncluded drift items:\n${itemsToInclude.map((item) => `- [${item.severity.toUpperCase()}] ${item.title}`).join('\n')}`,
    sourceBranch,
    targetBranch,
    author,
    diff,
    changeSet,
  });

  // Mark included drift items as pr_created and reference the PR ID
  for (const item of itemsToInclude) {
    item.status = 'pr_created';
    item.pullRequestId = pr.id;
  }

  return pr;
}
