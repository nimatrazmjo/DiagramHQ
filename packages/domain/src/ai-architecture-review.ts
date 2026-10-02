/**
 * DiagramHQ - AI Architecture Review Agent (F069)
 *
 * Automated pre-merge architectural review agent for pull requests & change sets.
 * Audits architecture graphs against a formal pre-merge compliance checklist:
 * 1. No circular dependencies: detects cyclic call chains across services
 * 2. Ownership present: verifies every component has an assigned engineering team owner
 * 3. No unapproved external dependencies: ensures external systems are certified/approved
 * 4. Backup & Disaster Recovery: verifies persistent stores have documented backup/DR plans
 * 5. No PII to third parties: checks for cleartext or unauthorized customer PII flows to external actors/vendors
 *
 * Verdict system:
 * - 'REQUEST_CHANGES': Returned whenever one or more critical/high checklist invariants are violated.
 * - 'APPROVE': Returned when all pre-merge checklist items PASS cleanly.
 * - 'COMMENT': Informational / warning advisories only.
 */

import type { ObjectId } from './ids';
import type { ModelObject, ModelConnection } from './types';
import type { ObjectOwnership } from './teams';

export type ReviewRuleId =
  | 'no_circular_dependencies'
  | 'owners_present'
  | 'no_unapproved_external_dependencies'
  | 'backup_dr_configured'
  | 'no_pii_to_third_parties';

export type CheckStatus = 'PASS' | 'FAIL';

export type ReviewVerdict = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';

export interface ReviewChecklistItem {
  ruleId: ReviewRuleId;
  title: string;
  description: string;
  status: CheckStatus;
  details: string;
  affectedEntityIds: string[];
}

export interface ArchitectureReviewViolation {
  ruleId: ReviewRuleId;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  affectedEntityIds: string[];
  remediation: string;
}

export interface ArchitectureReviewContext {
  objects: ModelObject[];
  connections: ModelConnection[];
  ownerships?: ObjectOwnership[];
  approvedExternalIds?: string[];
}

export interface ArchitectureReviewReport {
  id: string;
  verdict: ReviewVerdict;
  checklist: ReviewChecklistItem[];
  violations: ArchitectureReviewViolation[];
  summary: string;
  timestamp: string;
}

/**
 * Depth-first search cycle detection algorithm for directed graph.
 */
function findCycle(
  adjList: Map<ObjectId, ObjectId[]>
): ObjectId[] | null {
  const visited = new Set<ObjectId>();
  const recStack = new Set<ObjectId>();
  const parentMap = new Map<ObjectId, ObjectId>();

  let cycleStart: ObjectId | null = null;
  let cycleEnd: ObjectId | null = null;

  function dfs(node: ObjectId): boolean {
    visited.add(node);
    recStack.add(node);

    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        parentMap.set(neighbor, node);
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        cycleStart = neighbor;
        cycleEnd = node;
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const node of adjList.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) {
        // Reconstruct cycle path
        const cycle: ObjectId[] = [cycleStart!];
        let curr: ObjectId | null = cycleEnd;
        while (curr && curr !== cycleStart) {
          cycle.unshift(curr);
          curr = parentMap.get(curr) || null;
        }
        cycle.unshift(cycleStart!);
        return cycle;
      }
    }
  }

  return null;
}

/**
 * Runs the AI Architecture Review Agent against an architecture context.
 */
export function runArchitectureReview(
  context: ArchitectureReviewContext
): ArchitectureReviewReport {
  const { objects, connections, ownerships = [], approvedExternalIds = [] } = context;
  const now = new Date().toISOString();
  const objMap = new Map(objects.map((o) => [o.id, o]));

  const checklist: ReviewChecklistItem[] = [];
  const violations: ArchitectureReviewViolation[] = [];

  // 1. Rule: No circular dependencies
  const adjList = new Map<ObjectId, ObjectId[]>();
  for (const o of objects) {
    adjList.set(o.id, []);
  }
  for (const conn of connections) {
    if (adjList.has(conn.sourceObjectId) && objMap.has(conn.targetObjectId)) {
      adjList.get(conn.sourceObjectId)!.push(conn.targetObjectId);
    }
  }

  const cycle = findCycle(adjList);
  if (cycle && cycle.length > 0) {
    const cycleNames = cycle.map((id) => objMap.get(id)?.name || id).join(' → ');
    checklist.push({
      ruleId: 'no_circular_dependencies',
      title: 'No Circular Dependencies',
      description: 'Microservice call chains must be strictly acyclic to prevent deadlocks and cascading failures.',
      status: 'FAIL',
      details: `Circular dependency loop detected: ${cycleNames}`,
      affectedEntityIds: cycle,
    });
    violations.push({
      ruleId: 'no_circular_dependencies',
      severity: 'critical',
      message: `Circular dependency cycle detected along call chain: ${cycleNames}`,
      affectedEntityIds: cycle,
      remediation: 'Decouple tight dependency loop using an asynchronous message queue (EDA) or invert interface ownership.',
    });
  } else {
    checklist.push({
      ruleId: 'no_circular_dependencies',
      title: 'No Circular Dependencies',
      description: 'Microservice call chains must be strictly acyclic to prevent deadlocks and cascading failures.',
      status: 'PASS',
      details: 'Architecture dependency graph is completely acyclic (DAG).',
      affectedEntityIds: [],
    });
  }

function isExternalEntity(o?: ModelObject | null): boolean {
  if (!o) return false;
  return (
    o.kind === 'actor' ||
    (o.kind as string) === 'external' ||
    Boolean(o.metadata && (o.metadata.external === true || o.metadata.vendor === true))
  );
}

  // 2. Rule: Owners present
  const unownedObjects = objects.filter((o) => {
    // External actors or third parties don't require internal team ownership
    if (isExternalEntity(o)) return false;
    const hasOwnershipRecord = ownerships.some((own) => own.objectId === o.id);
    const hasMetadataOwner = Boolean(o.metadata && typeof o.metadata.owner === 'string' && o.metadata.owner.trim().length > 0);
    return !hasOwnershipRecord && !hasMetadataOwner;
  });

  if (unownedObjects.length > 0) {
    const unownedIds = unownedObjects.map((o) => o.id);
    const unownedNames = unownedObjects.map((o) => o.name).join(', ');
    checklist.push({
      ruleId: 'owners_present',
      title: 'Team Ownership Assigned',
      description: 'Every internal component and service must have a designated engineering team owner for operational accountability.',
      status: 'FAIL',
      details: `Missing team ownership on ${unownedObjects.length} component(s): ${unownedNames}`,
      affectedEntityIds: unownedIds,
    });
    violations.push({
      ruleId: 'owners_present',
      severity: 'high',
      message: `Unowned architectural components detected: ${unownedNames}`,
      affectedEntityIds: unownedIds,
      remediation: 'Assign a designated engineering team in Team Ownership settings or define an owner tag in component metadata.',
    });
  } else {
    checklist.push({
      ruleId: 'owners_present',
      title: 'Team Ownership Assigned',
      description: 'Every internal component and service must have a designated engineering team owner for operational accountability.',
      status: 'PASS',
      details: 'All internal components have designated engineering team ownership.',
      affectedEntityIds: [],
    });
  }

  // 3. Rule: No unapproved external dependencies
  const approvedSet = new Set(approvedExternalIds);
  const unapprovedExternalObjects = objects.filter((o) => {
    const isExt = (o.kind as string) === 'external' || Boolean(o.metadata && o.metadata.external === true);
    if (!isExt) return false;
    const isWhitelisted = approvedSet.has(o.id);
    const isMetadataApproved = o.metadata && o.metadata.approved === true;
    return !isWhitelisted && !isMetadataApproved;
  });

  if (unapprovedExternalObjects.length > 0) {
    const unapprovedIds = unapprovedExternalObjects.map((o) => o.id);
    const unapprovedNames = unapprovedExternalObjects.map((o) => o.name).join(', ');
    checklist.push({
      ruleId: 'no_unapproved_external_dependencies',
      title: 'Approved External Dependencies',
      description: 'All external integrations and third-party SaaS vendors must be approved by architecture and compliance governance.',
      status: 'FAIL',
      details: `Unapproved external third-party dependencies detected: ${unapprovedNames}`,
      affectedEntityIds: unapprovedIds,
    });
    violations.push({
      ruleId: 'no_unapproved_external_dependencies',
      severity: 'critical',
      message: `Unapproved external third-party systems detected in architecture: ${unapprovedNames}`,
      affectedEntityIds: unapprovedIds,
      remediation: 'Obtain security & compliance vendor clearance or add the external dependency to the organization approved vendor whitelist.',
    });
  } else {
    checklist.push({
      ruleId: 'no_unapproved_external_dependencies',
      title: 'Approved External Dependencies',
      description: 'All external integrations and third-party SaaS vendors must be approved by architecture and compliance governance.',
      status: 'PASS',
      details: 'All external systems and third-party dependencies are approved.',
      affectedEntityIds: [],
    });
  }

  // 4. Rule: Backup & Disaster Recovery (DR)
  const storesWithoutDR = objects.filter((o) => {
    if (o.kind !== 'store') return false;
    const meta = o.metadata || {};
    const hasBackup = meta.backupEnabled === true || meta.drConfigured === true || typeof meta.backupPlan === 'string';
    return !hasBackup;
  });

  if (storesWithoutDR.length > 0) {
    const storeIds = storesWithoutDR.map((o) => o.id);
    const storeNames = storesWithoutDR.map((o) => o.name).join(', ');
    checklist.push({
      ruleId: 'backup_dr_configured',
      title: 'Backup & Disaster Recovery (DR)',
      description: 'Persistent data stores must have documented backup configurations and disaster recovery plans.',
      status: 'FAIL',
      details: `Persistent store(s) missing backup/DR configuration: ${storeNames}`,
      affectedEntityIds: storeIds,
    });
    violations.push({
      ruleId: 'backup_dr_configured',
      severity: 'high',
      message: `Data stores lack documented backup & disaster recovery configurations: ${storeNames}`,
      affectedEntityIds: storeIds,
      remediation: 'Configure automated backup schedules and multi-AZ disaster recovery replication in datastore metadata.',
    });
  } else {
    checklist.push({
      ruleId: 'backup_dr_configured',
      title: 'Backup & Disaster Recovery (DR)',
      description: 'Persistent data stores must have documented backup configurations and disaster recovery plans.',
      status: 'PASS',
      details: 'All persistent data stores have verified backup and DR configurations.',
      affectedEntityIds: [],
    });
  }

  // 5. Rule: No PII to third parties
  const piiToThirdPartyConns = connections.filter((conn) => {
    const targetObj = objMap.get(conn.targetObjectId);
    const isThirdParty = isExternalEntity(targetObj);
    if (!isThirdParty) return false;

    const labelLower = (conn.label || '').toLowerCase();
    const descLower = (conn.description || '').toLowerCase();
    const hasPiiPayload =
      labelLower.includes('pii') ||
      labelLower.includes('password') ||
      labelLower.includes('ssn') ||
      labelLower.includes('credit card') ||
      descLower.includes('pii') ||
      descLower.includes('password') ||
      Boolean(conn.metadata && conn.metadata.containsPii === true);

    return hasPiiPayload;
  });

  if (piiToThirdPartyConns.length > 0) {
    const connIds = piiToThirdPartyConns.map((c) => c.id);
    checklist.push({
      ruleId: 'no_pii_to_third_parties',
      title: 'No PII Transmission to Third Parties',
      description: 'Direct transmission of customer PII, secrets, or financial records to external third-party endpoints is prohibited.',
      status: 'FAIL',
      details: `Detected ${piiToThirdPartyConns.length} connection(s) transmitting sensitive customer PII to external third parties.`,
      affectedEntityIds: connIds,
    });
    violations.push({
      ruleId: 'no_pii_to_third_parties',
      severity: 'critical',
      message: 'Direct customer PII or credential exfiltration path to external third-party detected.',
      affectedEntityIds: connIds,
      remediation: 'Tokenize or mask sensitive data at the edge before dispatching external webhooks or API requests.',
    });
  } else {
    checklist.push({
      ruleId: 'no_pii_to_third_parties',
      title: 'No PII Transmission to Third Parties',
      description: 'Direct transmission of customer PII, secrets, or financial records to external third-party endpoints is prohibited.',
      status: 'PASS',
      details: 'Zero customer PII transmission to external third-party boundaries detected.',
      affectedEntityIds: [],
    });
  }

  // Determine Verdict
  const hasFailures = checklist.some((c) => c.status === 'FAIL');
  const verdict: ReviewVerdict = hasFailures ? 'REQUEST_CHANGES' : 'APPROVE';

  const failedCount = checklist.filter((c) => c.status === 'FAIL').length;
  const passedCount = checklist.filter((c) => c.status === 'PASS').length;

  const summary = hasFailures
    ? `Architecture Review Agent verdict: REQUEST_CHANGES. Pre-merge review failed with ${failedCount} violation(s) across governance, security, and resiliency checklist rules.`
    : `Architecture Review Agent verdict: APPROVE. All ${passedCount} pre-merge architecture checklist rules passed cleanly with zero blocking violations.`;

  return {
    id: `rev_${Math.random().toString(36).substring(2, 9)}`,
    verdict,
    checklist,
    violations,
    summary,
    timestamp: now,
  };
}
