import React from 'react';
import type { DataFlowPlaybackStepInfo } from '@diagramhq/domain';

export interface DataFlowOverlayProps {
  dataFlowInfo: DataFlowPlaybackStepInfo | null;
  onClose?: () => void;
}

export function DataFlowOverlay({
  dataFlowInfo,
  onClose,
}: DataFlowOverlayProps): JSX.Element | null {
  if (!dataFlowInfo) return null;

  const percent =
    dataFlowInfo.totalSteps > 0
      ? Math.round((dataFlowInfo.stepNumber / dataFlowInfo.totalSteps) * 100)
      : 0;

  const classification =
    dataFlowInfo.stepClassification ?? dataFlowInfo.dataClassification;

  return (
    <aside
      data-testid="data-flow-overlay"
      aria-label="Data Flow Overlay"
      className="fixed top-20 right-6 z-30 w-80 bg-slate-900/90 border border-emerald-500/40 backdrop-blur-md rounded-2xl p-4 shadow-2xl shadow-emerald-950/40 text-slate-100 flex flex-col gap-3 pointer-events-auto"
    >
      <header className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-emerald-600/30 text-emerald-400 text-sm">
            📊
          </span>
          <div>
            <h4
              data-testid="data-flow-title"
              className="text-xs font-semibold text-white tracking-wide truncate max-w-[180px]"
            >
              {dataFlowInfo.flowName}
            </h4>
            <div className="text-[10px] text-emerald-300/80 font-medium">
              Data Lineage &amp; Movement
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            data-testid="data-flow-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            title="Close overlay"
          >
            ✕
          </button>
        )}
      </header>

      {classification && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium">Classification:</span>
          <span
            data-testid="data-flow-classification"
            className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold uppercase tracking-wider text-[10px]"
          >
            {classification}
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
          <span data-testid="data-flow-step-indicator">
            {`Step ${dataFlowInfo.stepNumber} of ${dataFlowInfo.totalSteps}`}
          </span>
          <span>{`${percent}%`}</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Active Payload Details */}
      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1">
            Data Elements
          </div>
          <div
            data-testid="data-flow-elements"
            className="flex flex-wrap gap-1.5"
          >
            {dataFlowInfo.dataElements.length > 0 ? (
              dataFlowInfo.dataElements.map((elem) => (
                <span
                  key={elem}
                  className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 text-[11px] font-mono"
                >
                  {elem}
                </span>
              ))
            ) : (
              <span className="text-slate-500 text-xs italic">No specific elements</span>
            )}
          </div>
        </div>

        {dataFlowInfo.transformation ? (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Transformation
            </div>
            <div
              data-testid="data-flow-transformation"
              className="text-xs text-white font-medium mt-0.5"
            >
              {dataFlowInfo.transformation}
            </div>
          </div>
        ) : null}

        {dataFlowInfo.note ? (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-teal-400 font-semibold">
              Note
            </div>
            <div
              data-testid="data-flow-note"
              className="text-xs text-slate-300 mt-0.5 italic"
            >
              {dataFlowInfo.note}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
