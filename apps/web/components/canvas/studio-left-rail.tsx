'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ObjectKind } from '@diagramhq/domain';

export interface StudioLeftRailProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onAddNode: (
    kind: 'system' | 'application' | 'database' | 'queue' | 'person' | 'component',
    customData?: { label?: string; technology?: string; icon?: string; description?: string }
  ) => void;
  onCreateGroup?: () => void;
  onToggleComments: () => void;
  unresolvedCommentCount: number;
  onToggleAiCopilot: () => void;
  onOpenIconCatalog: () => void;
  onToggleFlowTrace: () => void;
  isFlowPlaybackActive: boolean;
}

export function StudioLeftRail({
  onToggleSidebar,
  isSidebarOpen,
  onAddNode,
  onCreateGroup,
  onToggleComments,
  unresolvedCommentCount,
  onToggleAiCopilot,
  onOpenIconCatalog,
  onToggleFlowTrace,
  isFlowPlaybackActive,
}: StudioLeftRailProps): JSX.Element {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isFlowsMenuOpen, setIsFlowsMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const flowsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
      if (flowsMenuRef.current && !flowsMenuRef.current.contains(event.target as Node)) {
        setIsFlowsMenuOpen(false);
      }
    }
    if (isAddMenuOpen || isFlowsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isAddMenuOpen, isFlowsMenuOpen]);

  const handleCreateObject = (
    kind: 'system' | 'application' | 'database' | 'queue' | 'person' | 'component',
    label?: string
  ) => {
    setIsAddMenuOpen(false);
    onAddNode(kind, label ? { label } : undefined);
  };

  return (
    <>
      {/* ── Top-Left Floating Control: Flows ▾ + Record ─────────────── */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5" ref={flowsMenuRef}>
        <div className="flex items-center bg-[#15181c]/95 border border-white/[0.12] rounded-lg shadow-xl backdrop-blur-md p-0.5 text-xs">
          <button
            type="button"
            data-testid="toggle-flow-playback-btn"
            onClick={onToggleFlowTrace}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
              isFlowPlaybackActive
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-[#e7e9ea] hover:bg-white/[0.06]'
            }`}
            title="Toggle Flow Trace Playback"
          >
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>Flows</span>
            <span className="text-[10px] text-[#8b9196]">▾</span>
          </button>

          <button
            type="button"
            onClick={onToggleFlowTrace}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              isFlowPlaybackActive
                ? 'text-rose-400 bg-rose-500/20'
                : 'text-[#8b9196] hover:text-white hover:bg-white/[0.06]'
            }`}
            title={isFlowPlaybackActive ? 'Stop flow trace' : 'Record / play flow trace'}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
          </button>
        </div>
      </div>

      {/* ── Mid-Left Floating Vertical Tool Rail ─────────────────────── */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5">
        <div className="flex flex-col items-center bg-[#15181c]/95 border border-white/[0.12] rounded-xl shadow-xl backdrop-blur-md p-1 gap-1 text-slate-200">
          {/* Add Object (+) Button */}
          <div className="relative" ref={addMenuRef}>
            <button
              type="button"
              data-testid="left-rail-add-btn"
              onClick={() => setIsAddMenuOpen((v) => !v)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg transition-all ${
                isAddMenuOpen
                  ? 'bg-[#2BB5E8] text-slate-950 shadow-md shadow-[#2BB5E8]/30'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-[#e7e9ea]'
              }`}
              title="Add New Object or Boundary"
            >
              +
            </button>

            {/* Quick Add Popover */}
            {isAddMenuOpen && (
              <div className="absolute left-11 top-0 w-52 rounded-xl bg-[#15181c] border border-white/[0.12] shadow-2xl p-1 z-50 text-xs text-[#e7e9ea] animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-mono text-[#8b9196] uppercase tracking-wider">
                  Add C4 Object
                </div>
                <button
                  type="button"
                  data-testid="quick-add-system"
                  onClick={() => handleCreateObject('system', 'New System')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2.5 transition-colors"
                >
                  <span className="text-base">🖥️</span>
                  <div>
                    <div className="font-semibold">System</div>
                    <div className="text-[10px] text-[#8b9196]">C4 L1 Context boundary</div>
                  </div>
                </button>
                <button
                  type="button"
                  data-testid="quick-add-app"
                  onClick={() => handleCreateObject('application', 'New Application')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2.5 transition-colors"
                >
                  <span className="text-base">📱</span>
                  <div>
                    <div className="font-semibold">App / Service</div>
                    <div className="text-[10px] text-[#8b9196]">C4 L2 Container node</div>
                  </div>
                </button>
                <button
                  type="button"
                  data-testid="quick-add-store"
                  onClick={() => handleCreateObject('database', 'Database Store')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2.5 transition-colors"
                >
                  <span className="text-base">🗄️</span>
                  <div>
                    <div className="font-semibold">Store / Database</div>
                    <div className="text-[10px] text-[#8b9196]">3D Cylinder container</div>
                  </div>
                </button>
                <button
                  type="button"
                  data-testid="quick-add-component"
                  onClick={() => handleCreateObject('component', 'New Component')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2.5 transition-colors"
                >
                  <span className="text-base">🧩</span>
                  <div>
                    <div className="font-semibold">Component</div>
                    <div className="text-[10px] text-[#8b9196]">C4 L3 Internal module</div>
                  </div>
                </button>
                <button
                  type="button"
                  data-testid="quick-add-actor"
                  onClick={() => handleCreateObject('person', 'User / Actor')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2.5 transition-colors"
                >
                  <span className="text-base">👤</span>
                  <div>
                    <div className="font-semibold">Actor / Person</div>
                    <div className="text-[10px] text-[#8b9196]">Human stakeholder</div>
                  </div>
                </button>

                <div className="my-1 border-t border-white/[0.08]" />
                <button
                  type="button"
                  data-testid="quick-add-group"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    if (onCreateGroup) {
                      onCreateGroup();
                    } else {
                      handleCreateObject('system', 'New Group');
                    }
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2.5 transition-colors text-cyan-300"
                >
                  <span className="text-base">📦</span>
                  <div>
                    <div className="font-semibold">Group Container</div>
                    <div className="text-[10px] text-cyan-400/80">Translucent boundary wrapper</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="w-5 h-px bg-white/[0.08] my-0.5" />

          {/* Comments Panel Trigger */}
          <button
            type="button"
            data-testid="toggle-comments-btn"
            onClick={onToggleComments}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8b9196] hover:text-white hover:bg-white/[0.08] transition-colors relative"
            title="Toggle Architecture Comments"
          >
            <span>💬</span>
            {unresolvedCommentCount > 0 && (
              <span
                data-testid="comments-badge-count"
                className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center shadow"
              >
                {unresolvedCommentCount}
              </span>
            )}
          </button>

          {/* AI Copilot Drawer Trigger */}
          <button
            type="button"
            data-testid="toggle-ai-copilot-btn"
            onClick={onToggleAiCopilot}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8b9196] hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Toggle AI Architecture Copilot"
          >
            <span>✨</span>
          </button>

          {/* Official Brand Icons Catalog Trigger */}
          <button
            type="button"
            data-testid="toggle-icons-btn"
            onClick={onOpenIconCatalog}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8b9196] hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Browse Official Tech Icons"
          >
            <span>🎨</span>
          </button>

          {/* Model Objects Sidebar Drawer Toggle */}
          <button
            type="button"
            data-testid="toggle-sidebar-btn"
            onClick={onToggleSidebar}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              isSidebarOpen
                ? 'bg-[#2BB5E8]/20 text-[#2BB5E8]'
                : 'text-[#8b9196] hover:text-white hover:bg-white/[0.08]'
            }`}
            title="Toggle Model Tree Sidebar"
          >
            <span>📁</span>
          </button>
        </div>
      </div>
    </>
  );
}
