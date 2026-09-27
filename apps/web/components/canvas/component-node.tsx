import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '@diagramhq/domain';
import { SecurityBadges } from './security-badges';

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

function MiddlewareIcon(): JSX.Element {
  return (
    <svg
      className="w-4 h-4 text-teal-400 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function ComponentDefaultIcon(): JSX.Element {
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

function getComponentIcon(kind: string): JSX.Element {
  switch (kind.toLowerCase()) {
    case 'controller':
      return <ControllerIcon />;
    case 'service':
      return <ServiceIcon />;
    case 'repository':
      return <RepositoryIcon />;
    case 'middleware':
      return <MiddlewareIcon />;
    default:
      return <ComponentDefaultIcon />;
  }
}

function formatKindLabel(kind: string): string {
  switch (kind.toLowerCase()) {
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
    case 'utility':
      return 'Utility';
    default:
      return 'Component';
  }
}

/**
 * ComponentNode renders an Architecture Component element (F025).
 * Supports component kinds (Controller, Service, Repository, Middleware, Handler, Utility),
 * technology tags, interfaces list, code reference links, and 4-way handles.
 */
export function ComponentNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as ComponentNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Component';
  const componentKind = typeof nodeData.componentKind === 'string' && nodeData.componentKind.length > 0
    ? nodeData.componentKind
    : 'component';
  const technology = typeof nodeData.technology === 'string' && nodeData.technology.length > 0
    ? nodeData.technology
    : undefined;
  const interfaces = Array.isArray(nodeData.interfaces) && nodeData.interfaces.length > 0
    ? (nodeData.interfaces as string[])
    : undefined;
  const codeRef = typeof nodeData.codeRef === 'string' && nodeData.codeRef.length > 0
    ? nodeData.codeRef
    : undefined;
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0
    ? nodeData.description
    : undefined;
  const componentId = (nodeData.componentId as string) ?? id;

  const handleInspectCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof (nodeData as Record<string, unknown>).onInspectCode === 'function') {
      ((nodeData as Record<string, unknown>).onInspectCode as (id: string) => void)(componentId);
    } else if (typeof window !== 'undefined') {
      const inspectEvent = new CustomEvent('component:inspect-code', {
        detail: { componentId, codeRef },
      });
      window.dispatchEvent(inspectEvent);
    }
  };

  const getThemeClasses = (): string => {
    switch (componentKind.toLowerCase()) {
      case 'controller':
        return 'border-cyan-600/70 bg-gradient-to-b from-slate-900 to-cyan-950/40 shadow-cyan-950/30';
      case 'service':
        return 'border-blue-600/70 bg-gradient-to-b from-slate-900 to-blue-950/40 shadow-blue-950/30';
      case 'repository':
        return 'border-amber-600/70 bg-gradient-to-b from-slate-900 to-amber-950/40 shadow-amber-950/30';
      case 'middleware':
        return 'border-teal-600/70 bg-gradient-to-b from-slate-900 to-teal-950/40 shadow-teal-950/30';
      default:
        return 'border-indigo-600/70 bg-gradient-to-b from-slate-900 to-indigo-950/40 shadow-indigo-950/30';
    }
  };

  return (
    <div
      data-testid="component-node"
      className={`min-w-[220px] max-w-[280px] p-3.5 rounded-xl border-2 shadow-xl backdrop-blur-sm transition-all duration-150 ${getThemeClasses()} ${
        selected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950 border-blue-400' : ''
      }`}
    >
      {/* 4-way handles for routing */}
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-blue-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-blue-400" />

      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          {getComponentIcon(componentKind)}
          <span
            data-testid="component-kind-badge"
            className="text-[10px] font-semibold uppercase tracking-wider text-slate-300"
          >
            {`[Component: ${formatKindLabel(componentKind)}]`}
          </span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
          Component
        </span>
      </div>

      {/* Label */}
      <h3 className="font-semibold text-sm leading-tight text-white mb-1 truncate">
        {label}
      </h3>

      {/* Technology tag */}
      {technology && (
        <div className="mt-1 mb-1.5">
          <span
            data-testid="component-technology"
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

      {/* Interfaces */}
      {interfaces && interfaces.length > 0 && (
        <div data-testid="component-interfaces" className="mt-1.5 flex flex-wrap gap-1">
          {interfaces.map((iface) => (
            <span
              key={iface}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700/60"
            >
              {iface}
            </span>
          ))}
        </div>
      )}

      {/* Code reference link / inspect action */}
      {codeRef && (
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
            <span data-testid="component-code-ref" className="truncate" title={codeRef}>
              {codeRef}
            </span>
          </div>

          <button
            type="button"
            data-testid="component-code-ref-btn"
            onClick={handleInspectCode}
            className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/40 rounded transition-colors cursor-pointer"
            title="Inspect Component Code Reference"
          >
            Code
          </button>
        </div>
      )}

      {/* Security Overlays */}
      <SecurityBadges {...(nodeData as unknown as React.ComponentProps<typeof SecurityBadges>)} />
    </div>
  );
}
