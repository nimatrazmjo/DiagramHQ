'use client';

import React from 'react';

export interface CanvasDraftFrameProps {
  isDraft: boolean;
  branchName: string;
  changeCount: number;
  onMerge?: () => void;
  onSwitchToMain?: () => void;
}

export function CanvasDraftFrame({
  isDraft,
  branchName,
  changeCount,
  onMerge,
  onSwitchToMain,
}: CanvasDraftFrameProps): JSX.Element | null {
  if (!isDraft) return null;

  return (
    <>
      {/* Viewport perimeter animated dashed orange frame (IcePanel signature draft mode) */}
      <div
        data-testid="draft-mode-frame"
        className="pointer-events-none absolute inset-0 z-20 border-2 border-dashed border-amber-500/75 shadow-[inset_0_0_16px_rgba(245,158,11,0.08)]"
      />

      {/* Floating top-center draft notification pill */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1 rounded-full bg-[#15181c]/95 border border-amber-500/50 shadow-xl backdrop-blur-md text-xs text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]" />
          <span className="font-semibold text-[11px] tracking-wide uppercase">Draft Mode</span>
          <span className="text-[#8b9196]">•</span>
          <span className="font-mono text-[11px] text-[#e7e9ea] font-medium">{branchName}</span>
          {changeCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px]">
              {changeCount} changes
            </span>
          )}
          {onMerge && (
            <button
              type="button"
              onClick={onMerge}
              className="ml-1 px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider transition-colors"
            >
              Merge
            </button>
          )}
          {onSwitchToMain && (
            <button
              type="button"
              onClick={onSwitchToMain}
              className="px-1.5 py-0.5 rounded hover:bg-white/[0.08] text-[#8b9196] hover:text-[#e7e9ea] text-[10px] transition-colors"
              title="Return to main branch"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </>
  );
}
