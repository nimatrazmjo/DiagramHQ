import React, { useState } from 'react';
import {
  addMobileComment,
  approveArchitectureChange,
  askMobileAiCopilot,
  getCanvasDisplayMode,
  isMobileViewport,
  searchMobileCatalog,
  type CommentId,
  type MobileApprovalChange,
  type MobileComment,
  type MobileNotification,
  type MobileSearchableItem,
  type MobileTab,
  type MobileViewSummary,
  type PullRequestId,
  type UserId,
  type ViewId,
} from '@diagramhq/domain';

export interface MobileCompanionProps {
  isOpen?: boolean;
  onClose?: () => void;
  viewportWidth?: number; // Allows explicit testing of mobile vs desktop viewports
  initialViews?: MobileViewSummary[];
  initialChanges?: MobileApprovalChange[];
  initialComments?: MobileComment[];
}

export function MobileCompanion({
  isOpen = true,
  onClose,
  viewportWidth = 375, // Default to mobile phone screen (iPhone)
  initialViews,
  initialChanges,
  initialComments,
}: MobileCompanionProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState<MobileTab>('views');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const [changes, setChanges] = useState<MobileApprovalChange[]>(() => {
    return (
      initialChanges ?? [
        {
          id: 'pr_cde_waf' as PullRequestId,
          title: 'Isolate Cardholder Vault with Egress Firewall',
          authorName: 'Alex Mercer',
          summary: 'Enforces PCI DSS v4.0 Req 1.3 by restricting all outbound vault connections.',
          affectedComponentNames: ['Cardholder Data Vault', 'Egress Firewall Proxy'],
          status: 'pending',
        },
        {
          id: 'pr_kafka_mesh' as PullRequestId,
          title: 'Introduce Geo-Replicated Event Mesh',
          authorName: 'Elena Rostova',
          summary: 'Adds MirrorMaker 2 active-active topic replication between US-East and EU-West.',
          affectedComponentNames: ['Kafka Cluster US', 'Kafka Cluster EU'],
          status: 'pending',
        },
      ]
    );
  });

  const [comments, setComments] = useState<MobileComment[]>(() => {
    return (
      initialComments ?? [
        {
          id: 'cmt_init_1' as CommentId,
          author: {
            userId: 'usr_sec_ciso' as UserId,
            name: 'Sarah Connor',
            avatarInitials: 'SC',
          },
          targetTitle: 'PAN Tokenization Vault',
          text: 'Verified cryptographic HSM isolation meets Level 1 compliance.',
          createdAt: new Date().toISOString(),
          status: 'open',
        },
      ]
    );
  });

  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentTarget, setNewCommentTarget] = useState('PAN Tokenization Vault');

  const [notifications] = useState<MobileNotification[]>([
    {
      id: 'ntf_1',
      category: 'approval',
      title: 'Review Requested',
      message: 'Alex Mercer requested your approval on PR #104 (PCI Egress)',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ntf_2',
      category: 'comment',
      title: 'New Comment',
      message: 'Sarah Connor commented on PAN Tokenization Vault',
      isRead: true,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiActions, setAiActions] = useState<readonly string[]>([]);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const displayConfig = getCanvasDisplayMode(viewportWidth);
  const isMobile = isMobileViewport(viewportWidth);

  const views: MobileViewSummary[] = initialViews ?? [
    {
      id: 'vw_context_primary' as ViewId,
      name: 'System Context & External Actors',
      level: 'context',
      objectCount: 6,
      description: 'High-level C4 context diagram showing customer checkouts and 3rd party banks.',
      previewThumbnailColor: 'bg-indigo-900/60',
    },
    {
      id: 'vw_container_pci' as ViewId,
      name: 'Cardholder Data Environment (CDE)',
      level: 'container',
      objectCount: 12,
      description: 'Container level architecture isolating PAN datastores and HSM key managers.',
      previewThumbnailColor: 'bg-emerald-900/60',
    },
    {
      id: 'vw_component_auth' as ViewId,
      name: 'OAuth2 / Passkey IAM Gateway',
      level: 'component',
      objectCount: 8,
      description: 'Component level microservices managing authentication tokens and sessions.',
      previewThumbnailColor: 'bg-purple-900/60',
    },
  ];

  const searchableItems: MobileSearchableItem[] = [
    ...views.map((v) => ({
      id: v.id,
      type: 'view' as const,
      title: v.name,
      subtitle: `${v.level.toUpperCase()} View • ${v.objectCount} Components`,
      tags: [v.level, 'diagram', 'c4'],
    })),
    {
      id: 'obj_vault',
      type: 'object',
      title: 'PAN Tokenization Vault',
      subtitle: 'Isolated Datastore Enclave',
      tags: ['pci', 'store', 'security'],
    },
    {
      id: 'dec_zero_trust',
      type: 'decision',
      title: 'ADR-008: Zero-Trust Perimeter',
      subtitle: 'Accepted ADR on mTLS',
      tags: ['adr', 'security', 'mtls'],
    },
  ];

  const searchResults = searchMobileCatalog(searchQuery, searchableItems);

  const handleApprove = (changeId: PullRequestId) => {
    setChanges((prev) =>
      prev.map((c) => {
        if (c.id !== changeId) return c;
        const approved = approveArchitectureChange(c, 'Mobile Lead Architect');
        setFeedbackToast(`Approved change: '${c.title}'!`);
        return approved;
      }),
    );
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;

    const comment = addMobileComment({
      author: {
        userId: 'usr_mobile_user' as UserId,
        name: 'Mobile Architect',
        avatarInitials: 'MA',
      },
      targetTitle: newCommentTarget.trim() || 'General Architecture',
      text: newCommentText.trim(),
    });

    setComments((prev) => [...prev, comment]);
    setNewCommentText('');
    setFeedbackToast('Comment posted successfully.');
  };

  const handleAskAi = () => {
    if (!aiQuestion.trim()) return;
    const response = askMobileAiCopilot(aiQuestion.trim());
    setAiAnswer(response.answer);
    setAiActions(response.suggestedActions);
    setFeedbackToast('AI response generated.');
  };

  return (
    <div
      role="region"
      aria-label="DiagramHQ Mobile Companion"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans"
    >
      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold text-white leading-tight">DiagramHQ Mobile</h1>
              <span className="px-1.5 py-0.2 text-[9px] font-mono bg-indigo-950 border border-indigo-500/40 text-indigo-400 rounded">
                F134
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {isMobile ? 'Mobile Companion View' : 'Desktop Preview'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Desktop-First Canvas Invariant Ribbon */}
      <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/30 flex items-center space-x-2 text-indigo-300 text-xs">
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-[11px] leading-tight">
          <strong>Desktop-First Canvas:</strong> {displayConfig.advisoryMessage}
        </span>
      </div>

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-500/40 flex items-center justify-between text-emerald-200 text-xs">
          <span>{feedbackToast}</span>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-emerald-400 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {/* 1. VIEWS TAB */}
        {activeTab === 'views' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Architecture Views
              </h2>
              <span className="text-[11px] font-mono text-indigo-400">
                {`${views.length} Diagrams`}
              </span>
            </div>

            <div className="space-y-3">
              {views.map((v) => {
                const isSelected = activeViewId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => setActiveViewId(isSelected ? null : v.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-indigo-500/80 shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 border border-slate-700 text-indigo-300">
                        {v.level}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {`${v.objectCount} Objects`}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white mt-1.5">{v.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{v.description}</p>

                    {/* Mobile Card Visual Representation */}
                    <div className={`mt-3 p-3 rounded-lg border border-slate-800 ${v.previewThumbnailColor} flex items-center justify-between`}>
                      <span className="text-[11px] text-slate-300 font-mono">View Projection</span>
                      <span className="text-xs text-indigo-400 font-semibold">
                        {isSelected ? 'Viewing Active' : 'Tap to Inspect →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search components, views, ADRs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                {`Search Results (${searchResults.length})`}
              </span>

              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">No matching entities found.</div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-xs text-white">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.subtitle}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 border border-slate-700 text-indigo-300">
                      {item.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. APPROVALS TAB */}
        {activeTab === 'approvals' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending Approvals
              </h2>
              <span className="text-[11px] font-mono text-amber-400">
                {`${changes.filter((c) => c.status === 'pending').length} Pending`}
              </span>
            </div>

            <div className="space-y-3">
              {changes.map((change) => {
                const isPending = change.status === 'pending';

                return (
                  <div
                    key={change.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">
                        {`By ${change.authorName}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          change.status === 'approved'
                            ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                            : change.status === 'rejected'
                            ? 'bg-rose-950 border border-rose-500/40 text-rose-300'
                            : 'bg-amber-950 border border-amber-500/40 text-amber-300'
                        }`}
                      >
                        {change.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white">{change.title}</h3>
                    <p className="text-xs text-slate-400">{change.summary}</p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {change.affectedComponentNames.map((cName) => (
                        <span
                          key={cName}
                          className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-indigo-300"
                        >
                          {cName}
                        </span>
                      ))}
                    </div>

                    {isPending ? (
                      <div className="pt-2 flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(change.id)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Approve Change
                        </button>
                      </div>
                    ) : (
                      <div className="pt-1 text-[11px] text-slate-400 italic">
                        {`Reviewed by: ${change.reviewedBy} • ${change.reviewNotes}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. COMMENTS TAB */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Architecture Review Comments
            </h2>

            {/* Post New Comment Input */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] font-medium text-slate-300 block">Add Comment</span>
              <input
                type="text"
                placeholder="Target component (e.g. PAN Tokenization Vault)"
                value={newCommentTarget}
                onChange={(e) => setNewCommentTarget(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
              />
              <textarea
                placeholder="Write your review comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddComment}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Post Comment
              </button>
            </div>

            {/* Comment Feed */}
            <div className="space-y-2.5">
              {comments.map((cmt) => (
                <div
                  key={cmt.id}
                  className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-700 text-[10px] font-bold flex items-center justify-center text-white">
                        {cmt.author.avatarInitials}
                      </span>
                      <span className="font-semibold text-white">{cmt.author.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {cmt.createdAt.slice(0, 10)}
                    </span>
                  </div>
                  <div className="text-[11px] text-indigo-400 font-mono">{`On: ${cmt.targetTitle}`}</div>
                  <p className="text-xs text-slate-300">{cmt.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Notification Stream
            </h2>

            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border ${
                    !n.isRead ? 'bg-slate-800/80 border-indigo-500/60' : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{n.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {n.category.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. AI COPILOT QUESTIONS TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Mobile AI Copilot
            </h2>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] font-medium text-slate-300 block">
                Ask Architecture Questions
              </span>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. What is the single point of failure?"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleAskAi}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold"
                >
                  Ask
                </button>
              </div>
            </div>

            {aiAnswer && (
              <div className="p-4 bg-purple-950/40 border border-purple-500/40 rounded-xl space-y-3 text-xs">
                <div className="flex items-center space-x-2 text-purple-300 font-bold">
                  <span>✦ AI Copilot Answer</span>
                  <span className="text-[10px] font-mono bg-purple-950 border border-purple-500/40 px-1.5 rounded">
                    Confidence: 94%
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed">{aiAnswer}</p>

                {aiActions.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-purple-500/20">
                    <span className="text-[10px] uppercase font-bold text-purple-400">
                      Suggested Actions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiActions.map((act) => (
                        <span
                          key={act}
                          className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono"
                        >
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Mobile Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 z-50">
        <button
          type="button"
          onClick={() => setActiveTab('views')}
          className={`flex flex-col items-center justify-center space-y-1 w-12 py-1 ${
            activeTab === 'views' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          <span className="text-[10px] font-medium">Views</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center justify-center space-y-1 w-12 py-1 ${
            activeTab === 'search' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[10px] font-medium">Search</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          className={`flex flex-col items-center justify-center space-y-1 w-12 py-1 ${
            activeTab === 'approvals' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-medium">Approvals</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={`flex flex-col items-center justify-center space-y-1 w-12 py-1 ${
            activeTab === 'comments' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="text-[10px] font-medium">Comments</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center justify-center space-y-1 w-12 py-1 ${
            activeTab === 'ai' ? 'text-purple-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[10px] font-medium">AI</span>
        </button>
      </div>
    </div>
  );
}
