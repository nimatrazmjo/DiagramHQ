/**
 * Framework-agnostic canvas interfaces and model projection functions
 * for DiagramHQ infinite canvas (ADR-0002, MODULES.md §7).
 */

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasNodeData {
  label: string;
  kind?: string;
  description?: string;
  [key: string]: unknown;
}

export interface CanvasNode {
  id: string;
  type: string;
  position: CanvasPosition;
  data: CanvasNodeData;
  width?: number;
  height?: number;
  selected?: boolean;
  parentId?: string;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  selected?: boolean;
  animated?: boolean;
  data?: Record<string, unknown>;
}

export interface CanvasInteractionHandler {
  onNodeClick?: (id: string) => void;
  onNodeDragStop?: (id: string, position: CanvasPosition) => void;
  onSelectionChange?: (selectedNodeIds: string[], selectedEdgeIds: string[]) => void;
  onViewportChange?: (viewport: CanvasViewport) => void;
}

export interface CanvasRenderer<TContainer = unknown> {
  readonly name: string;
  mount(container: TContainer): void;
  unmount(): void;
  render(nodes: CanvasNode[], edges: CanvasEdge[]): void;
  setViewport(viewport: CanvasViewport): void;
  getViewport(): CanvasViewport;
  fitView(): void;
  setInteractionHandler(handler: CanvasInteractionHandler): void;
}

export interface ProjectViewModelObject {
  id: string;
  name: string;
  kind: string;
  description?: string | null;
  parentId?: string | null;
}

export interface ProjectViewModelConnection {
  id: string;
  sourceId: string;
  targetId: string;
  kind?: string;
  description?: string | null;
}

export interface ProjectViewModelViewObject {
  objectId: string;
  x?: number | null;
  y?: number | null;
  position?: CanvasPosition | null;
  width?: number | null;
  height?: number | null;
}

export interface ProjectViewModelParams {
  objects: Array<{
    id: string;
    name: string;
    kind: string;
    description?: string | null;
    parentId?: string | null;
  }>;
  connections: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    kind?: string;
    description?: string | null;
  }>;
  viewObjects?: Array<{
    objectId: string;
    x?: number | null;
    y?: number | null;
    position?: CanvasPosition | null;
    width?: number | null;
    height?: number | null;
  }>;
  gridColumns?: number;
}

export interface CanvasViewModel {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export const DEFAULT_GRID_COL_WIDTH = 280;
export const DEFAULT_GRID_ROW_HEIGHT = 180;
export const DEFAULT_GRID_COLUMNS = 4;

const KNOWN_NODE_TYPES = new Set([
  'system',
  'application',
  'store',
  'component',
  'actor',
  'group',
]);

/**
 * Maps an architectural object kind to a canvas node type.
 * Known kinds ('system', 'application', 'store', etc.) map to their normalized names;
 * unrecognized kinds default to 'system'.
 */
export function mapKindToNodeType(kind?: string | null): string {
  if (!kind) {
    return 'system';
  }
  const normalized = kind.trim().toLowerCase();
  return KNOWN_NODE_TYPES.has(normalized) ? normalized : 'system';
}

/**
 * Projects domain model objects and connections into canvas nodes and edges.
 * If viewObjects has explicit coordinate entries, they are used; otherwise,
 * auto-generates grid layout positions (col * 280, row * 180).
 */
export function projectViewModelToCanvas(
  params: ProjectViewModelParams
): CanvasViewModel;
export function projectViewModelToCanvas(
  objects: ProjectViewModelObject[],
  connections: ProjectViewModelConnection[],
  viewObjects?: ProjectViewModelViewObject[]
): CanvasViewModel;
export function projectViewModelToCanvas(
  paramsOrObjects: ProjectViewModelParams | ProjectViewModelObject[],
  maybeConnections?: ProjectViewModelConnection[],
  maybeViewObjects?: ProjectViewModelViewObject[]
): CanvasViewModel {
  let objects: ProjectViewModelObject[];
  let connections: ProjectViewModelConnection[];
  let viewObjects: ProjectViewModelViewObject[] | undefined;
  let gridColumns: number = DEFAULT_GRID_COLUMNS;

  if (Array.isArray(paramsOrObjects)) {
    objects = paramsOrObjects;
    connections = maybeConnections ?? [];
    viewObjects = maybeViewObjects;
  } else {
    objects = paramsOrObjects.objects ?? [];
    connections = paramsOrObjects.connections ?? [];
    viewObjects = paramsOrObjects.viewObjects;
    if (paramsOrObjects.gridColumns && paramsOrObjects.gridColumns > 0) {
      gridColumns = paramsOrObjects.gridColumns;
    }
  }

  const viewObjectMap = new Map<string, ProjectViewModelViewObject>();
  if (viewObjects) {
    for (const vo of viewObjects) {
      if (vo && vo.objectId) {
        viewObjectMap.set(vo.objectId, vo);
      }
    }
  }

  let fallbackIndex = 0;

  const nodes: CanvasNode[] = objects.map((object) => {
    const vo = viewObjectMap.get(object.id);
    let position: CanvasPosition;
    let width: number | undefined;
    let height: number | undefined;

    const explicitX = vo?.x != null ? vo.x : vo?.position?.x;
    const explicitY = vo?.y != null ? vo.y : vo?.position?.y;

    if (explicitX != null && explicitY != null) {
      position = { x: explicitX, y: explicitY };
      width = vo?.width != null ? vo.width : undefined;
      height = vo?.height != null ? vo.height : undefined;
    } else {
      const col = fallbackIndex % gridColumns;
      const row = Math.floor(fallbackIndex / gridColumns);
      position = {
        x: col * DEFAULT_GRID_COL_WIDTH,
        y: row * DEFAULT_GRID_ROW_HEIGHT,
      };
      fallbackIndex++;
    }

    const node: CanvasNode = {
      id: object.id,
      type: mapKindToNodeType(object.kind),
      position,
      data: {
        label: object.name,
        kind: object.kind,
        description: object.description || undefined,
      },
      ...(width != null ? { width } : {}),
      ...(height != null ? { height } : {}),
      ...(object.parentId ? { parentId: object.parentId } : {}),
    };

    return node;
  });

  const edges: CanvasEdge[] = connections.map((connection) => {
    const edge: CanvasEdge = {
      id: connection.id,
      source: connection.sourceId,
      target: connection.targetId,
      label: connection.kind || undefined,
      type: 'default',
      animated: connection.kind === 'async',
      data: {
        kind: connection.kind,
        description: connection.description || undefined,
      },
    };
    return edge;
  });

  return { nodes, edges };
}
