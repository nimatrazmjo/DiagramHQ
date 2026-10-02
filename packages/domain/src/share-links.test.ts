import { describe, it, expect } from 'vitest';
import {
  createShareLink,
  encodeShareLinkToken,
  decodeShareLinkToken,
  verifyShareLink,
  resolveAnonymousViewState,
  generateShareLinkUrl,
} from './share-links';

describe('Share Links Domain Logic (F052)', () => {
  const WORKSPACE_ID = 'ws-fintech-99';
  const VIEW_ID = 'view-container-payments';
  const NOW = 1_700_500_000;

  it('1. creates a read-only share link payload with camera and selection', () => {
    const payload = createShareLink({
      workspaceId: WORKSPACE_ID,
      viewId: VIEW_ID,
      camera: { panX: 250, panY: -80, zoom: 1.5 },
      selectedObjectId: 'obj-payment-service',
      allowComments: true,
      expiresInMs: 3600 * 1000, // 1 hour
      now: NOW,
    });

    expect(payload.id).toMatch(/^shl_/);
    expect(payload.workspaceId).toBe(WORKSPACE_ID);
    expect(payload.viewId).toBe(VIEW_ID);
    expect(payload.camera).toEqual({ panX: 250, panY: -80, zoom: 1.5 });
    expect(payload.selectedObjectId).toBe('obj-payment-service');
    expect(payload.permission).toBe('read_only');
    expect(payload.allowComments).toBe(true);
    expect(payload.expiresAt).toBe(NOW + 3600 * 1000);
  });

  it('2. validates required fields on creation', () => {
    expect(() =>
      createShareLink({ workspaceId: '', viewId: VIEW_ID })
    ).toThrow('Workspace ID cannot be empty');

    expect(() =>
      createShareLink({ workspaceId: WORKSPACE_ID, viewId: '  ' })
    ).toThrow('View ID cannot be empty');
  });

  it('3. encodes and decodes share link token faithfully', () => {
    const original = createShareLink({
      workspaceId: WORKSPACE_ID,
      viewId: VIEW_ID,
      camera: { panX: 100, panY: 200, zoom: 0.8 },
      selectedObjectId: 'obj-ledger-db',
      now: NOW,
    });

    const token = encodeShareLinkToken(original);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const decoded = decodeShareLinkToken(token);
    expect(decoded.id).toBe(original.id);
    expect(decoded.workspaceId).toBe(original.workspaceId);
    expect(decoded.viewId).toBe(original.viewId);
    expect(decoded.camera).toEqual(original.camera);
    expect(decoded.selectedObjectId).toBe(original.selectedObjectId);
    expect(decoded.permission).toBe('read_only');
  });

  it('4. rejects malformed share link tokens', () => {
    expect(() => decodeShareLinkToken('not-a-valid-token')).toThrow();
  });

  it('5. verifies token expiration correctly', () => {
    const unexpired = createShareLink({
      workspaceId: WORKSPACE_ID,
      viewId: VIEW_ID,
      expiresInMs: 10_000,
      now: NOW,
    });

    // Valid immediately
    const check1 = verifyShareLink(unexpired, NOW + 5_000);
    expect(check1.valid).toBe(true);

    // Expired after 15s
    const check2 = verifyShareLink(unexpired, NOW + 15_000);
    expect(check2.valid).toBe(false);
    if (!check2.valid) {
      expect(check2.reason).toBe('expired');
    }
  });

  it('6. Acceptance Test: anonymous open preserves state (viewer position + selection; no account required)', () => {
    // 1. Authenticated user generates share link with exact pan, zoom, and active selection
    const payload = createShareLink({
      workspaceId: WORKSPACE_ID,
      viewId: VIEW_ID,
      camera: { panX: 420, panY: -150, zoom: 1.25 },
      selectedObjectId: 'obj-api-gateway',
      allowComments: false,
      now: NOW,
    });

    const shareUrl = generateShareLinkUrl('https://diagramhq.com', payload);
    expect(shareUrl).toContain('https://diagramhq.com/share?token=');

    // Extract token from URL
    const token = shareUrl.split('token=')[1]!;

    // 2. Anonymous viewer opens link without authentication
    const verification = verifyShareLink(token, NOW + 100);
    expect(verification.valid).toBe(true);
    if (!verification.valid) throw new Error('Expected valid token');

    // 3. Resolve anonymous view state for canvas projection
    const anonymousState = resolveAnonymousViewState(verification.payload);

    // Exact state preservation verified
    expect(anonymousState.workspaceId).toBe(WORKSPACE_ID);
    expect(anonymousState.viewId).toBe(VIEW_ID);
    expect(anonymousState.camera.panX).toBe(420);
    expect(anonymousState.camera.panY).toBe(-150);
    expect(anonymousState.camera.zoom).toBe(1.25);
    expect(anonymousState.selectedObjectId).toBe('obj-api-gateway');
    expect(anonymousState.isReadOnly).toBe(true);
  });
});
