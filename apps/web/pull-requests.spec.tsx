import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createArchitecturePullRequest,
  submitPullRequestReview,
  computeVisualArchitectureDiff,
  computeArchitectureChangeSet,
  type ModelObject,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
} from '@diagramhq/domain';
import { PullRequestBadge, PullRequestModal } from './components/canvas/pull-request-modal';

describe('Architecture Pull Requests Integration & UI (F060)', () => {
  const archId = 'arch-demo' as ArchitectureId;
  const v1 = 'v1' as VersionId;
  const v2 = 'v2' as VersionId;

  const author = {
    id: 'usr-1',
    name: 'Sarah Connor',
  };

  const reviewer = {
    id: 'usr-2',
    name: 'John Connor',
  };

  const objCore: ModelObject = {
    id: 'app-core' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Core Monolith',
    kind: 'application',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const objCoreModified: ModelObject = {
    ...objCore,
    versionId: v2,
    name: 'Modular Core Service',
  };

  const diff = computeVisualArchitectureDiff(
    { objects: [objCore], connections: [] },
    { objects: [objCoreModified], connections: [] }
  );

  const changeSet = computeArchitectureChangeSet({
    baseObjects: [objCore],
    targetObjects: [objCoreModified],
    baseConnections: [],
    targetConnections: [],
  });

  it('1. Acceptance Test: a PR shows the correct diff and can be reviewed', () => {
    // 1. Create PR
    const pr = createArchitecturePullRequest({
      number: 42,
      title: 'Decompose Monolith into Modular Services',
      sourceBranch: 'feat/modular-core',
      targetBranch: 'main',
      author,
      diff,
      changeSet,
    });

    // Verify diff accuracy in PR
    expect(pr.diff.counts.modified).toBe(1);
    expect(pr.diff.objects[0]?.name).toBe('Modular Core Service');
    expect(pr.status).toBe('open');

    // 2. Submit Review
    const approvedPr = submitPullRequestReview(pr, {
      reviewer,
      decision: 'approve',
      body: 'Verified modular decomposition boundaries.',
    });

    expect(approvedPr.status).toBe('approved');
    expect(approvedPr.reviews).toHaveLength(1);
    expect(approvedPr.reviews[0]?.decision).toBe('approve');
  });

  it('2. renders <PullRequestBadge /> with PR number, status, and risk level', () => {
    const pr = createArchitecturePullRequest({
      number: 101,
      title: 'Add Payment Microservice',
      sourceBranch: 'feat/billing',
      targetBranch: 'main',
      author,
      diff,
      changeSet,
    });

    const html = renderToString(<PullRequestBadge pr={pr} />);

    expect(html).toContain('#101');
    expect(html).toContain('Add Payment Microservice');
    expect(html).toContain('open');
    expect(html).toContain('risk');
  });

  it('3. renders <PullRequestModal /> with diff metrics and review actions', () => {
    const pr = createArchitecturePullRequest({
      number: 101,
      title: 'Add Payment Microservice',
      sourceBranch: 'feat/billing',
      targetBranch: 'main',
      author,
      diff,
      changeSet,
    });

    const onClose = vi.fn();
    const onSubmitReview = vi.fn();
    const onAddComment = vi.fn();

    const html = renderToString(
      <PullRequestModal
        pr={pr}
        onClose={onClose}
        onSubmitReview={onSubmitReview}
        onAddComment={onAddComment}
      />
    );

    expect(html).toContain('#101');
    expect(html).toContain('Add Payment Microservice');
    expect(html).toContain('Risk Assessment');
    expect(html).toContain('Diff &amp; Changes (1)');
    expect(html).toContain('Modular Core Service');
    expect(html).toContain('Approve PR');
    expect(html).toContain('Request Changes / Reject');
  });
});
