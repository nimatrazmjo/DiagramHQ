import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { signApiToken } from '@/lib/api-token';
import { fetchFromApi } from '@/lib/api-fetch';
import { fetchUserOrganizations } from '@/app/dashboard/actions';
import { fetchOrgWorkspaces } from '@/app/dashboard/workspace-actions';

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
    });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  // 1. Try to load from user's primary workspace settings in API
  try {
    const userWorkspace = await getFirstUserWorkspace(userId, userEmail, session.user.name);
    if (userWorkspace) {
      const token = await signApiToken({
        id: userId,
        email: userEmail,
        name: session.user.name,
      });

      const res = await fetchFromApi(`/workspaces/${userWorkspace.workspace.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        const settings = data.workspace?.settings;
        if (settings?.studioDiagram) {
          // Update server memory cache
          serverCache.set(userId, settings.studioDiagram);
          return NextResponse.json({
            authenticated: true,
            user: session.user,
            diagram: settings.studioDiagram,
            workspaceId: userWorkspace.workspace.id,
            source: 'cloud',
          });
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch diagram from cloud workspace:', err);
  }

  // 2. Check server fallback cache
  const cachedDiagram = serverCache.get(userId) || null;

  return NextResponse.json({
    authenticated: true,
    user: session.user,
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid diagram payload' }, { status: 400 });
  }

  const payload = {
    ...(body as Record<string, unknown>),
    updatedAt: new Date().toISOString(),
    savedBy: userEmail,
  };

  // Always update server cache
  serverCache.set(userId, payload);

  // Attempt to persist to user's primary workspace in API
  let savedToWorkspace = false;
  try {
    const userWorkspace = await getFirstUserWorkspace(userId, userEmail, session.user.name);
    if (userWorkspace) {
      const token = await signApiToken({
        id: userId,
        email: userEmail,
        name: session.user.name,
      });

      // Fetch current workspace settings first
      const getRes = await fetchFromApi(`/workspaces/${userWorkspace.workspace.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      let currentSettings: Record<string, unknown> = {};
      if (getRes.ok) {
        const currentData = await getRes.json();
        currentSettings = (currentData.workspace?.settings as Record<string, unknown>) || {};
      }

      // Update workspace settings with studioDiagram
      const patchRes = await fetchFromApi(`/workspaces/${userWorkspace.workspace.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settings: {
            ...currentSettings,
            studioDiagram: payload,
          },
        }),
      });

      if (patchRes.ok) {
        savedToWorkspace = true;
      }
    }
  } catch (err) {
    console.warn('Failed to persist diagram to cloud workspace:', err);
  }

  return NextResponse.json({
    success: true,
    savedToWorkspace,
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

  return NextResponse.json({ success: true, message: 'Studio diagram reset' });
}
