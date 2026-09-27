import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { C4ContextNode } from './c4-context-node';
import { C4ContainerNode } from './c4-container-node';
import { C4SystemBoundaryNode } from './c4-system-boundary-node';
import { C4ComponentNode } from './c4-component-node';
import { C4ContainerBoundaryNode } from './c4-container-boundary-node';
import { PersonNode } from './person-node';
import { SystemNode } from './system-node';
import { AppNode } from './app-node';
import { ComponentNode } from './component-node';
import { DatabaseNode } from './database-node';
import { QueueNode } from './queue-node';
import { GroupNode } from './group-node';

export { C4ContextNode } from './c4-context-node';
export { C4ContainerNode } from './c4-container-node';
export { C4SystemBoundaryNode } from './c4-system-boundary-node';
export { C4ComponentNode } from './c4-component-node';
export { C4ContainerBoundaryNode } from './c4-container-boundary-node';
export { PersonNode } from './person-node';
export { SystemNode } from './system-node';
export { AppNode } from './app-node';
export { ComponentNode } from './component-node';
export { DatabaseNode } from './database-node';
export { QueueNode } from './queue-node';
export { GroupNode } from './group-node';

export interface CustomNodeData {
  label: string;
  kind?: string;
  description?: string;
  status?: string;
  [key: string]: unknown;
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
  component: ComponentNode,
  database: DatabaseNode,
  queue: QueueNode,
  group: GroupNode,
  c4Context: C4ContextNode,
  actor: PersonNode,
  person: PersonNode,
  c4Container: C4ContainerNode,
  c4SystemBoundary: C4SystemBoundaryNode,
  c4Component: C4ComponentNode,
  c4ContainerBoundary: C4ContainerBoundaryNode,
  default: SystemNode,
};

