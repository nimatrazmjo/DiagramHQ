import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { C4ContextElementKind, C4ContextNodeData } from '@diagramhq/domain';
import { EditableNodeLabel } from './editable-node-label';
import { DiagramNodeResizer } from './diagram-node-resizer';

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
        className={`w-full h-full min-w-[140px] min-h-[70px] rounded-2xl p-3 shadow-lg bg-slate-900/95 border transition-all flex flex-col justify-between relative select-none ${
          selected
            ? 'border-2 border-sky-400 ring-2 ring-pink-500/30 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
            : 'border border-pink-500/40 hover:border-pink-400'
        }`}
      >
        <DiagramNodeResizer isVisible={selected} minWidth={140} minHeight={70} color="#38bdf8" />
        <Handle type="target" position={Position.Top} id="top-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="source" position={Position.Top} id="top-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="target" position={Position.Left} id="left-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="source" position={Position.Left} id="left-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="target" position={Position.Right} id="right-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="source" position={Position.Right} id="right-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />

        {/* Top Bar */}
        <div className="flex items-center justify-between w-full h-5">
          <div className="p-1 rounded-full bg-pink-500/10 border border-pink-500/20">
            <PersonIcon />
          </div>
          <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
            Actor
          </span>
        </div>

        {/* Center Body */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-1 my-auto">
          <EditableNodeLabel
            nodeId={id}
            label={label}
            isEditing={Boolean(nodeData.isEditing)}
            onCommit={(newLabel) => {
              if (typeof nodeData.onRename === 'function') {
                (nodeData.onRename as (val: string) => void)(newLabel);
              }
            }}
            className="text-base sm:text-lg font-semibold text-slate-100 tracking-wide text-center truncate max-w-full"
          />
          {description && (
            <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 max-w-full leading-tight">
              {description}
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="w-full flex items-center justify-center text-center pt-1">
          <span className="text-[11px] font-mono text-slate-400 tracking-wider">
            Person
          </span>
        </div>
      </div>
    );
  }

  if (isExternal) {
    return (
      <div
        data-testid="c4-external-system-node"
        onDoubleClick={handleDoubleClick}
        className={`w-full h-full min-w-[140px] min-h-[70px] rounded-2xl p-3 shadow-lg bg-slate-900/60 border border-dashed transition-all flex flex-col justify-between relative select-none ${
          selected
            ? 'border-2 border-sky-400 ring-2 ring-slate-400/30 shadow-slate-400/20'
            : 'border-slate-600 hover:border-slate-500'
        }`}
      >
        <DiagramNodeResizer isVisible={selected} minWidth={140} minHeight={70} color="#38bdf8" />
        <Handle type="target" position={Position.Top} id="top-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="source" position={Position.Top} id="top-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="target" position={Position.Left} id="left-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="source" position={Position.Left} id="left-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="target" position={Position.Right} id="right-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
        <Handle type="source" position={Position.Right} id="right-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />

        {/* Top Bar */}
        <div className="flex items-center justify-between w-full h-5">
          <div className="p-1 rounded bg-slate-800 border border-slate-700">
            <SystemIcon external />
          </div>
          <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-400 border border-slate-700">
            Third-Party
          </span>
        </div>

        {/* Center Body */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-1 my-auto">
          <EditableNodeLabel
            nodeId={id}
            label={label}
            isEditing={Boolean(nodeData.isEditing)}
            onCommit={(newLabel) => {
              if (typeof nodeData.onRename === 'function') {
                (nodeData.onRename as (val: string) => void)(newLabel);
              }
            }}
            className="text-base sm:text-lg font-semibold text-slate-300 tracking-wide text-center truncate max-w-full"
          />
          {description && (
            <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 max-w-full leading-relaxed">
              {description}
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="w-full flex items-center justify-center text-center pt-1">
          <span className="text-[11px] font-mono text-slate-400 tracking-wider">
            External System
          </span>
        </div>
      </div>
    );
  }

  // Internal Software System
  return (
    <div
      data-testid="c4-system-node"
      onDoubleClick={handleDoubleClick}
      className={`w-full h-full min-w-[140px] min-h-[70px] rounded-2xl p-3 shadow-lg bg-slate-900/95 border transition-all flex flex-col justify-between relative select-none ${
        selected
          ? 'border-2 border-sky-400 ring-2 ring-blue-500/30 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
          : 'border border-blue-500/50 hover:border-blue-400'
      }`}
    >
      <DiagramNodeResizer isVisible={selected} minWidth={140} minHeight={70} color="#38bdf8" />
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />

      {/* Top Bar: IcePanel Drill-down zoom icon top-left, badges top-right */}
      <div className="flex items-center justify-between w-full h-5">
        {canDrillDown ? (
          <button
            type="button"
            data-testid="drill-down-btn"
            onClick={handleDrillDown}
            className="p-0.5 -ml-1 -mt-1 rounded text-slate-400 hover:text-sky-300 hover:bg-sky-500/20 transition-colors"
            title="Drill down to C4 Container view (Level 2)"
          >
            <span className="sr-only">Containers</span>
            {/* IcePanel magnifying glass with plus icon */}
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
        ) : (
          <div className="w-4 h-4" />
        )}

        <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
          C4 Level 1
        </span>
      </div>

      {/* Center Body: IcePanel Centered Object Label ("DHS") */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-1 my-auto">
        <EditableNodeLabel
          nodeId={id}
          label={label}
          isEditing={Boolean(nodeData.isEditing)}
          onCommit={(newLabel) => {
            if (typeof nodeData.onRename === 'function') {
              (nodeData.onRename as (val: string) => void)(newLabel);
            }
          }}
          className="text-base sm:text-lg font-semibold text-slate-100 tracking-wide text-center truncate max-w-full"
        />

        {description && (
          <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 max-w-full leading-tight">
            {description}
          </div>
        )}
      </div>

      {/* Bottom Bar: Object Type ("System") */}
      <div className="w-full flex items-center justify-center text-center pt-1">
        <span className="text-[11px] font-mono text-slate-400 tracking-wider">
          System
        </span>
      </div>
    </div>
  );
}
