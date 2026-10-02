import React from 'react';
import type { FlowPlaybackState } from '@diagramhq/domain';

export interface FlowPlaybackToolbarProps {
  state: FlowPlaybackState;
  currentStepNote?: string | null;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek?: (stepIndex: number) => void;
  onToggleLoop?: () => void;
}

export function FlowPlaybackToolbar({
  state,
  currentStepNote,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onRestart,
  onSpeedChange,
  onToggleLoop,
}: FlowPlaybackToolbarProps): JSX.Element {
  const stepNumber = state.totalSteps > 0 ? state.currentStepIndex + 1 : 0;
  const isAtFirst = state.currentStepIndex <= 0;
  const isAtLast = state.currentStepIndex >= state.totalSteps - 1;

  return (
    <div
      data-testid="flow-playback-toolbar"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 bg-slate-900/95 border border-sky-500/40 backdrop-blur-md rounded-2xl p-2.5 px-4 shadow-2xl shadow-sky-950/50"
    >
      {/* Current Step Description banner if available */}
      {currentStepNote && (
        <div
          data-testid="playback-step-note"
          className="text-xs text-sky-200 font-medium px-3 py-1 rounded-full bg-sky-950/80 border border-sky-600/50 max-w-md truncate"
        >
          <span className="font-bold text-sky-400 mr-1.5">Step #{stepNumber}:</span>
          {currentStepNote}
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Restart Button */}
        <button
          type="button"
          data-testid="playback-restart-btn"
          onClick={onRestart}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Restart flow from beginning"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>

        {/* Previous Button */}
        <button
          type="button"
          data-testid="playback-prev-btn"
          onClick={onPrev}
          disabled={isAtFirst}
          className={`p-1.5 rounded-lg transition-colors ${
            isAtFirst
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Previous step"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>

        {/* Play / Pause Primary Button */}
        {state.isPlaying ? (
          <button
            type="button"
            data-testid="playback-pause-btn"
            onClick={onPause}
            className="w-9 h-9 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center justify-center shadow-lg shadow-sky-500/30 transition-all active:scale-95"
            title="Pause playback"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            data-testid="playback-play-btn"
            onClick={onPlay}
            className="w-9 h-9 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center justify-center shadow-lg shadow-sky-500/30 transition-all active:scale-95 pl-0.5"
            title="Play flow"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        )}

        {/* Next Button */}
        <button
          type="button"
          data-testid="playback-next-btn"
          onClick={onNext}
          disabled={isAtLast && !state.isLooping}
          className={`p-1.5 rounded-lg transition-colors ${
            isAtLast && !state.isLooping
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Next step"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>

        {/* Step Indicator */}
        <div
          data-testid="playback-step-indicator"
          className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-slate-800/80 text-sky-300 border border-slate-700/60"
        >
          {state.totalSteps > 0
            ? `${stepNumber} / ${state.totalSteps}`
            : '0 / 0'}
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400 font-mono">Speed</span>
          <select
            data-testid="playback-speed-select"
            value={state.speedMultiplier}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="bg-slate-800 text-sky-300 text-xs rounded border border-slate-700 px-1.5 py-0.5 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>

        {/* Loop Toggle if provided */}
        {onToggleLoop && (
          <button
            type="button"
            data-testid="playback-loop-btn"
            onClick={onToggleLoop}
            className={`p-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
              state.isLooping
                ? 'text-sky-300 bg-sky-950/80 border border-sky-500/50'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={state.isLooping ? 'Looping enabled' : 'Looping disabled'}
          >
            ⟳
          </button>
        )}
      </div>
    </div>
  );
}
