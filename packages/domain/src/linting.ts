/**
 * Architecture Linting Engine (F085)
 *
 * Strict Acceptance Criteria:
 * - Findings at error/warning/info against architectural rules
 * - Test: seeded violations produce expected lint findings; a clean model is clean.
 */

import { type ArchitectureId } from './ids';
import type { ModelObject, ArchitectureModel } from './types';

// ============================================================================
// Types
// ============================================================================

export type LintSeverity = 'error' | 'warning' | 'info';

export type LintCategory =
  | 'structural'
  | 'documentation'
  | 'coupling'
  | 'hierarchy'
  | 'best-practice';

export interface ArchitectureLintFinding {
  id: string;
  ruleId: string;
  ruleName: string;
  category: LintCategory;
  severity: LintSeverity;
  targetId: string;
  targetType: 'object' | 'connection' | 'architecture';
  targetName: string;
  message: string;
  remediation: string;
  details?: Record<string, unknown>;
}

export interface ArchitectureLintSummary {
  totalFindings: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  byCategory: Record<LintCategory, number>;
  isClean: boolean;
  healthScore: number; // 0 - 100
}

export interface ArchitectureLintReport {
  architectureId: ArchitectureId;
  findings: ArchitectureLintFinding[];
  summary: ArchitectureLintSummary;
  executedAt: string;
}

export interface LintOptions {
  ignoredRuleIds?: string[];
  severityThreshold?: LintSeverity;
  maxCouplingThreshold?: number;
  customRules?: ArchitectureLintRule[];
}

export interface ArchitectureLintRule {
  id: string;
  name: string;
  category: LintCategory;
  defaultSeverity: LintSeverity;
  description: string;
  evaluate: (model: ArchitectureModel, options?: LintOptions) => ArchitectureLintFinding[];
}

// ============================================================================
// Canonical Built-in Rules
// ============================================================================

/**
 * Rule: Structural - Dangling Connection
 * Connection source or target does not exist in the model's objects.
 */
export const RULE_DANGLING_CONNECTION: ArchitectureLintRule = {
  id: 'ARCH-001',
  name: 'Dangling Connection',
  category: 'structural',
  defaultSeverity: 'error',
  description: 'Connection references a non-existent source or target object.',
  evaluate: (model) => {
    const findings: ArchitectureLintFinding[] = [];
    const objectMap = new Map<string, ModelObject>(model.objects.map((o) => [o.id, o]));

    for (const conn of model.connections) {
      const sourceExists = objectMap.has(conn.sourceObjectId);
      const targetExists = objectMap.has(conn.targetObjectId);

      if (!sourceExists || !targetExists) {
        const missingEnds: string[] = [];
        if (!sourceExists) missingEnds.push(`source object '${conn.sourceObjectId}'`);
        if (!targetExists) missingEnds.push(`target object '${conn.targetObjectId}'`);

        findings.push({
          id: `finding-${conn.id}-dangling`,
          ruleId: 'ARCH-001',
          ruleName: 'Dangling Connection',
          category: 'structural',
          severity: 'error',
          targetId: conn.id,
          targetType: 'connection',
          targetName: conn.label || `Connection ${conn.sourceObjectId} -> ${conn.targetObjectId}`,
          message: `Connection references missing ${missingEnds.join(' and ')}.`,
          remediation: 'Re-bind the connection endpoints to valid model objects or remove the connection.',
          details: { connectionId: conn.id, sourceId: conn.sourceObjectId, targetId: conn.targetObjectId },
        });
      }
    }

    return findings;
  },
};

/**
 * Rule: Structural - Direct Store-to-Store Connection
 * Database or datastores must not be directly coupled without an intervening service or worker.
 */
export const RULE_STORE_TO_STORE_CONNECTION: ArchitectureLintRule = {
  id: 'ARCH-002',
  name: 'Direct Datastore-to-Datastore Coupling',
  category: 'structural',
  defaultSeverity: 'error',
  description: 'Direct connections between two datastores bypass application logic and break encapsulation.',
  evaluate: (model) => {
    const findings: ArchitectureLintFinding[] = [];
    const objectMap = new Map<string, ModelObject>(model.objects.map((o) => [o.id, o]));

    for (const conn of model.connections) {
      const src = objectMap.get(conn.sourceObjectId);
      const tgt = objectMap.get(conn.targetObjectId);

      if (src && tgt && src.kind === 'store' && tgt.kind === 'store') {
        findings.push({
          id: `finding-${conn.id}-store-to-store`,
          ruleId: 'ARCH-002',
          ruleName: 'Direct Datastore-to-Datastore Coupling',
          category: 'structural',
          severity: 'error',
          targetId: conn.id,
          targetType: 'connection',
          targetName: conn.label || `${src.name} -> ${tgt.name}`,
          message: `Datastore '${src.name}' is directly connected to datastore '${tgt.name}'.`,
          remediation: 'Route data synchronization through an application service, ETL pipeline, or event bus.',
          details: { sourceStore: src.name, targetStore: tgt.name },
        });
      }
    }

    return findings;
  },
};

/**
 * Rule: Hierarchy - Invalid Parent-Child Nesting
 * Enforces C4 hierarchy:
 * - Systems can contain Applications, Stores, Actors, Groups
 * - Applications can contain Components
 * - Stores, Components, Actors cannot contain Systems or Applications
 * - No circular parent references
 */
export const RULE_INVALID_HIERARCHY: ArchitectureLintRule = {
  id: 'ARCH-003',
  name: 'Invalid Containment Hierarchy',
  category: 'hierarchy',
  defaultSeverity: 'error',
  description: 'Parent-child containment violates architectural boundary levels or contains cycles.',
  evaluate: (model) => {
    const findings: ArchitectureLintFinding[] = [];
    const objectMap = new Map<string, ModelObject>(model.objects.map((o) => [o.id, o]));

    for (const obj of model.objects) {
      if (!obj.parentId) continue;

      // Check if parent exists
      const parent = objectMap.get(obj.parentId);
      if (!parent) {
        findings.push({
          id: `finding-${obj.id}-missing-parent`,
          ruleId: 'ARCH-003',
          ruleName: 'Invalid Containment Hierarchy',
          category: 'hierarchy',
          severity: 'error',
          targetId: obj.id,
          targetType: 'object',
          targetName: obj.name,
          message: `Object '${obj.name}' references non-existent parent container '${obj.parentId}'.`,
          remediation: 'Attach object to an existing parent container or set parentId to null.',
          details: { objectId: obj.id, parentId: obj.parentId },
        });
        continue;
      }

      // Check circular containment
      let currParent: ModelObject | undefined = parent;
      const visited = new Set<string>([obj.id]);
      let hasCycle = false;

      while (currParent) {
        if (visited.has(currParent.id)) {
          hasCycle = true;
          break;
        }
        visited.add(currParent.id);
        currParent = currParent.parentId ? objectMap.get(currParent.parentId) : undefined;
      }

      if (hasCycle) {
        findings.push({
          id: `finding-${obj.id}-circular-hierarchy`,
          ruleId: 'ARCH-003',
          ruleName: 'Invalid Containment Hierarchy',
          category: 'hierarchy',
          severity: 'error',
          targetId: obj.id,
          targetType: 'object',
          targetName: obj.name,
          message: `Circular parent-child containment detected involving '${obj.name}'.`,
          remediation: 'Break the circular nesting by re-assigning the container hierarchy.',
        });
        continue;
      }

      // Check invalid inversion: component containing an application or system
      if (
        (parent.kind === 'component' && (obj.kind === 'application' || obj.kind === 'system')) ||
        (parent.kind === 'store' && (obj.kind === 'application' || obj.kind === 'system'))
      ) {
        findings.push({
          id: `finding-${obj.id}-invalid-nesting`,
          ruleId: 'ARCH-003',
          ruleName: 'Invalid Containment Hierarchy',
          category: 'hierarchy',
          severity: 'error',
          targetId: obj.id,
          targetType: 'object',
          targetName: obj.name,
          message: `Coarser entity '${obj.name}' (${obj.kind}) cannot be nested inside finer entity '${parent.name}' (${parent.kind}).`,
          remediation: 'Invert the relationship or move the child object to an appropriate higher-level container.',
        });
      }
    }

    return findings;
  },
};

/**
 * Rule: Structural - Orphaned Object
 * Functional objects (applications, components, datastores) with zero incoming or outgoing connections.
 */
export const RULE_ORPHAN_OBJECT: ArchitectureLintRule = {
  id: 'ARCH-004',
  name: 'Orphaned Architecture Object',
  category: 'structural',
  defaultSeverity: 'warning',
  description: 'Object has no inbound or outbound connections to any other component in the model.',
  evaluate: (model) => {
    const findings: ArchitectureLintFinding[] = [];
    const connectedObjectIds = new Set<string>();

    for (const conn of model.connections) {
      connectedObjectIds.add(conn.sourceObjectId);
      connectedObjectIds.add(conn.targetObjectId);
    }

    for (const obj of model.objects) {
      // Ignore logical grouping containers or actors if unconnected
      if (obj.kind === 'group' || obj.kind === 'system') continue;

      if (!connectedObjectIds.has(obj.id)) {
        findings.push({
          id: `finding-${obj.id}-orphaned`,
          ruleId: 'ARCH-004',
          ruleName: 'Orphaned Architecture Object',
          category: 'structural',
          severity: 'warning',
          targetId: obj.id,
          targetType: 'object',
          targetName: obj.name,
          message: `Object '${obj.name}' (${obj.kind}) is isolated with no incoming or outgoing connections.`,
          remediation: 'Connect this object to dependent consumers or backing services, or remove it if obsolete.',
          details: { kind: obj.kind },
        });
      }
    }

    return findings;
  },
};

/**
 * Rule: Documentation - Missing Technology Specification
 * Applications and Datastores must specify their technology stack or engine.
 */
export const RULE_MISSING_TECHNOLOGY: ArchitectureLintRule = {
  id: 'ARCH-005',
  name: 'Missing Technology Stack Metadata',
  category: 'documentation',
  defaultSeverity: 'warning',
  description: 'Applications and datastores should declare their underlying technology stack or engine.',
  evaluate: (model) => {
    const findings: ArchitectureLintFinding[] = [];

    for (const obj of model.objects) {
      if (obj.kind === 'application' || obj.kind === 'store') {
        const metadata = obj.metadata || {};
        const tech = metadata.technology || metadata.engine || metadata.tech;

        if (!tech || (typeof tech === 'string' && tech.trim().length === 0)) {
          findings.push({
            id: `finding-${obj.id}-missing-tech`,
            ruleId: 'ARCH-005',
            ruleName: 'Missing Technology Stack Metadata',
            category: 'documentation',
            severity: 'warning',
            targetId: obj.id,
            targetType: 'object',
            targetName: obj.name,
            message: `${obj.kind === 'store' ? 'Datastore' : 'Application'} '${obj.name}' does not specify a technology or engine.`,
            remediation: 'Specify the technology (e.g. Node.js, Go, PostgreSQL, Redis) in the object inspector.',
            details: { kind: obj.kind },
          });
        }
      }
    }

    return findings;
  },
};

/**
 * Rule: Structural - Self-Referencing Connection
 * Connection where sourceId === targetId without explicitly labeled loop/self semantic.
 */
export const RULE_SELF_REFERENCING_CONNECTION: ArchitectureLintRule = {
  id: 'ARCH-006',
  name: 'Self-Referencing Connection Loop',
  category: 'structural',
  defaultSeverity: 'warning',
  description: 'Connection links an object directly to itself.',
  evaluate: (model) => {
    const findings: ArchitectureLintFinding[] = [];
    const objectMap = new Map<string, ModelObject>(model.objects.map((o) => [o.id, o]));

    for (const conn of model.connections) {
      if (conn.sourceObjectId === conn.targetObjectId) {
        const obj = objectMap.get(conn.sourceObjectId);
        const name = obj ? obj.name : conn.sourceObjectId;

        findings.push({
          id: `finding-${conn.id}-self-loop`,
          ruleId: 'ARCH-006',
          ruleName: 'Self-Referencing Connection Loop',
          category: 'structural',
          severity: 'warning',
          targetId: conn.id,
          targetType: 'connection',
          targetName: conn.label || `Loop on ${name}`,
          message: `Connection '${conn.id}' creates an unclassified self-loop on '${name}'.`,
          remediation: 'Verify whether internal recursion is intentional; if not, point connection to target component.',
        });
      }
    }

    return findings;
  },
};

/**
 * Rule: Coupling - Excessive Node Fan-out / High Coupling
 * Single node with an excessive number of dependencies indicates god-object architecture.
 */
export const RULE_HIGH_COUPLING: ArchitectureLintRule = {
  id: 'ARCH-007',
  name: 'Excessive Node Coupling',
  category: 'coupling',
  defaultSeverity: 'warning',
  description: 'Node exceeds safe coupling limits (fan-in + fan-out), representing an architectural bottleneck.',
  evaluate: (model, options) => {
    const findings: ArchitectureLintFinding[] = [];
    const threshold = options?.maxCouplingThreshold ?? 10;
    const couplingCounts = new Map<string, number>();

    for (const conn of model.connections) {
      couplingCounts.set(conn.sourceObjectId, (couplingCounts.get(conn.sourceObjectId) || 0) + 1);
      couplingCounts.set(conn.targetObjectId, (couplingCounts.get(conn.targetObjectId) || 0) + 1);
    }

    for (const obj of model.objects) {
      const count = couplingCounts.get(obj.id) || 0;
      if (count > threshold) {
        findings.push({
          id: `finding-${obj.id}-high-coupling`,
          ruleId: 'ARCH-007',
          ruleName: 'Excessive Node Coupling',
          category: 'coupling',
          severity: 'warning',
          targetId: obj.id,
          targetType: 'object',
          targetName: obj.name,
          message: `Object '${obj.name}' has ${count} direct connections (exceeding limit of ${threshold}).`,
          remediation: 'Decompose this service into cohesive bounded contexts or introduce a message broker / facade.',
          details: { connectionCount: count, threshold },
        });
      }
    }

    return findings;
  },
};

/**
 * Rule: Documentation - Missing Description
 * Model objects should contain clear, informative descriptions for architectural onboarding.
 */
export const RULE_MISSING_DESCRIPTION: ArchitectureLintRule = {
  id: 'ARCH-008',
  name: 'Missing Entity Description',
  category: 'documentation',
  defaultSeverity: 'info',
  description: 'Architecture object lacks a human-readable description.',
  evaluate: (model) => {
    const findings: ArchitectureLintFinding[] = [];

    for (const obj of model.objects) {
      if (!obj.description || obj.description.trim().length === 0) {
        findings.push({
          id: `finding-${obj.id}-missing-desc`,
          ruleId: 'ARCH-008',
          ruleName: 'Missing Entity Description',
          category: 'documentation',
          severity: 'info',
          targetId: obj.id,
          targetType: 'object',
          targetName: obj.name,
          message: `Object '${obj.name}' does not have an architectural description.`,
          remediation: 'Add a concise summary explaining the role and purpose of this system component.',
        });
      }
    }

    return findings;
  },
};

/**
 * Rule: Best Practice - Missing Actor Entrypoint
 * Top-level system or platform context should have at least one user, client actor, or external interface.
 */
export const RULE_MISSING_ACTOR_ENTRYPOINT: ArchitectureLintRule = {
  id: 'ARCH-009',
  name: 'Missing User/Actor Entrypoint',
  category: 'best-practice',
  defaultSeverity: 'info',
  description: 'Model has no user/actor entities interacting with the application layer.',
  evaluate: (model) => {
    const findings: ArchitectureLintFinding[] = [];

    // Only apply if model has applications
    const hasApps = model.objects.some((o) => o.kind === 'application' || o.kind === 'system');
    if (!hasApps) return findings;

    const hasActors = model.objects.some((o) => o.kind === 'actor');
    if (!hasActors) {
      findings.push({
        id: `finding-${model.architecture.id}-no-actors`,
        ruleId: 'ARCH-009',
        ruleName: 'Missing User/Actor Entrypoint',
        category: 'best-practice',
        severity: 'info',
        targetId: model.architecture.id,
        targetType: 'architecture',
        targetName: model.architecture.name,
        message: 'No actor or user persona is modeled to illustrate external ingress and user journeys.',
        remediation: 'Add client actors (e.g. End User, Administrator, Mobile App) to clarify entrypoints.',
      });
    }

    return findings;
  },
};

export const CANONICAL_LINT_RULES: ArchitectureLintRule[] = [
  RULE_DANGLING_CONNECTION,
  RULE_STORE_TO_STORE_CONNECTION,
  RULE_INVALID_HIERARCHY,
  RULE_ORPHAN_OBJECT,
  RULE_MISSING_TECHNOLOGY,
  RULE_SELF_REFERENCING_CONNECTION,
  RULE_HIGH_COUPLING,
  RULE_MISSING_DESCRIPTION,
  RULE_MISSING_ACTOR_ENTRYPOINT,
];

// ============================================================================
// Core Lint Runner
// ============================================================================

/**
 * Evaluates an architecture model against all active lint rules and returns a structured report.
 */
export function lintArchitectureModel(
  model: ArchitectureModel,
  options?: LintOptions
): ArchitectureLintReport {
  const ignoredRules = new Set(options?.ignoredRuleIds || []);
  const allRules = [...CANONICAL_LINT_RULES, ...(options?.customRules || [])];

  const findings: ArchitectureLintFinding[] = [];

  for (const rule of allRules) {
    if (ignoredRules.has(rule.id)) continue;

    const ruleFindings = rule.evaluate(model, options);
    for (const finding of ruleFindings) {
      // Filter by severity threshold if specified
      if (options?.severityThreshold) {
        const severityRank: Record<LintSeverity, number> = {
          error: 3,
          warning: 2,
          info: 1,
        };
        if (severityRank[finding.severity] < severityRank[options.severityThreshold]) {
          continue;
        }
      }
      findings.push(finding);
    }
  }

  // Calculate summary metrics
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  const byCategory: Record<LintCategory, number> = {
    structural: 0,
    documentation: 0,
    coupling: 0,
    hierarchy: 0,
    'best-practice': 0,
  };

  for (const finding of findings) {
    if (finding.severity === 'error') errorCount++;
    else if (finding.severity === 'warning') warningCount++;
    else if (finding.severity === 'info') infoCount++;

    byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
  }

  const totalFindings = findings.length;
  const isClean = totalFindings === 0;

  // Deduct penalty from 100: errors -15, warnings -5, infos -1
  const penalty = errorCount * 15 + warningCount * 5 + infoCount * 1;
  const healthScore = Math.max(0, 100 - penalty);

  return {
    architectureId: model.architecture.id,
    findings,
    summary: {
      totalFindings,
      errorCount,
      warningCount,
      infoCount,
      byCategory,
      isClean,
      healthScore,
    },
    executedAt: new Date().toISOString(),
  };
}
