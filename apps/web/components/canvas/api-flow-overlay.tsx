import React from 'react';
import type { ApiFlowPlaybackStepInfo } from '@diagramhq/domain';

export interface ApiFlowOverlayProps {
  apiFlowInfo: ApiFlowPlaybackStepInfo | null;
  onClose?: () => void;
  onExportMermaid?: () => void;
  onExportPlantUML?: () => void;
}

export function ApiFlowOverlay({
  apiFlowInfo,
  onClose,
  onExportMermaid,
  onExportPlantUML,
}: ApiFlowOverlayProps): JSX.Element | null {
  if (!apiFlowInfo) return null;

  const percent =
    apiFlowInfo.totalSteps > 0
      ? Math.round((apiFlowInfo.stepNumber / apiFlowInfo.totalSteps) * 100)
      : 0;

  const currentMethod =
    apiFlowInfo.stepHttpMethod ?? apiFlowInfo.httpMethod ?? 'GET';
  const currentEndpoint =
    apiFlowInfo.stepEndpoint ?? apiFlowInfo.endpoint ?? '/api';
  const currentStatusCode =
    apiFlowInfo.stepStatusCode ?? apiFlowInfo.statusCode;

  const methodColorClass =
    currentMethod === 'GET'
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      : currentMethod === 'POST'
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        : currentMethod === 'PUT' || currentMethod === 'PATCH'
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : currentMethod === 'DELETE'
            ? 'bg-red-500/20 text-red-300 border-red-500/40'
            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';

  const statusColorClass =
    currentStatusCode && currentStatusCode < 300
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : currentStatusCode && currentStatusCode < 400
        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        : currentStatusCode && currentStatusCode >= 400
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          : 'bg-slate-700 text-slate-300 border-slate-600';

  return (
    <aside
      data-testid="api-flow-overlay"
      aria-label="API Flow Overlay"
      className="fixed top-20 right-6 z-30 w-84 bg-slate-900/90 border border-cyan-500/40 backdrop-blur-md rounded-2xl p-4 shadow-2xl shadow-cyan-950/40 text-slate-100 flex flex-col gap-3 pointer-events-auto"
    >
      <header className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-cyan-600/30 text-cyan-400 text-sm">
            ⚡
          </span>
          <div>
            <h4
              data-testid="api-flow-title"
              className="text-xs font-semibold text-white tracking-wide truncate max-w-[180px]"
            >
              {apiFlowInfo.flowName}
            </h4>
            <div className="text-[10px] text-cyan-300/80 font-medium">
              API Request Sequence
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            data-testid="api-flow-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            title="Close overlay"
          >
            ✕
          </button>
        )}
      </header>

      {/* HTTP Method and Endpoint Pill */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          data-testid="api-flow-method-badge"
          className={`px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wider font-mono ${methodColorClass}`}
        >
          {currentMethod}
        </span>
        <span
          data-testid="api-flow-endpoint-badge"
          className="text-xs font-mono text-slate-200 truncate max-w-[200px]"
          title={currentEndpoint}
        >
          {currentEndpoint}
        </span>
        {currentStatusCode && (
          <span
            data-testid="api-flow-status-badge"
            className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold font-mono ml-auto ${statusColorClass}`}
          >
            {currentStatusCode}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
          <span data-testid="api-flow-step-indicator">
            {`Step ${apiFlowInfo.stepNumber} of ${apiFlowInfo.totalSteps}`}
          </span>
          <span>{`${percent}%`}</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            data-testid="api-flow-progress-bar"
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Step Note */}
      {apiFlowInfo.note && (
        <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">
            Step Note
          </div>
          <p
            data-testid="api-flow-step-note"
            className="text-xs text-slate-300 leading-relaxed font-sans"
          >
            {apiFlowInfo.note}
          </p>
        </div>
      )}

      {/* Schema Previews */}
      {(apiFlowInfo.stepRequestSchema || apiFlowInfo.stepResponseSchema) && (
        <div className="flex flex-col gap-1.5">
          {apiFlowInfo.stepRequestSchema && (
            <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                Request Schema
              </span>
              <pre
                data-testid="api-flow-request-schema"
                className="text-[10px] font-mono text-cyan-200/90 whitespace-pre-wrap break-all"
              >
                {apiFlowInfo.stepRequestSchema}
              </pre>
            </div>
          )}
          {apiFlowInfo.stepResponseSchema && (
            <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                Response Schema
              </span>
              <pre
                data-testid="api-flow-response-schema"
                className="text-[10px] font-mono text-emerald-200/90 whitespace-pre-wrap break-all"
              >
                {apiFlowInfo.stepResponseSchema}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Exporter Action Buttons */}
      {(onExportMermaid || onExportPlantUML) && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
          {onExportMermaid && (
            <button
              type="button"
              data-testid="api-flow-export-mermaid"
              onClick={onExportMermaid}
              className="flex-1 px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-200 text-[11px] font-medium transition-colors"
            >
              Export Mermaid
            </button>
          )}
          {onExportPlantUML && (
            <button
              type="button"
              data-testid="api-flow-export-plantuml"
              onClick={onExportPlantUML}
              className="flex-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
            >
              Export PlantUML
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
