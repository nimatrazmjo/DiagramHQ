'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface QuickConnectObjectItem {
  id: string;
  name: string;
  kind?: string;
  domain?: string;
  icon?: string;
}

export interface QuickConnectPopoverProps {
  isOpen: boolean;
  position: { x: number; y: number };
  sourceNodeId: string;
  existingObjects?: QuickConnectObjectItem[];
  onSelectNewObject: (kind: 'system' | 'actor' | 'group', label?: string) => void;
  onSelectExistingObject: (objectId: string) => void;
  onClose: () => void;
}

function SystemIcon(): JSX.Element {
  return (
    <svg className="w-4 h-4 text-sky-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function ActorIcon(): JSX.Element {
  return (
    <svg className="w-4 h-4 text-pink-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
    </svg>
  );
}

function GroupIcon(): JSX.Element {
  return (
    <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" strokeDasharray="4 4" />
    </svg>
  );
}

export function QuickConnectPopover({
  isOpen,
  position,
  sourceNodeId,
  existingObjects = [],
  onSelectNewObject,
  onSelectExistingObject,
  onClose,
}: QuickConnectPopoverProps): JSX.Element | null {
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter existing objects excluding the source node
  const filteredExisting = existingObjects
    .filter((obj) => obj.id !== sourceNodeId)
    .filter((obj) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        obj.name.toLowerCase().includes(q) ||
        (obj.kind && obj.kind.toLowerCase().includes(q)) ||
        (obj.domain && obj.domain.toLowerCase().includes(q))
      );
    });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredExisting.length > 0 && filteredExisting[0]) {
        onSelectExistingObject(filteredExisting[0].id);
      } else if (searchQuery.trim()) {
        onSelectNewObject('system', searchQuery.trim());
      }
    }
  };

  // Clamp popover position so it stays inside window bounds
  const popoverWidth = 380;
  const popoverHeight = 300;
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const left = Math.max(16, Math.min(position.x, windowWidth - popoverWidth - 24));
  const top = Math.max(16, Math.min(position.y, windowHeight - popoverHeight - 24));

  return (
    <div
      ref={popoverRef}
      data-testid="quick-connect-popover"
      className="fixed z-50 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-4 w-[380px] text-slate-100 animate-in fade-in zoom-in-95 duration-100 select-none"
      style={{ left: `${left}px`, top: `${top}px` }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Search Input matching IcePanel cyan focus outline */}
      <div className="relative mb-3.5">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/80 border-2 border-sky-400 rounded-xl shadow-inner focus-within:ring-2 focus-within:ring-sky-400/40">
          <span className="text-sky-400 text-sm">🔍</span>
          <input
            ref={inputRef}
            data-testid="quick-connect-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search"
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main 2-column Layout: Existing objects (Left) & New object (Right) */}
      <div className="grid grid-cols-2 gap-3 min-h-[160px]">
        {/* Left Column: Existing objects */}
        <div className="flex flex-col border-r border-slate-800 pr-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Existing objects
          </div>
          <div className="flex-1 overflow-y-auto max-h-[170px] space-y-1 pr-1 custom-scrollbar">
            {filteredExisting.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-3 text-center">
                {searchQuery ? 'No matching objects' : 'No existing objects'}
              </div>
            ) : (
              filteredExisting.map((obj) => (
                <button
                  key={obj.id}
                  type="button"
                  data-testid={`quick-connect-existing-${obj.id}`}
                  onClick={() => onSelectExistingObject(obj.id)}
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/80 text-left transition-colors group"
                >
                  <div className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    {obj.kind === 'person' || obj.kind === 'actor' ? (
                      <ActorIcon />
                    ) : (
                      <SystemIcon />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-200 truncate group-hover:text-white">
                      {obj.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {obj.kind || 'System'}
                      {obj.domain ? ` · ${obj.domain}` : ''}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: New object */}
        <div className="flex flex-col pl-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            New object
          </div>
          <div className="space-y-2">
            <button
              type="button"
              data-testid="quick-connect-new-system"
              onClick={() => onSelectNewObject('system', searchQuery.trim() || undefined)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-sky-500/20 hover:border-sky-400/60 border border-slate-700/80 transition-all text-left text-xs font-medium text-slate-200 hover:text-white group"
            >
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <SystemIcon />
              </div>
              <span className="truncate">{searchQuery.trim() ? `System: ${searchQuery.trim()}` : 'System'}</span>
            </button>

            <button
              type="button"
              data-testid="quick-connect-new-actor"
              onClick={() => onSelectNewObject('actor', searchQuery.trim() || undefined)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-pink-500/20 hover:border-pink-400/60 border border-slate-700/80 transition-all text-left text-xs font-medium text-slate-200 hover:text-white group"
            >
              <div className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ActorIcon />
              </div>
              <span className="truncate">{searchQuery.trim() ? `Actor: ${searchQuery.trim()}` : 'Actor'}</span>
            </button>

            <button
              type="button"
              data-testid="quick-connect-new-group"
              onClick={() => onSelectNewObject('group', searchQuery.trim() || undefined)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 hover:border-emerald-400/60 border border-slate-700/80 transition-all text-left text-xs font-medium text-slate-200 hover:text-white group"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <GroupIcon />
              </div>
              <span className="truncate">{searchQuery.trim() ? `Group: ${searchQuery.trim()}` : 'Group'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
