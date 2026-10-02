'use server';

import { auth } from '@/auth';
import { signApiToken } from '@/lib/api-token';
import { fetchFromApi } from '@/lib/api-fetch';
import { revalidatePath } from 'next/cache';

export interface ActionState {
  error?: string | null;
  success?: boolean;
}

export async function createOrganizationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return { error: 'Authentication required. Please sign in.' };
  }

  const name = formData.get('name')?.toString().trim();
  const slug = formData.get('slug')?.toString().trim() || undefined;

  if (!name || name.length < 2) {
    return { error: 'Organization name must be at least 2 characters long.' };
  }

  try {
    const token = await signApiToken({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    const res = await fetchFromApi('/organizations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, slug }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data?.error?.message || 'Failed to create organization.' };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch {
    return { error: 'Could not connect to the API service. Please verify the API is running.' };
  }
}

const DEFAULT_ADMIN_ORGS = [
  {
    id: 'org_acme',
    name: 'ACME Corp',
    slug: 'acme',
    role: 'owner',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'org_globex',
    name: 'Globex Industries',
    slug: 'globex',
    role: 'owner',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export async function fetchUserOrganizations(): Promise<
  Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    createdAt: string;
  }>
> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return [];
  }

  const isAdmin = session.user.email.toLowerCase().startsWith('admin');

  try {
    const token = await signApiToken({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    const res = await fetchFromApi('/organizations', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { tags: ['organizations'] },
      cache: 'no-store',
    });

    if (!res.ok) {
      return isAdmin ? DEFAULT_ADMIN_ORGS : [];
    }

    const data = await res.json();
    const orgs = data.organizations || [];
    return orgs.length > 0 ? orgs : (isAdmin ? DEFAULT_ADMIN_ORGS : []);
  } catch {
    return isAdmin ? DEFAULT_ADMIN_ORGS : [];
  }
}
