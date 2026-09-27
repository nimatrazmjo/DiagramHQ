import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GroupNodeData } from '@diagramhq/domain';

function GroupIcon(): JSX.Element {
  return (
    <svg
      className="w-4 h-4 text-slate-400 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeDasharray="4 2" />
    </svg>
  );
}

function formatKindLabel(kind: string): string {
  switch (kind.toLowerCase()) {
    case 'boundary': return 'Boundary';
    case 'zone': return 'Zone';
    case 'team': return 'Team';
    case 'domain': return 'Domain';
    case 'namespace': return 'Namespace';
    default: return 'Group';
  }
}

export function GroupNode({ id: _id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as GroupNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Group';
  const groupKind = typeof nodeData.groupKind === 'string' && nodeData.groupKind.length > 0
    ? nodeData.groupKind
    : 'group';
  const childCount = typeof nodeData.childCount === 'number'
    ? nodeData.childCount
    : undefined;

  const getThemeClasses = (): string => {
    switch (groupKind.toLowerCase()) {
      case 'boundary':
        return 'border-slate-500/50 bg-slate-900/10';
      case 'team':
        return 'border-blue-500/50 bg-blue-900/10';
      case 'domain':
        return 'border-purple-500/50 bg-purple-900/10';
      case 'zone':
        return 'border-green-500/50 bg-green-900/10';
      case 'namespace':
        return 'border-orange-500/50 bg-orange-900/10';
      default:
        return 'border-slate-500/50 bg-slate-900/10';
    }
  };

  return (
    <div
      data-testid="group-node"
      className={`min-w-[300px] min-h-[200px] p-4 rounded-xl border-2 border-dashed shadow-sm transition-all duration-150 ${getThemeClasses()} ${
        selected ? 'ring-2 ring-slate-400 ring-offset-2 ring-offset-slate-950 border-solid' : ''
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

      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <GroupIcon />
          <span
            data-testid="group-kind-badge"
            className="text-[10px] font-semibold uppercase tracking-wider text-slate-300"
          >
            {`[Group: ${formatKindLabel(groupKind)}]`}
          </span>
        </div>
        {childCount !== undefined && (
          <span data-testid="group-child-count" className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
            {childCount} items
          </span>
        )}
      </div>

      <h3 className="font-semibold text-sm leading-tight text-white mb-1 truncate">
        {label}
      </h3>
    </div>
  );
}
