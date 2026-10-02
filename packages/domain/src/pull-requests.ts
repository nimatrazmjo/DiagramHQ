/**
 * DiagramHQ - Architecture Pull Requests Domain Logic (F060)
 *
 * Pure, framework-agnostic architecture pull request review engine.
 * Supports:
 * - Titled architecture PRs linking source branch to target branch
 * - Visual diff integration (added/modified/removed/moved with semantic colors)
 * - Downstream impact and affected systems analysis
 * - Automated risk assessment scoring (low, medium, high, critical)
 * - Review workflows: review, comment, approve, reject
 */

import { createId, type PullRequestId, type BranchId } from './ids';
import type { VisualArchitectureDiffResult } from './diff';
import type { ArchitectureChangeSet } from './changes';

export type PullRequestStatus = 'open' | 'approved' | 'rejected' | 'merged' | 'closed';
export type ReviewDecision = 'approve' | 'reject' | 'comment';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PullRequestUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface PullRequestReview {
  id: string;
  reviewer: PullRequestUser;
  decision: ReviewDecision;
  body?: string;
  createdAt: string;
}

export interface PullRequestComment {
  id: string;
  author: PullRequestUser;
  content: string;
  targetEntityId?: string; // Specific object or connection commented on
  createdAt: string;
}

export interface PullRequestRisk {
  level: RiskLevel;
  score: number; // 0 - 100
  reasons: string[];
}

export interface ArchitecturePullRequest {
  id: PullRequestId;
  number: number;
  title: string;
  description?: string;
  sourceBranch: string | BranchId;
  targetBranch: string | BranchId;
  author: PullRequestUser;
  status: PullRequestStatus;
  diff: VisualArchitectureDiffResult;
  changeSet: ArchitectureChangeSet;
  risk: PullRequestRisk;
  reviews: PullRequestReview[];
  comments: PullRequestComment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePullRequestInput {
  number?: number;
  title: string;
  description?: string;
  sourceBranch: string | BranchId;
  targetBranch: string | BranchId;
  author: PullRequestUser;
  diff: VisualArchitectureDiffResult;
  changeSet: ArchitectureChangeSet;
}

/**
 * Calculates risk level and generates explanation reasons from diff and impact sets.
 */
export function calculatePullRequestRisk(
  diff: VisualArchitectureDiffResult,
  changeSet: ArchitectureChangeSet
): PullRequestRisk {
  let score = 10;
  const reasons: string[] = [];

  // 1. Removals carry high risk
  if (diff.counts.removed > 0) {
    score += diff.counts.removed * 20;
    reasons.push(`${diff.counts.removed} architecture element(s) removed`);
  }

  // 2. Affected flows
  if (changeSet.affected.counts.flows > 0) {
    score += changeSet.affected.counts.flows * 15;
    reasons.push(`${changeSet.affected.counts.flows} business flow(s) affected`);
  }

  // 3. Affected teams
  if (changeSet.affected.counts.teams > 1) {
    score += changeSet.affected.counts.teams * 10;
    reasons.push(`Cross-team impact across ${changeSet.affected.counts.teams} teams`);
  }

  // 4. Large volume of modifications
  if (diff.counts.modified >= 3) {
    score += 15;
    reasons.push(`Substantial modifications to ${diff.counts.modified} components`);
  }

  // Normalize score
  score = Math.min(100, Math.max(0, score));

  let level: RiskLevel = 'low';
  if (score >= 70) {
    level = 'critical';
  } else if (score >= 45) {
    level = 'high';
  } else if (score >= 25) {
    level = 'medium';
  }

  if (reasons.length === 0) {
    reasons.push('Low-risk additive or cosmetic modification');
  }

  return { level, score, reasons };
}

let prSequence = 0;

/**
 * Creates a reviewable architecture pull request.
 */
export function createArchitecturePullRequest(
  input: CreatePullRequestInput
): ArchitecturePullRequest {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Pull request title cannot be empty');
  }

  const now = new Date().toISOString();
  const risk = calculatePullRequestRisk(input.diff, input.changeSet);
  prSequence += 1;

  return {
    id: createId('pr') as PullRequestId,
    number: input.number || prSequence,
    title: input.title.trim(),
    description: input.description,
    sourceBranch: input.sourceBranch,
    targetBranch: input.targetBranch,
    author: input.author,
    status: 'open',
    diff: input.diff,
    changeSet: input.changeSet,
    risk,
    reviews: [],
    comments: [],
    createdAt: now,
    updatedAt: now,
  };
}

export interface SubmitReviewInput {
  reviewer: PullRequestUser;
  decision: ReviewDecision;
  body?: string;
}

/**
 * Submits a review on an architecture pull request and transitions status accordingly.
 */
export function submitPullRequestReview(
  pr: ArchitecturePullRequest,
  reviewInput: SubmitReviewInput
): ArchitecturePullRequest {
  if (pr.status === 'merged' || pr.status === 'closed') {
    throw new Error(`Cannot review a ${pr.status} pull request`);
  }

  const newReview: PullRequestReview = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    reviewer: reviewInput.reviewer,
    decision: reviewInput.decision,
    body: reviewInput.body,
    createdAt: new Date().toISOString(),
  };

  const updatedReviews = [...pr.reviews, newReview];

  let nextStatus: PullRequestStatus = pr.status;
  if (reviewInput.decision === 'approve') {
    // If approved and not previously rejected
    const hasRejections = updatedReviews.some((r) => r.decision === 'reject');
    nextStatus = hasRejections ? 'rejected' : 'approved';
  } else if (reviewInput.decision === 'reject') {
    nextStatus = 'rejected';
  }

  return {
    ...pr,
    status: nextStatus,
    reviews: updatedReviews,
    updatedAt: new Date().toISOString(),
  };
}

export interface AddPRCommentInput {
  author: PullRequestUser;
  content: string;
  targetEntityId?: string;
}

/**
 * Adds a comment to an architecture PR or specific diff entity.
 */
export function addPullRequestComment(
  pr: ArchitecturePullRequest,
  input: AddPRCommentInput
): ArchitecturePullRequest {
  if (!input.content || input.content.trim().length === 0) {
    throw new Error('Comment content cannot be empty');
  }

  const comment: PullRequestComment = {
    id: `prc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    author: input.author,
    content: input.content.trim(),
    targetEntityId: input.targetEntityId,
    createdAt: new Date().toISOString(),
  };

  return {
    ...pr,
    comments: [...pr.comments, comment],
    updatedAt: new Date().toISOString(),
  };
}
