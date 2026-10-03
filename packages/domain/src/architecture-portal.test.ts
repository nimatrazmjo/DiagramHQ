import { describe, it, expect } from 'vitest';
import {
  initArchitecturePortal,
  buildPortalLevelProjection,
  drillDownPortalToObject,
  navigatePortalUp,
  inspectPortalObject,
  getDependencyHighlighting,
  zoomPortalCamera,
  panPortalCamera,
  fitPortalCameraToNodes,
  initPortalFlowPlayback,
  stepPortalFlowPlayback,
  searchArchitecturePortal,
} from './architecture-portal';
import { createId } from './ids';
import type {
  ArchitectureModel,
  Flow,
  FlowStep,
  ModelConnection,
  ModelObject,
  View,
} from './types';
import type { ArchitectureDecisionRecord } from './adrs';

function buildMockPortalModel() {
  const archId = createId('arch');

  // Hierarchy:
  // Root (Context):
  //   - sys1 (Payment System)
  //   - sys2 (Order System)
  //   - act1 (Customer Actor)
  // Inside sys1 (Container):
  //   - app1 (Payment API Gateway)
  //   - sto1 (Ledger Database)
  // Inside app1 (Component):
  //   - cmp1 (Auth Token Validator)
  //   - cmp2 (Transaction Orchestrator)

  const sys1 = createId('sys');
  const sys2 = createId('sys');
  const act1 = createId('act');
  const app1 = createId('app');
  const sto1 = createId('sto');
  const cmp1 = createId('cmp');
  const cmp2 = createId('cmp');

  const con1 = createId('con'); // act1 -> sys1
  const con2 = createId('con'); // sys1 -> sys2
  const con3 = createId('con'); // app1 -> sto1
  const con4 = createId('con'); // cmp1 -> cmp2

  const objects: ModelObject[] = [
    {
      id: sys1,
      architectureId: archId,
      versionId: createId('ver'),
      kind: 'system',
      name: 'Payment System',
      description: 'Core banking and settlement system',
      metadata: { technology: 'Java / Spring Boot', owner: 'Payments Team', sla: '99.99%' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: sys2,
      architectureId: archId,
      versionId: createId('ver'),
      kind: 'system',
      name: 'Order System',
      description: 'Order capture and fulfillment engine',
      metadata: { technology: 'Go / gRPC', owner: 'Order Team' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: act1,
      architectureId: archId,
      versionId: createId('ver'),
      kind: 'actor',
      name: 'Retail Customer',
      description: 'End-user initiating online purchases',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: app1,
      architectureId: archId,
      versionId: createId('ver'),
      kind: 'application',
      name: 'Payment API Gateway',
      description: 'Ingress reverse proxy for payment traffic',
      parentId: sys1,
      metadata: { technology: 'Kong / Node.js', owner: 'Edge Team' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: sto1,
      architectureId: archId,
      versionId: createId('ver'),
      kind: 'store',
      name: 'Ledger Database',
      description: 'PostgreSQL ACID journal',
      parentId: sys1,
      metadata: { technology: 'PostgreSQL 16', owner: 'DBA Team' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: cmp1,
      architectureId: archId,
      versionId: createId('ver'),
      kind: 'component',
      name: 'Auth Token Validator',
      description: 'Validates JWT authentication tokens',
      parentId: app1,
      metadata: { technology: 'TypeScript', owner: 'Security Team' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: cmp2,
      architectureId: archId,
      versionId: createId('ver'),
      kind: 'component',
      name: 'Transaction Orchestrator',
      description: 'Coordinates payment authorization steps',
      parentId: app1,
      metadata: { technology: 'TypeScript', owner: 'Edge Team' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const connections: ModelConnection[] = [
    {
      id: con1,
      architectureId: archId,
      versionId: createId('ver'),
      sourceObjectId: act1,
      targetObjectId: sys1,
      kind: 'sync',
      label: 'Submits payment',
      metadata: { protocol: 'HTTPS' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: con2,
      architectureId: archId,
      versionId: createId('ver'),
      sourceObjectId: sys1,
      targetObjectId: sys2,
      kind: 'sync',
      label: 'Verifies order validity',
      metadata: { protocol: 'gRPC' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: con3,
      architectureId: archId,
      versionId: createId('ver'),
      sourceObjectId: app1,
      targetObjectId: sto1,
      kind: 'sync',
      label: 'Persists journal record',
      metadata: { protocol: 'TCP / TLS' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: con4,
      architectureId: archId,
      versionId: createId('ver'),
      sourceObjectId: cmp1,
      targetObjectId: cmp2,
      kind: 'sync',
      label: 'Passes verified token payload',
      metadata: { protocol: 'In-process' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const model: ArchitectureModel = {
    architecture: {
      id: archId,
      name: 'Global Financial Platform',
      description: 'Omnichannel payment orchestration engine',
    },
    objects,
    connections,
  };

  return { model, sys1, sys2, act1, app1, sto1, cmp1, cmp2, con1, con2, con3, con4 };
}

describe('Architecture Portal Domain Engine (F095)', () => {
  describe('C4 Hierarchy & Level Projections', () => {
    it('projects top-level System Context when activeParentId is null', () => {
      const { model, sys1 } = buildMockPortalModel();
      const projection = buildPortalLevelProjection(model, null);

      expect(projection.currentLevel).toBe('context');
      expect(projection.activeParentId).toBeNull();
      expect(projection.breadcrumbs).toHaveLength(1);
      expect(projection.breadcrumbs[0]?.name).toBe('System Context');

      // Top level should show systems and actors
      expect(projection.visibleNodes.length).toBeGreaterThanOrEqual(3);
      const paymentSystemNode = projection.visibleNodes.find((n) => n.id === sys1);
      expect(paymentSystemNode).toBeDefined();
      expect(paymentSystemNode?.childCount).toBe(2); // app1 and sto1
      expect(paymentSystemNode?.inboundCount).toBe(1);
      expect(paymentSystemNode?.outboundCount).toBe(1);
    });

    it('projects Container level when drilled down into a system', () => {
      const { model, sys1, app1, sto1 } = buildMockPortalModel();
      const projection = buildPortalLevelProjection(model, sys1);

      expect(projection.currentLevel).toBe('container');
      expect(projection.activeParentId).toBe(sys1);
      expect(projection.breadcrumbs).toHaveLength(2);
      expect(projection.breadcrumbs[1]?.name).toBe('Payment System');

      // Visible nodes should be children of sys1: app1 and sto1
      expect(projection.visibleNodes).toHaveLength(2);
      expect(projection.visibleNodes.some((n) => n.id === app1)).toBe(true);
      expect(projection.visibleNodes.some((n) => n.id === sto1)).toBe(true);

      // app1 has 2 components
      const appNode = projection.visibleNodes.find((n) => n.id === app1);
      expect(appNode?.childCount).toBe(2);

      // Visible connections should show direct edge app1 -> sto1
      expect(projection.visibleEdges).toHaveLength(1);
      expect(projection.visibleEdges[0]?.sourceId).toBe(app1);
      expect(projection.visibleEdges[0]?.targetId).toBe(sto1);
    });

    it('projects Component level when drilled down into a container', () => {
      const { model, app1, cmp1, cmp2 } = buildMockPortalModel();
      const projection = buildPortalLevelProjection(model, app1);

      expect(projection.currentLevel).toBe('component');
      expect(projection.activeParentId).toBe(app1);
      expect(projection.breadcrumbs).toHaveLength(3);
      expect(projection.breadcrumbs[2]?.name).toBe('Payment API Gateway');

      // Visible nodes should be components inside app1
      expect(projection.visibleNodes).toHaveLength(2);
      expect(projection.visibleNodes.some((n) => n.id === cmp1)).toBe(true);
      expect(projection.visibleNodes.some((n) => n.id === cmp2)).toBe(true);

      // Connection cmp1 -> cmp2
      expect(projection.visibleEdges).toHaveLength(1);
      expect(projection.visibleEdges[0]?.sourceId).toBe(cmp1);
      expect(projection.visibleEdges[0]?.targetId).toBe(cmp2);
    });
  });

  describe('Portal Navigation & Lifecycle', () => {
    it('initializes portal in read-only mode with context level', () => {
      const { model } = buildMockPortalModel();
      const state = initArchitecturePortal(model);

      expect(state.isReadOnly).toBe(true);
      expect(state.architectureId).toBe(model.architecture.id);
      expect(state.drillDown.currentLevel).toBe('context');
      expect(state.selectedObjectId).toBeNull();
      expect(state.inspector).toBeNull();
      expect(state.camera.zoom).toBe(1.0);
    });

    it('drills down into system with subcomponents and updates camera', () => {
      const { model, sys1 } = buildMockPortalModel();
      const state = initArchitecturePortal(model);

      const drilled = drillDownPortalToObject(state, model, sys1);
      expect(drilled.drillDown.currentLevel).toBe('container');
      expect(drilled.drillDown.activeParentId).toBe(sys1);
      expect(drilled.drillDown.visibleNodes).toHaveLength(2);
    });

    it('navigates back up to root context using breadcrumbs', () => {
      const { model, sys1 } = buildMockPortalModel();
      const state = initArchitecturePortal(model);

      const drilled = drillDownPortalToObject(state, model, sys1);
      expect(drilled.drillDown.currentLevel).toBe('container');

      const ascended = navigatePortalUp(drilled, model, 0);
      expect(ascended.drillDown.currentLevel).toBe('context');
      expect(ascended.drillDown.activeParentId).toBeNull();
    });
  });

  describe('Object Inspector & Dependency Highlighting', () => {
    it('gathers comprehensive inspection metadata for a model object', () => {
      const { model, sys1, sys2, act1 } = buildMockPortalModel();

      const adr: ArchitectureDecisionRecord = {
        id: createId('dec'),
        number: 1,
        title: 'Use gRPC for Inter-System Calls',
        status: 'accepted',
        context: 'Low latency requirement.',
        decision: 'Adopt gRPC with protobuf schemas.',
        consequences: 'Requires gRPC gateway for browser clients.',
        alternatives: [],
        attachments: [{ targetType: 'object', targetId: sys1, attachedAt: '2026-09-01' }],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      const inspector = inspectPortalObject(model, sys1, { adrs: [adr] });

      expect(inspector).toBeDefined();
      expect(inspector?.object.id).toBe(sys1);
      expect(inspector?.object.technology).toBe('Java / Spring Boot');
      expect(inspector?.object.sla).toBe('99.99%');

      // Inbound callers: Retail Customer (act1)
      expect(inspector?.inboundDependencies).toHaveLength(1);
      expect(inspector?.inboundDependencies[0]?.source.id).toBe(act1);
      expect(inspector?.inboundDependencies[0]?.label).toBe('Submits payment');

      // Outbound downstream: Order System (sys2)
      expect(inspector?.outboundDependencies).toHaveLength(1);
      expect(inspector?.outboundDependencies[0]?.target.id).toBe(sys2);
      expect(inspector?.outboundDependencies[0]?.label).toBe('Verifies order validity');

      // Contained subcomponents: app1, sto1
      expect(inspector?.children).toHaveLength(2);

      // Associated ADRs
      expect(inspector?.associatedAdrs).toHaveLength(1);
      expect(inspector?.associatedAdrs[0]?.title).toBe('Use gRPC for Inter-System Calls');
    });

    it('calculates upstream and downstream dependency highlighting IDs', () => {
      const { model, sys1, sys2, act1, con1, con2 } = buildMockPortalModel();
      const highlight = getDependencyHighlighting(model, sys1);

      expect(highlight.selectedObjectId).toBe(sys1);
      expect(highlight.upstreamNodeIds).toEqual([act1]);
      expect(highlight.downstreamNodeIds).toEqual([sys2]);
      expect(highlight.activeConnectionIds).toEqual([con1, con2]);
    });
  });

  describe('Camera Navigation Controls', () => {
    it('clamps zoom between min and max bounds', () => {
      const camera = { x: 0, y: 0, zoom: 1.0 };

      const z1 = zoomPortalCamera(camera, 0.5);
      expect(z1.zoom).toBe(1.5);

      // Zoom out clamped to min 0.2
      const zMin = zoomPortalCamera(camera, -1.5);
      expect(zMin.zoom).toBe(0.2);

      // Zoom in clamped to max 3.0
      const zMax = zoomPortalCamera(camera, 5.0);
      expect(zMax.zoom).toBe(3.0);
    });

    it('pans camera by delta offsets', () => {
      const camera = { x: 100, y: 50, zoom: 1.0 };
      const panned = panPortalCamera(camera, -25, 40);

      expect(panned.x).toBe(75);
      expect(panned.y).toBe(90);
    });

    it('fits camera view to bounding box of visible nodes', () => {
      const nodes = [
        {
          id: createId('sys'),
          name: 'A',
          kind: 'system' as const,
          childCount: 0,
          inboundCount: 0,
          outboundCount: 0,
          position: { x: 0, y: 0, width: 200, height: 100 },
        },
        {
          id: createId('sys'),
          name: 'B',
          kind: 'system' as const,
          childCount: 0,
          inboundCount: 0,
          outboundCount: 0,
          position: { x: 400, y: 200, width: 200, height: 100 },
        },
      ];

      const fitted = fitPortalCameraToNodes(nodes, 1000, 600);
      expect(fitted.zoom).toBeGreaterThan(0.2);
      expect(fitted.zoom).toBeLessThanOrEqual(1.2);
    });
  });

  describe('Execution Flow Playback', () => {
    it('plays back flow steps sequentially with active step details', () => {
      const { sys1, sys2, con2 } = buildMockPortalModel();

      const flow: Flow = {
        id: createId('flw'),
        architectureId: createId('arch'),
        name: 'Order Verification Flow',
        type: 'sequence',
        description: 'Synchronous cross-system verification',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const steps: FlowStep[] = [
        {
          id: 'step-1',
          flowId: flow.id,
          stepIndex: 0,
          connectionId: con2,
          note: 'Payment core invokes order service to confirm line items',
        },
      ];

      const connections: ModelConnection[] = [
        {
          id: con2,
          architectureId: flow.architectureId,
          versionId: createId('ver'),
          sourceObjectId: sys1,
          targetObjectId: sys2,
          kind: 'sync',
          label: 'Verifies order validity',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const playback = initPortalFlowPlayback(flow, steps, connections);
      expect(playback.flowName).toBe('Order Verification Flow');
      expect(playback.totalSteps).toBe(1);
      expect(playback.currentStepIndex).toBe(0);
      expect(playback.activeStep?.sourceId).toBe(sys1);
      expect(playback.activeStep?.targetId).toBe(sys2);
      expect(playback.activeStep?.note).toContain('confirm line items');

      // Step forward
      const stepped = stepPortalFlowPlayback(playback, 1, steps, connections);
      expect(stepped.currentStepIndex).toBe(0); // clamped to max step
    });
  });

  describe('Global Portal Search', () => {
    it('finds objects, views, flows, and ADRs with direct jump targets', () => {
      const { model, app1, sys1 } = buildMockPortalModel();

      const view: View = {
        id: createId('vw'),
        architectureId: model.architecture.id,
        name: 'Payment Core Container View',
        kind: 'container',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const flow: Flow = {
        id: createId('flw'),
        architectureId: model.architecture.id,
        name: 'Instant Wire Transfer Flow',
        type: 'sequence',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const adr: ArchitectureDecisionRecord = {
        id: createId('dec'),
        number: 42,
        title: 'Adopt PostgreSQL for Ledger Storage',
        status: 'accepted',
        context: 'ACID requirements',
        decision: 'PostgreSQL',
        consequences: 'High consistency',
        alternatives: [],
        attachments: [],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      // Search for nested object (Payment API Gateway)
      const resObj = searchArchitecturePortal(model, 'Payment API Gateway', {
        views: [view],
        flows: [flow],
        adrs: [adr],
      });

      expect(resObj.length).toBeGreaterThan(0);
      expect(resObj[0]?.title).toBe('Payment API Gateway');
      expect(resObj[0]?.targetObjectId).toBe(app1);
      expect(resObj[0]?.targetParentId).toBe(sys1);
      expect(resObj[0]?.level).toBe('container');

      // Search for View
      const resView = searchArchitecturePortal(model, 'Container View', {
        views: [view],
      });
      expect(resView.some((r) => r.type === 'view')).toBe(true);

      // Search for Flow
      const resFlow = searchArchitecturePortal(model, 'Wire Transfer', {
        flows: [flow],
      });
      expect(resFlow.some((r) => r.type === 'flow')).toBe(true);

      // Search for ADR
      const resAdr = searchArchitecturePortal(model, 'PostgreSQL', {
        adrs: [adr],
      });
      expect(resAdr.some((r) => r.type === 'adr')).toBe(true);
    });
  });
});
