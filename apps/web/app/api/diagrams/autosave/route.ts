import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { signApiToken } from '@/lib/api-token';
import { fetchFromApi } from '@/lib/api-fetch';
import { fetchUserOrganizations } from '@/app/dashboard/actions';
import { fetchOrgWorkspaces } from '@/app/dashboard/workspace-actions';
import {
  mapCanvasKindToModelKind,
  mapModelObjectToCanvasNode,
  mapModelConnectionToCanvasEdge,
} from '@/lib/model/architecture-model-client';
import { inMemModelStore } from '@/lib/model/model-proxy';
import type {
  CanvasNode,
  CanvasEdge,
  ModelObject,
  ModelConnection,
  View,
  ArchitectureId,
  WorkspaceId,
  VersionId,
  ViewId,
  ObjectId,
} from '@diagramhq/domain';

// In-memory server fallback storage per user ID
declare global {
  // eslint-disable-next-line no-var
  var __studioDiagramsStore: Map<string, unknown> | undefined;
}

if (!globalThis.__studioDiagramsStore) {
  globalThis.__studioDiagramsStore = new Map();
}

const serverCache = globalThis.__studioDiagramsStore;

async function getFirstUserWorkspace(_userId?: string, _userEmail?: string, _userName?: string | null) {
  try {
    const orgs = await fetchUserOrganizations();
    if (orgs.length > 0) {
      const firstOrg = orgs[0]!;
      const workspaces = await fetchOrgWorkspaces(firstOrg.id);
      if (workspaces.length > 0) {
        return { workspace: workspaces[0]!, org: firstOrg };
      }
    }
  } catch (err) {
    console.warn('Failed to retrieve user workspace from API:', err);
  }
  return null;
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({
      authenticated: false,
      diagram: null,
      architectureId: null,
      viewId: null,
    });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  try {
    const userWorkspace = await getFirstUserWorkspace(userId, userEmail, session.user.name);
    if (userWorkspace) {
      const workspaceId = userWorkspace.workspace.id;
      const token = await signApiToken({
        id: userId,
        email: userEmail,
        name: session.user.name,
      });
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // 1. Resolve or create Architecture for workspace
      let archId: string | null = null;
      let defaultVersionId: string = 'ver-default';
      const archListRes = await fetchFromApi(`/workspaces/${workspaceId}/architectures`, {
        headers,
        cache: 'no-store',
      }).catch(() => null);

      if (archListRes?.ok) {
        const archListData = await archListRes.json();
        if (Array.isArray(archListData.architectures) && archListData.architectures.length > 0) {
          archId = archListData.architectures[0].id;
          defaultVersionId = archListData.architectures[0].defaultVersionId || 'ver-default';
        }
      }

      if (!archId) {
        const createArchRes = await fetchFromApi(`/workspaces/${workspaceId}/architectures`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'System Architecture',
            description: 'Primary System Architecture Model',
          }),
        }).catch(() => null);

        if (createArchRes?.ok) {
          const createArchData = await createArchRes.json();
          archId = createArchData.architecture?.id || null;
          defaultVersionId = createArchData.version?.id || 'ver-default';
        }
      }

      // If still no archId (e.g. API unavailable), use in-memory fallback
      if (!archId) {
        archId = `arch-${workspaceId}`;
        let fallbackArch = inMemModelStore.architectures.get(archId);
        if (!fallbackArch) {
          fallbackArch = {
            id: archId as unknown as ArchitectureId,
            workspaceId: workspaceId as unknown as WorkspaceId,
            name: 'System Architecture',
            description: 'Primary System Architecture Model',
            defaultVersionId: defaultVersionId as unknown as VersionId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          inMemModelStore.architectures.set(archId, fallbackArch);
        }
      }

      // 2. Resolve or create View for architecture
      let viewId: string | null = null;
      const viewsRes = await fetchFromApi(`/architectures/${archId}/views`, {
        headers,
        cache: 'no-store',
      }).catch(() => null);

      if (viewsRes?.ok) {
        const viewsData = await viewsRes.json();
        if (Array.isArray(viewsData.views) && viewsData.views.length > 0) {
          viewId = viewsData.views[0].id;
        }
      }

      if (!viewId) {
        const createViewRes = await fetchFromApi(`/architectures/${archId}/views`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'System Context',
            kind: 'context',
            level: 1,
          }),
        }).catch(() => null);

        if (createViewRes?.ok) {
          const createViewData = await createViewRes.json();
          viewId = createViewData.view?.id || null;
        }
      }

      if (!viewId) {
        viewId = `view-${archId}`;
        const existingView = inMemModelStore.views.get(viewId);
        if (!existingView) {
          const fallbackView: View = {
            id: viewId as unknown as ViewId,
            architectureId: archId as unknown as ArchitectureId,
            name: 'System Context',
            kind: 'context',
            level: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          inMemModelStore.views.set(viewId, fallbackView);
        }
      }

      // 3. Fetch Model Snapshot and View Objects
      let modelObjects: ModelObject[] = [];
      let modelConnections: ModelConnection[] = [];
      let viewObjectsList: Array<{ viewId: string; objectId: string; positionX: number; positionY: number }> = [];

      const modelRes = await fetchFromApi(`/architectures/${archId}/model`, {
        headers,
        cache: 'no-store',
      }).catch(() => null);

      if (modelRes?.ok) {
        const modelData = await modelRes.json();
        modelObjects = modelData.objects || [];
        modelConnections = modelData.connections || [];
      } else {
        modelObjects = Array.from(inMemModelStore.objects.values()).filter(
          (o) => o.architectureId === archId,
        );
        modelConnections = Array.from(inMemModelStore.connections.values()).filter(
          (c) => c.architectureId === archId,
        );
      }

      const voRes = await fetchFromApi(`/views/${viewId}/objects`, {
        headers,
        cache: 'no-store',
      }).catch(() => null);

      if (voRes?.ok) {
        const voData = await voRes.json();
        viewObjectsList = voData.viewObjects || [];
      } else {
        viewObjectsList = inMemModelStore.viewObjects.get(viewId) || [];
      }

      // 4. Migration Check: If legacy settings.studioDiagram blob exists, migrate into model API and retire blob
      const getWsRes = await fetchFromApi(`/workspaces/${workspaceId}`, {
        headers,
        cache: 'no-store',
      }).catch(() => null);

      if (getWsRes?.ok) {
        const wsData = await getWsRes.json();
        const settings = wsData.workspace?.settings;
        if (settings?.studioDiagram && modelObjects.length === 0) {
          // Migrate legacy blob
          const legacy = settings.studioDiagram as { nodes?: CanvasNode[]; edges?: CanvasEdge[] };
          if (Array.isArray(legacy.nodes) && legacy.nodes.length > 0) {
            for (const node of legacy.nodes) {
              const kind = mapCanvasKindToModelKind(node.data?.kind);
              const postObj = await fetchFromApi(`/architectures/${archId}/objects`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  id: node.id,
                  name: node.data?.label || node.id,
                  kind,
                  description: node.data?.description,
                  parentId: node.data?.parentId,
                  metadata: {
                    technology: node.data?.technology,
                    originalKind: node.data?.kind,
                    c4Level: node.data?.c4Level,
                  },
                }),
              }).catch(() => null);

              if (postObj?.ok) {
                const postData = await postObj.json();
                modelObjects.push(postData.object);

                // Add to view with position
                await fetchFromApi(`/views/${viewId}/objects`, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    objectId: node.id,
                    position: node.position,
                  }),
                }).catch(() => null);

                viewObjectsList.push({
                  viewId,
                  objectId: node.id,
                  positionX: node.position.x,
                  positionY: node.position.y,
                });
              }
            }

            if (Array.isArray(legacy.edges)) {
              for (const edge of legacy.edges) {
                const postConn = await fetchFromApi(`/architectures/${archId}/connections`, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    id: edge.id,
                    sourceObjectId: edge.source,
                    targetObjectId: edge.target,
                    label: edge.label,
                    kind: edge.data?.kind || 'sync',
                    description: edge.data?.description,
                  }),
                }).catch(() => null);

                if (postConn?.ok) {
                  const connData = await postConn.json();
                  modelConnections.push(connData.connection);
                }
              }
            }
          }

          // Retire blob from workspace settings
          const newSettings = { ...settings };
          delete newSettings.studioDiagram;
          await fetchFromApi(`/workspaces/${workspaceId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ settings: newSettings }),
          }).catch(() => null);
        } else if (settings?.studioDiagram) {
          // Already have model objects; retire the obsolete blob
          const newSettings = { ...settings };
          delete newSettings.studioDiagram;
          await fetchFromApi(`/workspaces/${workspaceId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ settings: newSettings }),
          }).catch(() => null);
        }
      }

      // 5. Project model objects + viewObjects into canvas nodes & edges
      const posMap = new Map<string, { x: number; y: number }>();
      for (const vo of viewObjectsList) {
        posMap.set(vo.objectId, { x: vo.positionX, y: vo.positionY });
      }

      const nodes: CanvasNode[] = modelObjects.map((obj) =>
        mapModelObjectToCanvasNode(obj, posMap.get(obj.id)),
      );
      const edges: CanvasEdge[] = modelConnections.map((conn) =>
        mapModelConnectionToCanvasEdge(conn),
      );

      const diagramPayload = {
        nodes,
        edges,
        c4Level: (nodes[0]?.data?.c4Level as 1 | 2 | 3) || 1,
        updatedAt: new Date().toISOString(),
        savedBy: userEmail,
      };

      serverCache.set(userId, diagramPayload);

      return NextResponse.json({
        authenticated: true,
        user: session.user,
        workspaceId,
        architectureId: archId,
        viewId,
        model: {
          architecture: { id: archId, workspaceId, name: 'System Architecture' },
          version: { id: defaultVersionId, architectureId: archId, name: 'main' },
          objects: modelObjects,
          connections: modelConnections,
        },
        viewObjects: viewObjectsList,
        diagram: nodes.length > 0 ? diagramPayload : null,
        source: 'model-api',
      });
    }
  } catch (err) {
    console.warn('Failed to load architecture model for editor session:', err);
  }

  // Fallback if unable to reach workspace
  const cachedDiagram = serverCache.get(userId) || null;
  return NextResponse.json({
    authenticated: true,
    user: session.user,
    architectureId: 'arch-default',
    viewId: 'view-default',
    diagram: cachedDiagram,
    source: cachedDiagram ? 'server-cache' : null,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid diagram payload' }, { status: 400 });
  }

  const nodes: CanvasNode[] = Array.isArray(body.nodes) ? (body.nodes as CanvasNode[]) : [];
  const edges: CanvasEdge[] = Array.isArray(body.edges) ? (body.edges as CanvasEdge[]) : [];
  let architectureId: string | null = typeof body.architectureId === 'string' ? body.architectureId : null;
  let viewId: string | null = typeof body.viewId === 'string' ? body.viewId : null;

  const payload = {
    ...body,
    updatedAt: new Date().toISOString(),
    savedBy: userEmail,
  };

  serverCache.set(userId, payload);

  let savedToModel = false;
  try {
    const userWorkspace = await getFirstUserWorkspace(userId, userEmail, session.user.name);
    if (userWorkspace) {
      const workspaceId = userWorkspace.workspace.id;
      const token = await signApiToken({
        id: userId,
        email: userEmail,
        name: session.user.name,
      });
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      if (!architectureId) {
        const archListRes = await fetchFromApi(`/workspaces/${workspaceId}/architectures`, {
          headers,
          cache: 'no-store',
        }).catch(() => null);
        if (archListRes?.ok) {
          const archListData = await archListRes.json();
          if (Array.isArray(archListData.architectures) && archListData.architectures.length > 0) {
            architectureId = archListData.architectures[0].id;
          }
        }
      }

      if (!viewId && architectureId) {
        const viewsRes = await fetchFromApi(`/architectures/${architectureId}/views`, {
          headers,
          cache: 'no-store',
        }).catch(() => null);
        if (viewsRes?.ok) {
          const viewsData = await viewsRes.json();
          if (Array.isArray(viewsData.views) && viewsData.views.length > 0) {
            viewId = viewsData.views[0].id;
          }
        }
      }

      // Also ensure objects exist in model API
      const validNodeIds = new Set<string>();
      if (architectureId && nodes.length > 0) {
        for (const node of nodes) {
          // Check if object exists, if not create
          const getObj = await fetchFromApi(`/objects/${node.id}`, { headers }).catch(() => null);
          let objectExists = Boolean(getObj?.ok);
          if (!objectExists) {
            const createRes = await fetchFromApi(`/architectures/${architectureId}/objects`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                id: node.id,
                name: node.data?.label || node.id,
                kind: mapCanvasKindToModelKind(node.data?.kind),
                description: node.data?.description,
                parentId: node.data?.parentId,
                metadata: {
                  technology: node.data?.technology,
                  originalKind: node.data?.kind,
                  c4Level: node.data?.c4Level,
                },
              }),
            }).catch(() => null);
            objectExists = Boolean(createRes?.ok);

            if (viewId && objectExists) {
              await fetchFromApi(`/views/${viewId}/objects`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  objectId: node.id,
                  position: node.position,
                }),
              }).catch(() => null);
            }
          }

          if (objectExists) {
            validNodeIds.add(node.id);
          }
        }
      }

      // If viewId exists, persist positions per view via /views/:viewId/objects/positions for existing objects
      if (viewId && nodes.length > 0) {
        const eligibleNodes = architectureId ? nodes.filter((n) => validNodeIds.has(n.id)) : nodes;
        if (eligibleNodes.length > 0) {
          const positions = eligibleNodes.map((n) => ({
            objectId: n.id,
            x: Math.round(n.position.x),
            y: Math.round(n.position.y),
          }));

          await fetchFromApi(`/views/${viewId}/objects/positions`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ positions }),
          }).catch(() => null);
        }
      }

      // Also ensure connections exist in model API
      if (architectureId && edges.length > 0) {
        for (const edge of edges) {
          const getConn = await fetchFromApi(`/connections/${edge.id}`, { headers }).catch(() => null);
          if (!getConn?.ok) {
            await fetchFromApi(`/architectures/${architectureId}/connections`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                id: edge.id,
                sourceObjectId: edge.source,
                targetObjectId: edge.target,
                label: edge.label,
                kind: edge.data?.kind || 'sync',
                description: edge.data?.description,
              }),
            }).catch(() => null);
          }
        }
      }

      // Ensure any legacy blob in workspace settings is retired
      const getWsRes = await fetchFromApi(`/workspaces/${workspaceId}`, {
        headers,
        cache: 'no-store',
      }).catch(() => null);
      if (getWsRes?.ok) {
        const wsData = await getWsRes.json();
        const settings = wsData.workspace?.settings;
        if (settings?.studioDiagram) {
          const newSettings = { ...settings };
          delete newSettings.studioDiagram;
          await fetchFromApi(`/workspaces/${workspaceId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ settings: newSettings }),
          }).catch(() => null);
        }
      }

      savedToModel = true;
    }
  } catch (err) {
    console.warn('Failed to persist diagram to model API:', err);
  }

  // Also update in-memory store for fallback/tests
  if (nodes.length > 0) {
    const fallbackArchId = architectureId || 'arch-default';
    const fallbackViewId = viewId || 'view-default';
    for (const node of nodes) {
      if (!inMemModelStore.objects.has(node.id)) {
        inMemModelStore.objects.set(node.id, {
          id: node.id as unknown as ObjectId,
          architectureId: fallbackArchId as unknown as ArchitectureId,
          versionId: 'ver-default' as unknown as VersionId,
          kind: mapCanvasKindToModelKind(node.data?.kind),
          name: node.data?.label || node.id,
          description: node.data?.description ?? null,
          parentId: (node.data?.parentId ? (node.data.parentId as unknown as ObjectId) : null),
          metadata: {
            technology: node.data?.technology,
            originalKind: node.data?.kind,
            c4Level: node.data?.c4Level,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    const currentPositions = inMemModelStore.viewObjects.get(fallbackViewId) || [];
    for (const node of nodes) {
      const idx = currentPositions.findIndex((p) => p.objectId === node.id);
      if (idx >= 0) {
        currentPositions[idx] = {
          viewId: fallbackViewId,
          objectId: node.id,
          positionX: node.position.x,
          positionY: node.position.y,
        };
      } else {
        currentPositions.push({
          viewId: fallbackViewId,
          objectId: node.id,
          positionX: node.position.x,
          positionY: node.position.y,
        });
      }
    }
    inMemModelStore.viewObjects.set(fallbackViewId, currentPositions);
    savedToModel = true;
  }

  return NextResponse.json({
    success: true,
    savedToModel,
    architectureId,
    viewId,
    savedAt: payload.updatedAt,
  });
}

export async function DELETE(): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  serverCache.delete(userId);

  try {
    const userWorkspace = await getFirstUserWorkspace(userId, session.user.email, session.user.name);
    if (userWorkspace) {
      const token = await signApiToken({
        id: userId,
        email: session.user.email,
        name: session.user.name,
      });

      const getRes = await fetchFromApi(`/workspaces/${userWorkspace.workspace.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (getRes.ok) {
        const currentData = await getRes.json();
        const currentSettings = (currentData.workspace?.settings as Record<string, unknown>) || {};
        delete currentSettings.studioDiagram;

        await fetchFromApi(`/workspaces/${userWorkspace.workspace.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ settings: currentSettings }),
        });
      }
    }
  } catch (err) {
    console.warn('Failed to clear diagram in cloud workspace:', err);
  }

  return NextResponse.json({ success: true, message: 'Studio model state reset' });
}
