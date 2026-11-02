'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { ArchitectureBranch } from '@diagramhq/domain';
import type { SaveStatus } from '../../hooks/use-diagram-autosave';

export interface StudioTopBarProps {
  currentBranch: ArchitectureBranch;
  onOpenBranchSelector: () => void;
  isDraft: boolean;
  changeCount: number;
  onOpenVisualDiff: () => void;
  onMerge: () => void;
  viewMode: 'diagram' | 'model';
  onSelectViewMode: (mode: 'diagram' | 'model') => void;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  onForceSave: () => void;
  isLoggedIn: boolean;
  sessionUser?: { name?: string | null; email?: string | null; role?: string } | null;
  onOpenExport: () => void;
  onOpenShareLink: () => void;
  onOpenMermaid: () => void;
  onOpenPlantUml: () => void;
  onOpenAiCopilot: () => void;
  onOpenAiGeneration: () => void;
  onOpenAiReview: () => void;
  onOpenAiAdr: () => void;
  onResetCanvas: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportJson: () => void;
  onOpenIconCatalog: () => void;
  onToggleFlowTrace: () => void;
  isFlowPlaybackActive?: boolean;
}

export function StudioTopBar({
  currentBranch,
  onOpenBranchSelector,
  isDraft,
  changeCount,
  onOpenVisualDiff,
  onMerge,
  viewMode,
  onSelectViewMode,
  saveStatus,
  lastSavedAt,
  onForceSave,
  isLoggedIn,
  sessionUser,
  onOpenExport,
  onOpenShareLink,
  onOpenMermaid,
  onOpenPlantUml,
  onOpenAiCopilot,
  onOpenAiGeneration,
  onOpenAiReview,
  onOpenAiAdr,
  onResetCanvas,
  onImportJson,
  onExportJson,
  onOpenIconCatalog,
  onToggleFlowTrace,
  isFlowPlaybackActive = false,
}: StudioTopBarProps): JSX.Element {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close more menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    }
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMoreMenuOpen]);

  return (
    <header className="h-11 bg-[#0b0d0f] border-b border-white/[0.08] px-3 flex items-center justify-between gap-3 shrink-0 select-none z-30 relative">
      {/* ── Left Group: Exit · DRAFT Branch · More Menu ───────────────── */}
      <div className="flex items-center gap-2">
        {/* Exit to Home / Dashboard */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-[#8b9196] hover:text-[#e7e9ea] font-medium transition-colors px-2 py-1 rounded hover:bg-white/[0.05]"
          title="Exit to DiagramHQ"
        >
          <svg className="w-3.5 h-3.5 text-[#8b9196]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="font-semibold text-white">Exit</span>
          <span className="text-[#8b9196] font-normal text-xs">DiagramHQ</span>
        </Link>

        {/* Brand mark subtle glyph */}
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80 shadow-[0_0_6px_#3b82f6]" />

        {/* Active Branch Pill (IcePanel DRAFT style) */}
        {isDraft ? (
          <button
            type="button"
            data-testid="branch-badge"
            onClick={onOpenBranchSelector}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500/25 transition-all text-xs font-semibold shadow-sm shadow-amber-500/10"
            title="Active Draft Branch — click to switch or manage branches"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]" />
            <span className="text-[10px] tracking-wider uppercase font-bold text-amber-300">
              DRAFT (feature)
            </span>
            <span data-testid="branch-badge-name" className="font-mono text-[11px] text-amber-200 max-w-[120px] truncate">
              {currentBranch.name}
            </span>
            <span className="text-[10px] text-amber-400/80">▾</span>
          </button>
        ) : (
          <button
            type="button"
            data-testid="branch-badge"
            onClick={onOpenBranchSelector}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.12] text-[#8b9196] hover:text-[#e7e9ea] hover:bg-white/[0.08] transition-all text-xs font-medium"
            title="Active Branch — click to switch or create branch"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] tracking-wider uppercase font-bold text-emerald-400">
              main
            </span>
            <span data-testid="branch-badge-name" className="font-mono text-[11px] text-[#e7e9ea] max-w-[120px] truncate">
              {currentBranch.name}
            </span>
            <span className="text-[10px] text-[#8b9196]">▾</span>
          </button>
        )}

        {/* More Actions Dropdown (…) */}
        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            data-testid="more-options-btn"
            onClick={() => setIsMoreMenuOpen((v) => !v)}
            aria-label="More Options"
            className="w-7 h-7 flex items-center justify-center rounded text-[#8b9196] hover:text-[#e7e9ea] hover:bg-white/[0.06] transition-colors text-sm font-bold"
            title="More Options"
          >
            …
          </button>

          {isMoreMenuOpen && (
            <div className="absolute left-0 mt-1 w-56 rounded-xl bg-[#15181c] border border-white/[0.12] shadow-2xl p-1 z-50 text-xs text-[#e7e9ea] animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] font-mono text-[#8b9196] uppercase tracking-wider">
                Tools & Export
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenExport();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
              >
                <span>🖼️</span>
                <span>Export (PNG, SVG, PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenShareLink();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
              >
                <span>🔗</span>
                <span>Share Public Link</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenMermaid();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
              >
                <span>🧜‍♀️</span>
                <span>Mermaid.js Code</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenPlantUml();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
              >
                <span>🌱</span>
                <span>PlantUML Code</span>
              </button>

              <div className="my-1 border-t border-white/[0.08]" />
              <div className="px-2 py-1 text-[10px] font-mono text-[#8b9196] uppercase tracking-wider">
                Diagram Data
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onExportJson();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
              >
                <span>📤</span>
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
              >
                <span>📥</span>
                <span>Import JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImportJson}
                className="hidden"
              />

              <div className="my-1 border-t border-white/[0.08]" />
              <div className="px-2 py-1 text-[10px] font-mono text-[#8b9196] uppercase tracking-wider">
                Intelligence
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenAiCopilot();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
              >
                <span>🤖</span>
                <span>AI Copilot</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenAiGeneration();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
              >
                <span>✨</span>
                <span>AI Architecture Generator</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenAiReview();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
              >
                <span>🛡️</span>
                <span>Governance Review</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenAiAdr();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
              >
                <span>📜</span>
                <span>Draft ADR</span>
              </button>

              <div className="my-1 border-t border-white/[0.08]" />
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onResetCanvas();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 flex items-center gap-2 transition-colors"
              >
                <span>🧹</span>
                <span>Reset Canvas</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Center Group: Segmented Diagram ⟷ Model Toggle ───────────── */}
      <div className="flex items-center">
        <div
          data-testid="diagram-model-toggle"
          className="flex items-center bg-[#15181c] p-0.5 rounded-lg border border-white/[0.1] text-xs font-medium"
        >
          <button
            type="button"
            data-testid="view-mode-diagram"
            onClick={() => onSelectViewMode('diagram')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'diagram'
                ? 'bg-[#2BB5E8]/20 text-[#2BB5E8] border border-[#2BB5E8]/40 font-semibold shadow-sm'
                : 'text-[#8b9196] hover:text-[#e7e9ea] border border-transparent'
            }`}
          >
            <span>📐</span>
            <span>Diagram</span>
          </button>
          <button
            type="button"
            data-testid="view-mode-model"
            onClick={() => onSelectViewMode('model')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'model'
                ? 'bg-[#2BB5E8]/20 text-[#2BB5E8] border border-[#2BB5E8]/40 font-semibold shadow-sm'
                : 'text-[#8b9196] hover:text-[#e7e9ea] border border-transparent'
            }`}
          >
            <span>📦</span>
            <span>Model</span>
          </button>
        </div>
      </div>

      {/* ── Right Group: Autosave · N changes ▾ · Merge ▾ · User Pill ── */}
      <div className="flex items-center gap-2">
        {/* Autosave Status Indicator */}
        <div data-testid="autosave-status" className="flex items-center">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1 text-[11px] text-amber-300 font-medium animate-pulse px-2 py-0.5">
              <svg className="animate-spin h-3 w-3 text-amber-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="hidden sm:inline">Saving...</span>
            </div>
          )}
          {(saveStatus === 'saved' || (saveStatus === 'idle' && isLoggedIn)) && (
            <button
              type="button"
              onClick={onForceSave}
              title={lastSavedAt ? `Saved at ${lastSavedAt.toLocaleTimeString()}. Click to force save.` : 'Auto-saved'}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium px-2 py-0.5 rounded transition-colors"
            >
              <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="hidden sm:inline">Saved</span>
            </button>
          )}
          {saveStatus === 'unsaved' && (
            <div className="flex items-center gap-1 text-[11px] text-amber-300 font-medium px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span className="hidden sm:inline">Saving...</span>
            </div>
          )}
          {(saveStatus === 'saved-local' || (saveStatus === 'idle' && !isLoggedIn)) && (
            <button
              type="button"
              onClick={onForceSave}
              title="Saved locally in browser storage"
              className="flex items-center gap-1 text-[11px] text-[#8b9196] hover:text-[#e7e9ea] font-medium px-2 py-0.5 rounded transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span className="hidden sm:inline">Saved</span>
            </button>
          )}
        </div>

        {/* Change Counter Dropdown Trigger */}
        <button
          type="button"
          data-testid="toggle-visual-diff-btn"
          onClick={onOpenVisualDiff}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-[#e7e9ea] transition-colors"
          title="Review pending changes in this draft"
        >
          <span>🗂</span>
          <span className="font-mono text-xs text-[#2BB5E8]">{changeCount}</span>
          <span className="hidden sm:inline text-[#8b9196]">changes</span>
          <span className="text-[10px] text-[#8b9196]">▾</span>
        </button>

        {/* IcePanel Merge Action Button */}
        <button
          type="button"
          data-testid="toggle-review-pr-btn"
          onClick={onMerge}
          className="flex items-center gap-1 px-3 py-1 rounded bg-[#2BB5E8] hover:bg-[#209ecc] text-slate-950 font-bold text-xs transition-colors shadow-sm shadow-[#2BB5E8]/20"
          title="Merge this draft branch into main"
        >
          <span>Merge</span>
          <span className="text-[10px]">▾</span>
        </button>

        {/* User Pill / Studio Mode Badge */}
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            data-testid="studio-mode-badge"
            className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-[#e7e9ea] font-medium transition-colors"
            title="User Dashboard"
          >
            <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
              {(sessionUser?.name || sessionUser?.email || 'U').charAt(0).toUpperCase()}
            </span>
            <span className="max-w-[80px] truncate hidden xl:inline text-[#8b9196]">
              {sessionUser?.name || sessionUser?.email}
            </span>
          </Link>
        ) : (
          <span
            data-testid="studio-mode-badge"
            className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono"
          >
            Phase 0 Studio (Guest Mode)
          </span>
        )}
      </div>
    </header>
  );
}
