/**
 * DiagramHQ - Mentions & Tasks Domain Logic (F051)
 *
 * Pure, framework-agnostic mention parsing, notification dispatch,
 * and comment-to-task lifecycle conversion.
 */

import { createId, type TaskId, type NotificationId } from './ids';
import type { Comment, CommentTargetType } from './comments';

export interface UserDirectoryEntry {
  id: string;
  handle: string; // e.g. "alice"
  name: string;
  email?: string;
}

export interface MentionNotification {
  id: NotificationId;
  workspaceId: string;
  recipientUserId: string;
  recipientHandle: string;
  senderUserId: string;
  senderName: string;
  commentId: string;
  targetType: CommentTargetType;
  targetId: string;
  previewText: string;
  read: boolean;
  createdAt: number;
}

export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ArchitectureTask {
  id: TaskId;
  workspaceId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  creatorId: string;
  creatorName: string;
  sourceCommentId: string;
  targetType: CommentTargetType;
  targetId: string;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

const MENTION_REGEX = /@([a-zA-Z0-9._-]+)/g;

/**
 * Extracts unique lowercased mention handles from a text string.
 * Example: "Hey @alice and @bob_m please check" -> ["alice", "bob_m"]
 */
export function extractMentionHandles(text: string): string[] {
  if (!text) return [];
  const matches = text.match(MENTION_REGEX);
  if (!matches) return [];

  const unique = new Set<string>();
  for (const match of matches) {
    const handle = match.slice(1).toLowerCase().trim();
    if (handle) {
      unique.add(handle);
    }
  }

  return Array.from(unique);
}

/**
 * Generates notifications for all users mentioned in a comment.
 * Excludes self-mentions by the comment author.
 */
export function generateMentionNotifications(params: {
  comment: Comment;
  userDirectory: UserDirectoryEntry[];
  now?: number;
}): MentionNotification[] {
  const { comment, userDirectory } = params;
  const now = params.now ?? Date.now();

  const handles = extractMentionHandles(comment.content);
  if (handles.length === 0) {
    return [];
  }

  // Create handle-to-user lookup map
  const dirByHandle = new Map<string, UserDirectoryEntry>();
  for (const user of userDirectory) {
    dirByHandle.set(user.handle.toLowerCase(), user);
  }

  const notifications: MentionNotification[] = [];

  for (const handle of handles) {
    const user = dirByHandle.get(handle);
    if (!user) continue;

    // Do not notify self
    if (user.id === comment.author.id) continue;

    const preview =
      comment.content.length > 120
        ? `${comment.content.slice(0, 117)}...`
        : comment.content;

    notifications.push({
      id: createId('ntf') as NotificationId,
      workspaceId: comment.workspaceId,
      recipientUserId: user.id,
      recipientHandle: user.handle,
      senderUserId: comment.author.id,
      senderName: comment.author.name,
      commentId: comment.id,
      targetType: comment.targetType,
      targetId: comment.targetId,
      previewText: preview,
      read: false,
      createdAt: now,
    });
  }

  return notifications;
}

/**
 * Converts a comment into an actionable architecture task.
 * Automatically attributes target entity, creator, and default title.
 */
export function convertCommentToTask(params: {
  comment: Comment;
  title?: string;
  assignee?: { id: string; name: string } | null;
  priority?: TaskPriority;
  now?: number;
}): ArchitectureTask {
  const { comment, assignee } = params;
  const now = params.now ?? Date.now();

  // If title is not explicitly provided, derive from first line or sentence of comment
  let derivedTitle = params.title?.trim();
  if (!derivedTitle) {
    const firstLine = comment.content.split(/\r?\n/)[0]?.trim() || '';
    derivedTitle = firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
  }

  if (!derivedTitle) {
    derivedTitle = `Task from comment on ${comment.targetType}`;
  }

  return {
    id: createId('tsk') as TaskId,
    workspaceId: comment.workspaceId,
    title: derivedTitle,
    description: comment.content,
    status: 'open',
    priority: params.priority ?? 'medium',
    assigneeId: assignee?.id ?? null,
    assigneeName: assignee?.name ?? null,
    creatorId: comment.author.id,
    creatorName: comment.author.name,
    sourceCommentId: comment.id,
    targetType: comment.targetType,
    targetId: comment.targetId,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

/**
 * Updates task status and records completion timestamp if marked completed.
 */
export function updateTaskStatus(
  task: ArchitectureTask,
  newStatus: TaskStatus,
  now: number = Date.now()
): ArchitectureTask {
  const isCompleted = newStatus === 'completed';

  return {
    ...task,
    status: newStatus,
    updatedAt: now,
    completedAt: isCompleted ? now : null,
  };
}

/**
 * Reassigns an architecture task to another team member.
 */
export function reassignTask(
  task: ArchitectureTask,
  assignee: { id: string; name: string } | null,
  now: number = Date.now()
): ArchitectureTask {
  return {
    ...task,
    assigneeId: assignee?.id ?? null,
    assigneeName: assignee?.name ?? null,
    updatedAt: now,
  };
}
