import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { C4ContainerKind, C4ContainerNodeData } from '@diagramhq/domain';
import { EditableNodeLabel } from './editable-node-label';

function WebAppIcon(): JSX.Element {
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

function MobileAppIcon(): JSX.Element {
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
      <rect width="14" height="20" x="5" y="2" rx="2" />
      <line x1="12" x2="12.01" y1="18" y2="18" />
    </svg>
  );
}

function ServiceIcon(): JSX.Element {
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
      <rect width="20" height="8" x="2" y="2" rx="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  );
}

function DatabaseIcon(): JSX.Element {
  return (
    <svg
      className="w-4 h-4 text-amber-400 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function QueueIcon(): JSX.Element {
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
      <path d="m16 6 4 14" />
      <path d="M12 6v14" />
      <path d="M8 8v12" />
      <path d="M4 4v16" />
    </svg>
  );
}

function getContainerIcon(kind: C4ContainerKind): JSX.Element {
  switch (kind) {
    case 'web_app':
      return <WebAppIcon />;
    case 'mobile_app':
      return <MobileAppIcon />;
    case 'database':
      return <DatabaseIcon />;
    case 'queue':
      return <QueueIcon />;
    case 'api':
    case 'service':
    case 'store':
    default:
      return <ServiceIcon />;
  }
}

function getContainerBadgeLabel(kind: C4ContainerKind): string {
  switch (kind) {
    case 'web_app':
      return 'Web App';
    case 'mobile_app':
      return 'Mobile App';
    case 'api':
      return 'API Service';
    case 'service':
      return 'Service';
    case 'database':
      return 'Database';
    case 'queue':
      return 'Message Queue';
    case 'store':
      return 'Data Store';
    default:
      return 'Container';
  }
}

/**
 * C4ContainerNode renders C4 Container Level 2 elements:
 * - Single-Page Apps & Mobile Apps
 * - API Gateways & Backend Microservices
 * - Databases (SQL/NoSQL)
 * - Message Queues & Event Streams
 */
export function C4ContainerNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as C4ContainerNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'C4 Container';
  const description = typeof nodeData.description === 'string' ? nodeData.description : undefined;
  const containerKind: C4ContainerKind = nodeData.containerKind ?? 'service';
  const technology = typeof nodeData.technology === 'string' && nodeData.technology.trim()
    ? nodeData.technology
    : undefined;
  const canDrillToComponents = Boolean(nodeData.canDrillToComponents);
  const containerId = (nodeData.id as string) ?? id;

  const handleDrillToComponents = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof nodeData.onDrillToComponents === 'function') {
      nodeData.onDrillToComponents(containerId);
    } else if (typeof window !== 'undefined') {
      const drillEvent = new CustomEvent('c4:drill-down', {
        detail: { containerId, level: 3 },
      });
      window.dispatchEvent(drillEvent);
    }
  };

  const getTestId = (): string => {
    switch (containerKind) {
      case 'web_app':
      case 'mobile_app':
        return 'c4-app-node';
      case 'database':
        return 'c4-database-node';
      case 'queue':
        return 'c4-queue-node';
      case 'api':
      case 'service':
      default:
        return 'c4-service-node';
    }
  };

  const getThemeClasses = (): string => {
    switch (containerKind) {
      case 'web_app':
      case 'mobile_app':
        return 'border-emerald-600/70 bg-gradient-to-b from-slate-900 to-emerald-950/40 text-emerald-100 shadow-emerald-950/30';
      case 'database':
        return 'border-amber-600/70 bg-gradient-to-b from-slate-900 to-amber-950/40 text-amber-100 shadow-amber-950/30';
      case 'queue':
        return 'border-purple-600/70 bg-gradient-to-b from-slate-900 to-purple-950/40 text-purple-100 shadow-purple-950/30';
      case 'api':
      case 'service':
      default:
        return 'border-blue-600/70 bg-gradient-to-b from-slate-900 to-blue-950/40 text-blue-100 shadow-blue-950/30';
    }
  };

  return (
    <div
      data-testid={getTestId()}
      className={`relative min-w-[240px] max-w-[300px] p-4 rounded-xl border-2 shadow-xl backdrop-blur-sm transition-all duration-150 ${getThemeClasses()} ${
        selected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950 border-blue-400' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500 border-2 border-slate-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500 border-2 border-slate-900 rounded-full"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-slate-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-slate-900 rounded-full"
      />

      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          {getContainerIcon(containerKind)}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            {`[Container: ${getContainerBadgeLabel(containerKind)}]`}
          </span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
          C4 Level 2
        </span>
      </div>

      {/* Title */}
      <EditableNodeLabel
        nodeId={id}
        label={label}
        isEditing={Boolean(nodeData.isEditing)}
        onCommit={(newLabel) => {
          if (typeof nodeData.onRename === 'function') {
            (nodeData.onRename as (val: string) => void)(newLabel);
          }
        }}
        className="font-semibold text-sm leading-tight text-white mb-1 truncate"
      />

      {/* Technology Tag */}
      {technology && (
        <div className="mt-1 mb-1.5">
          <span
            data-testid="c4-container-technology"
            className="inline-block px-2 py-0.5 text-[11px] font-mono bg-white/10 text-blue-200 border border-white/10 rounded"
          >
            {`[${technology}]`}
          </span>
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-xs text-slate-300/80 leading-snug line-clamp-3 mb-2">
          {description}
        </p>
      )}

      {/* Drill-down to components action */}
      {canDrillToComponents && (
        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-end">
          <button
            type="button"
            data-testid="drill-to-components-btn"
            onClick={handleDrillToComponents}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 rounded shadow-sm transition-colors cursor-pointer"
            title="Drill down to Level 3 Component View"
          >
            <span>Components</span>
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
