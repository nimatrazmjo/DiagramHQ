import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { canRoleWrite, RoleBadge } from './app/dashboard/role-badge';
import { updateMemberRoleAction } from './app/dashboard/member-actions';
import { auth } from '@/auth';
import { signApiToken } from '@/lib/api-token';
import { revalidatePath } from 'next/cache';
import type { Session } from 'next-auth';
import type { Mock } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/api-token', () => ({
  signApiToken: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockedAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockedSignApiToken = vi.mocked(signApiToken);
const mockedRevalidatePath = vi.mocked(revalidatePath);

const mockSession: Session = {
  user: { id: 'usr_123', email: 'admin@diagramhq.com', name: 'Admin User' },
  expires: new Date(Date.now() + 3600000).toISOString(),
};

const anonymousSession: Session = {
  user: { name: 'NoEmailOrId' },
  expires: new Date(Date.now() + 3600000).toISOString(),
};

describe('Role permissions - canRoleWrite', () => {
  it('returns false for viewer role', () => {
    expect(canRoleWrite('viewer')).toBe(false);
  });

  it('returns true for editor, admin, and owner roles', () => {
    expect(canRoleWrite('editor')).toBe(true);
    expect(canRoleWrite('admin')).toBe(true);
    expect(canRoleWrite('owner')).toBe(true);
  });

  it('handles case-insensitivity correctly', () => {
    expect(canRoleWrite('VIEWER')).toBe(false);
    expect(canRoleWrite('Editor')).toBe(true);
    expect(canRoleWrite('ADMIN')).toBe(true);
    expect(canRoleWrite('Owner')).toBe(true);
  });

  it('returns false for empty, null, undefined, or unrecognized roles', () => {
    expect(canRoleWrite('')).toBe(false);
    expect(canRoleWrite(null)).toBe(false);
    expect(canRoleWrite(undefined)).toBe(false);
    expect(canRoleWrite('guest')).toBe(false);
    expect(canRoleWrite('member')).toBe(false);
  });
});

describe('RoleBadge component', () => {
  it('applies purple styling for owner role', () => {
    const badge = RoleBadge({ role: 'owner' });
    expect(badge.props.className).toContain('bg-purple-100 text-purple-800 border-purple-200');
    expect(badge.props.children).toBe('owner');
  });

  it('applies blue styling for admin role', () => {
    const badge = RoleBadge({ role: 'admin' });
    expect(badge.props.className).toContain('bg-blue-100 text-blue-800 border-blue-200');
    expect(badge.props.children).toBe('admin');
  });

  it('applies green styling for editor role', () => {
    const badge = RoleBadge({ role: 'editor' });
    expect(badge.props.className).toContain('bg-green-100 text-green-800 border-green-200');
    expect(badge.props.children).toBe('editor');
  });

  it('applies gray styling for viewer role', () => {
    const badge = RoleBadge({ role: 'viewer' });
    expect(badge.props.className).toContain('bg-gray-100 text-gray-700 border-gray-200');
    expect(badge.props.children).toBe('viewer');
  });

  it('handles custom casing and fallback gracefully', () => {
    const uppercaseBadge = RoleBadge({ role: 'OWNER' });
    expect(uppercaseBadge.props.className).toContain('bg-purple-100 text-purple-800 border-purple-200');

    const unknownBadge = RoleBadge({ role: 'unknown-role' });
    expect(unknownBadge.props.className).toContain('bg-gray-100 text-gray-700 border-gray-200');
  });
});

describe('updateMemberRoleAction', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('rejects unauthenticated requests with error when session is null', async () => {
    mockedAuth.mockResolvedValueOnce(null);

    const result = await updateMemberRoleAction('org_123', 'mem_456', 'editor');
    expect(result).toHaveProperty('error');
    expect(result.error).toContain('Authentication required');
    expect(result.success).toBeUndefined();
  });

  it('rejects unauthenticated requests when session user lacks id or email', async () => {
    mockedAuth.mockResolvedValueOnce(anonymousSession);

    const result = await updateMemberRoleAction('org_123', 'mem_456', 'editor');
    expect(result).toHaveProperty('error');
    expect(result.error).toContain('Authentication required');
  });

  it('rejects requests with missing required parameters', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);

    const result = await updateMemberRoleAction('', 'mem_456', 'editor');
    expect(result).toHaveProperty('error');
    expect(result.error).toContain('required');
  });

  it('calls API with correct token and payload on success', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);
    mockedSignApiToken.mockResolvedValueOnce('signed-jwt-token-xyz');

    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn().mockImplementation(async (url, options) => {
      capturedUrl = url.toString();
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response;
    });

    const result = await updateMemberRoleAction('org_123', 'mem_456', 'admin');

    expect(result).toEqual({ success: true });
    expect(mockedSignApiToken).toHaveBeenCalledWith({
      id: 'usr_123',
      email: 'admin@diagramhq.com',
      name: 'Admin User',
    });
    expect(capturedUrl).toContain('/organizations/org_123/members/mem_456');
    expect(capturedOptions?.method).toBe('PATCH');

    const headers = capturedOptions?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe('Bearer signed-jwt-token-xyz');
    expect(headers?.['Content-Type']).toBe('application/json');

    expect(JSON.parse(capturedOptions?.body as string)).toEqual({
      role: 'admin',
    });

    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('handles 204 No Content response successfully', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);
    mockedSignApiToken.mockResolvedValueOnce('signed-jwt-token-xyz');

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    const result = await updateMemberRoleAction('org_123', 'mem_456', 'viewer');

    expect(result).toEqual({ success: true });
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('returns API error message when API responds with an error', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);
    mockedSignApiToken.mockResolvedValueOnce('signed-jwt-token-xyz');

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        error: { message: 'Only organization owners can modify member roles.' },
      }),
    } as Response);

    const result = await updateMemberRoleAction('org_123', 'mem_456', 'editor');

    expect(result).toEqual({ error: 'Only organization owners can modify member roles.' });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it('handles network or unexpected exceptions gracefully', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);
    mockedSignApiToken.mockRejectedValueOnce(new Error('Network connection timeout'));

    const result = await updateMemberRoleAction('org_123', 'mem_456', 'editor');

    expect(result).toEqual({ error: 'Network connection timeout' });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});
