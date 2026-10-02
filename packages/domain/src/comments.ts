/**
 * DiagramHQ - Comments Domain Logic (F050)
 *
 * Pure, framework-agnostic comments engine for architectural entities:
 * objects, connections, diagrams, flows, docs, and changes.
 * Supports threaded replies, resolution workflows, and target aggregation.
 */

import { createId } from './ids';

export type CommentTargetType =
  | 'object'
  | 'connection'
  | 'diagram'
  | 'flow'
  | 'doc'
  | 'change';

export interface CommentAuthor {
  id: string;
  name: string;
  email?: string;
  color?: string;
  avatarUrl?: string;
}

export interface Comment {
  id: string;
  workspaceId: string;
  targetType: CommentTargetType;
  targetId: string;
  author: CommentAuthor;
  content: string;
  parentCommentId: string | null;
  resolved: boolean;
  resolvedBy: CommentAuthor | null;
  resolvedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CommentThread {
  rootComment: Comment;
  replies: Comment[];
  targetType: CommentTargetType;
  targetId: string;
  resolved: boolean;
  replyCount: number;
}

const VALID_TARGET_TYPES: Set<CommentTargetType> = new Set([
  'object',
  'connection',
  'diagram',
  'flow',
  'doc',
  'change',
]);

/**
 * Creates a root comment on an architectural entity.
 */
export function createComment(params: {
  id?: string;
  workspaceId: string;
  targetType: CommentTargetType;
  targetId: string;
  author: CommentAuthor;
  content: string;
  now?: number;
}): Comment {
  const { workspaceId, targetType, targetId, author, content } = params;
  const now = params.now ?? Date.now();

  if (!workspaceId.trim()) {
    throw new Error('Workspace ID cannot be empty');
  }
  if (!VALID_TARGET_TYPES.has(targetType)) {
    throw new Error(`Invalid comment targetType: ${targetType}`);
  }
  if (!targetId.trim()) {
    throw new Error('Target ID cannot be empty');
  }
  if (!author || !author.id.trim() || !author.name.trim()) {
    throw new Error('Author with id and name is required');
  }
  if (!content.trim()) {
    throw new Error('Comment content cannot be empty');
  }

  return {
    id: params.id ?? createId('cmt'),
    workspaceId: workspaceId.trim(),
    targetType,
    targetId: targetId.trim(),
    author: {
      ...author,
      color: author.color ?? '#3b82f6',
    },
    content: content.trim(),
    parentCommentId: null,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a reply to an existing comment.
 * If the parent comment is itself a reply, nests under the root thread.
 */
export function replyToComment(
  parentComment: Comment,
  params: {
    id?: string;
    author: CommentAuthor;
    content: string;
    now?: number;
  }
): Comment {
  const { author, content } = params;
  const now = params.now ?? Date.now();

  if (!author || !author.id.trim() || !author.name.trim()) {
    throw new Error('Author with id and name is required');
  }
  if (!content.trim()) {
    throw new Error('Reply content cannot be empty');
  }

  // Anchor to the true thread root
  const rootId = parentComment.parentCommentId ?? parentComment.id;

  return {
    id: params.id ?? createId('cmt'),
    workspaceId: parentComment.workspaceId,
    targetType: parentComment.targetType,
    targetId: parentComment.targetId,
    author: {
      ...author,
      color: author.color ?? '#3b82f6',
    },
    content: content.trim(),
    parentCommentId: rootId,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Resolves a comment thread.
 */
export function resolveComment(
  comment: Comment,
  resolvedBy: CommentAuthor,
  now: number = Date.now()
): Comment {
  if (!resolvedBy || !resolvedBy.id.trim() || !resolvedBy.name.trim()) {
    throw new Error('Resolver author is required');
  }

  return {
    ...comment,
    resolved: true,
    resolvedBy,
    resolvedAt: now,
    updatedAt: now,
  };
}

/**
 * Re-opens a previously resolved comment.
 */
export function reopenComment(comment: Comment, now: number = Date.now()): Comment {
  return {
    ...comment,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    updatedAt: now,
  };
}

/**
 * Updates the text content of an existing comment.
 */
export function updateCommentContent(
  comment: Comment,
  newContent: string,
  now: number = Date.now()
): Comment {
  if (!newContent.trim()) {
    throw new Error('Comment content cannot be empty');
  }

  return {
    ...comment,
    content: newContent.trim(),
    updatedAt: now,
  };
}

/**
 * Filters a list of comments by target entity, resolution status, or author.
 */
export function filterComments(
  comments: Comment[],
  filters: {
    targetType?: CommentTargetType;
    targetId?: string;
    resolved?: boolean;
    authorId?: string;
  }
): Comment[] {
  return comments.filter((c) => {
    if (filters.targetType && c.targetType !== filters.targetType) return false;
    if (filters.targetId && c.targetId !== filters.targetId) return false;
    if (filters.resolved !== undefined && c.resolved !== filters.resolved) return false;
    if (filters.authorId && c.author.id !== filters.authorId) return false;
    return true;
  });
}

/**
 * Groups flat comments into structured threads (root comment + ordered replies).
 */
export function buildCommentThreads(comments: Comment[]): CommentThread[] {
  const rootComments: Comment[] = [];
  const repliesByParentId: Record<string, Comment[]> = {};

  for (const c of comments) {
    if (!c.parentCommentId) {
      rootComments.push(c);
    } else {
      if (!repliesByParentId[c.parentCommentId]) {
        repliesByParentId[c.parentCommentId] = [];
      }
      repliesByParentId[c.parentCommentId]!.push(c);
    }
  }

  // Sort roots newest first
  rootComments.sort((a, b) => b.createdAt - a.createdAt);

  return rootComments.map((root) => {
    const threadReplies = repliesByParentId[root.id] ?? [];
    // Sort replies oldest first (chronological conversation flow)
    threadReplies.sort((a, b) => a.createdAt - b.createdAt);

    return {
      rootComment: root,
      replies: threadReplies,
      targetType: root.targetType,
      targetId: root.targetId,
      resolved: root.resolved,
      replyCount: threadReplies.length,
    };
  });
}

/**
 * Counts unresolved root comment threads grouped by target entity ID.
 * Ideal for canvas node badge overlays.
 */
export function countUnresolvedCommentsByTarget(
  comments: Comment[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const c of comments) {
    // Only count root comments that are unresolved
    if (!c.parentCommentId && !c.resolved) {
      counts[c.targetId] = (counts[c.targetId] ?? 0) + 1;
    }
  }

  return counts;
}
