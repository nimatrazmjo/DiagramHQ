'use server';

import { auth } from '@/auth';
import { signApiToken } from '@/lib/api-token';
import { revalidatePath } from 'next/cache';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UpdateMemberRoleResult {
  success?: boolean;
  error?: string;
}

export async function updateMemberRoleAction(
  orgId: string,
  memberId: string,
  newRole: string,
): Promise<UpdateMemberRoleResult> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return { error: 'Authentication required. Please sign in.' };
  }

  if (!orgId || !memberId || !newRole) {
    return { error: 'Organization ID, member ID, and role are required.' };
  }

  try {
    const token = await signApiToken({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    const res = await fetch(`${API_BASE}/organizations/${orgId}/members/${memberId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      revalidatePath('/dashboard');
      return { success: true };
    }

    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      message?: string;
    };

    return {
      error: data?.error?.message || data?.message || 'Failed to update member role.',
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Could not connect to the API service. Please verify the API is running.';
    return { error: message };
  }
}
