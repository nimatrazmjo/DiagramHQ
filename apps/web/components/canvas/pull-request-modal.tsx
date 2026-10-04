'use client';

import React, { useState } from 'react';
import type {
  ArchitecturePullRequest,
  ReviewDecision,
  RiskLevel,
} from '@diagramhq/domain';

export interface PullRequestBadgeProps {
  pr: ArchitecturePullRequest;
  onClick?: () => void;
}

export function PullRequestBadge({ pr, onClick }: PullRequestBadgeProps) {
  const statusColors: Record<string, string> = {
    open: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    approved: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    rejected: 'bg-rose-950 text-rose-300 border-rose-800',
    merged: 'bg-purple-950 text-purple-300 border-purple-800',
    closed: 'bg-slate-900 text-slate-400 border-slate-700',
  };

  const riskColors: Record<RiskLevel, string> = {
    low: 'text-emerald-400',
    medium: 'text-amber-400',
    high: 'text-orange-400',
    critical: 'text-rose-400',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800 transition-colors shadow-sm text-xs"
      aria-label="Pull Request Details"
    >
      <span className="material-symbols-outlined text-sm text-cyan-400">
        merge_type
      </span>
      <span className="font-mono font-bold text-white">{`#${pr.number}`}</span>
      <span className="font-medium truncate max-w-[160px]">{pr.title}</span>
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border ${
          statusColors[pr.status] || statusColors.open
        }`}
      >
        {pr.status}
      </span>
      <span
        className={`text-[11px] font-mono font-medium ${
          riskColors[pr.risk.level]
        }`}
      >
        {`${pr.risk.level} risk`}
      </span>
    </button>
  );
}

export interface PullRequestModalProps {
  pr: ArchitecturePullRequest;
  onClose?: () => void;
  onSubmitReview?: (decision: ReviewDecision, body?: string) => void;
  onAddComment?: (content: string) => void;
}

export function PullRequestModal({
  pr,
  onClose,
  onSubmitReview,
  onAddComment,
}: PullRequestModalProps) {
  const [commentText, setCommentText] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'diff' | 'reviews' | 'comments'>('diff');

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment?.(commentText.trim());
    setCommentText('');
  };

  return (
    <div
      data-testid="pull-request-modal"
      className="w-[480px] rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl p-5 text-xs text-slate-200 backdrop-blur-md"
      role="dialog"
      aria-label="Architecture Pull Request Modal"
    >
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-cyan-400 text-sm">{`#${pr.number}`}</span>
            <h3 data-testid="pr-title" className="font-bold text-white text-sm">{pr.title}</h3>
          </div>
          <div data-testid="pr-branches" className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
            <span>{`${String(pr.sourceBranch)} → ${String(pr.targetBranch)}`}</span>
            <span>•</span>
            <span>{`by ${pr.author.name}`}</span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            data-testid="pr-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {/* Risk Banner */}
      <div data-testid="pr-risk-banner" className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
        <span className="material-symbols-outlined text-base text-amber-400 shrink-0">
          shield
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white uppercase text-[10px] tracking-wider">
              {`Risk Assessment: ${pr.risk.level} (${pr.risk.score}/100)`}
            </span>
          </div>
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
            {pr.risk.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mt-3 p-1 rounded-lg bg-slate-950/40 border border-slate-800">
        <button
          type="button"
          data-testid="pr-tab-diff"
          onClick={() => setActiveTab('diff')}
          className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'diff'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {`Diff & Changes (${pr.diff.counts.totalChanges})`}
        </button>
        <button
          type="button"
          data-testid="pr-tab-reviews"
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'reviews'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {`Reviews (${pr.reviews.length})`}
        </button>
        <button
          type="button"
          data-testid="pr-tab-comments"
          onClick={() => setActiveTab('comments')}
          className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'comments'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {`Comments (${pr.comments.length})`}
        </button>
      </div>

      {/* Tab Body */}
      <div className="mt-3 max-h-56 overflow-y-auto pr-1">
        {activeTab === 'diff' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/80 font-mono text-[11px]">
              <span className="text-emerald-400">{`+${pr.diff.counts.added} added`}</span>
              <span className="text-amber-400">{`~${pr.diff.counts.modified} modified`}</span>
              <span className="text-rose-400">{`-${pr.diff.counts.removed} removed`}</span>
              <span className="text-purple-400">{`↕${pr.diff.counts.moved} moved`}</span>
            </div>

            <div className="space-y-1.5 mt-2">
              {pr.diff.objects.map((obj) => (
                <div
                  key={obj.id}
                  className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800"
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-sm text-slate-400">
                      deployed_code
                    </span>
                    <span>{obj.name}</span>
                  </div>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase text-slate-950"
                    style={{ backgroundColor: obj.color }}
                  >
                    {obj.changeType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-2">
            {pr.reviews.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                No reviews submitted yet
              </div>
            ) : (
              pr.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-2.5 rounded bg-slate-950/40 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{rev.reviewer.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        rev.decision === 'approve'
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-rose-950 text-rose-300'
                      }`}
                    >
                      {rev.decision}
                    </span>
                  </div>
                  {rev.body && (
                    <div className="text-[11px] text-slate-300">{rev.body}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-2">
            {pr.comments.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                No comments on this pull request
              </div>
            ) : (
              pr.comments.map((cmt) => (
                <div
                  key={cmt.id}
                  className="p-2.5 rounded bg-slate-950/40 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span>{cmt.author.name}</span>
                    {cmt.targetEntityId && (
                      <span className="font-mono text-[10px] text-cyan-400">
                        {`on ${cmt.targetEntityId}`}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300">{cmt.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Review Actions Footer */}
      {onSubmitReview && pr.status === 'open' && (
        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
          <input
            type="text"
            data-testid="pr-review-input"
            placeholder="Review feedback (optional)..."
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              data-testid="pr-reject-btn"
              onClick={() => {
                onSubmitReview('reject', reviewNote || undefined);
                setReviewNote('');
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 font-medium transition-colors"
            >
              Request Changes / Reject
            </button>
            <button
              type="button"
              data-testid="pr-approve-btn"
              onClick={() => {
                onSubmitReview('approve', reviewNote || undefined);
                setReviewNote('');
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
            >
              Approve PR
            </button>
          </div>
        </div>
      )}

      {/* Comment Form */}
      {onAddComment && (
        <form onSubmit={handleCommentSubmit} className="mt-3 flex gap-2">
          <input
            type="text"
            data-testid="pr-comment-input"
            placeholder="Leave a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            data-testid="pr-comment-submit"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Comment
          </button>
        </form>
      )}
    </div>
  );
}
