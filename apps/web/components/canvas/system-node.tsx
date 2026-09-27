import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SystemNodeData } from '@diagramhq/domain';
import { SecurityBadges } from './security-badges';

function SystemIcon({ external }: { external?: boolean }): JSX.Element {
  return (
    <svg
      className={`w-4 h-4 flex-shrink-0 ${external ? 'text-slate-400' : 'text-blue-400'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function CloudIcon(): JSX.Element {
  return (
    <svg
      className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}

/**
 * SystemNode renders a Software System element (F023).
 * Supports internal systems (with container drill-down, domain, and criticality)
 * as well as external systems (third-party / SaaS with dashed border styling).
 */
export function SystemNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as SystemNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Software System';
  const isExternal = Boolean(nodeData.external);
  const domain = typeof nodeData.domain === 'string' && nodeData.domain.length > 0 ? nodeData.domain : undefined;
  const systemType = typeof nodeData.systemType === 'string' && nodeData.systemType.length > 0 ? nodeData.systemType : undefined;
  const critical = Boolean(nodeData.critical);
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0 ? nodeData.description : undefined;
  const canDrillDown = Boolean(nodeData.canDrillDown ?? !isExternal);
  const systemId = (nodeData.systemId as string) ?? id;

  const handleDrillDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof nodeData.onDrillDown === 'function') {
      (nodeData.onDrillDown as (id: string) => void)(systemId);
    } else if (typeof window !== 'undefined') {
      const drillEvent = new CustomEvent('system:drill-down', {
        detail: { systemId, level: 2 },
      });
      window.dispatchEvent(drillEvent);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (canDrillDown) {
      handleDrillDown(e);
    }
  };

  if (isExternal) {
    return (
      <div
        data-testid="external-system-node"
        className={`min-w-[220px] max-w-[280px] rounded-xl p-3.5 shadow-lg bg-slate-900/80 border border-dashed transition-all ${
          selected
            ? 'border-slate-300 ring-2 ring-slate-400/30 shadow-slate-400/20'
            : 'border-slate-600 hover:border-slate-500'
        }`}
      >
        <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !bg-slate-400" />
        <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-slate-400" />
        <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-slate-400" />
        <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !bg-slate-400" />
        <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-slate-400" />
        <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-slate-400" />
        <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-slate-400" />
        <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-slate-400" />

        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded bg-slate-800 border border-slate-700">
              <CloudIcon />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
              External System
            </span>
          </div>
          <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
            {systemType ? `[${systemType}]` : '[Third-Party]'}
          </span>
        </div>

        {/* Label */}
        <div className="text-sm font-semibold text-slate-200 truncate">{label}</div>

        {/* Domain */}
        {domain && (
          <div className="mt-1.5">
            <span className="text-[11px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 font-mono">
              {`[Domain: ${domain}]`}
            </span>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed border-t border-slate-800/80 pt-1.5">
            {description}
          </div>
        )}

        {/* Security Overlays */}
        <SecurityBadges {...(nodeData as unknown as React.ComponentProps<typeof SecurityBadges>)} />
      </div>
    );
  }

  // Internal Software System
  return (
    <div
      data-testid="system-node"
      onDoubleClick={handleDoubleClick}
      className={`min-w-[220px] max-w-[280px] rounded-xl p-3.5 shadow-lg bg-slate-900/95 border transition-all ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-blue-500/20'
          : critical
          ? 'border-blue-500/70 hover:border-blue-400 ring-1 ring-amber-500/20'
          : 'border-blue-500/50 hover:border-blue-400'
      }`}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-blue-400" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-blue-500/10 border border-blue-500/20">
            <SystemIcon />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 font-mono">
            System Boundary
          </span>
        </div>
        <div className="flex items-center gap-1">
          {critical && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              [Tier 0]
            </span>
          )}
          <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Internal
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="text-sm font-semibold text-slate-100 truncate">{label}</div>

      {/* Domain & System Type badges */}
      {(domain || systemType) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {domain && (
            <span className="text-[11px] font-medium text-blue-300/90 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/50">
              {`[Domain: ${domain}]`}
            </span>
          )}
          {systemType && (
            <span className="text-[11px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
              {`[Type: ${systemType}]`}
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed border-t border-slate-800/80 pt-1.5">
          {description}
        </div>
      )}

      {/* Security Overlays */}
      <SecurityBadges {...(nodeData as unknown as React.ComponentProps<typeof SecurityBadges>)} />

      {/* Drill-down action to Containers */}
      {canDrillDown && (
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            data-testid="system-drill-down-btn"
            onClick={handleDrillDown}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 py-1 rounded transition-colors"
            title="Drill down into Containers"
          >
            <span>Containers</span>
            <span aria-hidden="true">↷</span>
          </button>
        </div>
      )}
    </div>
  );
}
