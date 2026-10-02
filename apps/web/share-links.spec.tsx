/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createShareLink,
  encodeShareLinkToken,
  decodeShareLinkToken,
  verifyShareLink,
  resolveAnonymousViewState,
  generateShareLinkUrl,
} from '@diagramhq/domain';
import {
  ShareLinkModal,
  ReadOnlyBanner,
} from './components/canvas';

describe('Share Links Integration & UI (F052)', () => {
  const WORKSPACE_ID = 'ws-share-demo';
  const VIEW_ID = 'view-level-2-containers';
  const NOW = 1_700_500_000;

  it('1. Acceptance Test: anonymous open preserves state (viewer position + selection; no account required)', () => {
    // 1. Author creates a share link preserving camera position and selection
    const payload = createShareLink({
      workspaceId: WORKSPACE_ID,
      viewId: VIEW_ID,
      camera: { panX: 350, panY: -120, zoom: 1.4 },
      selectedObjectId: 'obj-api-gateway',
      allowComments: true,
      now: NOW,
    });

    const shareUrl = generateShareLinkUrl('https://diagramhq.app', payload);
    expect(shareUrl).toContain('https://diagramhq.app/share?token=');

    // 2. Anonymous user receives URL and parses token
    const token = shareUrl.split('token=')[1]!;
    expect(token).toBeDefined();

    const decoded = decodeShareLinkToken(token);
    expect(decoded.workspaceId).toBe(WORKSPACE_ID);
    expect(decoded.viewId).toBe(VIEW_ID);

    // 3. Verify link without requiring authentication
    const verification = verifyShareLink(token, NOW + 60_000);
    expect(verification.valid).toBe(true);
    if (!verification.valid) throw new Error('Expected valid token');

    // 4. Resolve anonymous view state for canvas projection
    const anonymousState = resolveAnonymousViewState(verification.payload);

    // Assert complete state preservation
    expect(anonymousState.workspaceId).toBe(WORKSPACE_ID);
    expect(anonymousState.viewId).toBe(VIEW_ID);
    expect(anonymousState.camera.panX).toBe(350);
    expect(anonymousState.camera.panY).toBe(-120);
    expect(anonymousState.camera.zoom).toBe(1.4);
    expect(anonymousState.selectedObjectId).toBe('obj-api-gateway');
    expect(anonymousState.isReadOnly).toBe(true);
    expect(anonymousState.allowComments).toBe(true);
  });

  it('2. verifies expired share links are rejected', () => {
    const payload = createShareLink({
      workspaceId: WORKSPACE_ID,
      viewId: VIEW_ID,
      expiresInMs: 3600 * 1000, // 1 hour
      now: NOW,
    });

    const token = encodeShareLinkToken(payload);

    // Within expiration window: valid
    expect(verifyShareLink(token, NOW + 1800 * 1000).valid).toBe(true);

    // After expiration window: invalid with reason 'expired'
    const expiredCheck = verifyShareLink(token, NOW + 7200 * 1000);
    expect(expiredCheck.valid).toBe(false);
    if (!expiredCheck.valid) {
      expect(expiredCheck.reason).toBe('expired');
    }
  });

  it('3. renders the <ShareLinkModal /> component', () => {
    const html = renderToString(
      <ShareLinkModal
        isOpen={true}
        onClose={() => {}}
        workspaceId={WORKSPACE_ID}
        viewId={VIEW_ID}
        currentCamera={{ panX: 100, panY: 50, zoom: 1.2 }}
        selectedObjectId="obj-auth"
      />
    );

    expect(html).toContain('data-testid="share-link-modal"');
    expect(html).toContain('Share Diagram View');
    expect(html).toContain('data-testid="share-link-input"');
    expect(html).toContain('data-testid="share-copy-button"');
    expect(html).toContain('data-testid="share-opt-camera"');
    expect(html).toContain('data-testid="share-opt-selection"');
    expect(html).toContain('obj-auth');
    expect(html).toContain('data-testid="share-opt-expiry"');
    expect(html).toContain('Read-only access · No account or login required');
  });

  it('4. renders the <ReadOnlyBanner /> component for anonymous sessions', () => {
    const html = renderToString(
      <ReadOnlyBanner
        viewName="Level 2 Containers"
        selectedObjectName="Edge API Gateway"
        onResetView={() => {}}
      />
    );

    expect(html).toContain('data-testid="readonly-banner"');
    expect(html).toContain('Read-Only View');
    expect(html).toContain('Level 2 Containers');
    expect(html).toContain('Edge API Gateway');
    expect(html).toContain('data-testid="readonly-reset-btn"');
    expect(html).toContain('Reset Camera');
  });
});
