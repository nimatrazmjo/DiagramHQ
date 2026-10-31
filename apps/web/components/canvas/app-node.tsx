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
import { EditableNodeLabel } from './editable-node-label';
import { DiagramNodeResizer } from './diagram-node-resizer';


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
      className={`w-full h-full min-w-[140px] min-h-[70px] rounded-2xl p-3 shadow-lg bg-slate-900/95 border transition-all flex flex-col justify-between relative select-none ${
        nodeData.flowView && !nodeData.isInFlow
          ? 'opacity-35 border-slate-800'
          : nodeData.flowView && nodeData.isInFlow
            ? 'border-sky-400 ring-2 ring-sky-500/50 shadow-sky-500/30'
            : selected
              ? 'border-2 border-sky-400 ring-2 ring-emerald-500/30 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
              : 'border border-emerald-500/40 hover:border-emerald-400'
      }`}
    >
      <DiagramNodeResizer isVisible={selected} minWidth={140} minHeight={70} color="#38bdf8" />

      {/* 4-way handles for routing */}
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-950 !rounded-full shadow-sm" />

      {/* Top bar: Zoom icon on left, brand/port on right */}
      <div className="flex items-center justify-between w-full h-5">
        {canDrillDown ? (
          <button
            type="button"
            data-testid="app-drill-down-btn"
            onClick={handleDrillDown}
            className="p-0.5 -ml-1 -mt-1 rounded text-slate-400 hover:text-sky-300 hover:bg-sky-500/20 transition-colors"
            title="Drill down into Components"
          >
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
          <div className="p-0.5 -ml-1 -mt-1 text-slate-500">
            <AppIcon />
          </div>
        )}

        <div className="flex items-center gap-1">
          <span className="sr-only">App Service</span>
          {status && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {status}
            </span>
          )}
          {port && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
              {`:${port}`}
            </span>
          )}
          {brandIcon && (
            <img src={brandIcon} alt="" className="w-4 h-4 object-contain opacity-80" />
          )}
        </div>
      </div>

      {/* Center Body: Label */}
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

      {/* Bottom Bar: Kind and Technology */}
      <div className="w-full flex flex-col items-center justify-center text-center pt-1">
        <span className="text-[11px] font-mono text-slate-400/90 tracking-wider">
          {applicationType ? `[Type: ${applicationType}]` : 'Container'}
        </span>
        {technology && (
          <span className="text-[10px] text-emerald-400 font-mono">
            {`[${technology}]`}
          </span>
        )}
        {runtime && (
          <span className="text-[10px] text-slate-500 font-mono">
            {runtime}
          </span>
        )}
      </div>

      {/* Overlays */}
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
