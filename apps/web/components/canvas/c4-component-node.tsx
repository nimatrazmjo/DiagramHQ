import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { C4CodeMappingStub, C4ComponentKind, C4ComponentNodeData } from '@diagramhq/domain';
import { EditableNodeLabel } from './editable-node-label';

function ControllerIcon(): JSX.Element {
  return (
    <svg
      className="w-4 h-4 text-cyan-400 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="12 8 8 12 12 16 16 12 12 8" />
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
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function RepositoryIcon(): JSX.Element {
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
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10" />
      <path d="M6 10h10" />
    </svg>
  );
}

function ComponentIcon(): JSX.Element {
  return (
    <svg
      className="w-4 h-4 text-indigo-400 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="8" height="8" x="3" y="3" rx="1" />
      <path d="M7 11v4a2 2 0 0 0 2 2h4" />
      <rect width="8" height="8" x="13" y="13" rx="1" />
    </svg>
  );
}

function getComponentIcon(kind: C4ComponentKind): JSX.Element {
  switch (kind) {
    case 'controller':
      return <ControllerIcon />;
    case 'service':
      return <ServiceIcon />;
    case 'repository':
      return <RepositoryIcon />;
    case 'component':
    default:
      return <ComponentIcon />;
  }
}

function getComponentBadgeLabel(kind: C4ComponentKind): string {
  switch (kind) {
    case 'controller':
      return 'Controller';
    case 'service':
      return 'Service';
    case 'repository':
      return 'Repository';
    case 'middleware':
      return 'Middleware';
    case 'handler':
      return 'Handler';
    case 'component':
    default:
      return 'Component';
  }
}

/**
 * C4ComponentNode renders C4 Component Level 3 elements:
 * - Controllers, Services, Repositories, Middlewares, Handlers
 * - Technology tag
 * - Level 4 Code mapping stub (link/file path representation)
 */
export function C4ComponentNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as C4ComponentNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'C4 Component';
  const description = typeof nodeData.description === 'string' ? nodeData.description : undefined;
  const componentKind: C4ComponentKind = nodeData.componentKind ?? 'component';
  const technology = typeof nodeData.technology === 'string' && nodeData.technology.trim()
    ? nodeData.technology
    : undefined;
  const codeMappingStub = nodeData.codeMappingStub as C4CodeMappingStub | undefined;
  const componentId = (nodeData.id as string) ?? id;

  const handleInspectCodeStub = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof nodeData.onInspectCodeStub === 'function') {
      nodeData.onInspectCodeStub(componentId);
    } else if (typeof window !== 'undefined') {
      const inspectEvent = new CustomEvent('c4:inspect-code', {
        detail: { componentId, codeMappingStub },
      });
      window.dispatchEvent(inspectEvent);
    }
  };

  const getTestId = (): string => {
    switch (componentKind) {
      case 'controller':
        return 'c4-controller-node';
      case 'service':
        return 'c4-component-service-node';
      case 'repository':
        return 'c4-repository-node';
      default:
        return 'c4-component-node';
    }
  };

  const getThemeClasses = (): string => {
    switch (componentKind) {
      case 'controller':
        return 'border-cyan-600/70 bg-gradient-to-b from-slate-900 to-cyan-950/40 text-cyan-100 shadow-cyan-950/30';
      case 'service':
        return 'border-blue-600/70 bg-gradient-to-b from-slate-900 to-blue-950/40 text-blue-100 shadow-blue-950/30';
      case 'repository':
        return 'border-amber-600/70 bg-gradient-to-b from-slate-900 to-amber-950/40 text-amber-100 shadow-amber-950/30';
      default:
        return 'border-indigo-600/70 bg-gradient-to-b from-slate-900 to-indigo-950/40 text-indigo-100 shadow-indigo-950/30';
    }
  };

  return (
    <div
      data-testid={getTestId()}
      className={`relative min-w-[220px] max-w-[280px] p-3.5 rounded-xl border-2 shadow-xl backdrop-blur-sm transition-all duration-150 ${getThemeClasses()} ${
        selected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950 border-blue-400' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-blue-500 border-2 border-slate-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 bg-blue-500 border-2 border-slate-900 rounded-full"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 bg-blue-500 border-2 border-slate-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-blue-500 border-2 border-slate-900 rounded-full"
      />

      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          {getComponentIcon(componentKind)}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            {`[Component: ${getComponentBadgeLabel(componentKind)}]`}
          </span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
          C4 Level 3
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
            data-testid="c4-component-technology"
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

      {/* Level 4 Code Mapping Stub (Acceptance Criteria) */}
      {codeMappingStub?.filePath && (
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-1 text-[11px]">
          <div className="flex items-center gap-1 truncate text-slate-400 font-mono text-[10px]">
            <svg
              className="w-3 h-3 flex-shrink-0 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span className="truncate" title={codeMappingStub.filePath}>
              {codeMappingStub.filePath}
            </span>
          </div>

          <button
            type="button"
            data-testid="c4-code-mapping-btn"
            onClick={handleInspectCodeStub}
            className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/40 rounded transition-colors cursor-pointer"
            title="Inspect Level 4 Code Mapping Stub"
          >
            L4 Code
          </button>
        </div>
      )}
    </div>
  );
}
