import {
  createId,
  type CommentId,
  type ObjectId,
  type PullRequestId,
  type UserId,
  type ViewId,
} from './ids';

// ============================================================================
// 1. Viewport & Desktop-First Canvas Invariant
// ============================================================================

export const MOBILE_VIEWPORT_BREAKPOINT_PX = 768;

export type CanvasDisplayMode = 'desktop_canvas' | 'mobile_companion';

export interface CanvasDisplayConfig {
  readonly mode: CanvasDisplayMode;
  readonly isCanvasEditingEnabled: boolean;
  readonly isMobileOptimized: boolean;
  readonly advisoryMessage: string;
}

/**
 * Determines whether a given viewport width falls in the mobile breakpoint.
 */
export function isMobileViewport(widthPx: number): boolean {
  return widthPx < MOBILE_VIEWPORT_BREAKPOINT_PX;
}

/**
 * Invariant: Canvas stays desktop-first.
 * Complex 2D node drag-and-drop, multi-select alignment, and connection routing
 * are reserved for desktop viewports. On mobile, the mobile companion is activated
 * providing first-class viewing, approvals, comments, search, and AI queries.
 */
export function getCanvasDisplayMode(viewportWidthPx: number): CanvasDisplayConfig {
  if (isMobileViewport(viewportWidthPx)) {
    return {
      mode: 'mobile_companion',
      isCanvasEditingEnabled: false,
      isMobileOptimized: true,
      advisoryMessage:
        'Canvas layout and node editing is desktop-first. Mobile companion is active for viewing, review approvals, comments, and AI queries.',
    };
  }

  return {
    mode: 'desktop_canvas',
    isCanvasEditingEnabled: true,
    isMobileOptimized: false,
    advisoryMessage: 'Full interactive 2D desktop canvas active.',
  };
}

// ============================================================================
// 2. Mobile View Cards & Navigation
// ============================================================================

export type MobileTab = 'views' | 'search' | 'approvals' | 'comments' | 'notifications' | 'ai';

export interface MobileViewSummary {
  readonly id: ViewId;
  readonly name: string;
  readonly level: 'context' | 'container' | 'component';
  readonly objectCount: number;
  readonly description: string;
  readonly previewThumbnailColor: string;
}

export interface MobileSearchableItem {
  readonly id: string;
  readonly type: 'view' | 'object' | 'decision' | 'change';
  readonly title: string;
  readonly subtitle: string;
  readonly tags: readonly string[];
}

/**
 * Fast client-side fuzzy search across architecture views, objects, and ADRs.
 */
export function searchMobileCatalog(
  query: string,
  items: readonly MobileSearchableItem[],
): MobileSearchableItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return [...items];

  return items.filter((item) => {
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchSub = item.subtitle.toLowerCase().includes(q);
    const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
    return matchTitle || matchSub || matchTags;
  });
}

// ============================================================================
// 3. Mobile Approvals Workflow (Pull Requests & Changes)
// ============================================================================

export interface MobileApprovalChange {
  readonly id: PullRequestId;
  readonly title: string;
  readonly authorName: string;
  readonly summary: string;
  readonly affectedComponentNames: readonly string[];
  readonly status: 'pending' | 'approved' | 'rejected';
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
  readonly reviewNotes?: string;
}

/**
 * Approves an architecture change / PR directly from mobile viewport.
 */
export function approveArchitectureChange(
  change: MobileApprovalChange,
  reviewerName: string,
  notes?: string,
): MobileApprovalChange {
  const now = new Date().toISOString();
  return {
    ...change,
    status: 'approved',
    reviewedBy: reviewerName,
    reviewedAt: now,
    reviewNotes: notes ?? 'Approved via DiagramHQ Mobile Companion.',
  };
}

/**
 * Rejects an architecture change / PR with required rationale.
 */
export function rejectArchitectureChange(
  change: MobileApprovalChange,
  reviewerName: string,
  reason: string,
): MobileApprovalChange {
  const now = new Date().toISOString();
  return {
    ...change,
    status: 'rejected',
    reviewedBy: reviewerName,
    reviewedAt: now,
    reviewNotes: reason,
  };
}

// ============================================================================
// 4. Mobile Comments & Threading
// ============================================================================

export interface MobileCommentAuthor {
  readonly userId: UserId;
  readonly name: string;
  readonly avatarInitials: string;
}

export interface MobileComment {
  readonly id: CommentId;
  readonly author: MobileCommentAuthor;
  readonly targetObjectId?: ObjectId;
  readonly targetTitle: string;
  readonly text: string;
  readonly createdAt: string;
  readonly status: 'open' | 'resolved';
}

export interface AddMobileCommentParams {
  readonly author: MobileCommentAuthor;
  readonly targetTitle: string;
  readonly text: string;
  readonly targetObjectId?: ObjectId;
}

/**
 * Creates and appends a mobile comment on an architectural component or view.
 */
export function addMobileComment(params: AddMobileCommentParams): MobileComment {
  return {
    id: createId('cmt'),
    author: params.author,
    targetObjectId: params.targetObjectId,
    targetTitle: params.targetTitle,
    text: params.text.trim(),
    createdAt: new Date().toISOString(),
    status: 'open',
  };
}

/**
 * Resolves a mobile comment thread.
 */
export function resolveMobileComment(comment: MobileComment): MobileComment {
  return {
    ...comment,
    status: 'resolved',
  };
}

// ============================================================================
// 5. Mobile Notifications
// ============================================================================

export interface MobileNotification {
  readonly id: string;
  readonly category: 'approval' | 'comment' | 'alert';
  readonly title: string;
  readonly message: string;
  readonly isRead: boolean;
  readonly createdAt: string;
}

export function markMobileNotificationRead(notification: MobileNotification): MobileNotification {
  return {
    ...notification,
    isRead: true,
  };
}

// ============================================================================
// 6. Mobile AI Architectural Questions
// ============================================================================

export interface MobileAiAnswer {
  readonly question: string;
  readonly answer: string;
  readonly confidence: number;
  readonly relevantObjectNames: readonly string[];
  readonly suggestedActions: readonly string[];
}

/**
 * Handles fast, lightweight AI architecture questions formatted for mobile screens.
 */
export function askMobileAiCopilot(
  question: string,
  modelContext = 'Default System Model',
): MobileAiAnswer {
  const q = question.toLowerCase().trim();

  let answer: string;
  let relevantObjects: string[];
  let actions: string[];

  if (q.includes('bottleneck') || q.includes('spof') || q.includes('latency')) {
    answer =
      'Analysis identifies `Order Payment Gateway` as the primary bottleneck with high synchronous fan-out to the relational database. Recommend introducing a Kafka buffer for asynchronous settlements.';
    relevantObjects = ['Order Payment Gateway', 'Transactional PostgreSQL Database'];
    actions = ['Review Kafka event buffer PR', 'Simulate failure scenario'];
  } else if (q.includes('pci') || q.includes('compliance') || q.includes('security')) {
    answer =
      'Cardholder data environment (CDE) is isolated behind tokenization vaults. Encryption at rest is AES-256-GCM and all perimeter edges enforce TLS 1.3.';
    relevantObjects = ['PAN Tokenization Vault', 'Edge API Gateway'];
    actions = ['Inspect compliance pack', 'Run zero-trust security audit'];
  } else {
    answer = `Based on ${modelContext}: All services are currently green. Total 14 components across 3 tiers (Perimeter, Application, Datastore).`;
    relevantObjects = ['Core API Gateway', 'PostgreSQL Cluster'];
    actions = ['View Container Diagram', 'Ask specific question'];
  }

  return {
    question,
    answer,
    confidence: 0.94,
    relevantObjectNames: relevantObjects,
    suggestedActions: actions,
  };
}
