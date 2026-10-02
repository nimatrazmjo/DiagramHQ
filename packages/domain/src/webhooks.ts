/**
 * DiagramHQ - Outbound Webhooks & Event Notification Engine (F126)
 *
 * Implements outbound webhook delivery and lifecycle event notification:
 * - Emits:
 *   - object.* (object.created, object.updated, object.deleted)
 *   - connection.* (connection.created, connection.updated, connection.deleted)
 *   - diagram.created, flow.created
 *   - architecture.updated, version.created
 *   - change.approved, change.merged
 * - Cryptographic HMAC SHA-256 payload signing (X-Hub-Signature-256)
 * - Subscription registry, event filtering, wildcard topic matching, and delivery audit logs
 * - Test sink integration for end-to-end event verification
 */

import type { ArchitectureId, WorkspaceId } from './ids';

export type WebhookEventType =
  | 'object.created'
  | 'object.updated'
  | 'object.deleted'
  | 'connection.created'
  | 'connection.updated'
  | 'connection.deleted'
  | 'diagram.created'
  | 'flow.created'
  | 'architecture.updated'
  | 'version.created'
  | 'change.approved'
  | 'change.merged'
  | '*';

export const ALL_WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  'object.created',
  'object.updated',
  'object.deleted',
  'connection.created',
  'connection.updated',
  'connection.deleted',
  'diagram.created',
  'flow.created',
  'architecture.updated',
  'version.created',
  'change.approved',
  'change.merged',
];

export interface WebhookSubscription {
  id: string;
  workspaceId: WorkspaceId;
  architectureId?: ArchitectureId;
  targetUrl: string;
  secretToken: string;
  description?: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OutboundWebhookPayload<T = unknown> {
  eventId: string;
  event: WebhookEventType;
  timestamp: string;
  workspaceId: WorkspaceId;
  architectureId?: ArchitectureId;
  actorId?: string;
  data: T;
}

export type WebhookEventPayload<T = unknown> = OutboundWebhookPayload<T>;

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface WebhookDeliveryLog {
  id: string;
  subscriptionId: string;
  eventId: string;
  targetUrl: string;
  event: WebhookEventType;
  status: WebhookDeliveryStatus;
  httpStatusCode?: number;
  latencyMs: number;
  signature: string;
  attemptCount: number;
  error?: string;
  deliveredAt: string;
}

export interface WebhookRegistry {
  workspaceId: WorkspaceId;
  subscriptions: WebhookSubscription[];
  deliveryLogs: WebhookDeliveryLog[];
}

export interface CreateWebhookSubscriptionInput {
  workspaceId: WorkspaceId;
  architectureId?: ArchitectureId;
  targetUrl: string;
  secretToken?: string;
  description?: string;
  events: WebhookEventType[];
  isActive?: boolean;
}

export type WebhookHttpSink = (
  url: string,
  headers: Record<string, string>,
  body: string
) => Promise<{ status: number; body?: string }>;

// ============================================================================
// Pure TypeScript SHA-256 & HMAC (Framework & Platform Agnostic)
// ============================================================================

function sha256(ascii: string): Uint8Array {
  let i: number, j: number;

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (i = 0; i < ascii.length; i++) {
    const code = ascii.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | ((code & 0xff) << (24 - (i % 4) * 8));
  }

  words[asciiBitLength >> 5] = (words[asciiBitLength >> 5] || 0) | (0x80 << (24 - (asciiBitLength % 32)));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w: number[] = [];
  for (i = 0; i < words.length; i += 16) {
    const subHash = hash.slice(0);
    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] || 0;
      } else {
        const gamma0 =
          ((w[j - 15]! >>> 7) | (w[j - 15]! << 25)) ^
          ((w[j - 15]! >>> 18) | (w[j - 15]! << 14)) ^
          (w[j - 15]! >>> 3);
        const gamma1 =
          ((w[j - 2]! >>> 17) | (w[j - 2]! << 15)) ^
          ((w[j - 2]! >>> 19) | (w[j - 2]! << 13)) ^
          (w[j - 2]! >>> 10);
        w[j] = (w[j - 16]! + gamma0 + w[j - 7]! + gamma1) | 0;
      }

      const s1 =
        ((subHash[4]! >>> 6) | (subHash[4]! << 26)) ^
        ((subHash[4]! >>> 11) | (subHash[4]! << 21)) ^
        ((subHash[4]! >>> 25) | (subHash[4]! << 7));
      const ch = (subHash[4]! & subHash[5]!) ^ (~subHash[4]! & subHash[6]!);
      const temp1 = (subHash[7]! + s1 + ch + k[j]! + w[j]!) | 0;

      const s0 =
        ((subHash[0]! >>> 2) | (subHash[0]! << 30)) ^
        ((subHash[0]! >>> 13) | (subHash[0]! << 19)) ^
        ((subHash[0]! >>> 22) | (subHash[0]! << 10));
      const maj =
        (subHash[0]! & subHash[1]!) ^
        (subHash[0]! & subHash[2]!) ^
        (subHash[1]! & subHash[2]!);
      const temp2 = (s0 + maj) | 0;

      subHash[7] = subHash[6]!;
      subHash[6] = subHash[5]!;
      subHash[5] = subHash[4]!;
      subHash[4] = (subHash[3]! + temp1) | 0;
      subHash[3] = subHash[2]!;
      subHash[2] = subHash[1]!;
      subHash[1] = subHash[0]!;
      subHash[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j]! + subHash[j]!) | 0;
    }
  }

  const out = new Uint8Array(32);
  for (i = 0; i < 8; i++) {
    out[i * 4] = (hash[i]! >>> 24) & 0xff;
    out[i * 4 + 1] = (hash[i]! >>> 16) & 0xff;
    out[i * 4 + 2] = (hash[i]! >>> 8) & 0xff;
    out[i * 4 + 3] = hash[i]! & 0xff;
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

function bytesToAscii(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]!);
  }
  return str;
}

/**
 * Computes standard HMAC-SHA256 signature for a payload using a secret key.
 */
export function generateHmacSignature(payload: string, secret: string): string {
  const blockSize = 64;
  let keyBytes: Uint8Array;

  if (secret.length > blockSize) {
    keyBytes = sha256(secret);
  } else {
    keyBytes = new Uint8Array(blockSize);
    for (let i = 0; i < secret.length; i++) {
      keyBytes[i] = secret.charCodeAt(i);
    }
  }

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);

  for (let i = 0; i < blockSize; i++) {
    const kByte = keyBytes[i] || 0;
    oKeyPad[i] = kByte ^ 0x5c;
    iKeyPad[i] = kByte ^ 0x36;
  }

  const innerHash = sha256(bytesToAscii(iKeyPad) + payload);
  const outerHash = sha256(bytesToAscii(oKeyPad) + bytesToAscii(innerHash));

  return `sha256=${bytesToHex(outerHash)}`;
}

/**
 * Validates whether an incoming signature matches the calculated HMAC-SHA256.
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateHmacSignature(payload, secret);
  return expectedSignature === signature;
}

// ============================================================================
// Registry & Subscription Management
// ============================================================================

export function createWebhookRegistry(workspaceId: WorkspaceId): WebhookRegistry {
  return {
    workspaceId,
    subscriptions: [],
    deliveryLogs: [],
  };
}

export function createWebhookSubscription(input: CreateWebhookSubscriptionInput): WebhookSubscription {
  const now = new Date().toISOString();
  const subId = `wh-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const secret = input.secretToken || `whsec_${Math.random().toString(36).substring(2, 18)}`;

  return {
    id: subId,
    workspaceId: input.workspaceId,
    architectureId: input.architectureId,
    targetUrl: input.targetUrl,
    secretToken: secret,
    description: input.description,
    events: input.events.length > 0 ? [...input.events] : ['*'],
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

export function addWebhookSubscription(
  registry: WebhookRegistry,
  subscription: WebhookSubscription
): WebhookRegistry {
  return {
    ...registry,
    subscriptions: [...registry.subscriptions, subscription],
  };
}

export function updateWebhookSubscription(
  registry: WebhookRegistry,
  subscriptionId: string,
  updates: Partial<Omit<WebhookSubscription, 'id' | 'workspaceId' | 'createdAt'>>
): WebhookRegistry {
  const now = new Date().toISOString();
  return {
    ...registry,
    subscriptions: registry.subscriptions.map((s) => {
      if (s.id !== subscriptionId) return s;
      return {
        ...s,
        ...updates,
        updatedAt: now,
      };
    }),
  };
}

export function deleteWebhookSubscription(
  registry: WebhookRegistry,
  subscriptionId: string
): WebhookRegistry {
  return {
    ...registry,
    subscriptions: registry.subscriptions.filter((s) => s.id !== subscriptionId),
  };
}

// ============================================================================
// Event Formatting & Matching
// ============================================================================

export function formatWebhookPayload<T = unknown>(
  event: WebhookEventType,
  workspaceId: WorkspaceId,
  data: T,
  options?: { architectureId?: ArchitectureId; actorId?: string }
): OutboundWebhookPayload<T> {
  const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  return {
    eventId,
    event,
    timestamp: new Date().toISOString(),
    workspaceId,
    architectureId: options?.architectureId,
    actorId: options?.actorId,
    data,
  };
}

/**
 * Finds all active subscriptions matching a given event type and architecture scope.
 */
export function matchSubscribedWebhooks(
  registry: WebhookRegistry,
  event: WebhookEventType,
  architectureId?: ArchitectureId
): WebhookSubscription[] {
  return registry.subscriptions.filter((sub) => {
    if (!sub.isActive) return false;

    // Check architecture scoping
    if (sub.architectureId && architectureId && sub.architectureId !== architectureId) {
      return false;
    }

    // Wildcard matches all events
    if (sub.events.includes('*')) return true;

    // Exact event match
    if (sub.events.includes(event)) return true;

    // Wildcard prefix matches (e.g. object.* or connection.*)
    const [eventCategory] = event.split('.');
    if (eventCategory && sub.events.includes(`${eventCategory}.*` as WebhookEventType)) {
      return true;
    }

    return false;
  });
}

// ============================================================================
// Webhook Event Dispatcher & Sink Engine
// ============================================================================

export async function dispatchWebhookEvent(
  registry: WebhookRegistry,
  event: WebhookEventType,
  payload: OutboundWebhookPayload,
  sink?: WebhookHttpSink
): Promise<{ registry: WebhookRegistry; results: WebhookDeliveryLog[] }> {
  const matchedSubs = matchSubscribedWebhooks(registry, event, payload.architectureId);
  const payloadString = JSON.stringify(payload);
  const results: WebhookDeliveryLog[] = [];
  const now = new Date().toISOString();

  for (const sub of matchedSubs) {
    const signature = generateHmacSignature(payloadString, sub.secretToken);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-DiagramHQ-Event': event,
      'X-DiagramHQ-Delivery': payload.eventId,
      'X-Hub-Signature-256': signature,
    };

    const startTime = Date.now();
    let status: WebhookDeliveryStatus = 'success';
    let httpStatusCode = 200;
    let error: string | undefined;

    if (sink) {
      try {
        const response = await sink(sub.targetUrl, headers, payloadString);
        httpStatusCode = response.status;
        if (response.status < 200 || response.status >= 300) {
          status = 'failed';
          error = `HTTP response status code ${response.status}`;
        }
      } catch (err) {
        status = 'failed';
        httpStatusCode = 500;
        error = err instanceof Error ? err.message : String(err);
      }
    }

    const latencyMs = Math.max(1, Date.now() - startTime);
    const logId = `del-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const logEntry: WebhookDeliveryLog = {
      id: logId,
      subscriptionId: sub.id,
      eventId: payload.eventId,
      targetUrl: sub.targetUrl,
      event,
      status,
      httpStatusCode,
      latencyMs,
      signature,
      attemptCount: 1,
      error,
      deliveredAt: now,
    };

    results.push(logEntry);
  }

  const updatedRegistry: WebhookRegistry = {
    ...registry,
    deliveryLogs: [...results, ...registry.deliveryLogs].slice(0, 100), // keep latest 100 logs
  };

  return {
    registry: updatedRegistry,
    results,
  };
}
