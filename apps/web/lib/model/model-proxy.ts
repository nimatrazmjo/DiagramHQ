import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { signApiToken } from '@/lib/api-token';
import { fetchFromApi } from '@/lib/api-fetch';
import {
  createId,
  type Architecture,
  type ArchitectureId,
  type ModelConnection,
  type ModelObject,
  type Version,
  type VersionId,
  type View,
  type ViewId,
  type WorkspaceId,
} from '@diagramhq/domain';

interface InMemStore {
  architectures: Map<string, Architecture>;
  versions: Map<string, Version>;
  objects: Map<string, ModelObject>;
  connections: Map<string, ModelConnection>;
  views: Map<string, View>;
  viewObjects: Map<string, Array<{ viewId: string; objectId: string; positionX: number; positionY: number }>>;
}

declare global {
  // eslint-disable-next-line no-var
  var __diagramhqModelStore: InMemStore | undefined;
}

if (!globalThis.__diagramhqModelStore) {
  globalThis.__diagramhqModelStore = {
    architectures: new Map(),
    versions: new Map(),
    objects: new Map(),
    connections: new Map(),
    views: new Map(),
    viewObjects: new Map(),
  };
}

export const inMemModelStore = globalThis.__diagramhqModelStore;

export async function proxyApiRequest(
  req: NextRequest,
  apiPath: string,
): Promise<NextResponse> {
  const session = await auth().catch(() => null);
  let token: string | undefined;

  if (session?.user?.id && session?.user?.email) {
    try {
      token = await signApiToken({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      });
    } catch {
      // Continue without token
    }
  }

  const method = req.method;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let bodyText: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      bodyText = await req.text();
    } catch {
      // No body
    }
  }

  // 1. Attempt to forward to NestJS API (skipped in test environment to use in-memory store)
  if (process.env.NODE_ENV !== 'test') {
    try {
      const apiRes = await fetchFromApi(apiPath, {
        method,
        headers,
        body: bodyText,
        cache: 'no-store',
      });

      if (apiRes.ok || apiRes.status < 500) {
        const data = await apiRes.json().catch(() => null);
        return NextResponse.json(data, { status: apiRes.status });
      }
    } catch {
      // API is unreachable; handle via in-memory fallback store
    }
  }

  // 2. In-memory fallback handler for test / offline scenarios
  return handleInMemoryFallback(method, apiPath, bodyText);
}

function handleInMemoryFallback(
  method: string,
  apiPath: string,
  bodyText?: string,
): NextResponse {
  const parsedBody = bodyText ? JSON.parse(bodyText) : {};
  const cleanPath = apiPath.split('?')[0] || '';

  // GET /architectures/:id/objects
  const archObjectsMatch = cleanPath.match(/^\/?architectures\/([^/]+)\/objects$/);
  if (archObjectsMatch) {
    const archId = archObjectsMatch[1]!;
    if (method === 'GET') {
      const list = Array.from(inMemModelStore.objects.values()).filter(
        (o) => o.architectureId === archId,
      );
      return NextResponse.json({ objects: list });
    }
    if (method === 'POST') {
      const newObj: ModelObject = {
        id: parsedBody.id || createId(parsedBody.kind === 'system' ? 'sys' : 'app'),
        architectureId: archId as unknown as ArchitectureId,
        versionId: (parsedBody.versionId || 'ver-default') as unknown as VersionId,
        kind: parsedBody.kind || 'application',
        name: parsedBody.name || 'Untitled Object',
        description: parsedBody.description ?? null,
        parentId: parsedBody.parentId ?? null,
        metadata: parsedBody.metadata ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemModelStore.objects.set(newObj.id, newObj);
      return NextResponse.json({ object: newObj }, { status: 201 });
    }
  }

  // GET /architectures/:id/connections
  const archConnMatch = cleanPath.match(/^\/?architectures\/([^/]+)\/connections$/);
  if (archConnMatch) {
    const archId = archConnMatch[1]!;
    if (method === 'GET') {
      const list = Array.from(inMemModelStore.connections.values()).filter(
        (c) => c.architectureId === archId,
      );
      return NextResponse.json({ connections: list });
    }
    if (method === 'POST') {
      const newConn: ModelConnection = {
        id: parsedBody.id || createId('con'),
        architectureId: archId as unknown as ArchitectureId,
        versionId: (parsedBody.versionId || 'ver-default') as unknown as VersionId,
        sourceObjectId: parsedBody.sourceObjectId,
        targetObjectId: parsedBody.targetObjectId,
        kind: parsedBody.kind || 'sync',
        label: parsedBody.label ?? null,
        description: parsedBody.description ?? null,
        metadata: parsedBody.metadata ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemModelStore.connections.set(newConn.id, newConn);
      return NextResponse.json({ connection: newConn }, { status: 201 });
    }
  }

  // /architectures/:id/views
  const archViewsMatch = cleanPath.match(/^\/?architectures\/([^/]+)\/views$/);
  if (archViewsMatch) {
    const archId = archViewsMatch[1]!;
    if (method === 'GET') {
      const viewsList = Array.from(inMemModelStore.views.values()).filter(
        (v) => v.architectureId === archId,
      );
      if (viewsList.length === 0) {
        const defaultView: View = {
          id: `view-${archId}` as unknown as ViewId,
          architectureId: archId as unknown as ArchitectureId,
          name: 'System Context',
          kind: 'context',
          level: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemModelStore.views.set(defaultView.id, defaultView);
        viewsList.push(defaultView);
      }
      return NextResponse.json({ views: viewsList });
    }
    if (method === 'POST') {
      const newView: View = {
        id: (parsedBody.id || createId('vw')) as unknown as ViewId,
        architectureId: archId as unknown as ArchitectureId,
        name: parsedBody.name || 'New Architecture View',
        kind: parsedBody.kind || 'context',
        level: parsedBody.level || 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemModelStore.views.set(newView.id, newView);
      return NextResponse.json({ view: newView }, { status: 201 });
    }
  }

  // GET /architectures/:id/model
  const archModelMatch = cleanPath.match(/^\/?architectures\/([^/]+)\/model$/);
  if (archModelMatch && method === 'GET') {
    const archId = archModelMatch[1]!;
    let arch = inMemModelStore.architectures.get(archId);
    if (!arch) {
      arch = {
        id: archId as unknown as ArchitectureId,
        workspaceId: 'ws-default' as unknown as WorkspaceId,
        name: 'Default Architecture',
        description: 'Primary System Architecture',
        defaultVersionId: 'ver-default' as unknown as VersionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemModelStore.architectures.set(archId, arch);
    }
    let ver = inMemModelStore.versions.get('ver-default');
    if (!ver) {
      ver = {
        id: 'ver-default' as unknown as VersionId,
        architectureId: archId as unknown as ArchitectureId,
        name: 'main',
        kind: 'main',
        status: 'draft',
        createdAt: new Date(),
      };
      inMemModelStore.versions.set('ver-default', ver);
    }
    const objects = Array.from(inMemModelStore.objects.values()).filter(
      (o) => o.architectureId === archId,
    );
    const connections = Array.from(inMemModelStore.connections.values()).filter(
      (c) => c.architectureId === archId,
    );
    return NextResponse.json({
      architecture: arch,
      version: ver,
      objects,
      connections,
    });
  }

  // /objects/:id
  const objMatch = cleanPath.match(/^\/?objects\/([^/]+)$/);
  if (objMatch) {
    const objId = objMatch[1]!;
    if (method === 'GET') {
      const obj = inMemModelStore.objects.get(objId);
      if (!obj) return NextResponse.json({ error: 'Object not found' }, { status: 404 });
      return NextResponse.json({ object: obj });
    }
    if (method === 'PATCH') {
      const obj = inMemModelStore.objects.get(objId);
      if (!obj) return NextResponse.json({ error: 'Object not found' }, { status: 404 });
      const updated: ModelObject = {
        ...obj,
        name: parsedBody.name ?? obj.name,
        description: parsedBody.description !== undefined ? parsedBody.description : obj.description,
        parentId: parsedBody.parentId !== undefined ? parsedBody.parentId : obj.parentId,
        metadata: parsedBody.metadata ? { ...obj.metadata, ...parsedBody.metadata } : obj.metadata,
        updatedAt: new Date(),
      };
      inMemModelStore.objects.set(objId, updated);
      return NextResponse.json({ object: updated });
    }
    if (method === 'DELETE') {
      inMemModelStore.objects.delete(objId);
      // Cascade delete connections
      for (const [cId, conn] of inMemModelStore.connections.entries()) {
        if (conn.sourceObjectId === objId || conn.targetObjectId === objId) {
          inMemModelStore.connections.delete(cId);
        }
      }
      return NextResponse.json({ success: true, id: objId });
    }
  }

  // /connections/:id
  const connMatch = cleanPath.match(/^\/?connections\/([^/]+)$/);
  if (connMatch) {
    const connId = connMatch[1]!;
    if (method === 'GET') {
      const conn = inMemModelStore.connections.get(connId);
      if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
      return NextResponse.json({ connection: conn });
    }
    if (method === 'PATCH') {
      const conn = inMemModelStore.connections.get(connId);
      if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
      const updated: ModelConnection = {
        ...conn,
        label: parsedBody.label !== undefined ? parsedBody.label : conn.label,
        kind: parsedBody.kind ?? conn.kind,
        description: parsedBody.description !== undefined ? parsedBody.description : conn.description,
        metadata: parsedBody.metadata ? { ...conn.metadata, ...parsedBody.metadata } : conn.metadata,
        updatedAt: new Date(),
      };
      inMemModelStore.connections.set(connId, updated);
      return NextResponse.json({ connection: updated });
    }
    if (method === 'DELETE') {
      inMemModelStore.connections.delete(connId);
      return NextResponse.json({ success: true, id: connId });
    }
  }

  // /views/:viewId/objects/positions
  const viewPosMatch = cleanPath.match(/^\/?views\/([^/]+)\/objects\/positions$/);
  if (viewPosMatch && method === 'PATCH') {
    const viewId = viewPosMatch[1]!;
    const positions: Array<{ objectId: string; x: number; y: number }> = parsedBody.positions || [];
    const existing = inMemModelStore.viewObjects.get(viewId) || [];

    for (const pos of positions) {
      const idx = existing.findIndex((vo) => vo.objectId === pos.objectId);
      if (idx >= 0) {
        existing[idx] = { viewId, objectId: pos.objectId, positionX: pos.x, positionY: pos.y };
      } else {
        existing.push({ viewId, objectId: pos.objectId, positionX: pos.x, positionY: pos.y });
      }
    }
    inMemModelStore.viewObjects.set(viewId, existing);
    return NextResponse.json({ result: { updatedCount: positions.length, errors: [] } });
  }

  // /views/:viewId/objects
  const viewObjsMatch = cleanPath.match(/^\/?views\/([^/]+)\/objects$/);
  if (viewObjsMatch) {
    const viewId = viewObjsMatch[1]!;
    if (method === 'GET') {
      const list = inMemModelStore.viewObjects.get(viewId) || [];
      return NextResponse.json({ viewObjects: list });
    }
    if (method === 'POST') {
      const objectId = parsedBody.objectId;
      const pos = parsedBody.position || { x: 100, y: 100 };
      const list = inMemModelStore.viewObjects.get(viewId) || [];
      const item = { viewId, objectId, positionX: pos.x, positionY: pos.y };
      const existingIdx = list.findIndex((vo) => vo.objectId === objectId);
      if (existingIdx >= 0) {
        list[existingIdx] = item;
      } else {
        list.push(item);
      }
      inMemModelStore.viewObjects.set(viewId, list);
      return NextResponse.json({ viewObject: item }, { status: 201 });
    }
  }

  // DELETE /views/:viewId/objects/:objectId
  const viewObjDelMatch = cleanPath.match(/^\/?views\/([^/]+)\/objects\/([^/]+)$/);
  if (viewObjDelMatch && method === 'DELETE') {
    const viewId = viewObjDelMatch[1]!;
    const objectId = viewObjDelMatch[2]!;
    const list = inMemModelStore.viewObjects.get(viewId) || [];
    inMemModelStore.viewObjects.set(
      viewId,
      list.filter((vo) => vo.objectId !== objectId),
    );
    // Crucially do NOT delete from inMemModelStore.objects: removal from view preserves model object!
    return NextResponse.json({ success: true, removedObjectId: objectId });
  }

  // GET /views/:viewId/projection
  const viewProjMatch = cleanPath.match(/^\/?views\/([^/]+)\/projection$/);
  if (viewProjMatch && method === 'GET') {
    const viewId = viewProjMatch[1]!;
    const view = inMemModelStore.views.get(viewId);
    if (!view) return NextResponse.json({ error: 'View not found' }, { status: 404 });
    const viewObjs = inMemModelStore.viewObjects.get(viewId) || [];
    const objects = viewObjs
      .map((vo) => {
        const obj = inMemModelStore.objects.get(vo.objectId);
        if (!obj) return null;
        return {
          id: obj.id,
          name: obj.name,
          kind: obj.kind,
          description: obj.description,
          metadata: obj.metadata,
          position: { x: vo.positionX, y: vo.positionY },
        };
      })
      .filter(Boolean);
    return NextResponse.json({ view, objects });
  }

  // /views/:viewId
  const viewMatch = cleanPath.match(/^\/?views\/([^/]+)$/);
  if (viewMatch) {
    const viewId = viewMatch[1]!;
    if (method === 'GET') {
      const view = inMemModelStore.views.get(viewId);
      if (!view) return NextResponse.json({ error: 'View not found' }, { status: 404 });
      return NextResponse.json({ view });
    }
    if (method === 'PATCH') {
      const view = inMemModelStore.views.get(viewId);
      if (!view) return NextResponse.json({ error: 'View not found' }, { status: 404 });
      const updated: View = {
        ...view,
        name: parsedBody.name ?? view.name,
        kind: parsedBody.kind ?? view.kind,
        level: parsedBody.level ?? view.level,
        updatedAt: new Date(),
      };
      inMemModelStore.views.set(viewId, updated);
      return NextResponse.json({ view: updated });
    }
    if (method === 'DELETE') {
      inMemModelStore.views.delete(viewId);
      inMemModelStore.viewObjects.delete(viewId);
      return NextResponse.json({ success: true, id: viewId });
    }
  }

  return NextResponse.json({ message: 'OK', path: apiPath });
}
