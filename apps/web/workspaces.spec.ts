import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createWorkspaceAction, fetchOrgWorkspaces } from './app/dashboard/workspace-actions';
import { auth } from '@/auth';
import { signApiToken } from '@/lib/api-token';
import { revalidatePath } from 'next/cache';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/api-token', () => ({
  signApiToken: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import type { Session } from 'next-auth';
import type { Mock } from 'vitest';

const mockedAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockedSignApiToken = vi.mocked(signApiToken);
const mockedRevalidatePath = vi.mocked(revalidatePath);

const mockSession: Session = {
  user: { id: 'usr_123', email: 'test@diagramhq.com', name: 'Tester' },
  expires: new Date(Date.now() + 3600000).toISOString(),
};

const anonymousSession: Session = {
  user: { name: 'Anonymous' },
  expires: new Date(Date.now() + 3600000).toISOString(),
};

describe('createWorkspaceAction', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns error when user is not authenticated', async () => {
    mockedAuth.mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.append('name', 'Architecture Core');

    const result = await createWorkspaceAction('org_123', {}, formData);
    expect(result).toEqual({ error: 'Authentication required.' });
  });

  it('returns error when session user is missing id or email', async () => {
    mockedAuth.mockResolvedValueOnce(anonymousSession);

    const formData = new FormData();
    formData.append('name', 'Architecture Core');

    const result = await createWorkspaceAction('org_123', {}, formData);
    expect(result).toEqual({ error: 'Authentication required.' });
  });

  it('returns error when workspace name is less than 2 characters long', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);

    const formData = new FormData();
    formData.append('name', 'A');

    const result = await createWorkspaceAction('org_123', {}, formData);
    expect(result).toEqual({ error: 'Workspace name must be at least 2 characters long.' });
  });

  it('returns error when workspace name is empty or whitespace', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);

    const formData = new FormData();
    formData.append('name', '   ');

    const result = await createWorkspaceAction('org_123', {}, formData);
    expect(result).toEqual({ error: 'Workspace name must be at least 2 characters long.' });
  });

  it('calls API and returns success when valid name and slug are provided', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);
    mockedSignApiToken.mockResolvedValueOnce('mocked-token-xyz');

    let requestUrl = '';
    let requestOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn().mockImplementation(async (url, options) => {
      requestUrl = url.toString();
      requestOptions = options;
      return {
        ok: true,
        json: async () => ({
          workspace: {
            id: 'ws_123',
            name: 'Core Banking',
            slug: 'core-banking',
            orgId: 'org_123',
          },
        }),
      } as Response;
    });

    const formData = new FormData();
    formData.append('name', 'Core Banking');
    formData.append('slug', 'core-banking');

    const result = await createWorkspaceAction('org_123', {}, formData);

    expect(result).toEqual({ success: true });
    expect(mockedSignApiToken).toHaveBeenCalledWith({
      id: 'usr_123',
      email: 'test@diagramhq.com',
      name: 'Tester',
    });
    expect(requestUrl).toContain('/organizations/org_123/workspaces');
    expect(requestOptions?.method).toBe('POST');
    const headers = requestOptions?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe('Bearer mocked-token-xyz');
    expect(JSON.parse(requestOptions?.body as string)).toEqual({
      name: 'Core Banking',
      slug: 'core-banking',
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('returns error message from API if API returns non-ok status', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);
    mockedSignApiToken.mockResolvedValueOnce('mocked-token-xyz');

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { message: 'Workspace with slug already exists in this organization.' },
      }),
    } as Response);

    const formData = new FormData();
    formData.append('name', 'Existing Workspace');
    formData.append('slug', 'existing-workspace');

    const result = await createWorkspaceAction('org_123', {}, formData);
    expect(result).toEqual({ error: 'Workspace with slug already exists in this organization.' });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it('handles connection or unexpected errors gracefully', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);
    mockedSignApiToken.mockRejectedValueOnce(new Error('JWT signing error'));

    const formData = new FormData();
    formData.append('name', 'Valid Name');

    const result = await createWorkspaceAction('org_123', {}, formData);
    expect(result).toEqual({ error: 'JWT signing error' });
  });
});

describe('fetchOrgWorkspaces', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns empty array if orgId is not provided', async () => {
    const result = await fetchOrgWorkspaces('');
    expect(result).toEqual([]);
  });

  it('returns empty array if user is unauthenticated', async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await fetchOrgWorkspaces('org_123');
    expect(result).toEqual([]);
  });

  it('returns empty array on API fetch error', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);
    mockedSignApiToken.mockResolvedValueOnce('mocked-token');

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' }),
    } as Response);

    const result = await fetchOrgWorkspaces('org_123');
    expect(result).toEqual([]);
  });

  it('returns workspaces list on successful fetch', async () => {
    mockedAuth.mockResolvedValueOnce(mockSession);
    mockedSignApiToken.mockResolvedValueOnce('mocked-token');

    const mockWorkspaces = [
      {
        id: 'ws_1',
        name: 'Workspace Alpha',
        slug: 'workspace-alpha',
        orgId: 'org_123',
        createdAt: '2026-09-26T12:00:00.000Z',
        _count: { architectures: 3 },
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workspaces: mockWorkspaces }),
    } as Response);

    const result = await fetchOrgWorkspaces('org_123');
    expect(result).toEqual(mockWorkspaces);
  });
});
