import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  mapCanvasKindToModelKind,
  mapModelKindToCanvasKind,
  mapCanvasNodeToModelObject,
  mapModelObjectToCanvasNode,
  ArchitectureModelClient,
} from './lib/model/architecture-model-client';
import { inMemModelStore } from './lib/model/model-proxy';
import { GET as getAutosave, POST as postAutosave } from './app/api/diagrams/autosave/route';
import { GET as getArchObjects, POST as postArchObjects } from './app/architectures/[...slug]/route';
import { PATCH as patchObject, DELETE as deleteObject } from './app/objects/[...slug]/route';
import { POST as postArchConnections } from './app/architectures/[...slug]/route';
import { DELETE as deleteConnection } from './app/connections/[...slug]/route';
import { PATCH as patchViewPositions } from './app/views/[...slug]/route';
import type { NextRequest } from 'next/server';
import type {
  CanvasNode,
  CanvasEdge,
  ModelObject,
  ObjectId,
  ArchitectureId,
  VersionId,
  WorkspaceId,
} from '@diagramhq/domain';

// Mock NextAuth auth()
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: 'usr-architect-1',
      email: 'architect@diagramhq.com',
      name: 'Senior Architect',
    },
  }),
}));

// Mock dashboard actions
vi.mock('@/app/dashboard/actions', () => ({
  fetchUserOrganizations: vi.fn().mockResolvedValue([
    { id: 'org-test-1', name: 'Test Org' },
  ]),
}));

vi.mock('@/app/dashboard/workspace-actions', () => ({
  fetchOrgWorkspaces: vi.fn().mockResolvedValue([
    { id: 'ws-test-1', name: 'Test Workspace', settings: {} },
  ]),
}));

function createMockRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const parsedUrl = new URL(url, 'http://localhost:3000');
  return {
    method,
    url: parsedUrl.toString(),
    nextUrl: parsedUrl,
    text: async () => (body !== undefined ? JSON.stringify(body) : ''),
    json: async () => body,
  } as unknown as NextRequest;
}

describe('F144: Wire Editor to Model API', () => {
  beforeEach(() => {
    inMemModelStore.architectures.clear();
    inMemModelStore.versions.clear();
    inMemModelStore.objects.clear();
    inMemModelStore.connections.clear();
    inMemModelStore.views.clear();
    inMemModelStore.viewObjects.clear();
  });

  describe('1. Model Kind & Canvas Mapping Integrity', () => {
    it('maps canvas kinds to domain model kinds correctly', () => {
      expect(mapCanvasKindToModelKind('system')).toBe('system');
      expect(mapCanvasKindToModelKind('application')).toBe('application');
      expect(mapCanvasKindToModelKind('service')).toBe('application');
      expect(mapCanvasKindToModelKind('database')).toBe('store');
      expect(mapCanvasKindToModelKind('queue')).toBe('store');
      expect(mapCanvasKindToModelKind('component')).toBe('component');
      expect(mapCanvasKindToModelKind('actor')).toBe('actor');
      expect(mapCanvasKindToModelKind('person')).toBe('actor');
      expect(mapCanvasKindToModelKind('group')).toBe('group');
    });

    it('maps domain model kinds back to canvas kinds preserving original kinds', () => {
      expect(mapModelKindToCanvasKind('system')).toBe('system');
      expect(mapModelKindToCanvasKind('application')).toBe('service');
      expect(mapModelKindToCanvasKind('store')).toBe('database');
      expect(mapModelKindToCanvasKind('store', 'queue')).toBe('queue');
      expect(mapModelKindToCanvasKind('actor', 'person')).toBe('person');
      expect(mapModelKindToCanvasKind('component')).toBe('component');
    });

    it('converts CanvasNode to ModelObject and back without loss of metadata', () => {
      const node: CanvasNode = {
        id: 'node-auth-api',
        type: 'customNode',
        position: { x: 320, y: 180 },
        data: {
          label: 'Auth Service',
          kind: 'service',
          technology: 'NestJS / JWT',
          description: 'Handles token issuance',
          c4Level: 2,
          parentId: 'sys-core',
        },
      };

      const modelObj = mapCanvasNodeToModelObject(node, 'arch-123', 'ver-main');
      expect(modelObj.id).toBe('node-auth-api');
      expect(modelObj.name).toBe('Auth Service');
      expect(modelObj.kind).toBe('application');
      expect(modelObj.parentId).toBe('sys-core');
      expect(modelObj.metadata).toMatchObject({
        technology: 'NestJS / JWT',
        originalKind: 'service',
        c4Level: 2,
      });

      const restoredNode = mapModelObjectToCanvasNode(modelObj, { x: 320, y: 180 });
      expect(restoredNode.id).toBe(node.id);
      expect(restoredNode.position).toEqual({ x: 320, y: 180 });
      expect(restoredNode.data.label).toBe('Auth Service');
      expect(restoredNode.data.kind).toBe('service');
      expect(restoredNode.data.technology).toBe('NestJS / JWT');
      expect(restoredNode.data.c4Level).toBe(2);
      expect(restoredNode.data.parentId).toBe('sys-core');
    });
  });

  describe('2. Model API Object & Connection CRUD Routes', () => {
    it('creates object via /architectures/:id/objects and returns it via GET /architectures/:id/objects', async () => {
      const archId = 'arch-test-100';

      // 1. POST /architectures/:id/objects
      const postReq = createMockRequest(`http://localhost:3000/architectures/${archId}/objects`, 'POST', {
        id: 'obj-billing-svc',
        name: 'Billing Gateway',
        kind: 'application',
        description: 'Stripe webhook listener',
        metadata: { technology: 'Go' },
      });
      const postRes = await postArchObjects(postReq, { params: { slug: [archId, 'objects'] } });
      const postData = await postRes.json();
      expect(postRes.status).toBe(201);
      expect(postData.object.name).toBe('Billing Gateway');
      expect(postData.object.kind).toBe('application');

      // 2. GET /architectures/:id/objects returns the created object
      const getReq = createMockRequest(`http://localhost:3000/architectures/${archId}/objects`, 'GET');
      const getRes = await getArchObjects(getReq, { params: { slug: [archId, 'objects'] } });
      const getData = await getRes.json();
      expect(getRes.status).toBe(200);
      expect(Array.isArray(getData.objects)).toBe(true);
      expect(getData.objects.some((o: ModelObject) => o.id === 'obj-billing-svc')).toBe(true);
    });

    it('updates object metadata via PATCH /objects/:id and removes it via DELETE /objects/:id', async () => {
      const archId = 'arch-test-200';
      const objId = 'obj-user-svc';

      // Pre-seed object
      inMemModelStore.objects.set(objId, {
        id: objId as unknown as ObjectId,
        architectureId: archId as unknown as ArchitectureId,
        versionId: 'ver-default' as unknown as VersionId,
        kind: 'application',
        name: 'User Service',
        description: 'Old description',
        parentId: null,
        metadata: { technology: 'Node.js' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // PATCH /objects/:id
      const patchReq = createMockRequest(`http://localhost:3000/objects/${objId}`, 'PATCH', {
        name: 'User & Profile Service',
        description: 'New v2 description',
        metadata: { technology: 'TypeScript / Fastify' },
      });
      const patchRes = await patchObject(patchReq, { params: { slug: [objId] } });
      const patchData = await patchRes.json();
      expect(patchData.object.name).toBe('User & Profile Service');
      expect(patchData.object.metadata.technology).toBe('TypeScript / Fastify');

      // Verify in store
      expect(inMemModelStore.objects.get(objId)?.name).toBe('User & Profile Service');

      // DELETE /objects/:id
      const delReq = createMockRequest(`http://localhost:3000/objects/${objId}`, 'DELETE');
      const delRes = await deleteObject(delReq, { params: { slug: [objId] } });
      const delData = await delRes.json();
      expect(delData.success).toBe(true);
      expect(inMemModelStore.objects.has(objId)).toBe(false);
    });

    it('creates and deletes connections via /architectures/:id/connections and /connections/:id', async () => {
      const archId = 'arch-test-300';
      const postReq = createMockRequest(`http://localhost:3000/architectures/${archId}/connections`, 'POST', {
        id: 'conn-api-to-db',
        sourceObjectId: 'app-web',
        targetObjectId: 'store-db',
        kind: 'sync',
        label: 'gRPC / TLS',
      });

      const postRes = await postArchConnections(postReq, { params: { slug: [archId, 'connections'] } });
      const postData = await postRes.json();
      expect(postRes.status).toBe(201);
      expect(postData.connection.id).toBe('conn-api-to-db');
      expect(postData.connection.label).toBe('gRPC / TLS');

      // DELETE /connections/:id
      const delReq = createMockRequest('http://localhost:3000/connections/conn-api-to-db', 'DELETE');
      const delRes = await deleteConnection(delReq, { params: { slug: ['conn-api-to-db'] } });
      const delData = await delRes.json();
      expect(delData.success).toBe(true);
      expect(inMemModelStore.connections.has('conn-api-to-db')).toBe(false);
    });
  });

  describe('3. View Positions Persistence (/views/:viewId/objects/positions)', () => {
    it('persists and updates node coordinates per view', async () => {
      const viewId = 'view-context-1';

      const patchReq = createMockRequest(`http://localhost:3000/views/${viewId}/objects/positions`, 'PATCH', {
        positions: [
          { objectId: 'app-web', x: 250, y: 140 },
          { objectId: 'store-db', x: 500, y: 320 },
        ],
      });

      const patchRes = await patchViewPositions(patchReq, {
        params: { slug: [viewId, 'objects', 'positions'] },
      });
      const patchData = await patchRes.json();
      expect(patchData.result.updatedCount).toBe(2);

      const savedPositions = inMemModelStore.viewObjects.get(viewId);
      expect(savedPositions).toBeDefined();
      expect(savedPositions?.find((p) => p.objectId === 'app-web')?.positionX).toBe(250);
      expect(savedPositions?.find((p) => p.objectId === 'store-db')?.positionY).toBe(320);
    });
  });

  describe('4. Autosave Route & Reopening from Model', () => {
    it('persists editor objects to model and saves view positions without storing JSON blob', async () => {
      const nodes: CanvasNode[] = [
        {
          id: 'app-gateway',
          type: 'customNode',
          position: { x: 150, y: 200 },
          data: { label: 'API Gateway', kind: 'service', technology: 'Envoy' },
        },
      ];
      const edges: CanvasEdge[] = [];

      const postReq = createMockRequest('http://localhost:3000/api/diagrams/autosave', 'POST', {
        nodes,
        edges,
        architectureId: 'arch-ws-test-1',
        viewId: 'view-arch-ws-test-1',
      });

      const postRes = await postAutosave(postReq);
      const postData = await postRes.json();

      expect(postData.success).toBe(true);
      expect(postData.savedToModel).toBe(true);
      expect(postData.architectureId).toBe('arch-ws-test-1');

      // Verify object exists in model store
      expect(inMemModelStore.objects.has('app-gateway')).toBe(true);
      expect(inMemModelStore.objects.get('app-gateway')?.name).toBe('API Gateway');

      // GET /api/diagrams/autosave restores directly from the model
      const getRes = await getAutosave();
      const getData = await getRes.json();

      expect(getData.authenticated).toBe(true);
      expect(getData.source).toBe('model-api');
      expect(getData.model.objects.some((o: ModelObject) => o.id === 'app-gateway')).toBe(true);
      expect(getData.diagram.nodes.some((n: CanvasNode) => n.id === 'app-gateway')).toBe(true);
    });
  });

  describe('5. ArchitectureModelClient loadFromModel Projection', () => {
    it('projects domain model objects and view positions into canvas nodes and edges', () => {
      const client = new ArchitectureModelClient();
      const mockModel = {
        architecture: {
          id: 'arch-10' as unknown as ArchitectureId,
          workspaceId: 'ws-1' as unknown as WorkspaceId,
          name: 'Core Platform',
          defaultVersionId: 'ver-1' as unknown as VersionId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        version: {
          id: 'ver-1' as unknown as VersionId,
          architectureId: 'arch-10' as unknown as ArchitectureId,
          name: 'main',
          kind: 'main' as const,
          status: 'draft' as const,
          createdAt: new Date(),
        },
        objects: [
          {
            id: 'sys-mesh' as unknown as ObjectId,
            architectureId: 'arch-10' as unknown as ArchitectureId,
            versionId: 'ver-1' as unknown as VersionId,
            kind: 'system' as const,
            name: 'Service Mesh',
            description: 'Istio mesh',
            parentId: null,
            metadata: { c4Level: 1 },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        connections: [],
      };

      const viewObjects = [{ viewId: 'v1', objectId: 'sys-mesh', positionX: 420, positionY: 280 }];

      const { nodes, edges } = client.loadFromModel(mockModel, viewObjects);
      expect(nodes).toHaveLength(1);
      expect(nodes[0]!.id).toBe('sys-mesh');
      expect(nodes[0]!.data.label).toBe('Service Mesh');
      expect(nodes[0]!.position).toEqual({ x: 420, y: 280 });
      expect(edges).toHaveLength(0);
      expect(client.getArchitectureId()).toBe('arch-10');
    });
  });
});
