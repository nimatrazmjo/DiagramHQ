import React from 'react';
import type { UserJourneyPlaybackStepInfo } from '@diagramhq/domain';

export interface UserJourneyOverlayProps {
  journeyInfo: UserJourneyPlaybackStepInfo | null;
  onClose?: () => void;
}

export function UserJourneyOverlay({
  journeyInfo,
  onClose,
}: UserJourneyOverlayProps): JSX.Element | null {
  if (!journeyInfo) return null;

  const percent =
    journeyInfo.totalSteps > 0
      ? Math.round((journeyInfo.stepNumber / journeyInfo.totalSteps) * 100)
      : 0;

  return (
    <aside
      data-testid="user-journey-overlay"
      aria-label="User Journey Overlay"
      className="fixed top-20 right-6 z-30 w-80 bg-slate-900/90 border border-violet-500/40 backdrop-blur-md rounded-2xl p-4 shadow-2xl shadow-violet-950/40 text-slate-100 flex flex-col gap-3 pointer-events-auto"
    >
      <header className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-violet-600/30 text-violet-400 text-sm">
            🗺️
          </span>
          <div>
            <h4
              data-testid="user-journey-title"
              className="text-xs font-semibold text-white tracking-wide truncate max-w-[180px]"
            >
              {journeyInfo.flowName}
            </h4>
            <div className="text-[10px] text-violet-300/80 font-medium">
              User Journey Playback
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            data-testid="user-journey-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            title="Close overlay"
          >
            ✕
          </button>
        )}
      </header>

      {journeyInfo.persona && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium">Persona:</span>
          <span
            data-testid="user-journey-persona"
            className="px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-200 text-xs font-semibold"
          >
            {journeyInfo.persona}
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
          <span data-testid="user-journey-step-indicator">
            {`Step ${journeyInfo.stepNumber} of ${journeyInfo.totalSteps}`}
          </span>
          <span>{percent}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Step Detail Card */}
      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
        {journeyInfo.actorAction ? (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Actor Action
            </div>
            <div
              data-testid="user-journey-action"
              className="text-xs text-white font-medium mt-0.5"
            >
              {journeyInfo.actorAction}
            </div>
          </div>
        ) : null}

        {journeyInfo.userIntent ? (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-violet-400/90 font-semibold">
              User Intent
            </div>
            <div
              data-testid="user-journey-intent"
              className="text-xs text-violet-200/90 mt-0.5"
            >
              {journeyInfo.userIntent}
            </div>
          </div>
        ) : null}

        {journeyInfo.note ? (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold">
              Note
            </div>
            <div
              data-testid="user-journey-note"
              className="text-xs text-slate-300 mt-0.5 italic"
            >
              {journeyInfo.note}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
