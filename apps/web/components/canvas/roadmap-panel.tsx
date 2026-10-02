'use client';

import React, { useState } from 'react';
import type {
  ArchitectureRoadmapItem,
  RoadmapItemStatus,
  RoadmapPriority,
} from '@diagramhq/domain';
import {
  groupRoadmapItemsByQuarter,
  calculateRoadmapProgress,
} from '@diagramhq/domain';

export interface RoadmapItemCardProps {
  item: ArchitectureRoadmapItem;
  onClick?: () => void;
  onLinkChange?: (item: ArchitectureRoadmapItem) => void;
  activeChangeSetId?: string;
}

export function RoadmapItemCard({
  item,
  onClick,
  onLinkChange,
  activeChangeSetId,
}: RoadmapItemCardProps) {
  const statusStyles: Record<RoadmapItemStatus, { bg: string; text: string; border: string }> = {
    planned: { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
    in_progress: { bg: 'bg-amber-950', text: 'text-amber-300', border: 'border-amber-800' },
    completed: { bg: 'bg-emerald-950', text: 'text-emerald-300', border: 'border-emerald-800' },
    deferred: { bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' },
  };

  const priorityStyles: Record<RoadmapPriority, string> = {
    low: 'text-slate-400',
    medium: 'text-cyan-400',
    high: 'text-amber-400',
    critical: 'text-rose-400',
  };

  const isLinkedToActive = activeChangeSetId
    ? item.linkedChangeSetIds.includes(activeChangeSetId)
    : false;

  const currentStatus = statusStyles[item.status] || statusStyles.planned;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border bg-slate-900 transition-all text-xs space-y-2 cursor-pointer ${
        isLinkedToActive
          ? 'border-cyan-500 shadow-md shadow-cyan-950/40 bg-slate-850'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-white leading-snug">{item.title}</h4>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}
        >
          {item.status.replace('_', ' ')}
        </span>
      </div>

      {item.description && (
        <p className="text-slate-400 text-[11px] line-clamp-2">{item.description}</p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-cyan-400 font-semibold">{item.quarter}</span>
          <span className={`font-mono text-[10px] uppercase ${priorityStyles[item.priority]}`}>
            {`${item.priority} priority`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {item.linkedChangeSetIds.length > 0 && (
            <span className="flex items-center gap-1 text-slate-400 font-mono text-[10px]" title="Linked change sets">
              <span className="material-symbols-outlined text-[13px]">link</span>
              {item.linkedChangeSetIds.length}
            </span>
          )}
          {activeChangeSetId && onLinkChange && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLinkChange(item);
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                isLinkedToActive
                  ? 'bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800'
                  : 'bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-800'
              }`}
            >
              {isLinkedToActive ? 'Unlink Change' : 'Link Change'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface RoadmapTimelinePanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: ArchitectureRoadmapItem[];
  activeChangeSetId?: string;
  onLinkChange?: (item: ArchitectureRoadmapItem) => void;
  onCreateItem?: (newItem: {
    title: string;
    quarter: string;
    description?: string;
    priority?: RoadmapPriority;
  }) => void;
}

export function RoadmapTimelinePanel({
  isOpen,
  onClose,
  items,
  activeChangeSetId,
  onLinkChange,
  onCreateItem,
}: RoadmapTimelinePanelProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuarter, setNewQuarter] = useState('2026-Q1');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<RoadmapPriority>('medium');

  if (!isOpen) return null;

  const grouped = groupRoadmapItemsByQuarter(items);
  const quarters = Object.keys(grouped);
  const metrics = calculateRoadmapProgress(items);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newQuarter.trim()) return;

    onCreateItem?.({
      title: newTitle.trim(),
      quarter: newQuarter.trim(),
      description: newDesc.trim() || undefined,
      priority: newPriority,
    });

    setNewTitle('');
    setNewDesc('');
    setShowCreateModal(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Architecture Roadmap Timeline"
    >
      <div className="w-full max-w-4xl h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-cyan-400 text-2xl">
              map
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">
                Architecture Roadmap
              </h2>
              <p className="text-xs text-slate-400">
                Quarterly architecture milestones and linked changes
                {activeChangeSetId && (
                  <span className="text-cyan-400 ml-1 font-mono">{`(${activeChangeSetId})`}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              + Add Roadmap Item
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Close Roadmap Panel"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Progress bar banner */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300">Quarterly Progress</span>
            <div className="w-48 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${metrics.percentComplete}%` }}
              />
            </div>
            <span className="font-mono text-emerald-400 font-bold">
              {`${metrics.percentComplete}% complete`}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>
              Total: <strong className="text-white font-mono">{metrics.total}</strong>
            </span>
            <span>
              Done: <strong className="text-emerald-400 font-mono">{metrics.completed}</strong>
            </span>
            <span>
              In Progress: <strong className="text-amber-400 font-mono">{metrics.inProgress}</strong>
            </span>
            <span>
              Planned: <strong className="text-cyan-400 font-mono">{metrics.planned}</strong>
            </span>
          </div>
        </div>

        {/* Timeline body */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
          {quarters.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">
                event_busy
              </span>
              <p className="text-sm font-medium">No roadmap items scheduled</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Schedule your architectural evolutions by target quarter and link them to model change sets.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Create First Item
              </button>
            </div>
          ) : (
            <div className="grid grid-flow-col auto-cols-[280px] gap-4 h-full items-start">
              {quarters.map((q) => {
                const quarterItems = grouped[q] || [];
                return (
                  <div
                    key={q}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col max-h-full space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-mono font-bold text-cyan-400 text-sm">{q}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 font-mono">
                        {`${quarterItems.length} items`}
                      </span>
                    </div>

                    <div className="space-y-2 overflow-y-auto pr-1">
                      {quarterItems.map((item) => (
                        <RoadmapItemCard
                          key={item.id}
                          item={item}
                          activeChangeSetId={activeChangeSetId}
                          onLinkChange={onLinkChange}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Item Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-slate-100">
              <h3 className="text-base font-bold text-white mb-4">
                Schedule New Architecture Milestone
              </h3>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., PostgreSQL 16 Partitioning"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Quarter
                    </label>
                    <select
                      value={newQuarter}
                      onChange={(e) => setNewQuarter(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="2026-Q1">2026-Q1</option>
                      <option value="2026-Q2">2026-Q2</option>
                      <option value="2026-Q3">2026-Q3</option>
                      <option value="2026-Q4">2026-Q4</option>
                      <option value="2027-Q1">2027-Q1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Priority
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as RoadmapPriority)}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={3}
                    placeholder="Technical scope, architectural impact, and goals..."
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    Save Milestone
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
