/**
 * Organization Architecture Rules Engine (F086)
 *
 * Strict Acceptance Criteria:
 * - Rules: owner required, external API auth, no cross-service DB access, PII flow restrictions
 * - Test: a rule fires on a violating model.
 */

import { type ArchitectureId } from './ids';
import type { ModelObject, ArchitectureModel } from './types';

// ============================================================================
// Types
// ============================================================================

export type RuleSeverity = 'error' | 'warning';
export type RuleEnforcementLevel = 'strict' | 'advisory' | 'disabled';

export interface OrgRuleViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: RuleSeverity;
  targetId: string;
  targetType: 'object' | 'connection';
  targetName: string;
  reason: string;
  remediation: string;
  context?: Record<string, unknown>;
}

export interface RuleEvaluationSummary {
  ruleId: string;
  ruleName: string;
  description: string;
  passed: boolean;
  violationCount: number;
}

export interface OrgRulesEvaluationReport {
  architectureId: ArchitectureId;
  isCompliant: boolean;
  totalViolations: number;
  errorCount: number;
  warningCount: number;
  violations: OrgRuleViolation[];
  ruleSummaries: RuleEvaluationSummary[];
  evaluatedAt: string;
}

export interface OrgArchitectureRule {
  id: string;
  name: string;
  description: string;
  defaultSeverity: RuleSeverity;
  evaluate: (model: ArchitectureModel) => OrgRuleViolation[];
}

export interface RulePolicyConfig {
  disabledRuleIds?: string[];
  severityOverrides?: Record<string, RuleSeverity>;
}

// ============================================================================
// Canonical 4 Organization Rules
// ============================================================================

/**
 * Rule 1: Owner Required
 * Every architectural entity (application, store, service) must declare an owning team or engineer.
 */
export const RULE_OWNER_REQUIRED: OrgArchitectureRule = {
  id: 'ORG-RULE-001',
  name: 'Owner Required',
  description: 'Every application, service, and datastore must have an explicitly assigned team or owner.',
  defaultSeverity: 'error',
  evaluate: (model) => {
    const violations: OrgRuleViolation[] = [];

    for (const obj of model.objects) {
      // Actors and generic grouping boundaries do not require individual service owners
      if (obj.kind === 'actor' || obj.kind === 'group') continue;

      const metadata = obj.metadata || {};
      const owner = metadata.owner || metadata.team || metadata.ownerId || metadata.owningTeam;

      if (!owner || (typeof owner === 'string' && owner.trim().length === 0)) {
        violations.push({
          id: `violation-${obj.id}-missing-owner`,
          ruleId: 'ORG-RULE-001',
          ruleName: 'Owner Required',
          severity: 'error',
          targetId: obj.id,
          targetType: 'object',
          targetName: obj.name,
          reason: `Object '${obj.name}' (${obj.kind}) has no designated owner or owning team.`,
          remediation: 'Assign a team or engineer email to metadata.owner or metadata.team in the inspector.',
          context: { objectKind: obj.kind },
        });
      }
    }

    return violations;
  },
};

/**
 * Rule 2: External API Auth Required
 * Ingress connections from external actors/systems to internal services must enforce an authentication scheme.
 */
export const RULE_EXTERNAL_API_AUTH: OrgArchitectureRule = {
  id: 'ORG-RULE-002',
  name: 'External API Authentication Required',
  description: 'External API ingress connections and gateway boundaries must enforce authentication and cannot be unauthenticated.',
  defaultSeverity: 'error',
  evaluate: (model) => {
    const violations: OrgRuleViolation[] = [];
    const objectMap = new Map<string, ModelObject>(model.objects.map((o) => [o.id, o]));

    for (const conn of model.connections) {
      const source = objectMap.get(conn.sourceObjectId);
      const target = objectMap.get(conn.targetObjectId);

      // Check ingress connections originating from external actors or external boundary services
      const isExternalSource = source && (source.kind === 'actor' || (source.metadata?.external === true));
      const isInternalTarget = target && target.kind !== 'actor';

      if (isExternalSource && isInternalTarget) {
        const metadata = conn.metadata || {};
        const auth = (metadata.auth || metadata.authentication || metadata.authScheme) as string | undefined;

        const isUnauthenticated =
          !auth ||
          auth.trim().length === 0 ||
          auth.toLowerCase() === 'none' ||
          auth.toLowerCase() === 'public' ||
          auth.toLowerCase() === 'unauthenticated';

        if (isUnauthenticated) {
          violations.push({
            id: `violation-${conn.id}-unauthenticated-ingress`,
            ruleId: 'ORG-RULE-002',
            ruleName: 'External API Authentication Required',
            severity: 'error',
            targetId: conn.id,
            targetType: 'connection',
            targetName: conn.label || `${source?.name || conn.sourceObjectId} -> ${target?.name || conn.targetObjectId}`,
            reason: `External ingress connection to '${target?.name}' does not enforce an authentication scheme.`,
            remediation: 'Configure an authentication mechanism (e.g., OAuth2, JWT, API Key, mTLS) on the connection.',
            context: {
              sourceName: source?.name,
              targetName: target?.name,
              authSpecified: auth || 'none',
            },
          });
        }
      }
    }

    return violations;
  },
};

/**
 * Rule 3: No Cross-Service Direct Database Access
 * Services must not directly access datastores owned by another service (Database-Per-Service pattern).
 */
export const RULE_NO_CROSS_SERVICE_DB_ACCESS: OrgArchitectureRule = {
  id: 'ORG-RULE-003',
  name: 'No Cross-Service Direct Database Access',
  description: 'Datastores private to a service must not be directly queried or connected to by external/foreign services.',
  defaultSeverity: 'error',
  evaluate: (model) => {
    const violations: OrgRuleViolation[] = [];
    const objectMap = new Map<string, ModelObject>(model.objects.map((o) => [o.id, o]));

    // Find all store objects
    const stores = model.objects.filter((o) => o.kind === 'store');

    for (const store of stores) {
      // An owner service may be defined explicitly via metadata.ownerServiceId, parentId, or metadata.owner
      const storeOwnerServiceId =
        (store.metadata?.ownerServiceId as string | undefined) ||
        (store.parentId ? store.parentId : undefined);

      // Find all incoming connections to this store
      const incomingConns = model.connections.filter(
        (c) => c.targetObjectId === store.id && c.sourceObjectId !== store.id
      );

      const connectingServiceIds = new Set<string>();
      for (const conn of incomingConns) {
        const caller = objectMap.get(conn.sourceObjectId);
        if (caller && (caller.kind === 'application' || caller.kind === 'component')) {
          connectingServiceIds.add(caller.id);

          // If the store has a defined single owner service and the caller is not that service:
          if (storeOwnerServiceId && caller.id !== storeOwnerServiceId) {
            const ownerObj = objectMap.get(storeOwnerServiceId);
            violations.push({
              id: `violation-${conn.id}-cross-db-${caller.id}-${store.id}`,
              ruleId: 'ORG-RULE-003',
              ruleName: 'No Cross-Service Direct Database Access',
              severity: 'error',
              targetId: conn.id,
              targetType: 'connection',
              targetName: conn.label || `${caller.name} -> ${store.name}`,
              reason: `Service '${caller.name}' directly accesses datastore '${store.name}' owned by '${ownerObj?.name || storeOwnerServiceId}'.`,
              remediation: `Expose an API or event interface in '${ownerObj?.name || 'the owning service'}' instead of direct database access.`,
              context: {
                callerId: caller.id,
                callerName: caller.name,
                storeId: store.id,
                storeName: store.name,
                ownerServiceId: storeOwnerServiceId,
              },
            });
          }
        }
      }

      // If no explicit owner service was declared, but multiple distinct services connect directly:
      if (!storeOwnerServiceId && connectingServiceIds.size > 1) {
        const serviceNames = Array.from(connectingServiceIds)
          .map((id) => objectMap.get(id)?.name || id)
          .join(', ');

        violations.push({
          id: `violation-${store.id}-shared-database`,
          ruleId: 'ORG-RULE-003',
          ruleName: 'No Cross-Service Direct Database Access',
          severity: 'error',
          targetId: store.id,
          targetType: 'object',
          targetName: store.name,
          reason: `Datastore '${store.name}' is shared directly by multiple independent services (${serviceNames}).`,
          remediation: 'Decompose the database per service or designate a single owning microservice to govern it.',
          context: {
            storeId: store.id,
            storeName: store.name,
            connectingServiceCount: connectingServiceIds.size,
          },
        });
      }
    }

    return violations;
  },
};

/**
 * Rule 4: PII Flow Restrictions
 * Connections carrying PII or sensitive data must enforce TLS/encryption and cannot terminate at unapproved external systems.
 */
export const RULE_PII_FLOW_RESTRICTIONS: OrgArchitectureRule = {
  id: 'ORG-RULE-004',
  name: 'PII Flow Restrictions',
  description: 'Connections carrying PII or sensitive data must enforce encryption (TLS/HTTPS) and cannot flow to unapproved external endpoints.',
  defaultSeverity: 'error',
  evaluate: (model) => {
    const violations: OrgRuleViolation[] = [];
    const objectMap = new Map<string, ModelObject>(model.objects.map((o) => [o.id, o]));

    for (const conn of model.connections) {
      const source = objectMap.get(conn.sourceObjectId);
      const target = objectMap.get(conn.targetObjectId);

      const metadata = conn.metadata || {};
      const carriesPII =
        metadata.pii === true ||
        metadata.dataClassification === 'pii' ||
        metadata.dataClassification === 'sensitive' ||
        metadata.dataClassification === 'restricted';

      if (carriesPII) {
        // Check 1: Encryption enforcement
        const protocol = (metadata.protocol as string | undefined)?.toLowerCase() || '';
        const isEncrypted =
          metadata.encrypted === true ||
          metadata.tls === true ||
          protocol.startsWith('https') ||
          protocol.includes('tls') ||
          protocol === 'grpc-tls' ||
          protocol === 'ssh';

        if (!isEncrypted) {
          violations.push({
            id: `violation-${conn.id}-unencrypted-pii`,
            ruleId: 'ORG-RULE-004',
            ruleName: 'PII Flow Restrictions',
            severity: 'error',
            targetId: conn.id,
            targetType: 'connection',
            targetName: conn.label || `${source?.name || conn.sourceObjectId} -> ${target?.name || conn.targetObjectId}`,
            reason: `Connection carrying sensitive PII data transmits over unencrypted transport (${protocol || 'unspecified'}).`,
            remediation: 'Enforce TLS/HTTPS encryption on this connection (set metadata.encrypted: true or HTTPS protocol).',
            context: { protocol, carriesPII: true },
          });
        }

        // Check 2: Unapproved external endpoint transfer
        const isTargetExternal =
          target &&
          (target.kind === 'actor' ||
            target.metadata?.external === true ||
            target.metadata?.thirdParty === true);

        const isDPAApproved = target && target.metadata?.hasDpaAgreement === true;

        if (isTargetExternal && !isDPAApproved) {
          violations.push({
            id: `violation-${conn.id}-unapproved-external-pii`,
            ruleId: 'ORG-RULE-004',
            ruleName: 'PII Flow Restrictions',
            severity: 'error',
            targetId: conn.id,
            targetType: 'connection',
            targetName: conn.label || `${source?.name || conn.sourceObjectId} -> ${target?.name || conn.targetObjectId}`,
            reason: `Sensitive PII data is transmitted to external entity '${target?.name}' without a verified Data Processing Agreement (DPA).`,
            remediation: 'Obtain an authorized DPA or route the data through an anonymization / tokenization pipeline.',
            context: { targetName: target?.name, carriesPII: true },
          });
        }
      }
    }

    return violations;
  },
};

export const CANONICAL_ORG_RULES: OrgArchitectureRule[] = [
  RULE_OWNER_REQUIRED,
  RULE_EXTERNAL_API_AUTH,
  RULE_NO_CROSS_SERVICE_DB_ACCESS,
  RULE_PII_FLOW_RESTRICTIONS,
];

// ============================================================================
// Core Evaluation Runner
// ============================================================================

/**
 * Evaluates an architecture model against all organization rules and returns a structured compliance report.
 */
export function evaluateArchitectureRules(
  model: ArchitectureModel,
  config?: RulePolicyConfig
): OrgRulesEvaluationReport {
  const disabledRules = new Set(config?.disabledRuleIds || []);
  const allViolations: OrgRuleViolation[] = [];
  const ruleSummaries: RuleEvaluationSummary[] = [];

  for (const rule of CANONICAL_ORG_RULES) {
    if (disabledRules.has(rule.id)) {
      continue;
    }

    const ruleViolations = rule.evaluate(model);

    // Apply severity overrides if specified
    const effectiveViolations: OrgRuleViolation[] = ruleViolations.map((v) => {
      const override = config?.severityOverrides?.[rule.id];
      if (override) {
        return { ...v, severity: override };
      }
      return v;
    });

    allViolations.push(...effectiveViolations);

    ruleSummaries.push({
      ruleId: rule.id,
      ruleName: rule.name,
      description: rule.description,
      passed: effectiveViolations.length === 0,
      violationCount: effectiveViolations.length,
    });
  }

  let errorCount = 0;
  let warningCount = 0;
  for (const v of allViolations) {
    if (v.severity === 'error') errorCount++;
    else if (v.severity === 'warning') warningCount++;
  }

  const isCompliant = errorCount === 0;

  return {
    architectureId: model.architecture.id,
    isCompliant,
    totalViolations: allViolations.length,
    errorCount,
    warningCount,
    violations: allViolations,
    ruleSummaries,
    evaluatedAt: new Date().toISOString(),
  };
}
