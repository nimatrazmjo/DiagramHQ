/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createComment,
  extractMentionHandles,
  generateMentionNotifications,
  convertCommentToTask,
  updateTaskStatus,
  type CommentAuthor,
  type UserDirectoryEntry,
} from '@diagramhq/domain';
import {
  MentionText,
  TaskCard,
} from './components/canvas';

describe('Mentions & Tasks Integration & UI (F051)', () => {
  const WORKSPACE_ID = 'ws-mentions-test';
  const NOW = 1_700_400_000;

  const AUTHOR_ALICE: CommentAuthor = {
    id: 'user-alice',
    name: 'Alice Miller',
    email: 'alice@example.com',
    color: '#10b981',
  };

  const DIRECTORY: UserDirectoryEntry[] = [
    { id: 'user-alice', handle: 'alice', name: 'Alice Miller' },
    { id: 'user-bob', handle: 'bob', name: 'Bob Smith' },
    { id: 'user-charlie', handle: 'charlie', name: 'Charlie Davis' },
  ];

  it('1. Acceptance Test: comment with @mention fires notification + convert to task', () => {
    // 1. Author writes a comment with @mention
    const comment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: 'obj-stripe-billing',
      author: AUTHOR_ALICE,
      content: 'Critical: @bob audit Stripe webhook signature verification.',
      now: NOW,
    });

    // 2. Mention triggers notification for Bob
    const notifications = generateMentionNotifications({
      comment,
      userDirectory: DIRECTORY,
      now: NOW + 10,
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.recipientUserId).toBe('user-bob');
    expect(notifications[0]?.recipientHandle).toBe('bob');
    expect(notifications[0]?.senderName).toBe('Alice Miller');
    expect(notifications[0]?.targetType).toBe('object');
    expect(notifications[0]?.targetId).toBe('obj-stripe-billing');
    expect(notifications[0]?.previewText).toContain('audit Stripe webhook signature');

    // 3. Convert comment to an architecture task
    const task = convertCommentToTask({
      comment,
      title: 'Audit Stripe webhook signature verification',
      assignee: { id: 'user-bob', name: 'Bob Smith' },
      priority: 'urgent',
      now: NOW + 20,
    });

    expect(task.id).toMatch(/^tsk_/);
    expect(task.title).toBe('Audit Stripe webhook signature verification');
    expect(task.assigneeName).toBe('Bob Smith');
    expect(task.priority).toBe('urgent');
    expect(task.sourceCommentId).toBe(comment.id);
    expect(task.status).toBe('open');

    // 4. Update task status to completed
    const completed = updateTaskStatus(task, 'completed', NOW + 100);
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBe(NOW + 100);
  });

  it('2. handles multi-mentions and ignores author self-mentions', () => {
    const comment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'flow',
      targetId: 'flow-auth-journey',
      author: AUTHOR_ALICE,
      content: 'Hey @alice, @bob, and @charlie, please check the auth sequence.',
      now: NOW,
    });

    const handles = extractMentionHandles(comment.content);
    expect(handles).toEqual(expect.arrayContaining(['alice', 'bob', 'charlie']));

    const notifications = generateMentionNotifications({
      comment,
      userDirectory: DIRECTORY,
      now: NOW,
    });

    // Alice is author -> excluded. Only Bob and Charlie receive notifications.
    expect(notifications).toHaveLength(2);
    const recipients = notifications.map((n) => n.recipientHandle);
    expect(recipients).toContain('bob');
    expect(recipients).toContain('charlie');
    expect(recipients).not.toContain('alice');
  });

  it('3. renders the <MentionText /> component with stylized mention pills', () => {
    const text = 'Please check with @bob and @charlie regarding the API spec.';

    const html = renderToString(<MentionText text={text} />);

    expect(html).toContain('data-testid="mention-pill-bob"');
    expect(html).toContain('@bob');
    expect(html).toContain('data-testid="mention-pill-charlie"');
    expect(html).toContain('@charlie');
  });

  it('4. renders the <TaskCard /> component with title, assignee, and priority badge', () => {
    const comment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'connection',
      targetId: 'conn-auth-db',
      author: AUTHOR_ALICE,
      content: 'Configure TLS certificate rotation on database connection',
      now: NOW,
    });

    const task = convertCommentToTask({
      comment,
      title: 'Configure TLS certificate rotation',
      assignee: { id: 'user-bob', name: 'Bob Smith' },
      priority: 'high',
      now: NOW,
    });

    const html = renderToString(<TaskCard task={task} />);

    expect(html).toContain(`data-testid="task-card-${task.id}"`);
    expect(html).toContain('Configure TLS certificate rotation');
    expect(html).toContain('Bob Smith');
    expect(html).toContain('high');
    expect(html).toContain('connection:');
    expect(html).toContain('conn-auth-db');
  });
});
