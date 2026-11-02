import React from 'react';
import { type NodeProps } from '@xyflow/react';
import type { QueueNodeData } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';
import { FlowBadges } from './flow-badges';
import { useDynamicNodeDimensions } from './node-dimension-utils';
import { IcePanelNodeShell } from './icepanel-node-shell';

function QueueGlyph(): JSX.Element {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    default: return '';
  }
}

/**
 * QueueNode — IcePanel "Store" style messaging/queue object, card variant.
 */
export function QueueNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as QueueNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Queue';
  const queueKind = typeof nodeData.queueKind === 'string' && (nodeData.queueKind as string).length > 0 ? (nodeData.queueKind as string) : 'queue';
  const technology = typeof nodeData.technology === 'string' && (nodeData.technology as string).length > 0 ? (nodeData.technology as string) : undefined;
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0 ? nodeData.description : undefined;
  const status = nodeData.status as string | undefined;

  const brandIcon = (nodeData.icon as string) || getTechnologyIconPath(queueKind) || getTechnologyIconPath(technology) || getTechnologyIconPath(label) || undefined;
  const fontSize = (nodeData.fontSize as number) || (nodeData.labelFontSize as number) || ((nodeData.style as Record<string, unknown>)?.fontSize as number);

  const { cardRef, minHeight, minWidth } = useDynamicNodeDimensions(
    { label, description, technology, kind: queueKind, fontSize, hasHeader: true, hasFooter: true },
    'queue',
    id,
  );

  const techLabel = technology || formatKindLabel(queueKind);
  const subtitle = techLabel ? `Queue: ${techLabel}` : 'Queue';

  return (
    <IcePanelNodeShell
      nodeId={id}
      testId="queue-node"
      variant="card"
      title={label}
      subtitle={subtitle}
      iconPath={brandIcon}
      fallbackGlyph={<QueueGlyph />}
      selected={selected}
      isEditing={Boolean(nodeData.isEditing)}
      onRename={(next) => (typeof nodeData.onRename === 'function' ? (nodeData.onRename as (v: string) => void)(next) : undefined)}
      status={status}
      minWidth={minWidth}
      minHeight={minHeight}
      cardRef={cardRef}
      style={nodeData.style as React.CSSProperties}
      fontSize={fontSize}
      dim={Boolean(nodeData.flowView && !nodeData.isInFlow)}
      highlight={Boolean(nodeData.flowView && nodeData.isInFlow)}
      overlays={
        <FlowBadges
          flowView={nodeData.flowView as boolean | undefined}
          isInFlow={nodeData.isInFlow as boolean | undefined}
          flowStepNumbers={nodeData.flowStepNumbers as number[] | undefined}
          isActiveStepParticipant={nodeData.isActiveStepParticipant as boolean | undefined}
        />
      }
    />
  );
}
