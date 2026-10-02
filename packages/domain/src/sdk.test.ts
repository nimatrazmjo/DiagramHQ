import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  createDiagramHQClient,
  createMockTestServer,
  DiagramHQApiError,
  NotFoundError,
  type CreateModelObjectInput,
} from './sdk';
import type { ObjectId, WorkspaceId } from './ids';

describe('F127 — TypeScript Client SDK', () => {
  const wsId = 'ws-payments-platform' as WorkspaceId;

  describe('SDK Configuration & Authentication', () => {
    it('initializes client and passes authorization header to transport', async () => {
      let capturedAuth = '';
      const { transport } = createMockTestServer();

      const client = createDiagramHQClient({
        token: 'dhq_pat_secret_998877',
        transport: async (url, options) => {
          capturedAuth = options.headers['Authorization'] || '';
          return transport(url, options);
        },
      });

      await client.architectures.create(wsId, {
        name: 'Auth Test Architecture',
      });

      expect(capturedAuth).toBe('Bearer dhq_pat_secret_998877');
    });

    it('throws AuthenticationError on 401 unauthorized status', async () => {
      const client = createDiagramHQClient({
        transport: async () => ({
          status: 401,
          json: async () => ({ error: 'Unauthorized' }),
          text: async () => 'Unauthorized',
        }),
      });

      await expect(client.architectures.create(wsId, { name: 'Fail' })).rejects.toThrow(
        AuthenticationError
      );
    });

    it('throws NotFoundError on 404 resource not found', async () => {
      const { transport } = createMockTestServer();
      const client = createDiagramHQClient({ transport });

      await expect(
        client.objects.get('obj-non-existent' as unknown as ObjectId)
      ).rejects.toThrow(NotFoundError);
    });

    it('throws DiagramHQApiError on 500 server error status', async () => {
      const client = createDiagramHQClient({
        maxRetries: 0,
        transport: async () => ({
          status: 500,
          json: async () => ({ error: 'Internal Server Error' }),
          text: async () => 'Internal Server Error',
        }),
      });

      await expect(client.architectures.create(wsId, { name: 'Error' })).rejects.toThrow(
        DiagramHQApiError
      );
    });
  });

  describe('Full SDK CRUD Round-Trip Against Test Server', () => {
    it('performs end-to-end CRUD round-trip: architecture -> objects -> connections -> model -> cleanup', async () => {
      const { transport } = createMockTestServer();
      const client = createDiagramHQClient({
        baseUrl: 'https://api.diagramhq.com',
        token: 'dhq_pat_test',
        transport,
      });

      // 1. CREATE Architecture
      const { architecture, version } = await client.architectures.create(wsId, {
        name: 'Global Payment Orchestrator',
        description: 'Multi-region payment rail and ledger infrastructure',
      });

      expect(architecture.id).toBeDefined();
      expect(architecture.name).toBe('Global Payment Orchestrator');
      expect(version.name).toBe('main');

      // 2. GET Architecture
      const getArchRes = await client.architectures.get(architecture.id);
      expect(getArchRes.architecture.name).toBe('Global Payment Orchestrator');

      // 3. UPDATE Architecture
      const updatedArchRes = await client.architectures.update(architecture.id, {
        name: 'Global Payment Orchestrator V2',
      });
      expect(updatedArchRes.architecture.name).toBe('Global Payment Orchestrator V2');

      // 4. CREATE Model Objects (CRUD)
      const edgeGatewayInput: CreateModelObjectInput = {
        name: 'Edge API Gateway',
        kind: 'application',
        description: 'TLS termination and routing',
        metadata: { technology: ['Fastify', 'Envoy'], port: 443 },
        position: { x: 100, y: 150 },
      };
      const { object: edgeGateway } = await client.objects.create(architecture.id, edgeGatewayInput);
      expect(edgeGateway.id).toBeDefined();
      expect(edgeGateway.name).toBe('Edge API Gateway');

      const ledgerServiceInput: CreateModelObjectInput = {
        name: 'Ledger Microservice',
        kind: 'component',
        description: 'Transactional double-entry ledger',
        parentId: edgeGateway.id,
        metadata: { technology: ['Go', 'gRPC'] },
      };
      const { object: ledgerService } = await client.objects.create(architecture.id, ledgerServiceInput);
      expect(ledgerService.parentId).toBe(edgeGateway.id);

      // 5. GET & UPDATE Model Object
      const fetchedObj = await client.objects.get(edgeGateway.id);
      expect(fetchedObj.object.name).toBe('Edge API Gateway');

      const updatedObjRes = await client.objects.update(edgeGateway.id, {
        description: 'Updated reverse proxy edge router',
        metadata: { tier: 'tier-1-critical' },
      });
      expect(updatedObjRes.object.description).toBe('Updated reverse proxy edge router');
      expect(updatedObjRes.object.metadata?.['tier']).toBe('tier-1-critical');

      // 6. LIST Model Objects
      const listObjsRes = await client.objects.list(architecture.id);
      expect(listObjsRes.objects).toHaveLength(2);
      expect(listObjsRes.objects.map((o) => o.id)).toContain(edgeGateway.id);
      expect(listObjsRes.objects.map((o) => o.id)).toContain(ledgerService.id);

      // 7. CREATE Model Connection
      const { connection: edgeToLedgerConn } = await client.connections.create(architecture.id, {
        sourceObjectId: edgeGateway.id,
        targetObjectId: ledgerService.id,
        kind: 'sync',
        label: 'gRPC / TLS',
        metadata: { protocol: 'gRPC', port: 50051 },
      });
      expect(edgeToLedgerConn.id).toBeDefined();
      expect(edgeToLedgerConn.label).toBe('gRPC / TLS');

      // 8. LIST Model Connections
      const listConnsRes = await client.connections.list(architecture.id);
      expect(listConnsRes.connections).toHaveLength(1);
      expect(listConnsRes.connections[0]?.id).toBe(edgeToLedgerConn.id);

      // 9. GET Architecture Model Snapshot
      const modelSnapshot = await client.architectures.getModel(architecture.id);
      expect(modelSnapshot.architecture.name).toBe('Global Payment Orchestrator V2');
      expect(modelSnapshot.objects).toHaveLength(2);
      expect(modelSnapshot.connections).toHaveLength(1);

      // 10. DELETE Connection & Object
      const delConnRes = await client.connections.delete(edgeToLedgerConn.id);
      expect(delConnRes.success).toBe(true);

      const delObjRes = await client.objects.delete(ledgerService.id);
      expect(delObjRes.success).toBe(true);

      const remainingObjs = await client.objects.list(architecture.id);
      expect(remainingObjs.objects).toHaveLength(1);
      expect(remainingObjs.objects[0]?.id).toBe(edgeGateway.id);
    });
  });
});
