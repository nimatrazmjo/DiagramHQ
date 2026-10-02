import { describe, it, expect } from 'vitest';
import {
  computeArchitecturalImpact,
  generateAIImpactNarrative,
  analyzeAndNarrateImpact,
} from './ai-impact';
import type {
  ArchitectureId,
  VersionId,
  ObjectId,
  ConnectionId,
  FlowId,
  TeamId,
  OrgId,
} from './ids';
import type { ModelObject, ModelConnection, FlowWithSteps } from './types';
import type { Team, ObjectOwnership } from './teams';

describe('AI Architecture Impact Analysis (F066)', () => {
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;
  const orgId = 'org-test' as OrgId;

  // Topology: Client (user) -> Gateway -> Auth Service -> Postgres DB
  //                                    \-> Billing API
  const clientUser: ModelObject = {
    id: 'usr-client' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Web Client',
    kind: 'actor',
    position: { x: 100, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const edgeGateway: ModelObject = {
    id: 'app-gateway' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Edge API Gateway',
    kind: 'application',
    position: { x: 300, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const authService: ModelObject = {
    id: 'app-auth' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Authentication Service',
    kind: 'application',
    position: { x: 500, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const postgresDb: ModelObject = {
    id: 'sto-db' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Primary Database',
    kind: 'store',
    position: { x: 700, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const billingService: ModelObject = {
    id: 'app-billing' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Billing Service',
    kind: 'application',
    position: { x: 500, y: 250 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const connClientGw: ModelConnection = {
    id: 'con-client-gw' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: clientUser.id,
    targetObjectId: edgeGateway.id,
    label: 'HTTPS',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const connGwAuth: ModelConnection = {
    id: 'con-gw-auth' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: edgeGateway.id,
    targetObjectId: authService.id,
    label: 'gRPC Auth',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const connAuthDb: ModelConnection = {
    id: 'con-auth-db' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: authService.id,
    targetObjectId: postgresDb.id,
    label: 'SQL Query',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const connGwBilling: ModelConnection = {
    id: 'con-gw-billing' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: edgeGateway.id,
    targetObjectId: billingService.id,
    label: 'Charge API',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const checkoutFlow: FlowWithSteps = {
    id: 'flw-checkout' as FlowId,
    architectureId: archId,
    name: 'Customer Checkout Flow',
    description: 'User purchase journey',
    steps: [
      { id: 's1', flowId: 'flw-checkout' as FlowId, stepIndex: 1, connectionId: connClientGw.id },
      { id: 's2', flowId: 'flw-checkout' as FlowId, stepIndex: 2, connectionId: connGwBilling.id },
    ],
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const platformTeam: Team = {
    id: 'team-platform' as TeamId,
    orgId,
    name: 'Platform Engineering',
    slug: 'platform-engineering',
    memberUserIds: ['u1'],
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const authOwnership: ObjectOwnership = {
    objectId: authService.id,
    primaryTeamId: platformTeam.id,
    updatedAt: new Date('2026-10-01'),
  };

  const context = {
    objects: [clientUser, edgeGateway, authService, postgresDb, billingService],
    connections: [connClientGw, connGwAuth, connAuthDb, connGwBilling],
    flows: [checkoutFlow],
    teams: [platformTeam],
    ownerships: [authOwnership],
  };

  it('1. Acceptance Test: Select an object -> direct/indirect deps, affected flows/teams, critical paths, and AI narrative matches computed set', () => {
    // Select Auth Service:
    // Direct dependent: Edge Gateway (points to Auth)
    // Indirect dependent: Web Client (points to Gateway which points to Auth)
    // Direct dependency: Postgres DB (Auth points to Postgres)
    const { impact, narrative } = analyzeAndNarrateImpact(authService.id, context);

    // 1. Structural assertions
    expect(impact.targetObject.id).toBe(authService.id);
    expect(impact.directDependents.some((d) => d.id === edgeGateway.id)).toBe(true);
    expect(impact.indirectDependents.some((d) => d.id === clientUser.id)).toBe(true);
    expect(impact.directDependencies.some((d) => d.id === postgresDb.id)).toBe(true);
    expect(impact.metrics.directDependentsCount).toBe(1);
    expect(impact.metrics.indirectDependentsCount).toBe(1);
    expect(impact.metrics.totalBlastRadiusCount).toBe(2);

    // Stakeholder team
    expect(impact.affectedTeams.some((t) => t.teamName === 'Platform Engineering')).toBe(true);

    // 2. AI narrative invariant check: AI impact matches the computed set
    expect(narrative.title).toContain('Authentication Service');
    expect(narrative.executiveSummary).toContain('1 dependent(s)');
    expect(narrative.executiveSummary).toContain('1 indirect dependent(s)');
    expect(narrative.breakdown.blastRadiusAnalysis).toContain('Edge API Gateway');
    expect(narrative.breakdown.blastRadiusAnalysis).toContain('Web Client');
    expect(narrative.breakdown.teamStakeholders).toContain('Platform Engineering');
  });

  it('2. assesses critical paths when a dependent has no alternative routing', () => {
    // Gateway has connGwAuth and connGwBilling, but let's test Postgres DB where Auth is only inbound
    const dbImpact = computeArchitecturalImpact(postgresDb.id, context);

    // Auth Service only connects to Postgres DB, so Auth is an exclusive caller
    expect(dbImpact.criticalPaths.length).toBeGreaterThanOrEqual(1);
    const critical = dbImpact.criticalPaths[0];
    expect(critical?.dependentObjectId).toBe(authService.id);
    expect(critical?.rationale).toContain('Single point of failure');

    const narrative = generateAIImpactNarrative(dbImpact);
    expect(narrative.breakdown.criticalPathRisks).toContain('Single Point of Failure');
    expect(narrative.recommendedActions.some((a) => a.includes('circuit breakers'))).toBe(true);
  });

  it('3. leaf / actor node produces low risk and 0 dependents', () => {
    const clientImpact = computeArchitecturalImpact(clientUser.id, context);

    expect(clientImpact.riskLevel).toBe('low');
    expect(clientImpact.metrics.directDependentsCount).toBe(0);
    expect(clientImpact.metrics.indirectDependentsCount).toBe(0);

    const narrative = generateAIImpactNarrative(clientImpact);
    expect(narrative.recommendedActions.some((a) => a.includes('Customer Checkout Flow'))).toBe(true);

    // Completely isolated node
    const isolatedNode: ModelObject = {
      id: 'app-isolated' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Isolated Worker',
      kind: 'application',
      position: { x: 0, y: 0 },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };
    const isolatedImpact = computeArchitecturalImpact(isolatedNode.id, {
      ...context,
      objects: [...context.objects, isolatedNode],
    });
    const isolatedNarrative = generateAIImpactNarrative(isolatedImpact);
    expect(isolatedNarrative.recommendedActions[0]).toContain('Standard deployment review');
  });

  it('4. throws when target object is not found', () => {
    expect(() =>
      computeArchitecturalImpact('non-existent' as ObjectId, context)
    ).toThrow("Cannot compute impact: Object with ID 'non-existent' not found");
  });
});
