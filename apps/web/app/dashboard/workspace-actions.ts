'use server';

import { auth } from '@/auth';
import { signApiToken } from '@/lib/api-token';
import { revalidatePath } from 'next/cache';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ActionState {
  error?: string | null;
  success?: boolean;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  orgId: string;
  createdAt: string;
  _count?: {
    architectures: number;
  };
}

export async function createWorkspaceAction(
  orgId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return { error: 'Authentication required.' };
  }

  const effectiveOrgId = orgId || formData?.get('orgId')?.toString().trim();
  if (!effectiveOrgId) {
    return { error: 'Organization ID is required.' };
  }

  const name = formData?.get('name')?.toString().trim();
  const slug = formData?.get('slug')?.toString().trim() || undefined;

  if (!name || name.length < 2) {
    return { error: 'Workspace name must be at least 2 characters long.' };
  }

  try {
    const token = await signApiToken({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    const res = await fetch(`${API_BASE}/organizations/${effectiveOrgId}/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, slug: slug || undefined }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { error: data?.error?.message || data?.message || 'Failed to create workspace.' };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Could not connect to the API service. Please verify the API is running.';
    return { error: message };
  }
}

export async function fetchOrgWorkspaces(
  orgId: string,
): Promise<Array<WorkspaceItem>> {
  if (!orgId) {
    return [];
  }

  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return [];
  }

  try {
    const token = await signApiToken({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    const res = await fetch(`${API_BASE}/organizations/${orgId}/workspaces`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.workspaces || (Array.isArray(data) ? data : []);
  } catch {
    return [];
  }
}
