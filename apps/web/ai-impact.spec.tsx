import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  analyzeAndNarrateImpact,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
  type FlowId,
  type TeamId,
  type OrgId,
  type ModelObject,
  type ModelConnection,
  type FlowWithSteps,
  type Team,
  type ObjectOwnership,
} from '@diagramhq/domain';
import {
  ImpactMetricsBadge,
  AIImpactDrawer,
} from './components/canvas/ai-impact-drawer';

describe('AI Architecture Impact Analysis Integration & UI (F066)', () => {
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;
  const orgId = 'org-test' as OrgId;

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

  const authFlow: FlowWithSteps = {
    id: 'flw-auth' as FlowId,
    architectureId: archId,
    name: 'Token Validation Flow',
    description: 'Validates tokens across edge and auth',
    steps: [
      { id: 's1', flowId: 'flw-auth' as FlowId, stepIndex: 1, connectionId: connClientGw.id },
      { id: 's2', flowId: 'flw-auth' as FlowId, stepIndex: 2, connectionId: connGwAuth.id },
    ],
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const securityTeam: Team = {
    id: 'team-security' as TeamId,
    orgId,
    name: 'Security Core Team',
    slug: 'security-core-team',
    memberUserIds: ['u-sec'],
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const authOwnership: ObjectOwnership = {
    objectId: authService.id,
    primaryTeamId: securityTeam.id,
    updatedAt: new Date('2026-10-01'),
  };

  const context = {
    objects: [clientUser, edgeGateway, authService],
    connections: [connClientGw, connGwAuth],
    flows: [authFlow],
    teams: [securityTeam],
    ownerships: [authOwnership],
  };

  it('1. Acceptance Test: Select an object -> direct/indirect deps, affected flows/teams, critical paths, and AI narrative matches computed set', () => {
    const { impact, narrative } = analyzeAndNarrateImpact(authService.id, context);

    // Direct dependent: Edge Gateway
    expect(impact.directDependents.some((d) => d.id === edgeGateway.id)).toBe(true);
    // Indirect dependent: Web Client
    expect(impact.indirectDependents.some((d) => d.id === clientUser.id)).toBe(true);
    // Affected flow
    expect(impact.affectedFlows.some((f) => f.id === authFlow.id)).toBe(true);
    // Affected team
    expect(impact.affectedTeams.some((t) => t.teamName === 'Security Core Team')).toBe(true);

    // Verifies AI narrative matches computed impact
    expect(narrative.title).toContain('Authentication Service');
    expect(narrative.executiveSummary).toContain('1 dependent(s)');
    expect(narrative.executiveSummary).toContain('1 indirect dependent(s)');
    expect(narrative.breakdown.blastRadiusAnalysis).toContain('Edge API Gateway');
    expect(narrative.breakdown.blastRadiusAnalysis).toContain('Web Client');
    expect(narrative.breakdown.flowDisruptions).toContain('Token Validation Flow');
    expect(narrative.breakdown.teamStakeholders).toContain('Security Core Team');
  });

  it('2. renders <ImpactMetricsBadge /> for various risk levels', () => {
    const htmlCrit = renderToString(
      <ImpactMetricsBadge riskLevel="critical" totalBlastRadius={8} />
    );
    expect(htmlCrit).toContain('Critical Blast Radius');
    expect(htmlCrit).toContain('(8 affected)');

    const htmlLow = renderToString(
      <ImpactMetricsBadge riskLevel="low" totalBlastRadius={0} />
    );
    expect(htmlLow).toContain('Low Risk');
    expect(htmlLow).toContain('(0 affected)');
  });

  it('3. renders <AIImpactDrawer /> in open and closed states with AI narrative breakdown', () => {
    const { impact, narrative } = analyzeAndNarrateImpact(authService.id, context);
    const onClose = vi.fn();
    const onSelect = vi.fn();

    // Open
    const openHtml = renderToString(
      <AIImpactDrawer
        isOpen={true}
        onClose={onClose}
        impact={impact}
        narrative={narrative}
        onSelectEntity={onSelect}
      />
    );

    expect(openHtml).toContain('AI Impact &amp; Blast Radius Analysis');
    expect(openHtml).toContain('Target Component');
    expect(openHtml).toContain('Authentication Service');
    expect(openHtml).toContain('AI Synthesized Narrative');
    expect(openHtml).toContain('Impacted Entity Catalog');
    expect(openHtml).toContain('Edge API Gateway');
    expect(openHtml).toContain('Web Client');

    // Closed
    const closedHtml = renderToString(
      <AIImpactDrawer
        isOpen={false}
        onClose={onClose}
        impact={impact}
        narrative={narrative}
      />
    );
    expect(closedHtml).toBe('');
  });
});
