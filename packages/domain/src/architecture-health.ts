/**
 * Architecture Health Engine (F129)
 *
 * Aggregates topology dependencies, documentation coverage, security posture,
 * ownership governance, and infrastructure drift into a single composite
 * Architecture Health Scorecard with categorized scores, actionable findings,
 * and comprehensive change analytics.
 *
 * Strict Acceptance Criteria:
 * - Categorized health (dependencies, documentation, security, ownership, drift)
 *   with findings
 * - Analytics counts + change analytics
 * - Test: health computed on a sample matches seeded gaps
 */

import { type ArchitectureId, type ObjectId } from './ids';
import type { ArchitectureModel, ModelObject } from './types';
import { detectDependencyCycles } from './dependency-graph';
import { analyzeSecurityArchitecture } from './security-architecture';
import { detectArchitectureDrift } from './drift';
import { lintArchitectureModel } from './linting';
import { evaluateArchitectureRules } from './rules';
import { computeArchitectureChangeSet } from './changes';

// ============================================================================
// Types
// ============================================================================

export type HealthCategory =
  | 'dependencies'
  | 'documentation'
  | 'security'
  | 'ownership'
  | 'drift'
  | 'linting'
  | 'rules';

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface HealthFinding {
  id: string;
  category: HealthCategory;
  severity: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  targetId?: string;
  targetName?: string;
  remediation?: string;
}

export interface CategoryHealth {
  category: HealthCategory;
  label: string;
  score: number; // 0 – 100
  status: HealthStatus;
  findingCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface ChangeAnalytics {
  hasBaseline: boolean;
  baselineScore?: number;
  scoreDelta: number; // current compositeScore - baseline compositeScore
  trend: 'improving' | 'degrading' | 'stable';
  addedObjectsCount: number;
  modifiedObjectsCount: number;
  removedObjectsCount: number;
  addedConnectionsCount: number;
  removedConnectionsCount: number;
  totalChanges: number;
  affectedObjectsCount: number;
  affectedFlowsCount: number;
  affectedTeamsCount: number;
  changeRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

export interface HealthAnalytics {
  totalObjects: number;
  totalConnections: number;
  ownedObjects: number;
  documentedObjects: number;
  ownershipCoverage: number; // 0–100 %
  documentationCoverage: number; // 0–100 %
  dependencyCount: number;
  cyclicDependencyCount: number;
  isolatedObjectCount: number;
  securityExposureCount: number;
  securityScore: number;
  driftItemCount: number;
  lintFindingCount: number;
  ruleViolationCount: number;
  changeAnalytics: ChangeAnalytics;
}

export interface ArchitectureHealthReport {
  architectureId: ArchitectureId;
  compositeScore: number; // 0 – 100 weighted average
  overallStatus: HealthStatus;
  categories: CategoryHealth[];
  findings: HealthFinding[];
  analytics: HealthAnalytics;
  generatedAt: string;
}

export interface ArchitectureHealthOptions {
  actualModel?: ArchitectureModel;
  baselineModel?: ArchitectureModel;
}

// ============================================================================
// Category Weights
// ============================================================================

const CORE_CATEGORY_WEIGHTS: Record<
  'dependencies' | 'documentation' | 'security' | 'ownership' | 'drift',
  number
> = {
  dependencies: 0.25,
  documentation: 0.15,
  security: 0.25,
  ownership: 0.15,
  drift: 0.2,
};

// ============================================================================
// Helpers
// ============================================================================

export function scoreToStatus(score: number): HealthStatus {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'warning';
  return 'critical';
}

export function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

// ============================================================================
// Core Architecture Health Engine
// ============================================================================

/**
 * Compute a composite Architecture Health Scorecard for the given model.
 *
 * Accepts an optional actualModel (for drift detection) or full ArchitectureHealthOptions
 * (containing actualModel and baselineModel for change analytics).
 */
export function computeArchitectureHealth(
  model: ArchitectureModel,
  optionsOrActual?: ArchitectureHealthOptions | ArchitectureModel
): ArchitectureHealthReport {
  const options: ArchitectureHealthOptions =
    optionsOrActual && 'architecture' in optionsOrActual
      ? { actualModel: optionsOrActual }
      : (optionsOrActual as ArchitectureHealthOptions) || {};

  const findings: HealthFinding[] = [];
  const categories: CategoryHealth[] = [];

  const objects = model.objects || [];
  const connections = model.connections || [];
  const totalObjects = objects.length;
  const totalConnections = connections.length;
  const objectMap = new Map<ObjectId, ModelObject>(objects.map((o) => [o.id, o]));

  // --------------------------------------------------------------------------
  // 1. Dependencies Health
  // --------------------------------------------------------------------------
  const cycles = detectDependencyCycles(objects, connections);

  const connectedIds = new Set<ObjectId>();
  for (const c of connections) {
    connectedIds.add(c.sourceObjectId);
    connectedIds.add(c.targetObjectId);
  }

  // Dangling connections (endpoints pointing to non-existent objects)
  const danglingConnections = connections.filter(
    (c) => !objectMap.has(c.sourceObjectId) || !objectMap.has(c.targetObjectId)
  );

  // Isolated non-actor, non-group objects
  const isolatedObjects = objects.filter(
    (o) => o.kind !== 'actor' && o.kind !== 'group' && !connectedIds.has(o.id)
  );

  for (const cycle of cycles) {
    findings.push({
      id: `dep-cycle-${cycle.id}`,
      category: 'dependencies',
      severity: 'error',
      title: 'Cyclic Dependency Detected',
      detail: `Circular dependency detected: ${cycle.pathDescription}`,
      targetId: cycle.nodeIds[0],
      targetName: cycle.nodeNames[0],
      remediation: 'Decouple cyclic components using event-driven messaging or interface adapters.',
    });
  }

  for (const conn of danglingConnections) {
    findings.push({
      id: `dep-dangling-${conn.id}`,
      category: 'dependencies',
      severity: 'error',
      title: 'Dangling Connection Endpoint',
      detail: `Connection "${conn.label || conn.id}" connects to an undefined object.`,
      targetId: conn.id,
      remediation: 'Remove or reconnect the dangling connection to a valid entity.',
    });
  }

  for (const obj of isolatedObjects) {
    findings.push({
      id: `dep-isolated-${obj.id}`,
      category: 'dependencies',
      severity: 'info',
      title: 'Isolated Component',
      detail: `Component "${obj.name}" has no inbound or outbound connections.`,
      targetId: obj.id,
      targetName: obj.name,
      remediation: 'Define connections showing how this component communicates within the architecture.',
    });
  }

  const depErrorCount = cycles.length + danglingConnections.length;
  const depWarningCount = 0;
  const depInfoCount = isolatedObjects.length;
  const depPenalty = cycles.length * 25 + danglingConnections.length * 15 + isolatedObjects.length * 5;
  const depScore = clamp(100 - depPenalty);

  categories.push({
    category: 'dependencies',
    label: 'Dependencies & Topology',
    score: depScore,
    status: scoreToStatus(depScore),
    findingCount: depErrorCount + depWarningCount + depInfoCount,
    errorCount: depErrorCount,
    warningCount: depWarningCount,
    infoCount: depInfoCount,
  });

  // --------------------------------------------------------------------------
  // 2. Documentation Health
  // --------------------------------------------------------------------------
  const documentedObjects = objects.filter(
    (o) => o.description && o.description.trim().length > 10
  );
  const undocumentedObjects = objects.filter(
    (o) => !o.description || o.description.trim().length <= 10
  );

  const hasArchDescription = Boolean(
    model.architecture?.description && model.architecture.description.trim().length > 10
  );

  for (const obj of undocumentedObjects) {
    findings.push({
      id: `doc-${obj.id}`,
      category: 'documentation',
      severity: 'info',
      title: 'Missing Component Documentation',
      detail: `${obj.name} (${obj.kind}) has no detailed description.`,
      targetId: obj.id,
      targetName: obj.name,
      remediation: 'Provide a concise summary of the component purpose, tech stack, and responsibilities.',
    });
  }

  if (!hasArchDescription && totalObjects > 0) {
    findings.push({
      id: `doc-arch-${model.architecture?.id || 'root'}`,
      category: 'documentation',
      severity: 'info',
      title: 'Missing Architecture Overview',
      detail: `Architecture "${model.architecture?.name || 'Untitled'}" lacks an overview description.`,
      targetId: model.architecture?.id,
      targetName: model.architecture?.name,
      remediation: 'Add a high-level architecture overview describing the business domain and architecture goals.',
    });
  }

  const docRatio = totalObjects > 0 ? documentedObjects.length / totalObjects : 1;
  const documentationCoverage = clamp(Math.round(docRatio * 100));
  const docScore = !hasArchDescription && totalObjects > 0 ? Math.max(0, documentationCoverage - 10) : documentationCoverage;

  categories.push({
    category: 'documentation',
    label: 'Documentation Coverage',
    score: docScore,
    status: scoreToStatus(docScore),
    findingCount: undocumentedObjects.length + (!hasArchDescription && totalObjects > 0 ? 1 : 0),
    errorCount: 0,
    warningCount: 0,
    infoCount: undocumentedObjects.length + (!hasArchDescription && totalObjects > 0 ? 1 : 0),
  });

  // --------------------------------------------------------------------------
  // 3. Security Health (F090)
  // --------------------------------------------------------------------------
  const secReport = analyzeSecurityArchitecture(model);

  for (const exp of secReport.exposures) {
    findings.push({
      id: `sec-${exp.id}`,
      category: 'security',
      severity:
        exp.severity === 'critical' || exp.severity === 'high'
          ? 'error'
          : exp.severity === 'medium'
            ? 'warning'
            : 'info',
      title: exp.title || `Security: ${exp.type.replace(/_/g, ' ')}`,
      detail: exp.description,
      targetId: exp.targetId,
      targetName: exp.targetName,
      remediation: exp.remediation,
    });
  }

  const secScore = clamp(secReport.metrics.securityScore);
  const secErrors = secReport.exposures.filter(
    (e) => e.severity === 'critical' || e.severity === 'high'
  ).length;
  const secWarnings = secReport.exposures.filter((e) => e.severity === 'medium').length;
  const secInfos = secReport.exposures.filter((e) => e.severity === 'low').length;

  categories.push({
    category: 'security',
    label: 'Security Architecture',
    score: secScore,
    status: scoreToStatus(secScore),
    findingCount: secReport.exposures.length,
    errorCount: secErrors,
    warningCount: secWarnings,
    infoCount: secInfos,
  });

  // --------------------------------------------------------------------------
  // 4. Ownership Health
  // --------------------------------------------------------------------------
  // Actors and groups do not require individual service owners
  const ownableObjects = objects.filter((o) => o.kind !== 'actor' && o.kind !== 'group');
  const ownedObjects = ownableObjects.filter((o) => Boolean(o.metadata?.owner || o.metadata?.team));
  const unownedObjects = ownableObjects.filter((o) => !o.metadata?.owner && !o.metadata?.team);

  for (const obj of unownedObjects) {
    findings.push({
      id: `own-${obj.id}`,
      category: 'ownership',
      severity: 'warning',
      title: 'Missing Component Owner',
      detail: `${obj.name} (${obj.kind}) has no team or owner assigned in metadata.`,
      targetId: obj.id,
      targetName: obj.name,
      remediation: 'Assign an engineering team or owner to guarantee governance and incident escalation.',
    });
  }

  const totalOwnable = ownableObjects.length;
  const ownershipCoverage = clamp(
    totalOwnable > 0 ? Math.round((ownedObjects.length / totalOwnable) * 100) : 100
  );
  const ownershipScore = ownershipCoverage;

  categories.push({
    category: 'ownership',
    label: 'Ownership Governance',
    score: ownershipScore,
    status: scoreToStatus(ownershipScore),
    findingCount: unownedObjects.length,
    errorCount: 0,
    warningCount: unownedObjects.length,
    infoCount: 0,
  });

  // --------------------------------------------------------------------------
  // 5. Drift Health (F084)
  // --------------------------------------------------------------------------
  let driftScore = 100;
  let driftFindingCount = 0;
  let driftErrors = 0;
  let driftWarnings = 0;
  let driftInfos = 0;

  if (options.actualModel && options.actualModel !== model) {
    const driftReport = detectArchitectureDrift({
      architectureId: model.architecture.id,
      documentedModel: model,
      actualModel: options.actualModel,
    });

    const crit = driftReport.summary.bySeverity.critical || 0;
    const hi = driftReport.summary.bySeverity.high || 0;
    const med = driftReport.summary.bySeverity.medium || 0;
    const lo =
      (driftReport.summary.bySeverity.low || 0) +
      (driftReport.summary.bySeverity.informational || 0);

    for (const item of driftReport.driftItems) {
      findings.push({
        id: `drift-${item.id}`,
        category: 'drift',
        severity:
          item.severity === 'critical' || item.severity === 'high'
            ? 'error'
            : item.severity === 'medium'
              ? 'warning'
              : 'info',
        title: item.title,
        detail: item.description,
        targetId: item.documentedEntity?.id || item.actualEntity?.id,
        targetName: item.documentedEntity?.name || item.actualEntity?.name,
        remediation: 'Reconcile model with actual infrastructure state or generate a Pull Request.',
      });
    }

    driftErrors = crit + hi;
    driftWarnings = med;
    driftInfos = lo;
    driftFindingCount = driftReport.driftItems.length;

    const driftPenalty = crit * 25 + hi * 15 + med * 5 + lo * 2;
    driftScore = clamp(100 - driftPenalty);
  }

  categories.push({
    category: 'drift',
    label: 'Architecture Drift',
    score: driftScore,
    status: scoreToStatus(driftScore),
    findingCount: driftFindingCount,
    errorCount: driftErrors,
    warningCount: driftWarnings,
    infoCount: driftInfos,
  });

  // --------------------------------------------------------------------------
  // Composite Score
  // --------------------------------------------------------------------------
  const compositeScore = clamp(
    categories.reduce((acc, cat) => {
      const weight =
        cat.category in CORE_CATEGORY_WEIGHTS
          ? CORE_CATEGORY_WEIGHTS[
              cat.category as 'dependencies' | 'documentation' | 'security' | 'ownership' | 'drift'
            ]
          : 0;
      return acc + cat.score * weight;
    }, 0)
  );

  const overallStatus = scoreToStatus(compositeScore);

  // --------------------------------------------------------------------------
  // Auxiliary Linting & Rules Metrics
  // --------------------------------------------------------------------------
  let lintFindingCount = 0;
  try {
    const lintReport = lintArchitectureModel(model);
    lintFindingCount = lintReport.summary.totalFindings;
  } catch {
    lintFindingCount = 0;
  }

  let ruleViolationCount = 0;
  try {
    const rulesReport = evaluateArchitectureRules(model);
    ruleViolationCount = rulesReport.totalViolations;
  } catch {
    ruleViolationCount = 0;
  }

  // --------------------------------------------------------------------------
  // Change Analytics
  // --------------------------------------------------------------------------
  let changeAnalytics: ChangeAnalytics;

  if (options.baselineModel && options.baselineModel !== model) {
    const baselineReport = computeArchitectureHealth(options.baselineModel);
    const scoreDelta = compositeScore - baselineReport.compositeScore;
    const trend = scoreDelta > 0 ? 'improving' : scoreDelta < 0 ? 'degrading' : 'stable';

    const changeSet = computeArchitectureChangeSet({
      baseObjects: options.baselineModel.objects,
      targetObjects: model.objects,
      baseConnections: options.baselineModel.connections,
      targetConnections: model.connections,
    });

    const addedObjects = changeSet.changes.added.filter((c) => c.kind === 'object').length;
    const modifiedObjects = changeSet.changes.modified.filter((c) => c.kind === 'object').length;
    const removedObjects = changeSet.changes.removed.filter((c) => c.kind === 'object').length;
    const addedConnections = changeSet.changes.added.filter((c) => c.kind === 'connection').length;
    const removedConnections = changeSet.changes.removed.filter(
      (c) => c.kind === 'connection'
    ).length;

    let changeRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (scoreDelta <= -20 || changeSet.affected.counts.objects >= 10) {
      changeRiskLevel = 'critical';
    } else if (scoreDelta < 0 || changeSet.affected.counts.objects >= 5) {
      changeRiskLevel = 'high';
    } else if (changeSet.changes.totalDirectChanges > 3) {
      changeRiskLevel = 'medium';
    }

    const summary = `${trend === 'improving' ? 'Health improved' : trend === 'degrading' ? 'Health degraded' : 'Health unchanged'} (${scoreDelta >= 0 ? '+' : ''}${scoreDelta} pts). ${changeSet.changes.totalDirectChanges} change(s) across ${changeSet.affected.counts.objects} affected component(s).`;

    changeAnalytics = {
      hasBaseline: true,
      baselineScore: baselineReport.compositeScore,
      scoreDelta,
      trend,
      addedObjectsCount: addedObjects,
      modifiedObjectsCount: modifiedObjects,
      removedObjectsCount: removedObjects,
      addedConnectionsCount: addedConnections,
      removedConnectionsCount: removedConnections,
      totalChanges: changeSet.changes.totalDirectChanges,
      affectedObjectsCount: changeSet.affected.counts.objects,
      affectedFlowsCount: changeSet.affected.counts.flows,
      affectedTeamsCount: changeSet.affected.counts.teams,
      changeRiskLevel,
      summary,
    };
  } else {
    changeAnalytics = {
      hasBaseline: false,
      scoreDelta: 0,
      trend: 'stable',
      addedObjectsCount: 0,
      modifiedObjectsCount: 0,
      removedObjectsCount: 0,
      addedConnectionsCount: 0,
      removedConnectionsCount: 0,
      totalChanges: 0,
      affectedObjectsCount: 0,
      affectedFlowsCount: 0,
      affectedTeamsCount: 0,
      changeRiskLevel: 'low',
      summary: 'No previous baseline model provided for comparison.',
    };
  }

  // --------------------------------------------------------------------------
  // Analytics Counts
  // --------------------------------------------------------------------------
  const analytics: HealthAnalytics = {
    totalObjects,
    totalConnections,
    ownedObjects: ownedObjects.length,
    documentedObjects: documentedObjects.length,
    ownershipCoverage: ownershipScore,
    documentationCoverage,
    dependencyCount: totalConnections,
    cyclicDependencyCount: cycles.length,
    isolatedObjectCount: isolatedObjects.length,
    securityExposureCount: secReport.exposures.length,
    securityScore: secScore,
    driftItemCount: driftFindingCount,
    lintFindingCount,
    ruleViolationCount,
    changeAnalytics,
  };

  return {
    architectureId: model.architecture.id,
    compositeScore,
    overallStatus,
    categories,
    findings,
    analytics,
    generatedAt: new Date().toISOString(),
  };
}
