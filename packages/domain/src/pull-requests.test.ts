import { describe, it, expect } from 'vitest';
import {
  createArchitecturePullRequest,
  submitPullRequestReview,
  addPullRequestComment,
  calculatePullRequestRisk,
  type CreatePullRequestInput,
} from './pull-requests';
import { computeVisualArchitectureDiff } from './diff';
import { computeArchitectureChangeSet } from './changes';
import type {
  ArchitectureId,
  ObjectId,
  ConnectionId,
  FlowId,
  TeamId,
  VersionId,
} from './ids';
import type { ModelObject, ModelConnection, FlowWithSteps } from './types';

describe('Architecture Pull Requests Domain Engine (F060)', () => {
  const archId = 'arch-demo' as ArchitectureId;
  const v1 = 'v1' as VersionId;
  const v2 = 'v2' as VersionId;

  const author = {
    id: 'usr_author',
    name: 'Alice Architect',
    email: 'alice@diagramhq.com',
  };

  const reviewer = {
    id: 'usr_reviewer',
    name: 'Bob Principal',
    email: 'bob@diagramhq.com',
  };

  const obj1: ModelObject = {
    id: 'app-gateway' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'API Gateway',
    kind: 'application',
    position: { x: 50, y: 50 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const obj2: ModelObject = {
    id: 'app-auth' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Auth Service',
    kind: 'application',
    position: { x: 200, y: 200 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conn1: ModelConnection = {
    id: 'con-1' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: obj1.id,
    targetObjectId: obj2.id,
    label: 'Authenticate',
    kind: 'sync',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const flow1: FlowWithSteps = {
    id: 'flw-login' as FlowId,
    architectureId: archId,
    name: 'Login Flow',
    type: 'api_flow',
    steps: [
      {
        id: 'st-1',
        flowId: 'flw-login' as FlowId,
        connectionId: conn1.id,
        stepIndex: 1,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // v2 changes: obj2 modified, new billing object added
  const obj2Modified: ModelObject = {
    ...obj2,
    versionId: v2,
    name: 'OAuth2 / OIDC Auth Service',
  };

  const objBilling: ModelObject = {
    id: 'app-billing' as ObjectId,
    architectureId: archId,
    versionId: v2,
    name: 'Billing Microservice',
    kind: 'application',
    position: { x: 400, y: 400 },
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: { ownerTeamId: 'team-billing' as TeamId },
  };

  const diff = computeVisualArchitectureDiff(
    { objects: [obj1, obj2], connections: [conn1] },
    { objects: [obj1, obj2Modified, objBilling], connections: [conn1] }
  );

  const changeSet = computeArchitectureChangeSet({
    baseObjects: [obj1, obj2],
    targetObjects: [obj1, obj2Modified, objBilling],
    baseConnections: [conn1],
    targetConnections: [conn1],
    flows: [flow1],
  });

  it('1. Acceptance Test: a PR shows the correct diff and can be reviewed', () => {
    // 1. Create titled PR
    const prInput: CreatePullRequestInput = {
      title: 'feat(auth): Upgrade Auth Service to OAuth2 & Deploy Billing',
      description: 'Replaces legacy authentication with OIDC standard and provisions billing service.',
      sourceBranch: 'feat/auth-v2',
      targetBranch: 'main',
      author,
      diff,
      changeSet,
    };

    const pr = createArchitecturePullRequest(prInput);

    // Verify PR properties
    expect(pr.title).toBe('feat(auth): Upgrade Auth Service to OAuth2 & Deploy Billing');
    expect(pr.status).toBe('open');
    expect(pr.sourceBranch).toBe('feat/auth-v2');
    expect(pr.targetBranch).toBe('main');

    // Verify diff accuracy
    expect(pr.diff.counts.added).toBe(1); // objBilling
    expect(pr.diff.counts.modified).toBe(1); // obj2Modified
    expect(pr.diff.counts.removed).toBe(0);
    expect(pr.diff.objects.find((o) => o.id === objBilling.id)?.changeType).toBe('added');

    // Verify risk assessment
    expect(pr.risk.level).toBeDefined();
    expect(pr.risk.score).toBeGreaterThan(0);
    expect(pr.risk.reasons.length).toBeGreaterThan(0);

    // 2. Review workflow - Add comment
    const commentedPr = addPullRequestComment(pr, {
      author: reviewer,
      content: 'Make sure PKCE code verification is enabled.',
      targetEntityId: obj2Modified.id,
    });

    expect(commentedPr.comments).toHaveLength(1);
    expect(commentedPr.comments[0].content).toContain('PKCE');
    expect(commentedPr.comments[0].targetEntityId).toBe(obj2Modified.id);

    // 3. Review workflow - Submit approval
    const approvedPr = submitPullRequestReview(commentedPr, {
      reviewer,
      decision: 'approve',
      body: 'Architecture changes look solid. Verified against OAuth2 spec.',
    });

    expect(approvedPr.status).toBe('approved');
    expect(approvedPr.reviews).toHaveLength(1);
    expect(approvedPr.reviews[0].decision).toBe('approve');

    // 4. Review workflow - Submit rejection
    const rejectedPr = submitPullRequestReview(commentedPr, {
      reviewer,
      decision: 'reject',
      body: 'Missing rate limiter on public token endpoint.',
    });

    expect(rejectedPr.status).toBe('rejected');
    expect(rejectedPr.reviews[0].decision).toBe('reject');
  });

  it('2. calculates risk reasons accurately for dangerous removals', () => {
    const removalDiff = computeVisualArchitectureDiff(
      { objects: [obj1, obj2], connections: [conn1] },
      { objects: [obj1], connections: [] }
    );
    const removalChanges = computeArchitectureChangeSet({
      baseObjects: [obj1, obj2],
      targetObjects: [obj1],
      baseConnections: [conn1],
      targetConnections: [],
      flows: [flow1],
    });

    const risk = calculatePullRequestRisk(removalDiff, removalChanges);
    expect(risk.reasons.some((r) => r.includes('removed'))).toBe(true);
    expect(risk.reasons.some((r) => r.includes('flow(s) affected'))).toBe(true);
    expect(risk.level).toMatch(/high|critical/);
  });

  it('3. throws on invalid PR creation or review of closed PRs', () => {
    expect(() =>
      createArchitecturePullRequest({
        title: '',
        sourceBranch: 'feat',
        targetBranch: 'main',
        author,
        diff,
        changeSet,
      })
    ).toThrow('Pull request title cannot be empty');

    const pr = createArchitecturePullRequest({
      title: 'Valid PR',
      sourceBranch: 'feat',
      targetBranch: 'main',
      author,
      diff,
      changeSet,
    });

    const mergedPr = { ...pr, status: 'merged' as const };
    expect(() =>
      submitPullRequestReview(mergedPr, {
        reviewer,
        decision: 'approve',
      })
    ).toThrow('Cannot review a merged pull request');
  });
});
