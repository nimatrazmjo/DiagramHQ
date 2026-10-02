import { describe, expect, it } from 'vitest';
import {
  annotateApiFlowStep,
  createApiFlow,
  createFlow,
  exportFlowToMermaidSequence,
  exportFlowToPlantUMLSequence,
} from './flow';
import {
  createFlowPlayback,
  getApiFlowPlaybackStepInfo,
  nextFlowStep,
} from './flow-playback';
import { projectFlowToCanvas } from './flow-view';
import { createId, type ConnectionId } from './ids';
import type { ModelConnection, ModelObject } from './types';

describe('API Flows (F047)', () => {
  const archId = createId('arch');

  const userObj: ModelObject = {
    id: createId('act'),
    architectureId: archId,
    name: 'Customer Client',
    kind: 'actor',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const gatewayObj: ModelObject = {
    id: createId('app'),
    architectureId: archId,
    name: 'API Gateway',
    kind: 'application',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const ordersObj: ModelObject = {
    id: createId('cmp'),
    architectureId: archId,
    name: 'Order Service',
    kind: 'component',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const dbObj: ModelObject = {
    id: createId('sto'),
    architectureId: archId,
    name: 'Order Postgres Database',
    kind: 'store',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conn1: ModelConnection = {
    id: createId('con'),
    architectureId: archId,
    sourceObjectId: userObj.id,
    targetObjectId: gatewayObj.id,
    kind: 'sync',
    description: 'HTTPS JSON API',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conn2: ModelConnection = {
    id: createId('con'),
    architectureId: archId,
    sourceObjectId: gatewayObj.id,
    targetObjectId: ordersObj.id,
    kind: 'sync',
    description: 'gRPC Command',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conn3: ModelConnection = {
    id: createId('con'),
    architectureId: archId,
    sourceObjectId: ordersObj.id,
    targetObjectId: dbObj.id,
    kind: 'data',
    description: 'SQL Transaction',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const allConnections = [conn1, conn2, conn3];
  const allObjects = [userObj, gatewayObj, ordersObj, dbObj];

  describe('createApiFlow', () => {
    it('creates an API flow with valid endpoint, HTTP method, and schemas', () => {
      const flow = createApiFlow(
        {
          architectureId: archId,
          name: 'Create Order API Flow',
          endpoint: '/api/v1/orders',
          httpMethod: 'post',
          requestSchema: '{ "items": [{ "sku": string, "quantity": number }] }',
          responseSchema: '{ "orderId": string, "status": "created" }',
          statusCode: 201,
          steps: [
            {
              connectionId: conn1.id,
              endpoint: '/api/v1/orders',
              httpMethod: 'POST',
              statusCode: 201,
              note: 'Client submits checkout payload',
            },
            {
              connectionId: conn2.id,
              endpoint: '/orders.OrderService/Create',
              httpMethod: 'POST',
              statusCode: 200,
              note: 'Gateway invokes internal gRPC service',
            },
            {
              connectionId: conn3.id,
              endpoint: 'INSERT INTO orders',
              httpMethod: 'POST',
              statusCode: 200,
              note: 'Persist record',
            },
          ],
        },
        allConnections,
      );

      expect(flow.type).toBe('api_flow');
      expect(flow.name).toBe('Create Order API Flow');
      expect(flow.endpoint).toBe('/api/v1/orders');
      expect(flow.httpMethod).toBe('POST');
      expect(flow.statusCode).toBe(201);
      expect(flow.requestSchema).toContain('items');
      expect(flow.responseSchema).toContain('orderId');
      expect(flow.steps).toHaveLength(3);
      expect(flow.steps[0]?.endpoint).toBe('/api/v1/orders');
      expect(flow.steps[0]?.statusCode).toBe(201);
    });

    it('rejects an empty endpoint', () => {
      expect(() =>
        createApiFlow({
          architectureId: archId,
          name: 'Invalid Flow',
          endpoint: '   ',
        }),
      ).toThrowError(/API flow endpoint must not be empty/);
    });
  });

  describe('annotateApiFlowStep', () => {
    it('updates API step properties and annotations', () => {
      const flow = createApiFlow(
        {
          architectureId: archId,
          name: 'Query User API Flow',
          endpoint: '/api/v1/users/:id',
          httpMethod: 'GET',
          steps: [{ connectionId: conn1.id }],
        },
        allConnections,
      );

      const step = flow.steps[0]!;
      const annotated = annotateApiFlowStep(step, {
        endpoint: '/api/v1/users/42',
        httpMethod: 'GET',
        statusCode: 200,
        responseSchema: '{ "id": "42", "username": "alice" }',
        note: 'Fetch customer profile',
      });

      expect(annotated.endpoint).toBe('/api/v1/users/42');
      expect(annotated.httpMethod).toBe('GET');
      expect(annotated.statusCode).toBe(200);
      expect(annotated.responseSchema).toContain('alice');
      expect(annotated.note).toBe('Fetch customer profile');
    });
  });

  describe('getApiFlowPlaybackStepInfo', () => {
    it('returns null for non-api_flow or empty flow', () => {
      const regularFlow = createFlow({
        architectureId: archId,
        name: 'Regular Sequence',
      });
      const playback = createFlowPlayback(regularFlow);
      expect(getApiFlowPlaybackStepInfo(regularFlow, playback)).toBeNull();
    });

    it('provides structured playback context for active API step', () => {
      const flow = createApiFlow(
        {
          architectureId: archId,
          name: 'Payment Capture Flow',
          endpoint: '/api/v1/payments/capture',
          httpMethod: 'POST',
          statusCode: 200,
          steps: [
            {
              connectionId: conn1.id,
              endpoint: '/api/v1/payments/capture',
              httpMethod: 'POST',
              statusCode: 200,
              note: 'Client payment submission',
            },
            {
              connectionId: conn2.id,
              endpoint: '/internal/charge',
              httpMethod: 'POST',
              statusCode: 200,
              note: 'Call payment backend',
            },
          ],
        },
        allConnections,
      );

      let playback = createFlowPlayback(flow);
      let stepInfo = getApiFlowPlaybackStepInfo(flow, playback);
      expect(stepInfo).not.toBeNull();
      expect(stepInfo?.stepNumber).toBe(1);
      expect(stepInfo?.stepEndpoint).toBe('/api/v1/payments/capture');
      expect(stepInfo?.note).toBe('Client payment submission');

      playback = nextFlowStep(playback);
      stepInfo = getApiFlowPlaybackStepInfo(flow, playback);
      expect(stepInfo?.stepNumber).toBe(2);
      expect(stepInfo?.stepEndpoint).toBe('/internal/charge');
      expect(stepInfo?.note).toBe('Call payment backend');
    });
  });

  describe('exportFlowToMermaidSequence', () => {
    it('exports API flow to valid Mermaid sequence diagram syntax', () => {
      const flow = createApiFlow(
        {
          architectureId: archId,
          name: 'Order Checkout',
          endpoint: '/api/v1/checkout',
          httpMethod: 'POST',
          statusCode: 201,
          steps: [
            {
              connectionId: conn1.id,
              endpoint: '/api/v1/checkout',
              httpMethod: 'POST',
              statusCode: 201,
              note: 'Submit cart checkout',
              requestSchema: '{ "cartId": "xyz" }',
              responseSchema: '{ "orderId": "ord-1" }',
            },
            {
              connectionId: conn2.id,
              endpoint: '/orders/submit',
              httpMethod: 'POST',
              statusCode: 200,
              note: 'Create internal order record',
            },
          ],
        },
        allConnections,
      );

      const mermaid = exportFlowToMermaidSequence(flow, allObjects, allConnections, {
        autonumber: true,
        includeSchemas: true,
        includeNotes: true,
      });

      expect(mermaid).toContain('sequenceDiagram');
      expect(mermaid).toContain('autonumber');
      expect(mermaid).toContain('%% Order Checkout');
      expect(mermaid).toContain(`actor p_${userObj.id} as Customer Client`);
      expect(mermaid).toContain(`participant p_${gatewayObj.id} as API Gateway`);
      expect(mermaid).toContain(`participant p_${ordersObj.id} as Order Service`);
      expect(mermaid).toContain(`p_${userObj.id}->>p_${gatewayObj.id}: POST /api/v1/checkout`);
      expect(mermaid).toContain(`Note over p_${gatewayObj.id}: Submit cart checkout`);
      expect(mermaid).toContain('Req: { "cartId": "xyz" }');
      expect(mermaid).toContain(`p_${gatewayObj.id}-->>p_${userObj.id}: 201`);
    });

    it('throws error if a connection is not present in model connections', () => {
      const flow = createApiFlow({
        architectureId: archId,
        name: 'Missing Conn Flow',
        endpoint: '/api/test',
        steps: [{ connectionId: 'non-existent-conn' as unknown as ConnectionId }],
      });

      expect(() =>
        exportFlowToMermaidSequence(flow, allObjects, allConnections),
      ).toThrowError(/Connection "non-existent-conn" for flow step 0 not found/);
    });
  });

  describe('exportFlowToPlantUMLSequence', () => {
    it('exports API flow to valid PlantUML sequence diagram syntax', () => {
      const flow = createApiFlow(
        {
          architectureId: archId,
          name: 'PlantUML Checkout Flow',
          endpoint: '/api/v1/checkout',
          httpMethod: 'POST',
          statusCode: 200,
          steps: [
            {
              connectionId: conn1.id,
              endpoint: '/api/v1/checkout',
              httpMethod: 'POST',
              statusCode: 200,
              note: 'Validate auth token',
            },
            {
              connectionId: conn2.id,
              endpoint: '/orders',
              httpMethod: 'POST',
              statusCode: 200,
            },
          ],
        },
        allConnections,
      );

      const puml = exportFlowToPlantUMLSequence(flow, allObjects, allConnections, {
        title: 'Checkout API Sequence',
        autonumber: true,
      });

      expect(puml).toContain('@startuml');
      expect(puml).toContain('title Checkout API Sequence');
      expect(puml).toContain('autonumber');
      expect(puml).toContain(`actor "Customer Client" as p_${userObj.id}`);
      expect(puml).toContain(`participant "API Gateway" as p_${gatewayObj.id}`);
      expect(puml).toContain(`p_${userObj.id} -> p_${gatewayObj.id}: POST /api/v1/checkout`);
      expect(puml).toContain(`note over p_${gatewayObj.id}: Validate auth token`);
      expect(puml).toContain(`p_${gatewayObj.id} --> p_${userObj.id}: 200`);
      expect(puml).toContain('@enduml');
    });
  });

  describe('projectFlowToCanvas for API flows', () => {
    it('projects API metadata onto canvas edges and flowMetadata', () => {
      const flow = createApiFlow(
        {
          architectureId: archId,
          name: 'Canvas API Flow',
          endpoint: '/api/v1/data',
          httpMethod: 'GET',
          statusCode: 200,
          requestSchema: '{ "filter": "active" }',
          responseSchema: '{ "count": 10 }',
          steps: [
            {
              connectionId: conn1.id,
              endpoint: '/api/v1/data',
              httpMethod: 'GET',
              statusCode: 200,
              note: 'Fetch records',
            },
          ],
        },
        allConnections,
      );

      const projection = projectFlowToCanvas(allObjects, allConnections, flow, undefined, {
        activeStepIndex: 0,
      });

      expect(projection.flowMetadata.flowType).toBe('api_flow');
      expect(projection.flowMetadata.endpoint).toBe('/api/v1/data');
      expect(projection.flowMetadata.httpMethod).toBe('GET');
      expect(projection.flowMetadata.statusCode).toBe(200);
      expect(projection.flowMetadata.activeEndpoint).toBe('/api/v1/data');
      expect(projection.flowMetadata.activeHttpMethod).toBe('GET');
      expect(projection.flowMetadata.activeStatusCode).toBe(200);

      const flowEdge = projection.edges.find((e) => e.id === conn1.id);
      expect(flowEdge).toBeDefined();
      expect(flowEdge?.data.endpoint).toBe('/api/v1/data');
      expect(flowEdge?.data.httpMethod).toBe('GET');
      expect(flowEdge?.data.statusCode).toBe(200);
    });
  });
});
