import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface CustomNodeData {
  label: string;
  kind?: string;
  description?: string;
  status?: string;
  [key: string]: unknown;
}

function SystemIcon(): JSX.Element {
  return (
    <svg
      className="w-4 h-4 text-blue-400 flex-shrink-0"
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

function AppIcon(): JSX.Element {
  return (
    <svg
      className="w-4 h-4 text-emerald-400 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

function StoreIcon(): JSX.Element {
  return (
    <svg
      className="w-4 h-4 text-purple-400 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}

/**
 * High-level system boundary node with handles on all 4 sides,
 * system icon, label, and description.
 */
export function SystemNode({ data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as CustomNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'System Node';
  const description = typeof nodeData.description === 'string' ? nodeData.description : undefined;

  return (
    <div
      data-testid="system-node"
      className={`min-w-[220px] max-w-[280px] rounded-lg p-3 shadow-lg bg-slate-900/95 border transition-all ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-blue-500/20'
          : 'border-blue-500/40 hover:border-blue-400'
      }`}
    >
      {/* Target & Source Handles on all 4 directions */}
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-blue-400" />

      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1 rounded bg-blue-500/10 border border-blue-500/20">
          <SystemIcon />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 font-mono">
          System Boundary
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

/**
 * Application / service node with app icon, label, and status.
 */
export function AppNode({ data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as CustomNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Application Node';
  const status = typeof nodeData.status === 'string' ? nodeData.status : 'Active';
  const description = typeof nodeData.description === 'string' ? nodeData.description : undefined;

  return (
    <div
      data-testid="app-node"
      className={`min-w-[200px] max-w-[260px] rounded-lg p-3 shadow-lg bg-slate-900/95 border transition-all ${
        selected
          ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-emerald-500/20'
          : 'border-emerald-500/40 hover:border-emerald-400'
      }`}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-emerald-400" />

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20">
            <AppIcon />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 font-mono">
            App Service
          </span>
        </div>
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          {status}
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

/**
 * Database / storage node with cylinder icon, label, and kind.
 */
export function StoreNode({ data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as CustomNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Storage Node';
  const kind = typeof nodeData.kind === 'string' ? nodeData.kind : 'store';
  const description = typeof nodeData.description === 'string' ? nodeData.description : undefined;

  return (
    <div
      data-testid="store-node"
      className={`min-w-[200px] max-w-[260px] rounded-lg p-3 shadow-lg bg-slate-900/95 border transition-all ${
        selected
          ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-purple-500/20'
          : 'border-purple-500/40 hover:border-purple-400'
      }`}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !bg-purple-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-purple-400" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-purple-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !bg-purple-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-purple-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-purple-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-purple-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-purple-400" />

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-purple-500/10 border border-purple-500/20">
            <StoreIcon />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 font-mono">
            Data Store
          </span>
        </div>
        <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
          {kind}
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

export const nodeTypes = {
  system: SystemNode,
  application: AppNode,
  store: StoreNode,
  default: SystemNode,
};
