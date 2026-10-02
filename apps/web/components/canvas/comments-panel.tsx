'use client';

import React, { useState } from 'react';
import type {
  Comment,
  CommentThread,
  CommentTargetType,
  CommentAuthor,
} from '@diagramhq/domain';

export interface CommentsPanelProps {
  threads: CommentThread[];
  targetType: CommentTargetType;
  targetId: string;
  targetName?: string;
  currentAuthor: CommentAuthor;
  isOpen?: boolean;
  onClose?: () => void;
  onCreateComment?: (content: string) => void;
  onReplyComment?: (parentComment: Comment, content: string) => void;
  onResolveComment?: (comment: Comment) => void;
  onReopenComment?: (comment: Comment) => void;
  onDeleteComment?: (commentId: string) => void;
}

export function CommentPinBadge({
  count,
  targetId,
  onClick,
}: {
  count: number;
  targetId: string;
  onClick?: () => void;
}): JSX.Element | null {
  if (count <= 0) return null;

  return (
    <button
      type="button"
      data-testid={`comment-pin-${targetId}`}
      onClick={onClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/90 hover:bg-amber-500 text-white font-semibold text-[11px] shadow-md border border-amber-400/80 transition-all select-none cursor-pointer"
      title={`${count} unresolved ${count === 1 ? 'comment' : 'comments'}`}
    >
      <span className="material-symbols-outlined text-[13px]">chat_bubble</span>
      <span data-testid={`comment-pin-count-${targetId}`}>{count}</span>
    </button>
  );
}

function getAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || '??').toUpperCase();
}

export function CommentsPanel({
  threads,
  targetType,
  targetId,
  targetName,
  currentAuthor,
  isOpen = true,
  onClose,
  onCreateComment,
  onReplyComment,
  onResolveComment,
  onReopenComment,
}: CommentsPanelProps): JSX.Element | null {
  const [newCommentText, setNewCommentText] = useState('');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [filterResolved, setFilterResolved] = useState<'all' | 'unresolved'>('unresolved');

  if (!isOpen) return null;

  const filteredThreads = threads.filter((t) => {
    if (filterResolved === 'unresolved') {
      return !t.resolved;
    }
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onCreateComment?.(newCommentText.trim());
    setNewCommentText('');
  };

  const handleReplySubmit = (parent: Comment) => {
    const text = replyInputs[parent.id]?.trim();
    if (!text) return;
    onReplyComment?.(parent, text);
    setReplyInputs((prev) => ({ ...prev, [parent.id]: '' }));
  };

  return (
    <aside
      data-testid="comments-panel"
      aria-label="Comments"
      className="fixed right-4 top-20 bottom-4 w-96 bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden text-slate-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400 text-lg">
            forum
          </span>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Comments
            </h3>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="capitalize font-medium text-slate-300">
                {targetType}:
              </span>
              <span className="truncate max-w-[160px] text-white font-semibold">
                {targetName || targetId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Unresolved vs All toggle */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 text-[10px]">
            <button
              type="button"
              data-testid="comments-filter-unresolved"
              onClick={() => setFilterResolved('unresolved')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                filterResolved === 'unresolved'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Open
            </button>
            <button
              type="button"
              data-testid="comments-filter-all"
              onClick={() => setFilterResolved('all')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                filterResolved === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              data-testid="comments-panel-close"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              title="Close panel"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredThreads.length === 0 ? (
          <div
            data-testid="comments-empty-state"
            className="flex flex-col items-center justify-center h-48 text-center text-slate-400"
          >
            <span className="material-symbols-outlined text-3xl mb-2 text-slate-600">
              chat
            </span>
            <p className="text-xs">
              {filterResolved === 'unresolved'
                ? 'No open comments on this entity'
                : 'No comments yet'}
            </p>
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const root = thread.rootComment;
            const initials = getAuthorInitials(root.author.name);
            const authorColor = root.author.color || '#3b82f6';

            return (
              <div
                key={root.id}
                data-testid={`comment-thread-${root.id}`}
                className={`p-3.5 rounded-xl border transition-all ${
                  root.resolved
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-75'
                    : 'bg-slate-800/60 border-slate-700/80 shadow-sm'
                }`}
              >
                {/* Root Comment Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: authorColor }}
                    >
                      {initials}
                    </div>
                    <div>
                      <span
                        data-testid={`comment-author-${root.id}`}
                        className="text-xs font-semibold text-white block"
                      >
                        {root.author.name}
                      </span>
                    </div>
                  </div>

                  {/* Resolve / Reopen toggle */}
                  <div className="flex items-center gap-1.5">
                    {root.resolved ? (
                      <button
                        type="button"
                        data-testid={`comment-reopen-btn-${root.id}`}
                        onClick={() => onReopenComment?.(root)}
                        className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full hover:bg-emerald-500/20 font-medium transition-colors"
                        title="Reopen thread"
                      >
                        Resolved ✓
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid={`comment-resolve-btn-${root.id}`}
                        onClick={() => onResolveComment?.(root)}
                        className="text-[10px] px-2 py-0.5 bg-slate-700/60 text-slate-300 hover:text-white hover:bg-emerald-600/80 rounded-full font-medium transition-colors"
                        title="Mark as resolved"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>

                {/* Root Comment Content */}
                <p
                  data-testid={`comment-content-${root.id}`}
                  className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed mb-3"
                >
                  {root.content}
                </p>

                {/* Nested Replies */}
                {thread.replies.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-700/50 space-y-2.5 pl-3 border-l-2 border-slate-700/60 ml-2">
                    {thread.replies.map((reply) => {
                      const repInitials = getAuthorInitials(reply.author.name);
                      const repColor = reply.author.color || '#3b82f6';
                      return (
                        <div
                          key={reply.id}
                          data-testid={`comment-reply-${reply.id}`}
                          className="text-xs"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                              style={{ backgroundColor: repColor }}
                            >
                              {repInitials}
                            </div>
                            <span className="font-semibold text-slate-300 text-[11px]">
                              {reply.author.name}
                            </span>
                          </div>
                          <p className="text-slate-300 pl-5 text-[11px] leading-relaxed">
                            {reply.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reply Input Box */}
                {!root.resolved && (
                  <div className="mt-3 pt-2 border-t border-slate-700/40 flex items-center gap-1.5">
                    <input
                      type="text"
                      data-testid={`comment-reply-input-${root.id}`}
                      placeholder="Reply..."
                      value={replyInputs[root.id] ?? ''}
                      onChange={(e) =>
                        setReplyInputs({ ...replyInputs, [root.id]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleReplySubmit(root);
                        }
                      }}
                      className="flex-1 bg-slate-950/60 border border-slate-700/70 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      data-testid={`comment-reply-submit-${root.id}`}
                      onClick={() => handleReplySubmit(root)}
                      className="px-2 py-1 bg-primary text-white rounded-lg text-[11px] font-medium hover:bg-primary/90 transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Root Comment Composer */}
      <form
        onSubmit={handleCreateSubmit}
        className="p-3 border-t border-slate-800 bg-slate-950/80"
      >
        <div className="flex gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 mt-0.5"
            style={{ backgroundColor: currentAuthor.color || '#3b82f6' }}
            title={currentAuthor.name}
          >
            {getAuthorInitials(currentAuthor.name)}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              data-testid="comment-new-textarea"
              rows={2}
              placeholder={`Add comment on ${targetType}...`}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                data-testid="comment-new-submit"
                disabled={!newCommentText.trim()}
                className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Post Comment
              </button>
            </div>
          </div>
        </div>
      </form>
    </aside>
  );
}
