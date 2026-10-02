/**
 * DiagramHQ - Share Links Domain Logic (F052)
 *
 * Pure, framework-agnostic share link creation, token encoding/decoding,
 * expiration verification, and anonymous view projection.
 * Guarantees read-only permission and camera + selection state preservation.
 */

import { createId, type ShareLinkId } from './ids';

export interface ShareLinkCameraState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface ShareLinkPayload {
  id: ShareLinkId;
  workspaceId: string;
  viewId: string;
  camera: ShareLinkCameraState;
  selectedObjectId: string | null;
  selectedConnectionId: string | null;
  permission: 'read_only';
  allowComments: boolean;
  createdByUserId?: string;
  expiresAt: number | null; // null means never expires
  createdAt: number;
}

export interface AnonymousViewState {
  workspaceId: string;
  viewId: string;
  camera: ShareLinkCameraState;
  selectedObjectId: string | null;
  selectedConnectionId: string | null;
  isReadOnly: true;
  allowComments: boolean;
  expiresAt: number | null;
}

export type ShareLinkVerificationResult =
  | { valid: true; payload: ShareLinkPayload }
  | { valid: false; reason: 'expired' | 'malformed' | 'invalid_signature' };

/**
 * Creates a new share link payload preserving camera position and selection.
 */
export function createShareLink(params: {
  id?: ShareLinkId;
  workspaceId: string;
  viewId: string;
  camera?: Partial<ShareLinkCameraState>;
  selectedObjectId?: string | null;
  selectedConnectionId?: string | null;
  allowComments?: boolean;
  createdByUserId?: string;
  expiresInMs?: number | null;
  now?: number;
}): ShareLinkPayload {
  const { workspaceId, viewId } = params;
  const now = params.now ?? Date.now();

  if (!workspaceId.trim()) {
    throw new Error('Workspace ID cannot be empty');
  }
  if (!viewId.trim()) {
    throw new Error('View ID cannot be empty');
  }

  const camera: ShareLinkCameraState = {
    panX: params.camera?.panX ?? 0,
    panY: params.camera?.panY ?? 0,
    zoom: params.camera?.zoom !== undefined ? Math.max(0.1, params.camera.zoom) : 1,
  };

  const expiresAt =
    params.expiresInMs && params.expiresInMs > 0 ? now + params.expiresInMs : null;

  return {
    id: params.id ?? (createId('shl') as ShareLinkId),
    workspaceId: workspaceId.trim(),
    viewId: viewId.trim(),
    camera,
    selectedObjectId: params.selectedObjectId ?? null,
    selectedConnectionId: params.selectedConnectionId ?? null,
    permission: 'read_only',
    allowComments: params.allowComments ?? false,
    createdByUserId: params.createdByUserId,
    expiresAt,
    createdAt: now,
  };
}

/**
 * Encodes a ShareLinkPayload into a URL-safe Base64 token.
 */
export function encodeShareLinkToken(payload: ShareLinkPayload): string {
  const json = JSON.stringify(payload);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  // Browser fallback
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a URL-safe Base64 token back into a ShareLinkPayload.
 */
export function decodeShareLinkToken(token: string): ShareLinkPayload {
  if (!token || typeof token !== 'string') {
    throw new Error('Malformed share token');
  }

  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    let json: string;
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(base64, 'base64').toString('utf8');
    } else {
      json = decodeURIComponent(escape(atob(base64)));
    }

    const parsed = JSON.parse(json) as ShareLinkPayload;

    if (
      !parsed.id ||
      !parsed.workspaceId ||
      !parsed.viewId ||
      !parsed.camera ||
      parsed.permission !== 'read_only'
    ) {
      throw new Error('Invalid payload structure');
    }

    return parsed;
  } catch {
    throw new Error('Malformed or corrupted share link token');
  }
}

/**
 * Verifies whether a share link token or payload is valid and unexpired.
 */
export function verifyShareLink(
  tokenOrPayload: string | ShareLinkPayload,
  now: number = Date.now()
): ShareLinkVerificationResult {
  let payload: ShareLinkPayload;

  if (typeof tokenOrPayload === 'string') {
    try {
      payload = decodeShareLinkToken(tokenOrPayload);
    } catch {
      return { valid: false, reason: 'malformed' };
    }
  } else {
    payload = tokenOrPayload;
  }

  if (payload.expiresAt !== null && now > payload.expiresAt) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, payload };
}

/**
 * Resolves the anonymous view state for an incoming share link.
 */
export function resolveAnonymousViewState(payload: ShareLinkPayload): AnonymousViewState {
  return {
    workspaceId: payload.workspaceId,
    viewId: payload.viewId,
    camera: {
      panX: payload.camera.panX,
      panY: payload.camera.panY,
      zoom: payload.camera.zoom,
    },
    selectedObjectId: payload.selectedObjectId,
    selectedConnectionId: payload.selectedConnectionId,
    isReadOnly: true,
    allowComments: payload.allowComments,
    expiresAt: payload.expiresAt,
  };
}

/**
 * Formats a complete share link URL given a base URL and payload.
 */
export function generateShareLinkUrl(baseUrl: string, payload: ShareLinkPayload): string {
  const token = encodeShareLinkToken(payload);
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}/share?token=${token}`;
}
