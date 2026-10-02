import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PersonNodeData } from '@diagramhq/domain';
import { FlowBadges } from './flow-badges';


import { getTechnologyIconPath } from '../../lib/icons';

function PersonAvatarIcon(): JSX.Element {
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

function MailIcon(): JSX.Element {
  return (
    <svg
      className="w-3 h-3 text-slate-400 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/**
 * PersonNode renders a human actor / user persona (F022).
 * Displays role, department, external status badge, email, and description.
 */
export function PersonNode({ data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as PersonNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Person';
  const role = typeof nodeData.role === 'string' && nodeData.role.length > 0 ? nodeData.role : undefined;
  const department = typeof nodeData.department === 'string' && nodeData.department.length > 0 ? nodeData.department : undefined;
  const email = typeof nodeData.email === 'string' && nodeData.email.length > 0 ? nodeData.email : undefined;
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0 ? nodeData.description : undefined;
  const isExternal = Boolean(nodeData.external);
  const brandIcon =
    (nodeData.icon as string) ||
    getTechnologyIconPath(role) ||
    getTechnologyIconPath(label);

  return (
    <div
      data-testid="person-node"
      className={`min-w-[220px] max-w-[280px] rounded-xl p-3.5 shadow-lg bg-slate-900/95 border transition-all ${
        nodeData.flowView && !nodeData.isInFlow
          ? 'opacity-35 border-slate-800'
          : nodeData.flowView && nodeData.isInFlow
            ? 'border-sky-400 ring-2 ring-sky-500/50 shadow-sky-500/30'
            : selected
              ? 'border-pink-500 ring-2 ring-pink-500/30 shadow-pink-500/20'
              : isExternal
              ? 'border-pink-500/30 border-dashed hover:border-pink-400'
              : 'border-pink-500/50 hover:border-pink-400'
      }`}
    >

      {/* 4-way handles for seamless connection routing */}
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !bg-pink-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-pink-400" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-pink-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !bg-pink-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-pink-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-pink-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-pink-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-pink-400" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-pink-500/10 border border-pink-500/20 flex items-center justify-center p-1 shrink-0">
            {brandIcon ? (
              <img src={brandIcon} alt="" className="w-full h-full object-contain" />
            ) : (
              <PersonAvatarIcon />
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-400 font-mono">
            Person
          </span>
        </div>
        <span
          className={`px-1.5 py-0.5 text-[9px] font-mono rounded border ${
            isExternal
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : 'bg-pink-500/20 text-pink-300 border-pink-500/30'
          }`}
        >
          {isExternal ? 'External Actor' : 'Actor'}
        </span>
      </div>

      {/* Label / Name */}
      <div className="text-sm font-semibold text-slate-100 truncate">{label}</div>

      {/* Role & Department */}
      {(role || department) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {role && (
            <span className="text-[11px] font-medium text-pink-300/90 bg-pink-950/40 px-1.5 py-0.5 rounded border border-pink-900/50">
              {`[Role: ${role}]`}
            </span>
          )}
          {department && (
            <span className="text-[11px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
              {`[Dept: ${department}]`}
            </span>
          )}
        </div>
      )}

      {/* Email */}
      {email && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
          <MailIcon />
          <span className="truncate">{email}</span>
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed border-t border-slate-800/80 pt-1.5">
          {description}
        </div>
      )}

      {/* Flow Visualization Overlay */}
      <FlowBadges
        flowView={nodeData.flowView as boolean | undefined}
        isInFlow={nodeData.isInFlow as boolean | undefined}
        flowStepNumbers={nodeData.flowStepNumbers as number[] | undefined}
        isActiveStepParticipant={nodeData.isActiveStepParticipant as boolean | undefined}
      />
    </div>

  );
}
