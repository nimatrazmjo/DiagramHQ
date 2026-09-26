import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { C4ContextElementKind, C4ContextNodeData } from '@diagramhq/domain';

function PersonIcon(): JSX.Element {
  return (
    <svg
      className="w-4 h-4 text-pink-400 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
    </svg>
  );
}

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

/**
 * C4ContextNode renders C4 Context Level 1 elements:
 * - Person / Actor (user persona with avatar)
 * - Software System (internal boundary with container drill-down)
 * - External Software System (gray dashed external boundary)
 */
export function C4ContextNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as C4ContextNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'C4 Element';
  const description = typeof nodeData.description === 'string' ? nodeData.description : undefined;
  const c4Kind: C4ContextElementKind =
    nodeData.c4Kind ?? (nodeData.external ? 'external_system' : 'system');
  const isPerson = c4Kind === 'person';
  const isExternal = c4Kind === 'external_system';
  const canDrillDown = Boolean(nodeData.canDrillDown ?? (!isPerson && !isExternal));
  const systemId = (nodeData.systemId as string) ?? id;

  const handleDrillDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof nodeData.onDrillDown === 'function') {
      nodeData.onDrillDown(systemId);
    } else if (typeof window !== 'undefined') {
      // Dispatches custom event for drill-down listeners or navigates
      const drillEvent = new CustomEvent('c4:drill-down', {
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

  if (isPerson) {
    return (
      <div
        data-testid="c4-person-node"
        onDoubleClick={handleDoubleClick}
        className={`min-w-[200px] max-w-[260px] rounded-xl p-3 shadow-lg bg-slate-900/95 border transition-all ${
          selected
            ? 'border-pink-500 ring-2 ring-pink-500/30 shadow-pink-500/20'
            : 'border-pink-500/40 hover:border-pink-400'
        }`}
      >
        <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !bg-pink-400" />
        <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-pink-400" />
        <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-pink-400" />
        <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !bg-pink-400" />
        <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-pink-400" />
        <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-pink-400" />
        <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-pink-400" />
        <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-pink-400" />

        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-full bg-pink-500/10 border border-pink-500/20">
              <PersonIcon />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-400 font-mono">
              Person
            </span>
          </div>
          <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
            Actor
          </span>
        </div>

        <div className="text-sm font-semibold text-slate-100 truncate">{label}</div>

        {description && (
          <div className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {description}
          </div>
        )}
      </div>
    );
  }

  if (isExternal) {
    return (
      <div
        data-testid="c4-external-system-node"
        onDoubleClick={handleDoubleClick}
        className={`min-w-[220px] max-w-[280px] rounded-lg p-3 shadow-lg bg-slate-900/60 border border-dashed transition-all ${
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

        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded bg-slate-800 border border-slate-700">
              <SystemIcon external />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
              External System
            </span>
          </div>
          <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-400 border border-slate-700">
            Third-Party
          </span>
        </div>

        <div className="text-sm font-semibold text-slate-300 truncate">{label}</div>

        {description && (
          <div className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {description}
          </div>
        )}
      </div>
    );
  }

  // Internal Software System
  return (
    <div
      data-testid="c4-system-node"
      onDoubleClick={handleDoubleClick}
      className={`min-w-[220px] max-w-[280px] rounded-lg p-3 shadow-lg bg-slate-900/95 border transition-all ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-blue-500/20'
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

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-blue-500/10 border border-blue-500/20">
            <SystemIcon />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 font-mono">
            System
          </span>
        </div>
        <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
          C4 Level 1
        </span>
      </div>

      <div className="text-sm font-semibold text-slate-100 truncate">{label}</div>

      {description && (
        <div className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {description}
        </div>
      )}

      {canDrillDown && (
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            data-testid="drill-down-btn"
            onClick={handleDrillDown}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 py-1 rounded transition-colors"
            title="Drill down to C4 Container view (Level 2)"
          >
            <span>Containers</span>
            <span aria-hidden="true">↷</span>
          </button>
        </div>
      )}
    </div>
  );
}
