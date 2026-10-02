/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createComment,
  replyToComment,
  resolveComment,
  reopenComment,
  updateCommentContent,
  filterComments,
  buildCommentThreads,
  countUnresolvedCommentsByTarget,
  type CommentAuthor,
} from '@diagramhq/domain';
import {
  CommentsPanel,
  CommentPinBadge,
} from './components/canvas';

describe('Comments Integration & UI (F050)', () => {
  const WORKSPACE_ID = 'ws-comments-test';
  const NOW = 1_700_200_000;

  const AUTHOR_ALICE: CommentAuthor = {
    id: 'user-alice',
    name: 'Alice Miller',
    email: 'alice@example.com',
    color: '#10b981',
  };

  const AUTHOR_BOB: CommentAuthor = {
    id: 'user-bob',
    name: 'Bob Smith',
    email: 'bob@example.com',
    color: '#6366f1',
  };

  it('1. Acceptance Test: comment CRUD + resolve on the right entity', () => {
    const objectId = 'obj-api-gateway';
    const connectionId = 'conn-gw-auth';

    // C: Create comments on different entities
    const commentObj = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: objectId,
      author: AUTHOR_ALICE,
      content: 'Is rate limiting configured on the Edge API Gateway?',
      now: NOW,
    });

    const commentConn = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'connection',
      targetId: connectionId,
      author: AUTHOR_BOB,
      content: 'Switch this connection protocol to gRPC.',
      now: NOW + 50,
    });

    let comments = [commentObj, commentConn];

    // R: Read by target entity
    const objComments = filterComments(comments, { targetId: objectId });
    expect(objComments).toHaveLength(1);
    expect(objComments[0]?.content).toContain('Edge API Gateway');

    const connComments = filterComments(comments, { targetId: connectionId });
    expect(connComments).toHaveLength(1);
    expect(connComments[0]?.content).toContain('Switch this connection protocol');

    // U: Update comment content
    const updatedObjComment = updateCommentContent(
      commentObj,
      'Is rate limiting configured on Edge API Gateway? Also verify CORS policy.',
      NOW + 100
    );
    comments = [updatedObjComment, commentConn];

    // Add reply to object comment
    const replyObj = replyToComment(updatedObjComment, {
      author: AUTHOR_BOB,
      content: 'Yes, 1000 req/sec limit enabled.',
      now: NOW + 150,
    });
    comments = [...comments, replyObj];

    // Resolve ONLY on the object entity
    const resolvedObjComment = resolveComment(updatedObjComment, AUTHOR_ALICE, NOW + 200);
    comments = comments.map((c) => (c.id === updatedObjComment.id ? resolvedObjComment : c));

    // Verify object comment is resolved
    const resolvedCheck = filterComments(comments, { targetId: objectId, resolved: true });
    expect(resolvedCheck).toHaveLength(1);
    expect(resolvedCheck[0]?.resolvedBy?.name).toBe('Alice Miller');

    // Verify connection comment remains unresolved!
    const connCheck = filterComments(comments, { targetId: connectionId });
    expect(connCheck[0]?.resolved).toBe(false);

    // Reopen object comment
    const reopenedObj = reopenComment(resolvedObjComment, NOW + 300);
    expect(reopenedObj.resolved).toBe(false);

    // D: Delete comment (filtering out from collection)
    const afterDelete = comments.filter((c) => c.id !== commentConn.id);
    expect(afterDelete.find((c) => c.id === commentConn.id)).toBeUndefined();
  });

  it('2. supports comments across flows, diagrams, docs, and change entities', () => {
    const flowComment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'flow',
      targetId: 'flow-checkout-journey',
      author: AUTHOR_ALICE,
      content: 'Missing payment retry step in this flow.',
      now: NOW,
    });

    const diagramComment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'diagram',
      targetId: 'diagram-container-level',
      author: AUTHOR_BOB,
      content: 'Consider splitting data plane from control plane in this diagram.',
      now: NOW + 10,
    });

    const docComment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'doc',
      targetId: 'doc-rfc-002',
      author: AUTHOR_ALICE,
      content: 'ADR decision status needs review.',
      now: NOW + 20,
    });

    const changeComment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'change',
      targetId: 'chg-v1.4-v1.5',
      author: AUTHOR_BOB,
      content: 'Breaking schema migration in database.',
      now: NOW + 30,
    });

    const all = [flowComment, diagramComment, docComment, changeComment];
    expect(filterComments(all, { targetType: 'flow' })).toHaveLength(1);
    expect(filterComments(all, { targetType: 'diagram' })).toHaveLength(1);
    expect(filterComments(all, { targetType: 'doc' })).toHaveLength(1);
    expect(filterComments(all, { targetType: 'change' })).toHaveLength(1);
  });

  it('3. builds structured threads and target counts for canvas overlays', () => {
    const root1 = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: 'obj-cache',
      author: AUTHOR_ALICE,
      content: 'Redis TTL strategy?',
      now: NOW,
    });

    const reply1 = replyToComment(root1, {
      author: AUTHOR_BOB,
      content: 'Default 3600 seconds with jitter.',
      now: NOW + 10,
    });

    const threads = buildCommentThreads([root1, reply1]);
    expect(threads).toHaveLength(1);
    expect(threads[0]?.rootComment.id).toBe(root1.id);
    expect(threads[0]?.replyCount).toBe(1);
    expect(threads[0]?.replies[0]?.content).toBe('Default 3600 seconds with jitter.');

    const targetCounts = countUnresolvedCommentsByTarget([root1]);
    expect(targetCounts['obj-cache']).toBe(1);
  });

  it('4. renders the <CommentPinBadge /> canvas component', () => {
    const html = renderToString(
      <CommentPinBadge count={3} targetId="node-gateway" />
    );

    expect(html).toContain('data-testid="comment-pin-node-gateway"');
    expect(html).toContain('data-testid="comment-pin-count-node-gateway"');
    expect(html).toContain('3');
    expect(html).toContain('chat_bubble');
  });

  it('5. renders the <CommentsPanel /> component with threads and controls', () => {
    const rootComment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: 'obj-api-gateway',
      author: AUTHOR_ALICE,
      content: 'Need to review GraphQL query depth limiting.',
      now: NOW,
    });

    const replyComment = replyToComment(rootComment, {
      author: AUTHOR_BOB,
      content: 'Max depth configured to 7 levels.',
      now: NOW + 50,
    });

    const threads = buildCommentThreads([rootComment, replyComment]);

    const html = renderToString(
      <CommentsPanel
        threads={threads}
        targetType="object"
        targetId="obj-api-gateway"
        targetName="Edge API Gateway"
        currentAuthor={AUTHOR_ALICE}
        isOpen={true}
      />
    );

    expect(html).toContain('data-testid="comments-panel"');
    expect(html).toContain('Edge API Gateway');
    expect(html).toContain('Need to review GraphQL query depth limiting.');
    expect(html).toContain('Max depth configured to 7 levels.');
    expect(html).toContain('data-testid="comment-resolve-btn-' + rootComment.id + '"');
    expect(html).toContain('data-testid="comment-new-textarea"');
    expect(html).toContain('Post Comment');
  });
});
