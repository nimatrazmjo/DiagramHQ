import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ApplicationNodeData, Technology, PersonaMode } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';
import { SecurityBadges } from './security-badges';
import { DataBadges } from './data-badges';
import { OwnershipBadges } from './ownership-badges';
import { TechnologyBadges } from './technology-badges';
import { PersonaBadges } from './persona-badges';
import { FlowBadges } from './flow-badges';


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

/**
 * AppNode renders an Application or Service element (F024).
 * Supports technology tags, runtime, status indicator, port, and component drill-down.
 */
export function AppNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as ApplicationNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Application Service';
  const status = typeof nodeData.status === 'string' && nodeData.status.length > 0 ? nodeData.status : 'Active';
  const technology = typeof nodeData.technology === 'string' && nodeData.technology.length > 0 ? nodeData.technology : undefined;
  const applicationType = typeof nodeData.applicationType === 'string' && nodeData.applicationType.length > 0 ? nodeData.applicationType : undefined;
  const runtime = typeof nodeData.runtime === 'string' && nodeData.runtime.length > 0 ? nodeData.runtime : undefined;
  const port = typeof nodeData.port === 'number' ? nodeData.port : undefined;
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0 ? nodeData.description : undefined;
  const canDrillDown = Boolean(nodeData.canDrillDown);
  const applicationId = (nodeData.applicationId as string) ?? id;

  const handleDrillDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof nodeData.onDrillDown === 'function') {
      (nodeData.onDrillDown as (id: string) => void)(applicationId);
    } else if (typeof window !== 'undefined') {
      const drillEvent = new CustomEvent('application:drill-down', {
        detail: { applicationId, level: 3 },
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
    getTechnologyIconPath(technology || runtime || label);

  return (
    <div
      data-testid="app-node"
      onDoubleClick={handleDoubleClick}
      className={`min-w-[220px] max-w-[280px] rounded-xl p-3.5 shadow-lg bg-slate-900/95 border transition-all ${
        nodeData.flowView && !nodeData.isInFlow
          ? 'opacity-35 border-slate-800'
          : nodeData.flowView && nodeData.isInFlow
            ? 'border-sky-400 ring-2 ring-sky-500/50 shadow-sky-500/30'
            : selected
              ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-emerald-500/20'
              : 'border-emerald-500/50 hover:border-emerald-400'
      }`}
    >

      {/* 4-way handles for routing */}
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-emerald-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-emerald-400" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center p-1 shrink-0">
            {brandIcon ? (
              <img src={brandIcon} alt="" className="w-full h-full object-contain" />
            ) : (
              <AppIcon />
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 font-mono">
            App Service
          </span>
        </div>
        <div className="flex items-center gap-1">
          {port && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
              {`:${port}`}
            </span>
          )}
          <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {status}
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="text-sm font-semibold text-slate-100 truncate">{label}</div>

      {/* Technology, Type & Runtime tags */}
      {(technology || applicationType || runtime) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {technology && (
            <span className="text-[11px] font-medium text-emerald-300/90 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/50">
              {`[${technology}]`}
            </span>
          )}
          {applicationType && (
            <span className="text-[11px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
              {`[Type: ${applicationType}]`}
            </span>
          )}
          {runtime && (
            <span className="text-[11px] text-slate-500 bg-slate-800/40 px-1.5 py-0.5 rounded border border-slate-800">
              {runtime}
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
      
      {/* Data Views Overlays */}
      <DataBadges {...(nodeData as unknown as React.ComponentProps<typeof DataBadges>)} />

      {/* Ownership Views Overlays */}
      <OwnershipBadges {...(nodeData as unknown as React.ComponentProps<typeof OwnershipBadges>)} />
        <TechnologyBadges technologyView={nodeData.technologyView as boolean | undefined} technologies={nodeData.technologies as Technology[] | undefined} />

      {/* Persona Mode Overlay */}
      <PersonaBadges personaView={nodeData.personaView as boolean | undefined} personaMode={nodeData.personaMode as PersonaMode | undefined} />

      {/* Flow Visualization Overlay */}
      <FlowBadges
        flowView={nodeData.flowView as boolean | undefined}
        isInFlow={nodeData.isInFlow as boolean | undefined}
        flowStepNumbers={nodeData.flowStepNumbers as number[] | undefined}
        isActiveStepParticipant={nodeData.isActiveStepParticipant as boolean | undefined}
      />


      {/* Drill-down action to Components */}
      {canDrillDown && (
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            data-testid="app-drill-down-btn"
            onClick={handleDrillDown}
            className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 py-1 rounded transition-colors"
            title="Drill down into Components"
          >
            <span>Components</span>
            <span aria-hidden="true">↷</span>
          </button>
        </div>
      )}
    </div>
  );
}
