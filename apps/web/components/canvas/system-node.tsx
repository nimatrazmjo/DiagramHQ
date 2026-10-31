import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SystemNodeData, Technology, PersonaMode } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';
import { SecurityBadges } from './security-badges';
import { DataBadges } from './data-badges';
import { OwnershipBadges } from './ownership-badges';
import { TechnologyBadges } from './technology-badges';
import { PersonaBadges } from './persona-badges';
import { FlowBadges } from './flow-badges';
import { EditableNodeLabel } from './editable-node-label';
import { DiagramNodeResizer } from './diagram-node-resizer';


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

  const brandIcon =
    (nodeData.icon as string) ||
    getTechnologyIconPath(label || domain || systemType);

  if (isExternal) {
    return (
      <div
        data-testid="external-system-node"
        className={`w-full h-full min-w-[140px] min-h-[70px] rounded-2xl p-3 shadow-lg bg-slate-900/80 border border-dashed transition-all flex flex-col justify-between relative select-none ${
          nodeData.flowView && !nodeData.isInFlow
            ? 'opacity-35 border-slate-800'
            : nodeData.flowView && nodeData.isInFlow
              ? 'border-sky-400 ring-2 ring-sky-500/50 shadow-sky-500/30'
              : selected
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
          <div className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center p-1 shrink-0">
            {brandIcon ? (
              <img src={brandIcon} alt="" className="w-full h-full object-contain" />
            ) : (
              <CloudIcon />
            )}
          </div>
          <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
            {systemType ? `[${systemType}]` : '[Third-Party]'}
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
            className="text-base sm:text-lg font-semibold text-slate-200 tracking-wide text-center truncate max-w-full"
          />
          {description && (
            <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 max-w-full leading-tight">
              {description}
            </div>
          )}
        </div>

        {/* Bottom Bar: External System */}
        <div className="w-full flex flex-col items-center justify-center text-center pt-1">
          <span className="text-[11px] font-mono text-slate-400 tracking-wider">
            External System
          </span>
          {domain && (
            <span className="text-[10px] text-slate-500 font-mono">
              {`[Domain: ${domain}]`}
            </span>
          )}
        </div>

        {/* Security Overlays */}
        <SecurityBadges {...(nodeData as unknown as React.ComponentProps<typeof SecurityBadges>)} />
        <DataBadges {...(nodeData as unknown as React.ComponentProps<typeof DataBadges>)} />
        <OwnershipBadges {...(nodeData as unknown as React.ComponentProps<typeof OwnershipBadges>)} />
        <TechnologyBadges technologyView={nodeData.technologyView as boolean | undefined} technologies={nodeData.technologies as Technology[] | undefined} />
        <PersonaBadges personaView={nodeData.personaView as boolean | undefined} personaMode={nodeData.personaMode as PersonaMode | undefined} />
        <FlowBadges
          flowView={nodeData.flowView as boolean | undefined}
          isInFlow={nodeData.isInFlow as boolean | undefined}
          flowStepNumbers={nodeData.flowStepNumbers as number[] | undefined}
          isActiveStepParticipant={nodeData.isActiveStepParticipant as boolean | undefined}
        />
      </div>
    );
  }

  // Internal Software System
  return (
    <div
      data-testid="system-node"
      onDoubleClick={handleDoubleClick}
      className={`w-full h-full min-w-[140px] min-h-[70px] rounded-2xl p-3 shadow-lg bg-slate-900/95 border transition-all flex flex-col justify-between relative select-none ${
        nodeData.flowView && !nodeData.isInFlow
          ? 'opacity-35 border-slate-800'
          : nodeData.flowView && nodeData.isInFlow
            ? 'border-sky-400 ring-2 ring-sky-500/50 shadow-sky-500/30'
            : selected
              ? 'border-2 border-sky-400 ring-2 ring-blue-500/30 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
              : critical
              ? 'border-slate-700 hover:border-slate-500 ring-1 ring-amber-500/20'
              : 'border border-slate-700/80 hover:border-slate-500'
      }`}
    >
      <DiagramNodeResizer isVisible={selected} minWidth={140} minHeight={70} color="#38bdf8" />

      {/* 4 Connection Ports at Edge Midpoints */}
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
            data-testid="system-drill-down-btn"
            onClick={handleDrillDown}
            title="Drill down to Containers (Level 2)"
            className="p-0.5 -ml-1 -mt-1 rounded text-slate-400 hover:text-sky-300 hover:bg-sky-500/20 transition-colors"
          >
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

        <div className="flex items-center gap-1">
          <span className="sr-only">System Boundary</span>
          {critical && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              [Tier 0]
            </span>
          )}
          <span className="sr-only">Internal</span>
          {brandIcon && (
            <img src={brandIcon} alt="" className="w-4 h-4 object-contain opacity-80" />
          )}
        </div>
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
          className="text-base sm:text-lg font-semibold text-white tracking-wide text-center truncate max-w-full"
        />
        {description && (
          <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 max-w-full leading-tight">
            {description}
          </div>
        )}
      </div>

      {/* Bottom Bar: Object Type ("System") & optional domain */}
      <div className="w-full flex flex-col items-center justify-center text-center pt-1">
        <span className="text-[11px] font-mono text-slate-400/90 tracking-wider">
          {systemType ? `[Type: ${systemType}]` : 'System'}
        </span>
        {domain && (
          <span className="text-[10px] text-slate-500 font-mono">
            {`[Domain: ${domain}]`}
          </span>
        )}
      </div>

      {/* Security Overlays */}
      <SecurityBadges {...(nodeData as unknown as React.ComponentProps<typeof SecurityBadges>)} />
      <DataBadges {...(nodeData as unknown as React.ComponentProps<typeof DataBadges>)} />
      <OwnershipBadges {...(nodeData as unknown as React.ComponentProps<typeof OwnershipBadges>)} />
      <TechnologyBadges technologyView={nodeData.technologyView as boolean | undefined} technologies={nodeData.technologies as Technology[] | undefined} />
      <PersonaBadges personaView={nodeData.personaView as boolean | undefined} personaMode={nodeData.personaMode as PersonaMode | undefined} />
      <FlowBadges
        flowView={nodeData.flowView as boolean | undefined}
        isInFlow={nodeData.isInFlow as boolean | undefined}
        flowStepNumbers={nodeData.flowStepNumbers as number[] | undefined}
        isActiveStepParticipant={nodeData.isActiveStepParticipant as boolean | undefined}
      />
    </div>
  );
}
