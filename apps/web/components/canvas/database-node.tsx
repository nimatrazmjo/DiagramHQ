import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { DatabaseNodeData } from '@diagramhq/domain';
import { SecurityBadges } from './security-badges';
import { DataBadges } from './data-badges';

function DatabaseIcon(): JSX.Element {
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
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function formatKindLabel(kind: string): string {
  switch (kind.toLowerCase()) {
    case 'postgresql': return 'PostgreSQL';
    case 'mysql': return 'MySQL';
    case 'mongodb': return 'MongoDB';
    case 'redis': return 'Redis';
    case 'elasticsearch': return 'Elasticsearch';
    case 'dynamodb': return 'DynamoDB';
    case 'sqlite': return 'SQLite';
    case 'cassandra': return 'Cassandra';
    default: return 'Database';
  }
}

export function DatabaseNode({ id: _id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as DatabaseNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Database';
  const databaseKind = typeof nodeData.databaseKind === 'string' && nodeData.databaseKind.length > 0
    ? nodeData.databaseKind
    : 'store';
  const technology = typeof nodeData.technology === 'string' && nodeData.technology.length > 0
    ? nodeData.technology
    : undefined;
  const schema = typeof nodeData.schema === 'string' && nodeData.schema.length > 0
    ? nodeData.schema
    : undefined;
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0
    ? nodeData.description
    : undefined;

  const getThemeClasses = (): string => {
    switch (databaseKind.toLowerCase()) {
      case 'postgresql':
        return 'border-blue-600/70 bg-gradient-to-b from-slate-900 to-blue-950/40 shadow-blue-950/30';
      case 'mysql':
      case 'dynamodb':
        return 'border-orange-600/70 bg-gradient-to-b from-slate-900 to-orange-950/40 shadow-orange-950/30';
      case 'mongodb':
        return 'border-green-600/70 bg-gradient-to-b from-slate-900 to-green-950/40 shadow-green-950/30';
      case 'redis':
        return 'border-red-600/70 bg-gradient-to-b from-slate-900 to-red-950/40 shadow-red-950/30';
      case 'elasticsearch':
        return 'border-yellow-600/70 bg-gradient-to-b from-slate-900 to-yellow-950/40 shadow-yellow-950/30';
      default:
        return 'border-purple-600/70 bg-gradient-to-b from-slate-900 to-purple-950/40 shadow-purple-950/30';
    }
  };

  return (
    <div
      data-testid="database-node"
      className={`min-w-[220px] max-w-[280px] p-3.5 rounded-xl border-2 shadow-xl backdrop-blur-sm transition-all duration-150 ${getThemeClasses()} ${
        selected ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-950 border-purple-400' : ''
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

      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <DatabaseIcon />
          <span
            data-testid="database-kind-badge"
            className="text-[10px] font-semibold uppercase tracking-wider text-slate-300"
          >
            {`[Database: ${formatKindLabel(databaseKind)}]`}
          </span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
          Database
        </span>
      </div>

      <h3 className="font-semibold text-sm leading-tight text-white mb-1 truncate">
        {label}
      </h3>

      {technology && (
        <div className="mt-1 mb-1.5 flex gap-1">
          <span
            data-testid="database-technology"
            className="inline-block px-2 py-0.5 text-[11px] font-mono bg-white/10 text-blue-200 border border-white/10 rounded"
          >
            {`[${technology}]`}
          </span>
          {schema && (
            <span
              data-testid="database-schema"
              className="inline-block px-2 py-0.5 text-[11px] font-mono bg-white/10 text-cyan-200 border border-white/10 rounded"
            >
              {schema}
            </span>
          )}
        </div>
      )}

      {!technology && schema && (
        <div className="mt-1 mb-1.5">
          <span
            data-testid="database-schema"
            className="inline-block px-2 py-0.5 text-[11px] font-mono bg-white/10 text-cyan-200 border border-white/10 rounded"
          >
            {schema}
          </span>
        </div>
      )}

      {description && (
        <p className="text-xs text-slate-300/80 leading-snug line-clamp-3 mb-2">
          {description}
        </p>
      )}

      {/* Security Overlays */}
      <SecurityBadges {...(nodeData as unknown as React.ComponentProps<typeof SecurityBadges>)} />
      
      {/* Data Views Overlays */}
      <DataBadges {...(nodeData as unknown as React.ComponentProps<typeof DataBadges>)} />
    </div>
  );
}
