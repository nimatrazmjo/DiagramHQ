import { describe, it, expect } from 'vitest';
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
  type CommentTargetType,
} from './comments';

describe('Comments Domain Logic (F050)', () => {
  const WORKSPACE_ID = 'ws-comments-101';
  const NOW = 1_700_100_000;

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

  it('1. supports creating comments on all 6 target entity types', () => {
    const targets: CommentTargetType[] = [
      'object',
      'connection',
      'diagram',
      'flow',
      'doc',
      'change',
    ];

    for (const targetType of targets) {
      const comment = createComment({
        workspaceId: WORKSPACE_ID,
        targetType,
        targetId: `target-${targetType}-1`,
        author: AUTHOR_ALICE,
        content: `Reviewing this ${targetType}`,
        now: NOW,
      });

      expect(comment.id).toMatch(/^cmt_/);
      expect(comment.workspaceId).toBe(WORKSPACE_ID);
      expect(comment.targetType).toBe(targetType);
      expect(comment.targetId).toBe(`target-${targetType}-1`);
      expect(comment.author.name).toBe('Alice Miller');
      expect(comment.content).toBe(`Reviewing this ${targetType}`);
      expect(comment.parentCommentId).toBeNull();
      expect(comment.resolved).toBe(false);
      expect(comment.resolvedBy).toBeNull();
    }
  });

  it('2. validates input constraints on comment creation', () => {
    expect(() =>
      createComment({
        workspaceId: '',
        targetType: 'object',
        targetId: 'obj-1',
        author: AUTHOR_ALICE,
        content: 'Valid content',
      })
    ).toThrow('Workspace ID cannot be empty');

    expect(() =>
      createComment({
        workspaceId: WORKSPACE_ID,
        targetType: 'invalid_type' as unknown as CommentTargetType,
        targetId: 'obj-1',
        author: AUTHOR_ALICE,
        content: 'Valid content',
      })
    ).toThrow('Invalid comment targetType');

    expect(() =>
      createComment({
        workspaceId: WORKSPACE_ID,
        targetType: 'object',
        targetId: '   ',
        author: AUTHOR_ALICE,
        content: 'Valid content',
      })
    ).toThrow('Target ID cannot be empty');

    expect(() =>
      createComment({
        workspaceId: WORKSPACE_ID,
        targetType: 'object',
        targetId: 'obj-1',
        author: AUTHOR_ALICE,
        content: '   ',
      })
    ).toThrow('Comment content cannot be empty');
  });

  it('3. supports replies to existing comments nested under root thread', () => {
    const root = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: 'api-gateway',
      author: AUTHOR_ALICE,
      content: 'Should we add rate-limiting here?',
      now: NOW,
    });

    const reply1 = replyToComment(root, {
      author: AUTHOR_BOB,
      content: 'Yes, Token Bucket algorithm with Redis.',
      now: NOW + 500,
    });

    expect(reply1.parentCommentId).toBe(root.id);
    expect(reply1.targetType).toBe('object');
    expect(reply1.targetId).toBe('api-gateway');
    expect(reply1.author.name).toBe('Bob Smith');

    // Replying to a reply anchors to the root thread
    const reply2 = replyToComment(reply1, {
      author: AUTHOR_ALICE,
      content: 'Agreed, will configure it in Envoy.',
      now: NOW + 1000,
    });

    expect(reply2.parentCommentId).toBe(root.id);
  });

  it('4. Acceptance Test: comment CRUD + resolve on the right entity', () => {
    const objectId = 'obj-auth-service';
    const connectionId = 'conn-auth-db';

    // C: Create comment on object
    const commentObj = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: objectId,
      author: AUTHOR_ALICE,
      content: 'Initial auth service security note',
      now: NOW,
    });

    // Create a separate comment on connection
    const commentConn = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'connection',
      targetId: connectionId,
      author: AUTHOR_BOB,
      content: 'Needs mTLS certificate verification',
      now: NOW + 10,
    });

    // R: Read & filter comments by entity
    const all = [commentObj, commentConn];
    const objectComments = filterComments(all, { targetType: 'object', targetId: objectId });
    expect(objectComments).toHaveLength(1);
    expect(objectComments[0]?.id).toBe(commentObj.id);

    const connComments = filterComments(all, {
      targetType: 'connection',
      targetId: connectionId,
    });
    expect(connComments).toHaveLength(1);
    expect(connComments[0]?.id).toBe(commentConn.id);

    // U: Update comment text
    const updatedObjComment = updateCommentContent(
      commentObj,
      'Updated auth service security note: OAuth2 PKCE required',
      NOW + 100
    );
    expect(updatedObjComment.content).toBe(
      'Updated auth service security note: OAuth2 PKCE required'
    );
    expect(updatedObjComment.updatedAt).toBe(NOW + 100);

    // Resolve ONLY on the object entity
    const resolvedObjComment = resolveComment(updatedObjComment, AUTHOR_BOB, NOW + 200);
    expect(resolvedObjComment.resolved).toBe(true);
    expect(resolvedObjComment.resolvedBy?.name).toBe('Bob Smith');
    expect(resolvedObjComment.resolvedAt).toBe(NOW + 200);

    // Verify connection comment remains unresolved
    expect(commentConn.resolved).toBe(false);

    // D: Delete (simulated by filtering out id)
    const afterDelete = [resolvedObjComment, commentConn].filter(
      (c) => c.id !== commentObj.id
    );
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0]?.id).toBe(commentConn.id);
  });

  it('5. reopens a resolved comment cleanly', () => {
    const comment = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'doc',
      targetId: 'doc-arch-guidelines',
      author: AUTHOR_ALICE,
      content: 'Needs architecture diagram update',
      now: NOW,
    });

    const resolved = resolveComment(comment, AUTHOR_BOB, NOW + 100);
    expect(resolved.resolved).toBe(true);

    const reopened = reopenComment(resolved, NOW + 200);
    expect(reopened.resolved).toBe(false);
    expect(reopened.resolvedBy).toBeNull();
    expect(reopened.resolvedAt).toBeNull();
    expect(reopened.updatedAt).toBe(NOW + 200);
  });

  it('6. groups flat comments into structured threads', () => {
    const root1 = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: 'gateway',
      author: AUTHOR_ALICE,
      content: 'Thread 1 root',
      now: NOW,
    });

    const root2 = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: 'gateway',
      author: AUTHOR_BOB,
      content: 'Thread 2 root',
      now: NOW + 100, // Newer
    });

    const reply1_1 = replyToComment(root1, {
      author: AUTHOR_BOB,
      content: 'Reply to Thread 1',
      now: NOW + 50,
    });

    const threads = buildCommentThreads([root1, root2, reply1_1]);

    // Newer root first
    expect(threads).toHaveLength(2);
    expect(threads[0]?.rootComment.id).toBe(root2.id);
    expect(threads[0]?.replyCount).toBe(0);

    expect(threads[1]?.rootComment.id).toBe(root1.id);
    expect(threads[1]?.replyCount).toBe(1);
    expect(threads[1]?.replies[0]?.id).toBe(reply1_1.id);
  });

  it('7. counts unresolved root comments by target entity', () => {
    const c1 = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: 'node-A',
      author: AUTHOR_ALICE,
      content: 'C1',
      now: NOW,
    });

    const c2 = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'object',
      targetId: 'node-A',
      author: AUTHOR_BOB,
      content: 'C2',
      now: NOW + 10,
    });

    const c3 = createComment({
      workspaceId: WORKSPACE_ID,
      targetType: 'connection',
      targetId: 'conn-1',
      author: AUTHOR_ALICE,
      content: 'C3',
      now: NOW + 20,
    });

    // Resolve c1
    const resolvedC1 = resolveComment(c1, AUTHOR_BOB, NOW + 30);

    const counts = countUnresolvedCommentsByTarget([resolvedC1, c2, c3]);
    expect(counts['node-A']).toBe(1); // c1 is resolved, so only 1 unresolved
    expect(counts['conn-1']).toBe(1);
    expect(counts['unknown-node']).toBeUndefined();
  });
});
