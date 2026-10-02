import { describe, it, expect } from 'vitest';
import {
  explainArchitectureAtAltitude,
} from './ai-explanation';
import type {
  ArchitectureId,
  VersionId,
  ObjectId,
  ConnectionId,
  FlowId,
  DecisionId,
} from './ids';
import type { ModelObject, ModelConnection, FlowWithSteps } from './types';
import type { ArchitectureDecisionRecord } from './adrs';

describe('AI Architecture Explanation (F065)', () => {
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

  const dbStore: ModelObject = {
    id: 'sto-db' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Postgres DB',
    kind: 'store',
    position: { x: 500, y: 100 },
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

  const authDbConn: ModelConnection = {
    id: 'con-auth-db' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: authService.id,
    targetObjectId: dbStore.id,
    label: 'Query Accounts',
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
      {
        id: 'flw-s2',
        flowId,
        stepIndex: 2,
        connectionId: authDbConn.id,
        note: 'Read credential hash from DB',
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
    decision: 'Edge Gateway validates RSA-signed JWTs without synchronous DB calls.',
    consequences: 'Improves response time by 80ms; revocation requires short expiration.',
    alternatives: ['Stateful server-side sessions', 'Opaque Redis tokens'],
    attachments: [
      { targetId: edgeGateway.id, targetType: 'object', attachedAt: '2026-10-01T00:00:00Z' },
      { targetId: authService.id, targetType: 'object', attachedAt: '2026-10-01T00:00:00Z' },
    ],
    author: { id: 'usr-1', name: 'Chief Architect' },
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const context = {
    objects: [edgeGateway, authService, dbStore],
    connections: [gwAuthConn, authDbConn],
    flows: [loginFlow],
    adrs: [authADR],
  };

  it('1. Acceptance Test: Explain a system/flow/decision at chosen altitude (engineer -> CTO) and references real objects', () => {
    // 1. Engineer altitude explanation of a component
    const engExpl = explainArchitectureAtAltitude({
      target: { kind: 'object', objectId: edgeGateway.id },
      altitude: 'engineer',
      context,
    });

    expect(engExpl.altitude).toBe('engineer');
    expect(engExpl.targetId).toBe(edgeGateway.id);
    expect(engExpl.targetName).toBe('Edge API Gateway');
    expect(engExpl.citedObjects.some((o) => o.id === edgeGateway.id)).toBe(true);
    expect(engExpl.citedObjects.some((o) => o.id === authService.id)).toBe(true);
    expect(engExpl.citedConnections.some((c) => c.id === gwAuthConn.id)).toBe(true);
    // Verifies textual grounding in real IDs
    const engCombinedText = JSON.stringify(engExpl.sections);
    expect(engCombinedText).toContain('app-auth');
    expect(engCombinedText).toContain('con-gw-auth');

    // 2. Architect altitude explanation of a flow
    const archExpl = explainArchitectureAtAltitude({
      target: { kind: 'flow', flowId: loginFlow.id },
      altitude: 'architect',
      context,
    });

    expect(archExpl.altitude).toBe('architect');
    expect(archExpl.targetId).toBe(loginFlow.id);
    expect(archExpl.citedObjects.some((o) => o.id === edgeGateway.id)).toBe(true);
    expect(archExpl.citedObjects.some((o) => o.id === authService.id)).toBe(true);
    expect(archExpl.citedObjects.some((o) => o.id === dbStore.id)).toBe(true);

    // 3. Executive (CTO) altitude explanation of an ADR decision
    const ctoExpl = explainArchitectureAtAltitude({
      target: { kind: 'adr', adrId: authADR.id },
      altitude: 'executive',
      context,
    });

    expect(ctoExpl.altitude).toBe('executive');
    expect(ctoExpl.targetId).toBe(authADR.id);
    expect(ctoExpl.title).toContain('EXECUTIVE');
    expect(ctoExpl.citedObjects.some((o) => o.id === edgeGateway.id)).toBe(true);
    expect(ctoExpl.citedObjects.some((o) => o.id === authService.id)).toBe(true);
    const ctoText = JSON.stringify(ctoExpl.sections);
    expect(ctoText).toContain('app-gateway');
  });

  it('2. flow explanation at engineer altitude walks steps in order and cites each connection', () => {
    const flowExpl = explainArchitectureAtAltitude({
      target: { kind: 'flow', flowId: loginFlow.id },
      altitude: 'engineer',
      context,
    });

    expect(flowExpl.sections).toHaveLength(2);
    expect(flowExpl.sections[0]?.title).toContain('Step 1');
    expect(flowExpl.sections[0]?.content).toContain('con-gw-auth');
    expect(flowExpl.sections[1]?.title).toContain('Step 2');
    expect(flowExpl.sections[1]?.content).toContain('con-auth-db');
  });

  it('3. overall architecture explanation generates structured sections with real objects', () => {
    const overallExpl = explainArchitectureAtAltitude({
      target: { kind: 'architecture' },
      altitude: 'executive',
      context,
    });

    expect(overallExpl.targetKind).toBe('architecture');
    expect(overallExpl.citedObjects).toHaveLength(3);
    expect(overallExpl.citedConnections).toHaveLength(2);
  });

  it('4. throws when target object or flow is missing, or altitude is invalid', () => {
    expect(() =>
      explainArchitectureAtAltitude({
        target: { kind: 'object', objectId: 'missing-obj' as ObjectId },
        altitude: 'engineer',
        context,
      })
    ).toThrow("Cannot find object with ID 'missing-obj' to explain");

    expect(() =>
      explainArchitectureAtAltitude({
        target: { kind: 'flow', flowId: 'missing-flow' as FlowId },
        altitude: 'engineer',
        context,
      })
    ).toThrow("Cannot find flow with ID 'missing-flow' to explain");

    expect(() =>
      explainArchitectureAtAltitude({
        target: { kind: 'architecture' },
        // @ts-expect-error Testing invalid altitude input
        altitude: 'intern',
        context,
      })
    ).toThrow("Invalid audience altitude: 'intern'");
  });
});
