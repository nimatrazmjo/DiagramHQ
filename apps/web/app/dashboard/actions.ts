'use server';

import { auth } from '@/auth';
import { signApiToken } from '@/lib/api-token';
import { revalidatePath } from 'next/cache';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

    const res = await fetch(`${API_BASE}/organizations`, {
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

  try {
    const token = await signApiToken({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    const res = await fetch(`${API_BASE}/organizations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { tags: ['organizations'] },
      cache: 'no-store',
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.organizations || [];
  } catch {
    return [];
  }
}
