import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { QueueNodeData } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';

function QueueIcon(): JSX.Element {
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
      <rect x="2" y="8" width="4" height="8" rx="1" />
      <rect x="10" y="8" width="4" height="8" rx="1" />
      <rect x="18" y="8" width="4" height="8" rx="1" />
      <path d="M6 12h4" />
      <path d="M14 12h4" />
    </svg>
  );
}

function formatKindLabel(kind: string): string {
  switch (kind.toLowerCase()) {
    case 'kafka': return 'Kafka';
    case 'rabbitmq': return 'RabbitMQ';
    case 'sqs': return 'SQS';
    case 'eventbridge': return 'EventBridge';
    case 'pubsub': return 'PubSub';
    case 'nats': return 'NATS';
    default: return 'Queue';
  }
}

export function QueueNode({ id: _id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as QueueNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Queue';
  const queueKind = typeof nodeData.queueKind === 'string' && nodeData.queueKind.length > 0
    ? nodeData.queueKind
    : 'queue';
  const technology = typeof nodeData.technology === 'string' && nodeData.technology.length > 0
    ? nodeData.technology
    : undefined;
  const topics = Array.isArray(nodeData.topics) && nodeData.topics.length > 0
    ? (nodeData.topics as string[])
    : undefined;
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0
    ? nodeData.description
    : undefined;

  const getThemeClasses = (): string => {
    switch (queueKind.toLowerCase()) {
      case 'kafka':
        return 'border-green-600/70 bg-gradient-to-b from-slate-900 to-green-950/40 shadow-green-950/30';
      case 'rabbitmq':
        return 'border-orange-600/70 bg-gradient-to-b from-slate-900 to-orange-950/40 shadow-orange-950/30';
      case 'eventbridge':
        return 'border-purple-600/70 bg-gradient-to-b from-slate-900 to-purple-950/40 shadow-purple-950/30';
      case 'pubsub':
        return 'border-blue-600/70 bg-gradient-to-b from-slate-900 to-blue-950/40 shadow-blue-950/30';
      case 'sqs':
      default:
        return 'border-amber-600/70 bg-gradient-to-b from-slate-900 to-amber-950/40 shadow-amber-950/30';
    }
  };

  const brandIcon =
    (nodeData.icon as string) ||
    getTechnologyIconPath(queueKind) ||
    getTechnologyIconPath(technology) ||
    getTechnologyIconPath(label);

  return (
    <div
      data-testid="queue-node"
      className={`min-w-[220px] max-w-[280px] p-3.5 rounded-xl border-2 shadow-xl backdrop-blur-sm transition-all duration-150 ${getThemeClasses()} ${
        selected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 border-amber-400' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !bg-amber-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-amber-400" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-amber-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !bg-amber-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-amber-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-amber-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-amber-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-amber-400" />

      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          {brandIcon ? (
            <img src={brandIcon} alt="" className="w-4 h-4 flex-shrink-0 object-contain" />
          ) : (
            <QueueIcon />
          )}
          <span
            data-testid="queue-kind-badge"
            className="text-[10px] font-semibold uppercase tracking-wider text-slate-300"
          >
            {`[Queue: ${formatKindLabel(queueKind)}]`}
          </span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
          Queue
        </span>
      </div>

      <h3 className="font-semibold text-sm leading-tight text-white mb-1 truncate">
        {label}
      </h3>

      {technology && (
        <div className="mt-1 mb-1.5">
          <span
            data-testid="queue-technology"
            className="inline-block px-2 py-0.5 text-[11px] font-mono bg-white/10 text-blue-200 border border-white/10 rounded"
          >
            {`[${technology}]`}
          </span>
        </div>
      )}

      {description && (
        <p className="text-xs text-slate-300/80 leading-snug line-clamp-3 mb-2">
          {description}
        </p>
      )}

      {topics && topics.length > 0 && (
        <div data-testid="queue-topics" className="mt-1.5 flex flex-wrap gap-1">
          {topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-amber-300 border border-slate-700/60"
            >
              {topic}
            </span>
          ))}
          {topics.length > 3 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-amber-300 border border-slate-700/60">
              +{topics.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
