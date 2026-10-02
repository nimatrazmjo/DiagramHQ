import { describe, it, expect } from 'vitest';
import {
  extractMentionHandles,
  generateMentionNotifications,
  convertCommentToTask,
  updateTaskStatus,
  reassignTask,
  type UserDirectoryEntry,
} from './mentions';
import { createComment, type CommentAuthor } from './comments';

describe('Mentions & Tasks Domain Logic (F051)', () => {
  const WORKSPACE_ID = 'ws-mentions-101';
  const NOW = 1_700_300_000;

  const AUTHOR_ALICE: CommentAuthor = {
    id: 'user-alice-1',
    name: 'Alice Miller',
    email: 'alice@example.com',
  };

  const DIRECTORY: UserDirectoryEntry[] = [
    { id: 'user-alice-1', handle: 'alice', name: 'Alice Miller' },
    { id: 'user-bob-2', handle: 'bob', name: 'Bob Smith' },
    { id: 'user-charlie-3', handle: 'charlie_d', name: 'Charlie Davis' },
  ];

  it('1. extracts unique, lowercased mention handles from text', () => {
    const text = 'Hey @Bob and @alice, please review with @CHARLIE_D and @bob again!';
    const handles = extractMentionHandles(text);
    expect(handles).toHaveLength(3);
    expect(handles).toEqual(expect.arrayContaining(['bob', 'alice', 'charlie_d']));

    expect(extractMentionHandles('')).toEqual([]);
    expect(extractMentionHandles('No mentions here')).toEqual([]);
  });

  it('2. generates mention notifications and excludes author self-mentions', () => {
    const comment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: 'obj-edge-gateway',
      author: AUTHOR_ALICE,
      content: 'Hey @bob and @alice, please verify mTLS certs with @unknown_user!',
      now: NOW,
    });

    const notifications = generateMentionNotifications({
      comment,
      userDirectory: DIRECTORY,
      now: NOW + 10,
    });

    // Bob is mentioned and not the author -> notification generated
    // Alice is the author -> self-mention excluded
    // unknown_user is not in directory -> ignored
    expect(notifications).toHaveLength(1);
    const notif = notifications[0]!;
    expect(notif.id).toMatch(/^ntf_/);
    expect(notif.recipientUserId).toBe('user-bob-2');
    expect(notif.recipientHandle).toBe('bob');
    expect(notif.senderUserId).toBe(AUTHOR_ALICE.id);
    expect(notif.senderName).toBe('Alice Miller');
    expect(notif.commentId).toBe(comment.id);
    expect(notif.targetType).toBe('object');
    expect(notif.targetId).toBe('obj-edge-gateway');
    expect(notif.read).toBe(false);
    expect(notif.createdAt).toBe(NOW + 10);
  });

  it('3. converts a comment to an architecture task', () => {
    const comment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'connection',
      targetId: 'conn-gateway-db',
      author: AUTHOR_ALICE,
      content: 'Migrate connection to PostgreSQL 16 SSL.\nVerify root certificate in vault.',
      now: NOW,
    });

    const task = convertCommentToTask({
      comment,
      assignee: { id: 'user-bob-2', name: 'Bob Smith' },
      priority: 'high',
      now: NOW + 50,
    });

    expect(task.id).toMatch(/^tsk_/);
    expect(task.workspaceId).toBe(WORKSPACE_ID);
    expect(task.title).toBe('Migrate connection to PostgreSQL 16 SSL.');
    expect(task.description).toBe(comment.content);
    expect(task.status).toBe('open');
    expect(task.priority).toBe('high');
    expect(task.assigneeId).toBe('user-bob-2');
    expect(task.assigneeName).toBe('Bob Smith');
    expect(task.creatorId).toBe(AUTHOR_ALICE.id);
    expect(task.creatorName).toBe('Alice Miller');
    expect(task.sourceCommentId).toBe(comment.id);
    expect(task.targetType).toBe('connection');
    expect(task.targetId).toBe('conn-gateway-db');
    expect(task.completedAt).toBeNull();
  });

  it('4. Acceptance Test: comment with @mention fires notification + convert to task', () => {
    // 1. User writes a comment with @mention
    const comment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: 'obj-auth-service',
      author: AUTHOR_ALICE,
      content: 'Urgent: @bob implement PKCE OAuth flow for mobile clients.',
      now: NOW,
    });

    // 2. Notification fires for mentioned user
    const notifications = generateMentionNotifications({
      comment,
      userDirectory: DIRECTORY,
      now: NOW + 10,
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.recipientUserId).toBe('user-bob-2');
    expect(notifications[0]?.recipientHandle).toBe('bob');
    expect(notifications[0]?.previewText).toContain('implement PKCE OAuth flow');

    // 3. Convert the comment into a tracked task assigned to Bob
    const task = convertCommentToTask({
      comment,
      title: 'Implement PKCE OAuth flow for mobile clients',
      assignee: { id: 'user-bob-2', name: 'Bob Smith' },
      priority: 'urgent',
      now: NOW + 20,
    });

    expect(task.status).toBe('open');
    expect(task.assigneeId).toBe('user-bob-2');
    expect(task.sourceCommentId).toBe(comment.id);
    expect(task.priority).toBe('urgent');

    // 4. Bob works on task and marks completed
    const inProgressTask = updateTaskStatus(task, 'in_progress', NOW + 100);
    expect(inProgressTask.status).toBe('in_progress');
    expect(inProgressTask.completedAt).toBeNull();

    const completedTask = updateTaskStatus(inProgressTask, 'completed', NOW + 200);
    expect(completedTask.status).toBe('completed');
    expect(completedTask.completedAt).toBe(NOW + 200);
  });

  it('5. supports task reassignment', () => {
    const comment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'doc',
      targetId: 'doc-adr-001',
      author: AUTHOR_ALICE,
      content: 'Document data retention policy',
      now: NOW,
    });

    const task = convertCommentToTask({
      comment,
      now: NOW,
    });
    expect(task.assigneeId).toBeNull();

    const reassigned = reassignTask(
      task,
      { id: 'user-charlie-3', name: 'Charlie Davis' },
      NOW + 100
    );
    expect(reassigned.assigneeId).toBe('user-charlie-3');
    expect(reassigned.assigneeName).toBe('Charlie Davis');
  });
});
