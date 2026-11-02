import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { getTechnologyIconPath } from '../../lib/icons';
import { IcePanelNodeShell } from './icepanel-node-shell';
import { C4ContextNode } from './c4-context-node';
import { C4ContainerNode } from './c4-container-node';
import { C4SystemBoundaryNode } from './c4-system-boundary-node';
import { C4ComponentNode } from './c4-component-node';
import { C4ContainerBoundaryNode } from './c4-container-boundary-node';
import { PersonNode } from './person-node';
import { SystemNode } from './system-node';
import { AppNode } from './app-node';
import { ComponentNode } from './component-node';
import { DatabaseNode } from './database-node';
import { QueueNode } from './queue-node';
import { GroupNode } from './group-node';
import { useDynamicNodeDimensions } from './node-dimension-utils';

export { C4ContextNode } from './c4-context-node';
export { C4ContainerNode } from './c4-container-node';
export { C4SystemBoundaryNode } from './c4-system-boundary-node';
export { C4ComponentNode } from './c4-component-node';
export { C4ContainerBoundaryNode } from './c4-container-boundary-node';
export { PersonNode } from './person-node';
export { SystemNode } from './system-node';
export { AppNode } from './app-node';
export { ComponentNode } from './component-node';
export { DatabaseNode } from './database-node';
export { QueueNode } from './queue-node';
export { GroupNode } from './group-node';
export { EditableNodeLabel, type EditableNodeLabelProps } from './editable-node-label';

export interface CustomNodeData {
  label: string;
  kind?: string;
  description?: string;
  status?: string;
  isEditing?: boolean;
  onRename?: (newLabel: string) => void;
  [key: string]: unknown;
}

/**
 * Store / storage node — IcePanel cylinder "Store" object.
 */
export function StoreNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as CustomNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Store';
  const kind = typeof nodeData.kind === 'string' ? nodeData.kind : 'store';
  const technology = typeof (nodeData as Record<string, unknown>).technology === 'string'
    ? ((nodeData as Record<string, unknown>).technology as string)
    : undefined;
  const description = typeof nodeData.description === 'string' ? nodeData.description : undefined;
  const status = nodeData.status as string | undefined;
  const brandIcon = ((nodeData as Record<string, unknown>).icon as string) || getTechnologyIconPath(technology || label);

  const fontSize =
    (nodeData.fontSize as number) ||
    (nodeData.labelFontSize as number) ||
    ((nodeData.style as Record<string, unknown>)?.fontSize as number);

  const { cardRef, minHeight, minWidth } = useDynamicNodeDimensions(
    { label, description, kind, fontSize, hasHeader: true, hasFooter: true, paddingY: 28 },
    'store',
    id,
  );

  const subtitle = technology ? `Store: ${technology}` : 'Store';

  return (
    <IcePanelNodeShell
      nodeId={id}
      testId="store-node"
      variant="cylinder"
      title={label}
      subtitle={subtitle}
      iconPath={brandIcon || undefined}
      selected={selected}
      isEditing={Boolean(nodeData.isEditing)}
      onRename={(next) => (typeof nodeData.onRename === 'function' ? (nodeData.onRename as (v: string) => void)(next) : undefined)}
      status={status}
      minWidth={minWidth}
      minHeight={minHeight}
      cardRef={cardRef}
      style={nodeData.style as React.CSSProperties}
      fontSize={fontSize}
    />
  );
}

export function CustomNodeComponent(props: NodeProps): JSX.Element {
  const kind = (props.data?.kind as string) || '';
  switch (kind) {
    case 'application':
    case 'app':
    case 'service':
      return <AppNode {...props} />;
    case 'database':
    case 'db':
      return <DatabaseNode {...props} />;
    case 'store':
      return <StoreNode {...props} />;
    case 'component':
      return <ComponentNode {...props} />;
    case 'queue':
      return <QueueNode {...props} />;
    case 'actor':
    case 'person':
      return <PersonNode {...props} />;
    case 'group':
    case 'boundary':
      return <GroupNode {...props} />;
    case 'system':
    default:
      return <SystemNode {...props} />;
  }
}

export const nodeTypes = {
  system: SystemNode,
  application: AppNode,
  app: AppNode,
  service: AppNode,
  store: StoreNode,
  component: ComponentNode,
  database: DatabaseNode,
  db: DatabaseNode,
  queue: QueueNode,
  group: GroupNode,
  c4Context: C4ContextNode,
  actor: PersonNode,
  person: PersonNode,
  c4Container: C4ContainerNode,
  container: C4ContainerNode,
  c4SystemBoundary: C4SystemBoundaryNode,
  c4Component: C4ComponentNode,
  c4ContainerBoundary: C4ContainerBoundaryNode,
  customNode: CustomNodeComponent,
  default: SystemNode,
};

