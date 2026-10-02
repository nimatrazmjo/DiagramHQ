import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  explainArchitectureAtAltitude,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
  type FlowId,
  type DecisionId,
  type ModelObject,
  type ModelConnection,
  type FlowWithSteps,
  type ArchitectureDecisionRecord,
} from '@diagramhq/domain';
import {
  AltitudeSelector,
  ArchitectureExplanationPanel,
} from './components/canvas/architecture-explanation-panel';

describe('AI Architecture Explanation Integration & UI (F065)', () => {
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  const edgeGateway: ModelObject = {
    id: 'app-gateway' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Edge API Gateway',
    kind: 'application',
    position: { x: 100, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const authService: ModelObject = {
    id: 'app-auth' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Authentication Service',
    kind: 'application',
    position: { x: 300, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const gwAuthConn: ModelConnection = {
    id: 'con-gw-auth' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: edgeGateway.id,
    targetObjectId: authService.id,
    label: 'Authorize JWT',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const flowId = 'flw-login' as FlowId;
  const loginFlow: FlowWithSteps = {
    id: flowId,
    architectureId: archId,
    name: 'User Authentication Flow',
    description: 'Login validation and token issuance',
    steps: [
      {
        id: 'flw-s1',
        flowId,
        stepIndex: 1,
        connectionId: gwAuthConn.id,
        note: 'Ingress authentication request',
      },
    ],
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const adrId = 'adr-001' as DecisionId;
  const authADR: ArchitectureDecisionRecord = {
    id: adrId,
    number: 1,
    title: 'Adopt Stateless JWT for Edge Authentication',
    status: 'accepted',
    context: 'Scale requirements dictate stateless edge verification.',
    decision: 'Edge Gateway validates RSA-signed JWTs.',
    consequences: 'Improves response time by 80ms.',
    alternatives: ['Stateful sessions'],
    attachments: [
      { targetId: edgeGateway.id, targetType: 'object', attachedAt: '2026-10-01T00:00:00Z' },
    ],
    author: { id: 'usr-1', name: 'Chief Architect' },
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const context = {
    objects: [edgeGateway, authService],
    connections: [gwAuthConn],
    flows: [loginFlow],
    adrs: [authADR],
  };

  it('1. Acceptance Test: Explain a system/flow/decision at a chosen altitude (engineer -> CTO) referencing real objects', () => {
    // Engineer altitude
    const engExpl = explainArchitectureAtAltitude({
      target: { kind: 'object', objectId: edgeGateway.id },
      altitude: 'engineer',
      context,
    });
    expect(engExpl.altitude).toBe('engineer');
    expect(engExpl.citedObjects.some((o) => o.id === edgeGateway.id)).toBe(true);

    // Architect altitude
    const archExpl = explainArchitectureAtAltitude({
      target: { kind: 'flow', flowId: loginFlow.id },
      altitude: 'architect',
      context,
    });
    expect(archExpl.altitude).toBe('architect');
    expect(archExpl.citedObjects.some((o) => o.id === edgeGateway.id)).toBe(true);

    // Executive altitude
    const execExpl = explainArchitectureAtAltitude({
      target: { kind: 'adr', adrId: authADR.id },
      altitude: 'executive',
      context,
    });
    expect(execExpl.altitude).toBe('executive');
    expect(execExpl.citedObjects.some((o) => o.id === edgeGateway.id)).toBe(true);
  });

  it('2. renders <AltitudeSelector /> with engineer, architect, and executive options', () => {
    const onChange = vi.fn();
    const html = renderToString(
      <AltitudeSelector
        currentAltitude="architect"
        onChangeAltitude={onChange}
      />
    );

    expect(html).toContain('Engineer / Tech Lead');
    expect(html).toContain('Solutions / Enterprise Architect');
    expect(html).toContain('Executive / CTO');
  });

  it('3. renders <ArchitectureExplanationPanel /> in open and closed states with citations', () => {
    const onClose = vi.fn();
    const onChangeAltitude = vi.fn();

    const expl = explainArchitectureAtAltitude({
      target: { kind: 'object', objectId: edgeGateway.id },
      altitude: 'engineer',
      context,
    });

    // Open
    const openHtml = renderToString(
      <ArchitectureExplanationPanel
        isOpen={true}
        onClose={onClose}
        explanation={expl}
        currentAltitude="engineer"
        onChangeAltitude={onChangeAltitude}
      />
    );

    expect(openHtml).toContain('Architecture Explanation');
    expect(openHtml).toContain('Technical Deep-Dive: Edge API Gateway');
    expect(openHtml).toContain('Grounded Entity Citations');
    expect(openHtml).toContain('app-gateway');
    expect(openHtml).toContain('con-gw-auth');

    // Closed
    const closedHtml = renderToString(
      <ArchitectureExplanationPanel
        isOpen={false}
        onClose={onClose}
        explanation={expl}
        currentAltitude="engineer"
        onChangeAltitude={onChangeAltitude}
      />
    );
    expect(closedHtml).toBe('');
  });
});
