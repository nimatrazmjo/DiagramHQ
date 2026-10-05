import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  ArchitectureModelClient,
} from './lib/model/architecture-model-client';
import { inMemModelStore } from './lib/model/model-proxy';
import { GET as getArchSlug, POST as postArchSlug } from './app/architectures/[...slug]/route';
import {
  GET as getViewsSlug,
  POST as postViewsSlug,
  PATCH as patchViewsSlug,
  DELETE as deleteViewsSlug,
} from './app/views/[...slug]/route';
import { PATCH as patchObjectSlug } from './app/objects/[...slug]/route';
import type { NextRequest } from 'next/server';
import type {
  CanvasNode,
  ModelObject,
  View,
  ObjectId,
  ArchitectureId,
  VersionId,
  ViewId,
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

describe('F145 — Real views: reuse objects across views', () => {
  const archId = 'arch-real-views-test' as unknown as ArchitectureId;
  const verId = 'ver-1' as unknown as VersionId;
  const client = new ArchitectureModelClient(undefined, {
    architectureId: archId as unknown as string,
  });

  beforeEach(() => {
    inMemModelStore.architectures.clear();
    inMemModelStore.versions.clear();
    inMemModelStore.objects.clear();
    inMemModelStore.connections.clear();
    inMemModelStore.views.clear();
    inMemModelStore.viewObjects.clear();
  });

  it('creates and lists multiple views for an architecture', async () => {
    // 1. Create View 1 (System Context)
    const req1 = createMockRequest(
      `http://localhost:3000/architectures/${archId}/views`,
      'POST',
      { name: 'System Context', kind: 'context', level: 1 },
    );
    const res1 = await postArchSlug(req1, { params: { slug: [archId as unknown as string, 'views'] } });
    expect(res1.status).toBe(201);
    const data1 = await res1.json();
    const view1 = data1.view;
    expect(view1.id).toMatch(/^vw[-_]/);
    expect(view1.name).toBe('System Context');

    // 2. Create View 2 (Container Diagram)
    const req2 = createMockRequest(
      `http://localhost:3000/architectures/${archId}/views`,
      'POST',
      { name: 'Containers', kind: 'container', level: 2 },
    );
    const res2 = await postArchSlug(req2, { params: { slug: [archId as unknown as string, 'views'] } });
    expect(res2.status).toBe(201);
    const data2 = await res2.json();
    const view2 = data2.view;
    expect(view2.id).toMatch(/^vw[-_]/);
    expect(view2.name).toBe('Containers');

    // 3. List Views
    const reqList = createMockRequest(`http://localhost:3000/architectures/${archId}/views`, 'GET');
    const resList = await getArchSlug(reqList, { params: { slug: [archId as unknown as string, 'views'] } });
    expect(resList.status).toBe(200);
    const listData = await resList.json();
    expect(listData.views).toHaveLength(2);
    expect(listData.views.map((v: { name: string }) => v.name)).toEqual([
      'System Context',
      'Containers',
    ]);
  });

  it('allows the same model object to be placed in multiple views with independent layouts', async () => {
    // Create base object in model
    const sharedObjectId = 'obj-auth-service' as unknown as ObjectId;
    const authService: ModelObject = {
      id: sharedObjectId,
      architectureId: archId,
      versionId: verId,
      name: 'Authentication Service',
      kind: 'system',
      description: 'Handles OAuth2 and JWT tokens',
      parentId: null,
      metadata: { technology: 'Node.js / Express' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemModelStore.objects.set(sharedObjectId, authService);

    // Create View A and View B
    const viewAId = 'vw-context-1' as unknown as ViewId;
    const viewBId = 'vw-container-1' as unknown as ViewId;
    inMemModelStore.views.set(viewAId, {
      id: viewAId,
      architectureId: archId,
      name: 'View A',
      kind: 'context',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    inMemModelStore.views.set(viewBId, {
      id: viewBId,
      architectureId: archId,
      name: 'View B',
      kind: 'container',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add shared object to View A at (100, 150)
    const addAReq = createMockRequest(
      `http://localhost:3000/views/${viewAId}/objects`,
      'POST',
      { objectId: sharedObjectId, position: { x: 100, y: 150 } },
    );
    const addARes = await postViewsSlug(addAReq, { params: { slug: [viewAId as unknown as string, 'objects'] } });
    expect(addARes.status).toBe(201);

    // Add shared object to View B at (600, 450)
    const addBReq = createMockRequest(
      `http://localhost:3000/views/${viewBId}/objects`,
      'POST',
      { objectId: sharedObjectId, position: { x: 600, y: 450 } },
    );
    const addBRes = await postViewsSlug(addBReq, { params: { slug: [viewBId as unknown as string, 'objects'] } });
    expect(addBRes.status).toBe(201);

    // Check View A objects
    const getAReq = createMockRequest(`http://localhost:3000/views/${viewAId}/objects`, 'GET');
    const getARes = await getViewsSlug(getAReq, { params: { slug: [viewAId as unknown as string, 'objects'] } });
    const viewAData = await getARes.json();
    expect(viewAData.viewObjects).toHaveLength(1);
    expect(viewAData.viewObjects[0].objectId).toBe(sharedObjectId);
    expect(viewAData.viewObjects[0].positionX).toBe(100);
    expect(viewAData.viewObjects[0].positionY).toBe(150);

    // Check View B objects
    const getBReq = createMockRequest(`http://localhost:3000/views/${viewBId}/objects`, 'GET');
    const getBRes = await getViewsSlug(getBReq, { params: { slug: [viewBId as unknown as string, 'objects'] } });
    const viewBData = await getBRes.json();
    expect(viewBData.viewObjects).toHaveLength(1);
    expect(viewBData.viewObjects[0].objectId).toBe(sharedObjectId);
    expect(viewBData.viewObjects[0].positionX).toBe(600);
    expect(viewBData.viewObjects[0].positionY).toBe(450);

    // Update position in View A to (250, 300)
    const patchPosReq = createMockRequest(
      `http://localhost:3000/views/${viewAId}/objects/positions`,
      'PATCH',
      { positions: [{ objectId: sharedObjectId, x: 250, y: 300 }] },
    );
    const patchPosRes = await patchViewsSlug(patchPosReq, {
      params: { slug: [viewAId as unknown as string, 'objects', 'positions'] },
    });
    expect(patchPosRes.status).toBe(200);

    // Verify View A position changed
    const listA = inMemModelStore.viewObjects.get(viewAId) || [];
    const checkA = listA.find((vo) => vo.objectId === (sharedObjectId as unknown as string));
    expect(checkA?.positionX).toBe(250);
    expect(checkA?.positionY).toBe(300);

    // Verify View B position is completely untouched (independent per-view layout)
    const listB = inMemModelStore.viewObjects.get(viewBId) || [];
    const checkB = listB.find((vo) => vo.objectId === (sharedObjectId as unknown as string));
    expect(checkB?.positionX).toBe(600);
    expect(checkB?.positionY).toBe(450);
  });

  it('updates an object name and metadata once, reflecting across all projecting views', async () => {
    const objectId = 'obj-database-core' as unknown as ObjectId;
    inMemModelStore.objects.set(objectId, {
      id: objectId,
      architectureId: archId,
      versionId: verId,
      name: 'PostgreSQL DB',
      kind: 'system',
      description: 'Primary relational storage',
      parentId: null,
      metadata: { technology: 'PostgreSQL 16' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const view1Id = 'vw-view-1' as unknown as ViewId;
    const view2Id = 'vw-view-2' as unknown as ViewId;
    inMemModelStore.views.set(view1Id, {
      id: view1Id,
      architectureId: archId,
      name: 'V1',
      kind: 'context',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    inMemModelStore.views.set(view2Id, {
      id: view2Id,
      architectureId: archId,
      name: 'V2',
      kind: 'container',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemModelStore.viewObjects.set(view1Id, [
      { viewId: view1Id, objectId, positionX: 50, positionY: 50 },
    ]);
    inMemModelStore.viewObjects.set(view2Id, [
      { viewId: view2Id, objectId, positionX: 400, positionY: 200 },
    ]);

    // Update object via API PATCH /objects/:id
    const patchReq = createMockRequest(
      `http://localhost:3000/objects/${objectId}`,
      'PATCH',
      {
        name: 'Distributed Cloud Database',
        description: 'Multi-region replicated cluster',
        metadata: { technology: 'CockroachDB / PostgreSQL' },
      },
    );
    const patchRes = await patchObjectSlug(patchReq, {
      params: { slug: [objectId as unknown as string] },
    });
    expect(patchRes.status).toBe(200);

    // Projection for View 1
    const proj1Req = createMockRequest(`http://localhost:3000/views/${view1Id}/projection`, 'GET');
    const proj1Res = await getViewsSlug(proj1Req, { params: { slug: [view1Id as unknown as string, 'projection'] } });
    const proj1Data = await proj1Res.json();
    expect(proj1Data.objects).toHaveLength(1);
    expect(proj1Data.objects[0].name).toBe('Distributed Cloud Database');
    expect(proj1Data.objects[0].description).toBe('Multi-region replicated cluster');
    expect(proj1Data.objects[0].position).toEqual({ x: 50, y: 50 });

    // Projection for View 2
    const proj2Req = createMockRequest(`http://localhost:3000/views/${view2Id}/projection`, 'GET');
    const proj2Res = await getViewsSlug(proj2Req, { params: { slug: [view2Id as unknown as string, 'projection'] } });
    const proj2Data = await proj2Res.json();
    expect(proj2Data.objects).toHaveLength(1);
    expect(proj2Data.objects[0].name).toBe('Distributed Cloud Database');
    expect(proj2Data.objects[0].description).toBe('Multi-region replicated cluster');
    expect(proj2Data.objects[0].position).toEqual({ x: 400, y: 200 });
  });

  it('removing an object from a view keeps the object in the model and in other views (remove ≠ delete)', async () => {
    const objectId = 'obj-kafka-stream' as unknown as ObjectId;
    inMemModelStore.objects.set(objectId, {
      id: objectId,
      architectureId: archId,
      versionId: verId,
      name: 'Event Bus',
      kind: 'system',
      description: 'Kafka event broker',
      parentId: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const viewAId = 'vw-view-a' as unknown as ViewId;
    const viewBId = 'vw-view-b' as unknown as ViewId;
    inMemModelStore.views.set(viewAId, {
      id: viewAId,
      architectureId: archId,
      name: 'View A',
      kind: 'context',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    inMemModelStore.views.set(viewBId, {
      id: viewBId,
      architectureId: archId,
      name: 'View B',
      kind: 'container',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemModelStore.viewObjects.set(viewAId, [
      { viewId: viewAId, objectId, positionX: 10, positionY: 20 },
    ]);
    inMemModelStore.viewObjects.set(viewBId, [
      { viewId: viewBId, objectId, positionX: 300, positionY: 400 },
    ]);

    // Remove from View A using DELETE /views/:viewId/objects/:objectId
    const deleteFromViewReq = createMockRequest(
      `http://localhost:3000/views/${viewAId}/objects/${objectId}`,
      'DELETE',
    );
    const deleteFromViewRes = await deleteViewsSlug(deleteFromViewReq, {
      params: { slug: [viewAId as unknown as string, 'objects', objectId as unknown as string] },
    });
    expect(deleteFromViewRes.status).toBe(200);

    // 1. View A should no longer have the object
    const viewAObjects = inMemModelStore.viewObjects.get(viewAId) || [];
    expect(viewAObjects).toHaveLength(0);

    // 2. The Model Object MUST STILL EXIST in the global model store
    const modelObject = inMemModelStore.objects.get(objectId);
    expect(modelObject).toBeDefined();
    expect(modelObject?.name).toBe('Event Bus');

    // 3. View B MUST STILL have the object
    const viewBObjects = inMemModelStore.viewObjects.get(viewBId) || [];
    expect(viewBObjects).toHaveLength(1);
    expect(viewBObjects[0]?.objectId).toBe(objectId);
  });

  it('projectToView only projects member objects with their coordinates and member connections', () => {
    const obj1 = 'obj-1' as unknown as ObjectId;
    const obj2 = 'obj-2' as unknown as ObjectId;
    const obj3 = 'obj-3' as unknown as ObjectId;

    // Load full model snapshot into client
    const testClient = client as unknown as {
      currentModel: {
        architecture: { id: ArchitectureId; name: string };
        version: { id: VersionId };
        objects: ModelObject[];
        connections: Array<{
          id: string;
          sourceObjectId: ObjectId;
          targetObjectId: ObjectId;
          label: string;
          kind: 'sync' | 'async';
        }>;
      };
    };

    testClient.currentModel = {
      architecture: { id: archId, name: 'Test' },
      version: { id: verId },
      objects: [
        {
          id: obj1,
          architectureId: archId,
          versionId: verId,
          name: 'Service 1',
          kind: 'system',
          parentId: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: obj2,
          architectureId: archId,
          versionId: verId,
          name: 'Service 2',
          kind: 'system',
          parentId: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: obj3,
          architectureId: archId,
          versionId: verId,
          name: 'Service 3',
          kind: 'system',
          parentId: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      connections: [
        { id: 'conn-1', sourceObjectId: obj1, targetObjectId: obj2, label: 'Calls', kind: 'sync' },
        { id: 'conn-2', sourceObjectId: obj2, targetObjectId: obj3, label: 'Notifies', kind: 'async' },
      ],
    };

    // Project view containing only obj1 and obj2
    const viewObjects = [
      { objectId: obj1 as unknown as string, positionX: 100, positionY: 120 },
      { objectId: obj2 as unknown as string, positionX: 300, positionY: 120 },
    ];

    const projection = client.projectToView(viewObjects);

    // Only 2 nodes should be projected
    expect(projection.nodes).toHaveLength(2);
    expect(projection.nodes.map((n: CanvasNode) => n.id)).toEqual(['obj-1', 'obj-2']);
    expect(projection.nodes[0]?.position).toEqual({ x: 100, y: 120 });
    expect(projection.nodes[1]?.position).toEqual({ x: 300, y: 120 });

    // Only conn-1 connects obj1 and obj2; conn-2 connects to obj3 which is not in this view
    expect(projection.edges).toHaveLength(1);
    expect(projection.edges[0]?.id).toBe('conn-1');
  });

  it('renders IcePanelSidebar with 1-click addition and removal affordances for real views', async () => {
    const { renderToString } = await import('react-dom/server');
    const { IcePanelSidebar } = await import('./components/canvas/icepanel-sidebar');

    const inViewNode: CanvasNode = {
      id: 'obj-in-view-1',
      type: 'system',
      position: { x: 50, y: 50 },
      data: { label: 'In View Service', kind: 'system' },
    };

    const notInViewModelObj: ModelObject = {
      id: 'obj-not-in-view-2' as unknown as ObjectId,
      architectureId: archId,
      versionId: verId,
      name: 'External Service',
      kind: 'system',
      description: 'Not yet in this view',
      parentId: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inViewModelObj: ModelObject = {
      id: 'obj-in-view-1' as unknown as ObjectId,
      architectureId: archId,
      versionId: verId,
      name: 'In View Service',
      kind: 'system',
      description: 'Already in this view',
      parentId: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const views: View[] = [
      {
        id: 'vw-1' as unknown as ViewId,
        architectureId: archId,
        name: 'Context Diagram',
        kind: 'context',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'vw-2' as unknown as ViewId,
        architectureId: archId,
        name: 'Container Diagram',
        kind: 'container',
        level: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const html = renderToString(
      <IcePanelSidebar
        isOpen={true}
        onToggle={() => {}}
        c4Level={1}
        onSelectC4Level={() => {}}
        nodes={[inViewNode]}
        selectedNodeId={null}
        onSelectNode={() => {}}
        onAddNode={() => {}}
        views={views}
        activeViewId="vw-1"
        onSelectView={() => {}}
        onCreateView={() => {}}
        onDeleteView={() => {}}
        allModelObjects={[inViewModelObj, notInViewModelObj]}
        onAddObjectToActiveView={() => {}}
        onRemoveObjectFromActiveView={() => {}}
      />,
    );

    // 1-click addition button for object NOT in active view
    expect(html).toContain('data-testid="add-to-view-obj-not-in-view-2"');
    expect(html).toContain('+ Add');

    // In View indicator & remove button for object already in active view
    expect(html).toContain('data-testid="remove-from-view-obj-in-view-1"');
    expect(html).toContain('In View');
  });
});
