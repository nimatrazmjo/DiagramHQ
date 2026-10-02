/**
 * F047 — API flows — integration spec.
 *
 * Verifies acceptance criteria from PHASE-05-FLOWS.md:
 * - API-request flow type (`kind: 'api_flow'`, HTTP method, endpoint, request/response schema, status code).
 * - Sequence diagram exporter: export API flow sequence to Mermaid sequence diagram syntax and PlantUML.
 * - Test: an API flow exports to Mermaid and plays back.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  createId,
  createArchitectureModel,
  addModelObject,
  addModelConnection,
  createApiFlow,
  annotateApiFlowStep,
  exportFlowToMermaidSequence,
  exportFlowToPlantUMLSequence,
  projectFlowToCanvas,
  createFlowPlayback,
  nextFlowStep,
  playFlow,
  getApiFlowPlaybackStepInfo,
  type Architecture,
  type Version,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
} from '@diagramhq/domain';
import { ApiFlowOverlay } from './components/canvas/api-flow-overlay';

describe('F047 — API flows (Web / Integration)', () => {
  const archId = createId('arch') as ArchitectureId;
  const wsId = createId('ws') as WorkspaceId;
  const verId = createId('ver') as VersionId;
  const NOW = new Date('2026-01-01T00:00:00Z');

  const arch: Architecture = {
    id: archId,
    workspaceId: wsId,
    name: 'E-Commerce Platform',
    createdAt: NOW,
    updatedAt: NOW,
  };

  const ver: Version = {
    id: verId,
    architectureId: archId,
    name: 'main',
    kind: 'main',
    status: 'approved',
    createdAt: NOW,
  };

  // Model: Customer (Actor) -> API Gateway (App) -> Orders Service (App) -> Postgres Database (Store)
  const customerId = createId('act') as ObjectId;
  const gatewayId = createId('app') as ObjectId;
  const ordersServiceId = createId('app') as ObjectId;
  const databaseId = createId('sto') as ObjectId;

  let model = createArchitectureModel(arch, ver);
  model = addModelObject(model, {
    id: customerId,
    architectureId: archId,
    versionId: verId,
    name: 'Shopper',
    kind: 'actor',
    createdAt: NOW,
    updatedAt: NOW,
  });
  model = addModelObject(model, {
    id: gatewayId,
    architectureId: archId,
    versionId: verId,
    name: 'Edge API Gateway',
    kind: 'application',
    createdAt: NOW,
    updatedAt: NOW,
  });
  model = addModelObject(model, {
    id: ordersServiceId,
    architectureId: archId,
    versionId: verId,
    name: 'Order Processing Service',
    kind: 'application',
    createdAt: NOW,
    updatedAt: NOW,
  });
  model = addModelObject(model, {
    id: databaseId,
    architectureId: archId,
    versionId: verId,
    name: 'Orders Relational DB',
    kind: 'store',
    createdAt: NOW,
    updatedAt: NOW,
  });

  // Connections
  const conn1Id = createId('con') as ConnectionId;
  const conn2Id = createId('con') as ConnectionId;
  const conn3Id = createId('con') as ConnectionId;

  model = addModelConnection(model, {
    id: conn1Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: customerId,
    targetObjectId: gatewayId,
    kind: 'sync',
    description: 'HTTPS JSON API',
    createdAt: NOW,
    updatedAt: NOW,
  });
  model = addModelConnection(model, {
    id: conn2Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: gatewayId,
    targetObjectId: ordersServiceId,
    kind: 'sync',
    description: 'gRPC Command',
    createdAt: NOW,
    updatedAt: NOW,
  });
  model = addModelConnection(model, {
    id: conn3Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: ordersServiceId,
    targetObjectId: databaseId,
    kind: 'data',
    description: 'SQL Write Transaction',
    createdAt: NOW,
    updatedAt: NOW,
  });

  const sampleApiFlow = createApiFlow(
    {
      architectureId: archId,
      name: 'Create Order Request',
      endpoint: '/api/v1/orders',
      httpMethod: 'POST',
      statusCode: 201,
      requestSchema: '{"items":[{"sku":"ABC","qty":2}],"currency":"USD"}',
      responseSchema: '{"orderId":"ord_99","status":"confirmed"}',
      steps: [
        {
          connectionId: conn1Id,
          endpoint: '/api/v1/orders',
          httpMethod: 'POST',
          statusCode: 201,
          requestSchema: '{"items":[{"sku":"ABC","qty":2}],"currency":"USD"}',
          note: 'Customer initiates order checkout',
        },
        {
          connectionId: conn2Id,
          endpoint: '/orders.OrderService/CreateOrder',
          httpMethod: 'POST',
          statusCode: 200,
          note: 'Gateway forwards to order service',
        },
        {
          connectionId: conn3Id,
          endpoint: 'INSERT INTO orders',
          httpMethod: 'POST',
          statusCode: 200,
          responseSchema: '{"orderId":"ord_99"}',
          note: 'Store order in Postgres',
        },
      ],
    },
    model.connections,
  );

  it('1. instantiates an API flow with full request/response schemas and endpoints', () => {
    expect(sampleApiFlow.type).toBe('api_flow');
    expect(sampleApiFlow.name).toBe('Create Order Request');
    expect(sampleApiFlow.endpoint).toBe('/api/v1/orders');
    expect(sampleApiFlow.httpMethod).toBe('POST');
    expect(sampleApiFlow.statusCode).toBe(201);
    expect(sampleApiFlow.steps).toHaveLength(3);
    expect(sampleApiFlow.steps[0]?.endpoint).toBe('/api/v1/orders');
    expect(sampleApiFlow.steps[1]?.endpoint).toBe('/orders.OrderService/CreateOrder');

    const updatedStep = annotateApiFlowStep(sampleApiFlow.steps[0]!, {
      statusCode: 200,
      note: 'Updated step note',
    });
    expect(updatedStep.statusCode).toBe(200);
    expect(updatedStep.note).toBe('Updated step note');
  });

  it('2. plays back an API flow step by step and tracks playback metadata', () => {
    let playback = createFlowPlayback(sampleApiFlow);
    expect(playback.isPlaying).toBe(false);
    expect(playback.currentStepIndex).toBe(0);

    playback = playFlow(playback);
    expect(playback.isPlaying).toBe(true);

    const step1Info = getApiFlowPlaybackStepInfo(sampleApiFlow, playback);
    expect(step1Info).not.toBeNull();
    expect(step1Info?.stepNumber).toBe(1);
    expect(step1Info?.stepHttpMethod).toBe('POST');
    expect(step1Info?.stepEndpoint).toBe('/api/v1/orders');
    expect(step1Info?.stepStatusCode).toBe(201);
    expect(step1Info?.note).toBe('Customer initiates order checkout');
    expect(step1Info?.stepRequestSchema).toContain('ABC');

    playback = nextFlowStep(playback);
    expect(playback.currentStepIndex).toBe(1);
    const step2Info = getApiFlowPlaybackStepInfo(sampleApiFlow, playback);
    expect(step2Info?.stepNumber).toBe(2);
    expect(step2Info?.stepEndpoint).toBe('/orders.OrderService/CreateOrder');

    playback = nextFlowStep(playback);
    expect(playback.currentStepIndex).toBe(2);
    const step3Info = getApiFlowPlaybackStepInfo(sampleApiFlow, playback);
    expect(step3Info?.stepNumber).toBe(3);
    expect(step3Info?.stepEndpoint).toBe('INSERT INTO orders');
    expect(step3Info?.stepResponseSchema).toContain('ord_99');
  });

  it('3. exports API flow sequence to Mermaid sequence diagram syntax', () => {
    const mermaid = exportFlowToMermaidSequence(sampleApiFlow, model.objects, model.connections, {
      autonumber: true,
      includeNotes: true,
      includeSchemas: true,
      includeReturnArrows: true,
    });

    expect(mermaid).toContain('sequenceDiagram');
    expect(mermaid).toContain('autonumber');
    expect(mermaid).toContain('%% Create Order Request');
    expect(mermaid).toContain(`actor p_${customerId} as Shopper`);
    expect(mermaid).toContain(`participant p_${gatewayId} as Edge API Gateway`);
    expect(mermaid).toContain(`participant p_${ordersServiceId} as Order Processing Service`);
    expect(mermaid).toContain(`participant p_${databaseId} as Orders Relational DB`);
    expect(mermaid).toContain(`p_${customerId}->>p_${gatewayId}: POST /api/v1/orders`);
    expect(mermaid).toContain(`Note over p_${gatewayId}: Customer initiates order checkout`);
    expect(mermaid).toContain(`p_${gatewayId}->>p_${ordersServiceId}: POST /orders.OrderService/CreateOrder`);
    expect(mermaid).toContain(`p_${ordersServiceId}->>p_${databaseId}: POST INSERT INTO orders`);
    expect(mermaid).toContain(`p_${databaseId}-->>p_${ordersServiceId}: 200`);
  });

  it('4. exports API flow sequence to PlantUML sequence diagram syntax', () => {
    const plantuml = exportFlowToPlantUMLSequence(sampleApiFlow, model.objects, model.connections, {
      title: 'Order Processing API Flow',
      autonumber: true,
      includeNotes: true,
    });

    expect(plantuml).toContain('@startuml');
    expect(plantuml).toContain('title Order Processing API Flow');
    expect(plantuml).toContain('autonumber');
    expect(plantuml).toContain(`actor "Shopper" as p_${customerId}`);
    expect(plantuml).toContain(`participant "Edge API Gateway" as p_${gatewayId}`);
    expect(plantuml).toContain(`p_${customerId} -> p_${gatewayId}: POST /api/v1/orders`);
    expect(plantuml).toContain(`note over p_${gatewayId}: Customer initiates order checkout`);
    expect(plantuml).toContain('@enduml');
  });

  it('5. projects API flow to canvas with edge annotations and flowMetadata', () => {
    const projection = projectFlowToCanvas(model.objects, model.connections, sampleApiFlow, undefined, {
      activeStepIndex: 0,
    });

    expect(projection.flowMetadata.flowType).toBe('api_flow');
    expect(projection.flowMetadata.endpoint).toBe('/api/v1/orders');
    expect(projection.flowMetadata.httpMethod).toBe('POST');
    expect(projection.flowMetadata.statusCode).toBe(201);
    expect(projection.flowMetadata.activeEndpoint).toBe('/api/v1/orders');
    expect(projection.flowMetadata.activeHttpMethod).toBe('POST');
    expect(projection.flowMetadata.activeStatusCode).toBe(201);

    const firstEdge = projection.edges.find((e) => e.id === conn1Id);
    expect(firstEdge).toBeDefined();
    const edgeData = firstEdge?.data as Record<string, unknown> | undefined;
    expect(edgeData?.endpoint).toBe('/api/v1/orders');
    expect(edgeData?.httpMethod).toBe('POST');
    expect(edgeData?.statusCode).toBe(201);
  });

  it('6. renders the <ApiFlowOverlay /> component with interactive details', () => {
    const playback = createFlowPlayback(sampleApiFlow);
    const apiFlowInfo = getApiFlowPlaybackStepInfo(sampleApiFlow, playback);

    const html = renderToString(
      <ApiFlowOverlay
        apiFlowInfo={apiFlowInfo}
        onClose={() => {}}
        onExportMermaid={() => {}}
        onExportPlantUML={() => {}}
      />,
    );

    expect(html).toContain('data-testid="api-flow-overlay"');
    expect(html).toContain('Create Order Request');
    expect(html).toContain('POST');
    expect(html).toContain('/api/v1/orders');
    expect(html).toContain('201');
    expect(html).toContain('Customer initiates order checkout');
    expect(html).toContain('Request Schema');
    expect(html).toContain('data-testid="api-flow-export-mermaid"');
    expect(html).toContain('data-testid="api-flow-export-plantuml"');
  });
});
