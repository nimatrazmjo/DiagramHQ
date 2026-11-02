import React from 'react';
import { type NodeProps } from '@xyflow/react';
import type { DatabaseNodeData, Technology, PersonaMode } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';
import { SecurityBadges } from './security-badges';
import { DataBadges } from './data-badges';
import { OwnershipBadges } from './ownership-badges';
import { TechnologyBadges } from './technology-badges';
import { PersonaBadges } from './persona-badges';
import { FlowBadges } from './flow-badges';
import { useDynamicNodeDimensions } from './node-dimension-utils';
import { IcePanelNodeShell } from './icepanel-node-shell';

function DatabaseGlyph(): JSX.Element {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    case 'store': return '';
    default: return kind;
  }
}

/**
 * DatabaseNode — IcePanel "Store" object, rendered as a cylinder.
 */
export function DatabaseNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as DatabaseNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Store';
  const databaseKind = typeof nodeData.databaseKind === 'string' && nodeData.databaseKind.length > 0 ? (nodeData.databaseKind as string) : 'store';
  const technology = typeof nodeData.technology === 'string' && nodeData.technology.length > 0 ? (nodeData.technology as string) : undefined;
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0 ? nodeData.description : undefined;
  const status = nodeData.status as string | undefined;

  const brandIcon = (nodeData.icon as string) || getTechnologyIconPath(databaseKind) || getTechnologyIconPath(technology) || getTechnologyIconPath(label) || undefined;
  const fontSize = (nodeData.fontSize as number) || (nodeData.labelFontSize as number) || ((nodeData.style as Record<string, unknown>)?.fontSize as number);

  const { cardRef, minHeight, minWidth } = useDynamicNodeDimensions(
    { label, description, technology, kind: databaseKind, fontSize, hasHeader: true, hasFooter: true, paddingY: 28 },
    'database',
    id,
  );

  const techLabel = technology || formatKindLabel(databaseKind);
  const subtitle = techLabel ? `Store: ${techLabel}` : 'Store';

  return (
    <IcePanelNodeShell
      nodeId={id}
      testId="database-node"
      variant="cylinder"
      title={label}
      subtitle={subtitle}
      iconPath={brandIcon}
      fallbackGlyph={<DatabaseGlyph />}
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
        <>
          <span data-testid="database-kind-badge" className="sr-only">{formatKindLabel(databaseKind)}</span>
          {technology && <span data-testid="database-technology" className="sr-only">{technology}</span>}
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
        </>
      }
    />
  );
}
