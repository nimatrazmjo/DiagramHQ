'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  reconnectEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Viewport,
  type OnSelectionChangeParams,
  type SelectionDragHandler,
  type SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type {
  AlignAxis,
  AlignableNode,
  ArchitectureId,
  CanvasEdge,
  CanvasNode,
  CanvasPosition,
  ConnectionId,
  LayoutEdge,
  LayoutEngineName,
  ObjectId,
  TemplateId,
  VersionId,
} from '@diagramhq/domain';
import {
  alignNodes,
  applyLayout,
  distributeNodes,
  instantiateTemplate,
  listLayoutEngines,
  projectViewModelToCanvas,
  snapToGrid,
} from '@diagramhq/domain';
import {
  useCanvasStore,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from '../../lib/canvas-store';
import {
  MoveNodeCommand,
  MoveNodesCommand,
  AlignNodesCommand,
  ApplyLayoutCommand,
  CreateNodeCommand,
  DeleteNodeCommand,
  ConnectNodesCommand,
  UpdateNodeMetadataCommand,
  UpdateEdgeDataCommand,
  defaultCommandDispatcher,
  type Command,
  type NodeMoveItem,
  type AlignOperation,
} from '../../lib/commands';
import { nodeTypes } from './custom-nodes';
import { IcePanelEdge } from './icepanel-edge';
import { AlignmentToolbar } from './alignment-toolbar';
import { LayoutMenu } from './layout-menu';
import { ShapePalette, type ShapeKind } from './shape-palette';
import { TemplatePanel } from './template-panel';

const edgeTypes = {
  icepanel: IcePanelEdge,
  default: IcePanelEdge,
  smoothstep: IcePanelEdge,
};

export interface InfiniteCanvasProps {
  initialNodes?: CanvasNode[];
  initialEdges?: CanvasEdge[];
  onNodeSelect?: (nodeId: string | null) => void;
  onEdgeSelect?: (edgeId: string | null) => void;
  isSpacePanning?: boolean;
  selectedNodeIds?: string[];
  selectedEdgeIds?: string[];
  isMinimapVisible?: boolean;
  isFullscreen?: boolean;
  isFocusMode?: boolean;
  className?: string;
  viewId?: string;
  onNodeDragStop?: (nodeId: string, position: { x: number; y: number }) => void;
  onCommandDispatched?: (command: Command) => void;
  persistFn?: (viewId: string, objectId: string, position: { x: number; y: number }) => Promise<void>;
  batchPersistFn?: (viewId: string, positions: Array<{ objectId: string; x: number; y: number }>) => Promise<void>;
  dragStopHandlerRef?: React.MutableRefObject<((event: unknown, node: Node) => void) | null>;
  onDragStopReady?: (handler: (event: unknown, node: Node) => void) => void;
  showPalette?: boolean;
  showTemplatePicker?: boolean;
  onEdgeConnect?: (edge: CanvasEdge) => void;
  onEdgeReconnect?: (oldEdge: CanvasEdge, newConnection: Connection, updatedEdge: CanvasEdge) => void;
  onNodeCreate?: (node: CanvasNode) => void;
  onNodeDelete?: (nodeId: string) => void;
  onNodeRename?: (nodeId: string, newLabel: string, prevLabel: string) => void;
  onEdgeLabelChange?: (edgeId: string, newLabel: string, prevLabel: string) => void;
}

export interface NodeDragStopHandlerOptions {
  getNodes: () => Node[];
  viewId?: string;
  persistFn?: (viewId: string, objectId: string, position: { x: number; y: number }) => Promise<void>;
  onCommandDispatched?: (command: Command) => void;
  onNodeDragStop?: (nodeId: string, position: { x: number; y: number }) => void;
  onPositionChange?: (nodeId: string, position: { x: number; y: number }) => void;
  dragStartPositions?: Map<string, { x: number; y: number }>;
  snapToGridEnabled?: boolean;
  gridSize?: number;
}

export function createNodeDragStopHandler({
  getNodes,
  viewId,
  persistFn,
  onCommandDispatched,
  onNodeDragStop,
  onPositionChange,
  dragStartPositions,
  snapToGridEnabled = false,
  gridSize,
}: NodeDragStopHandlerOptions): (_event: unknown, node: Node) => Promise<{ x: number; y: number }> {
  return async (_event: unknown, node: Node) => {
    const currentNodes = getNodes();
    const prevNode = currentNodes.find((n) => n.id === node.id);
    const startPos = dragStartPositions?.get(node.id);
    if (dragStartPositions) {
      dragStartPositions.delete(node.id);
    }

    const prevPosition =
      startPos ??
      (prevNode
        ? { x: prevNode.position.x, y: prevNode.position.y }
        : { x: node.position.x, y: node.position.y });

    const newPosition = snapToGridEnabled
      ? snapToGrid({ x: node.position.x, y: node.position.y }, gridSize)
      : { x: node.position.x, y: node.position.y };

    const command = new MoveNodeCommand({
      viewId,
      objectId: node.id,
      prevPosition,
      newPosition,
      persistFn,
    });

    if (onCommandDispatched) {
      onCommandDispatched(command);
    }
    const result = await defaultCommandDispatcher.dispatch(command);

    if (onNodeDragStop) {
      onNodeDragStop(node.id, newPosition);
    }

    if (onPositionChange) {
      onPositionChange(node.id, newPosition);
    }

    return result;
  };
}

/**
 * Maps a React Flow node to the domain's `AlignableNode` shape. React Flow
 * only reflects auto-measured node size on `node.measured`; the top-level
 * `width`/`height` fields stay undefined unless a node explicitly pins a
 * fixed size, so `measured` must be preferred for align/distribute math.
 */
export function toAlignableNode(node: Node): AlignableNode {
  return {
    id: node.id,
    position: { x: node.position.x, y: node.position.y },
    width: node.measured?.width ?? node.width ?? undefined,
    height: node.measured?.height ?? node.height ?? undefined,
  };
}

/**
 * Snaps a dragged group to the grid as a rigid body: the delta is derived
 * from a single anchor node and applied uniformly to every node, so the
 * relative offsets within the group are preserved (snapping each node's
 * position independently would distort them).
 */
export function snapGroupPositions(
  positions: Array<{ id: string; position: { x: number; y: number } }>,
  gridSize?: number,
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  if (positions.length === 0) return result;

  const anchor = positions[0]!;
  const snappedAnchor = snapToGrid(anchor.position, gridSize);
  const dx = snappedAnchor.x - anchor.position.x;
  const dy = snappedAnchor.y - anchor.position.y;

  for (const { id, position } of positions) {
    result.set(id, { x: position.x + dx, y: position.y + dy });
  }
  return result;
}

/**
 * Computes the fill color for a node on the canvas minimap (F017).
 * Selected nodes are highlighted in vibrant blue, while unselected nodes
 * are tinted by their architectural category (system, app/container, store/database, etc.).
 */
export function getMiniMapNodeColor(node: Node): string {
  if (node.selected) return '#60a5fa';
  const type = (node.type || '').toLowerCase();
  if (type.includes('system')) return '#818cf8';
  if (type.includes('app') || type.includes('container')) return '#38bdf8';
  if (type.includes('store') || type.includes('database')) return '#34d399';
  if (type.includes('component')) return '#fbbf24';
  if (type.includes('person')) return '#f472b6';
  return '#64748b';
}

function toFlowNode(node: CanvasNode): Node {
  return {
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: { ...node.data },
    ...(node.width != null ? { width: node.width } : {}),
    ...(node.height != null ? { height: node.height } : {}),
    ...(node.selected != null ? { selected: node.selected } : {}),
    ...(node.parentId ? { parentId: node.parentId } : {}),
  };
}

function toFlowEdge(edge: CanvasEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? (edge.data?.sourceHandle as string | undefined),
    targetHandle: edge.targetHandle ?? (edge.data?.targetHandle as string | undefined),
    type: edge.type && edge.type !== 'default' && edge.type !== 'smoothstep' ? edge.type : 'icepanel',
    label: edge.label,
    animated: edge.animated,
    selected: edge.selected,
    data: edge.data,
  };
}

function isTextInput(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    (el as HTMLElement).isContentEditable
  );
}

function InfiniteCanvasContent({
  initialNodes = [],
  initialEdges = [],
  onNodeSelect,
  onEdgeSelect,
  isSpacePanning: propIsSpacePanning,
  selectedNodeIds: propSelectedNodeIds,
  selectedEdgeIds: propSelectedEdgeIds,
  isMinimapVisible: propIsMinimapVisible,
  isFullscreen: propIsFullscreen,
  isFocusMode: propIsFocusMode,
  className = '',
  viewId,
  onNodeDragStop,
  onCommandDispatched,
  persistFn,
  batchPersistFn,
  dragStopHandlerRef,
  onDragStopReady,
  showPalette = true,
  showTemplatePicker = true,
  onEdgeConnect,
  onEdgeReconnect,
  onNodeCreate,
  onNodeDelete,
  onNodeRename,
  onEdgeLabelChange,
}: InfiniteCanvasProps): JSX.Element {
  const [nodes, setNodes] = useState<Node[]>(() => initialNodes.map(toFlowNode));
  const [edges, setEdges] = useState<Edge[]>(() => initialEdges.map(toFlowEdge));
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const storeIsSpacePanning = useCanvasStore((s) => s.isSpacePanning);
  const isSpacePanning = propIsSpacePanning ?? storeIsSpacePanning;
  const storeSelectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const storeSelectedEdgeIds = useCanvasStore((s) => s.selectedEdgeIds);
  const isBoxSelectMode = useCanvasStore((s) => s.isBoxSelectMode);
  const isSnapToGridEnabled = useCanvasStore((s) => s.isSnapToGridEnabled);
  const storeIsMinimapVisible = useCanvasStore((s) => s.isMinimapVisible);
  const isMinimapVisible = propIsMinimapVisible ?? storeIsMinimapVisible;
  const storeIsFullscreen = useCanvasStore((s) => s.isFullscreen);
  const isFullscreen = propIsFullscreen ?? storeIsFullscreen;
  const storeIsFocusMode = useCanvasStore((s) => s.isFocusMode);
  const isFocusMode = propIsFocusMode ?? storeIsFocusMode;
  const selectedNodeIds = propSelectedNodeIds ?? storeSelectedNodeIds;
  const selectedEdgeIds = propSelectedEdgeIds ?? storeSelectedEdgeIds;
  const totalSelected = selectedNodeIds.length + selectedEdgeIds.length;
  const currentZoom = useCanvasStore((s) => s.viewport.zoom);
  const reactFlow = useReactFlow();

  const prevInitialPositionsRef = React.useRef<Map<string, { x: number; y: number }>>(
    new Map(initialNodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }])),
  );

  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleToggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      void containerRef.current?.requestFullscreen?.().catch((err: unknown) => {
        console.warn('Fullscreen request failed:', err);
      });
      useCanvasStore.getState().setIsFullscreen(true);
    } else {
      void document.exitFullscreen?.().catch((err: unknown) => {
        console.warn('Exit fullscreen failed:', err);
      });
      useCanvasStore.getState().setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFullscreenChange = () => {
      useCanvasStore.getState().setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setEditingNodeId(node.id);
  }, []);

  const handleEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setEditingEdgeId(edge.id);
  }, []);

  const handleCommitNodeRename = useCallback(
    async (nodeId: string, newLabel: string, prevLabel: string) => {
      setEditingNodeId(null);
      if (!newLabel || newLabel === prevLabel) return;

      const cmd = new UpdateNodeMetadataCommand({
        nodeId,
        prevData: { label: prevLabel, name: prevLabel },
        newData: { label: newLabel, name: newLabel },
        viewId,
        persistFn: persistFn
          ? async (vId, nId, data) => {
              if (typeof data.x === 'number' && typeof data.y === 'number') {
                await persistFn(vId, nId, { x: data.x, y: data.y });
              }
            }
          : undefined,
      });

      if (onCommandDispatched) {
        onCommandDispatched(cmd);
      }
      await defaultCommandDispatcher.dispatch(cmd);
      cmd.applyCanvasUpdate(setNodes, setEdges, 'execute');

      if (onNodeRename) {
        onNodeRename(nodeId, newLabel, prevLabel);
      }
    },
    [viewId, persistFn, onCommandDispatched, onNodeRename],
  );

  const handleCommitEdgeLabel = useCallback(
    async (edgeId: string, newLabel: string, prevLabel: string) => {
      setEditingEdgeId(null);
      if (newLabel === prevLabel) return;

      const currentEdge = edges.find((e) => e.id === edgeId);
      const prevData = { ...(currentEdge?.data || {}) };
      const newData = { ...prevData, description: newLabel, label: newLabel };

      const cmd = new UpdateEdgeDataCommand({
        edgeId,
        prevData,
        newData,
        prevLabel,
        newLabel,
      });

      if (onCommandDispatched) {
        onCommandDispatched(cmd);
      }
      await defaultCommandDispatcher.dispatch(cmd);
      cmd.applyCanvasUpdate(setNodes, setEdges, 'execute');

      if (onEdgeLabelChange) {
        onEdgeLabelChange(edgeId, newLabel, prevLabel);
      }
    },
    [edges, onCommandDispatched, onEdgeLabelChange],
  );

  useEffect(() => {
    const onNodeRenameEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ nodeId: string; newLabel: string; prevLabel: string }>).detail;
      if (detail) {
        void handleCommitNodeRename(detail.nodeId, detail.newLabel, detail.prevLabel);
      }
    };

    const onEdgeLabelChangeEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ edgeId: string; newLabel: string; prevLabel: string }>).detail;
      if (detail) {
        void handleCommitEdgeLabel(detail.edgeId, detail.newLabel, detail.prevLabel);
      }
    };

    window.addEventListener('canvas:node-rename', onNodeRenameEvent);
    window.addEventListener('canvas:edge-label-change', onEdgeLabelChangeEvent);
    return () => {
      window.removeEventListener('canvas:node-rename', onNodeRenameEvent);
      window.removeEventListener('canvas:edge-label-change', onEdgeLabelChangeEvent);
    };
  }, [handleCommitNodeRename, handleCommitEdgeLabel]);

  // In Focus Mode (F017), unselected nodes and unconnected edges are visually dimmed
  // so the user can isolate the selected architecture component or sub-graph.
  const displayedNodes = React.useMemo(() => {
    const selectedSet = new Set(selectedNodeIds);
    return nodes.map((n) => {
      const isSelected = selectedSet.has(n.id);
      const isEditing = editingNodeId === n.id;
      const baseNode =
        isFocusMode && selectedNodeIds.length > 0
          ? {
              ...n,
              style: {
                ...n.style,
                opacity: isSelected ? 1 : 0.15,
                filter: isSelected ? 'none' : 'grayscale(100%)',
                transition: 'opacity 0.2s ease, filter 0.2s ease',
              },
            }
          : n;

      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          isEditing,
          onStartEdit: () => setEditingNodeId(n.id),
          onRename: (newLabel: string) =>
            handleCommitNodeRename(n.id, newLabel, String(n.data?.label || '')),
        },
      };
    });
  }, [nodes, isFocusMode, selectedNodeIds, editingNodeId, handleCommitNodeRename]);

  const displayedEdges = React.useMemo(() => {
    const selectedSet = new Set(selectedNodeIds);
    return edges.map((e) => {
      const isConnected = selectedSet.has(e.source) || selectedSet.has(e.target);
      const isEditing = editingEdgeId === e.id;
      const baseEdge =
        isFocusMode && selectedNodeIds.length > 0
          ? {
              ...e,
              style: {
                ...e.style,
                opacity: isConnected ? 1 : 0.08,
                transition: 'opacity 0.2s ease',
              },
            }
          : e;

      return {
        ...baseEdge,
        data: {
          ...baseEdge.data,
          isEditing,
          onStartEdit: () => setEditingEdgeId(e.id),
          onCancelEdit: () => setEditingEdgeId(null),
          onLabelChange: (newLabel: string) =>
            handleCommitEdgeLabel(
              e.id,
              newLabel,
              String(e.data?.description || e.label || ''),
            ),
        },
      };
    });
  }, [edges, isFocusMode, selectedNodeIds, editingEdgeId, handleCommitEdgeLabel]);

  const dragStartPositions = React.useRef<Map<string, { x: number; y: number }>>(new Map());

  const handleNodeDragStart = useCallback((_event: unknown, node: Node) => {
    const currentInState = nodes.find((n) => n.id === node.id);
    dragStartPositions.current.set(node.id, {
      x: currentInState ? currentInState.position.x : node.position.x,
      y: currentInState ? currentInState.position.y : node.position.y,
    });
  }, [nodes]);

  const handleNodeDragStop = useCallback((event: unknown, node: Node) => {
    const handler = createNodeDragStopHandler({
      getNodes: () => nodes,
      viewId,
      persistFn,
      onCommandDispatched,
      onNodeDragStop,
      onPositionChange: (nodeId, newPosition) => {
        setNodes((nds) =>
          nds.map((n) => (n.id === nodeId ? { ...n, position: newPosition } : n))
        );
      },
      dragStartPositions: dragStartPositions.current,
      snapToGridEnabled: isSnapToGridEnabled,
    });
    return handler(event, node);
  }, [nodes, viewId, persistFn, onCommandDispatched, onNodeDragStop, isSnapToGridEnabled]);

  /** Group drag stop: fired when a multi-selection is dragged and released. */
  const handleSelectionDragStop: SelectionDragHandler = useCallback(
    (_event, draggedNodes) => {
      if (draggedNodes.length === 0) return;

      const snappedById = isSnapToGridEnabled
        ? snapGroupPositions(
            draggedNodes.map((n) => ({ id: n.id, position: { x: n.position.x, y: n.position.y } })),
          )
        : null;

      const moves: NodeMoveItem[] = draggedNodes.map((draggedNode) => {
        const startPos = dragStartPositions.current.get(draggedNode.id);
        dragStartPositions.current.delete(draggedNode.id);
        const prevPosition = startPos ?? { x: draggedNode.position.x, y: draggedNode.position.y };
        const rawPosition = { x: draggedNode.position.x, y: draggedNode.position.y };
        const newPosition = snappedById?.get(draggedNode.id) ?? rawPosition;
        return {
          objectId: draggedNode.id,
          prevPosition,
          newPosition,
        };
      });

      const command = new MoveNodesCommand({
        viewId,
        moves,
        persistFn: batchPersistFn,
      });

      if (onCommandDispatched) {
        onCommandDispatched(command);
      }

      // Sync local node positions after group move
      setNodes((nds) =>
        nds.map((n) => {
          const move = moves.find((m) => m.objectId === n.id);
          return move ? { ...n, position: move.newPosition } : n;
        }),
      );

      if (onNodeDragStop) {
        for (const move of moves) {
          onNodeDragStop(move.objectId, move.newPosition);
        }
      }

      // Revert the optimistic update if persistence fails, so the canvas
      // never shows positions the server didn't accept.
      void defaultCommandDispatcher.dispatch(command).catch((error) => {
        console.error('Failed to persist group move:', error);
        setNodes((nds) =>
          nds.map((n) => {
            const move = moves.find((m) => m.objectId === n.id);
            return move ? { ...n, position: move.prevPosition } : n;
          }),
        );
      });
    },
    [nodes, viewId, batchPersistFn, onCommandDispatched, onNodeDragStop, isSnapToGridEnabled],
  );

  // Shared guard across every whole-graph position mutation (align,
  // distribute, apply-layout): a second op firing while one is still
  // persisting could have its rollback-on-failure handler stomp on the
  // other's (possibly successful, possibly still-selected) positions. One
  // ref+state pair serializes all of them rather than letting align and
  // apply-layout race each other via independent guards.
  const isMutatingGraphRef = React.useRef(false);
  const [isMutatingGraph, setIsMutatingGraph] = useState(false);

  /**
   * Align/distribute the current multi-selection along an axis (F014).
   * Positions are computed synchronously (pure domain functions) and applied
   * to local node state immediately so the UI doesn't wait on an in-flight
   * persist; `batchPersistFn` runs in the background via the command for
   * undo history + server sync, and is reverted on failure.
   */
  const dispatchAlignOperation = useCallback(
    (operation: AlignOperation, minNodes: number) => {
      if (isMutatingGraphRef.current) return;

      const selectedIdSet = new Set(selectedNodeIds);
      const selected = nodes.filter((n) => selectedIdSet.has(n.id));
      if (selected.length < minNodes) return;

      isMutatingGraphRef.current = true;
      setIsMutatingGraph(true);

      let alignableNodes: AlignableNode[];
      let positionById: Map<string, CanvasPosition>;
      try {
        alignableNodes = selected.map(toAlignableNode);
        const positions =
          operation.type === 'align'
            ? alignNodes(alignableNodes, operation.axis)
            : distributeNodes(alignableNodes, operation.axis);
        positionById = new Map(alignableNodes.map((n, i) => [n.id, positions[i]!]));
      } catch (error) {
        // A synchronous throw here must still release the shared guard —
        // otherwise both the alignment toolbar and the layout menu would be
        // stuck disabled for the rest of the session.
        console.error('Failed to compute alignment:', error);
        isMutatingGraphRef.current = false;
        setIsMutatingGraph(false);
        return;
      }

      const previousPositionById = new Map(alignableNodes.map((n) => [n.id, n.position]));

      setNodes((nds) =>
        nds.map((n) => {
          const position = positionById.get(n.id);
          return position ? { ...n, position } : n;
        }),
      );

      const command = new AlignNodesCommand({
        viewId,
        nodes: alignableNodes,
        operation,
        persistFn: batchPersistFn,
      });

      if (onCommandDispatched) {
        onCommandDispatched(command);
      }

      // Revert the optimistic update if persistence fails, so the canvas
      // never shows positions the server didn't accept. Only revert a node
      // if it's still sitting exactly where this op put it — if something
      // else (e.g. a plain drag, which isn't gated by this guard) has since
      // moved it, that later change wins instead of being silently clobbered.
      void defaultCommandDispatcher
        .dispatch(command)
        .catch((error) => {
          console.error('Failed to persist alignment:', error);
          setNodes((nds) =>
            nds.map((n) => {
              const attempted = positionById.get(n.id);
              const revertTo = previousPositionById.get(n.id);
              if (!attempted || !revertTo) return n;
              const stillAtAttemptedPosition =
                n.position.x === attempted.x && n.position.y === attempted.y;
              return stillAtAttemptedPosition ? { ...n, position: revertTo } : n;
            }),
          );
        })
        .finally(() => {
          isMutatingGraphRef.current = false;
          setIsMutatingGraph(false);
        });
    },
    [nodes, selectedNodeIds, viewId, batchPersistFn, onCommandDispatched],
  );

  const handleAlign = useCallback(
    (axis: AlignAxis) => dispatchAlignOperation({ type: 'align', axis }, 2),
    [dispatchAlignOperation],
  );

  const handleDistribute = useCallback(
    (axis: 'horizontal' | 'vertical') =>
      dispatchAlignOperation({ type: 'distribute', axis }, 3),
    [dispatchAlignOperation],
  );

  /**
   * Apply a registered layout engine (F015) to the whole graph. Positions
   * are computed synchronously (pure domain function), once, and applied to
   * local node state immediately; the same precomputed positions are handed
   * to `ApplyLayoutCommand` so persistence never re-runs the (potentially
   * expensive, e.g. force-directed) layout math a second time. Shares
   * `isMutatingGraphRef`/`isMutatingGraph` with `dispatchAlignOperation` so
   * the two whole-graph mutations can't race each other.
   */
  const handleApplyLayout = useCallback(
    (engine: LayoutEngineName) => {
      if (isMutatingGraphRef.current) return;
      if (nodes.length === 0) return;

      isMutatingGraphRef.current = true;
      setIsMutatingGraph(true);

      let layoutNodes: AlignableNode[];
      let positionById: Map<string, CanvasPosition>;
      let positions: CanvasPosition[];
      try {
        layoutNodes = nodes.map(toAlignableNode);
        const layoutEdges: LayoutEdge[] = edges.map((e) => ({ source: e.source, target: e.target }));
        positions = applyLayout(layoutNodes, layoutEdges, engine);
        positionById = new Map(layoutNodes.map((n, i) => [n.id, positions[i]!]));
      } catch (error) {
        // A synchronous throw (e.g. a misbehaving third-party engine) must
        // still release the shared guard, or both the alignment toolbar and
        // the layout menu stay stuck disabled for the rest of the session.
        console.error('Failed to compute layout:', error);
        isMutatingGraphRef.current = false;
        setIsMutatingGraph(false);
        return;
      }

      const previousPositionById = new Map(layoutNodes.map((n) => [n.id, n.position]));

      setNodes((nds) =>
        nds.map((n) => {
          const position = positionById.get(n.id);
          return position ? { ...n, position } : n;
        }),
      );

      const command = new ApplyLayoutCommand({
        viewId,
        nodes: layoutNodes,
        positions,
        persistFn: batchPersistFn,
      });

      if (onCommandDispatched) {
        onCommandDispatched(command);
      }

      // Only revert a node if it's still exactly where this op put it — if
      // a plain drag (not gated by this guard) has since moved it, that
      // later change wins instead of being silently clobbered.
      void defaultCommandDispatcher
        .dispatch(command)
        .catch((error) => {
          console.error('Failed to persist layout:', error);
          setNodes((nds) =>
            nds.map((n) => {
              const attempted = positionById.get(n.id);
              const revertTo = previousPositionById.get(n.id);
              if (!attempted || !revertTo) return n;
              const stillAtAttemptedPosition =
                n.position.x === attempted.x && n.position.y === attempted.y;
              return stillAtAttemptedPosition ? { ...n, position: revertTo } : n;
            }),
          );
        })
        .finally(() => {
          isMutatingGraphRef.current = false;
          setIsMutatingGraph(false);
        });
    },
    [nodes, edges, viewId, batchPersistFn, onCommandDispatched],
  );

  if (dragStopHandlerRef) {
    dragStopHandlerRef.current = handleNodeDragStop;
  }
  if (onDragStopReady) {
    onDragStopReady(handleNodeDragStop);
  }

  const [canUndo, setCanUndo] = useState(() => defaultCommandDispatcher.canUndo());
  const [canRedo, setCanRedo] = useState(() => defaultCommandDispatcher.canRedo());

  useEffect(() => {
    return defaultCommandDispatcher.subscribe(() => {
      setCanUndo(defaultCommandDispatcher.canUndo());
      setCanRedo(defaultCommandDispatcher.canRedo());
    });
  }, []);

  const handleUndo = useCallback(async () => {
    if (isMutatingGraphRef.current) return;
    const cmd = defaultCommandDispatcher.peekUndo();
    if (!cmd) return;
    isMutatingGraphRef.current = true;
    setIsMutatingGraph(true);
    try {
      await defaultCommandDispatcher.undo();
      if ('applyCanvasUpdate' in cmd && typeof cmd.applyCanvasUpdate === 'function') {
        cmd.applyCanvasUpdate(setNodes, setEdges, 'undo');
      }
      if (cmd instanceof UpdateNodeMetadataCommand && onNodeRename) {
        onNodeRename(
          cmd.params.nodeId,
          String(cmd.params.prevData.label ?? ''),
          String(cmd.params.newData.label ?? ''),
        );
      } else if (cmd instanceof UpdateEdgeDataCommand && onEdgeLabelChange) {
        onEdgeLabelChange(
          cmd.params.edgeId,
          cmd.params.prevLabel ?? '',
          cmd.params.newLabel ?? '',
        );
      }
    } catch (error) {
      console.error('Failed to undo command:', error);
    } finally {
      isMutatingGraphRef.current = false;
      setIsMutatingGraph(false);
    }
  }, [onNodeRename, onEdgeLabelChange]);

  const handleRedo = useCallback(async () => {
    if (isMutatingGraphRef.current) return;
    const cmd = defaultCommandDispatcher.peekRedo();
    if (!cmd) return;
    isMutatingGraphRef.current = true;
    setIsMutatingGraph(true);
    try {
      await defaultCommandDispatcher.redo();
      if ('applyCanvasUpdate' in cmd && typeof cmd.applyCanvasUpdate === 'function') {
        cmd.applyCanvasUpdate(setNodes, setEdges, 'execute');
      }
      if (cmd instanceof UpdateNodeMetadataCommand && onNodeRename) {
        onNodeRename(
          cmd.params.nodeId,
          String(cmd.params.newData.label ?? ''),
          String(cmd.params.prevData.label ?? ''),
        );
      } else if (cmd instanceof UpdateEdgeDataCommand && onEdgeLabelChange) {
        onEdgeLabelChange(
          cmd.params.edgeId,
          cmd.params.newLabel ?? '',
          cmd.params.prevLabel ?? '',
        );
      }
    } catch (error) {
      console.error('Failed to redo command:', error);
    } finally {
      isMutatingGraphRef.current = false;
      setIsMutatingGraph(false);
    }
  }, [onNodeRename, onEdgeLabelChange]);

  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  const handleAddNode = useCallback(
    (kind: ShapeKind) => {
      const flowBounds = containerRef.current?.getBoundingClientRect();
      const centerX = flowBounds ? flowBounds.width / 2 : 400;
      const centerY = flowBounds ? flowBounds.height / 2 : 300;

      let flowPos = { x: 250, y: 180 };
      try {
        if (flowBounds && reactFlow.screenToFlowPosition) {
          flowPos = reactFlow.screenToFlowPosition({
            x: flowBounds.left + centerX,
            y: flowBounds.top + centerY,
          });
        }
      } catch {
        // Fallback for SSR or mock environments
      }

      const jitterX = Math.round((Math.random() - 0.5) * 80);
      const jitterY = Math.round((Math.random() - 0.5) * 80);

      const id = `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const defaultLabels: Record<string, string> = {
        system: 'New System',
        application: 'New Service',
        database: 'New Database',
        queue: 'New Message Queue',
        person: 'User / Actor',
        component: 'New Component',
        group: 'New Boundary Group',
      };

      const canvasNode: CanvasNode = {
        id,
        type: kind === 'database' ? 'database' : kind,
        position: {
          x: Math.round((flowPos?.x ?? 250) + jitterX),
          y: Math.round((flowPos?.y ?? 180) + jitterY),
        },
        data: {
          label: defaultLabels[kind] ?? 'New Node',
          kind,
          description: '',
          status: 'active',
        },
      };

      const command = new CreateNodeCommand({
        viewId,
        node: canvasNode,
      });

      if (onCommandDispatched) {
        onCommandDispatched(command);
      }
      void defaultCommandDispatcher.dispatch(command);

      const flowNode = toFlowNode(canvasNode);
      setNodes((nds) => [...nds, flowNode]);
      useCanvasStore.getState().setSelectedNodes([id]);
      if (onNodeSelect) {
        onNodeSelect(id);
      }
      if (onNodeCreate) {
        onNodeCreate(canvasNode);
      }
    },
    [viewId, onCommandDispatched, reactFlow, onNodeSelect, onNodeCreate],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const edgeId = `conn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const hasSpecificHandle = Boolean(connection.sourceHandle || connection.targetHandle);
      const canvasEdge: CanvasEdge = {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: 'icepanel',
        label: '',
        data: {
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
          routing: hasSpecificHandle ? 'manual' : 'auto',
        },
      };

      const command = new ConnectNodesCommand({
        viewId,
        edge: canvasEdge,
      });

      if (onCommandDispatched) {
        onCommandDispatched(command);
      }
      void defaultCommandDispatcher.dispatch(command);

      setEdges((eds) => [
        ...eds,
        {
          id: edgeId,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: 'icepanel',
          label: '',
          data: canvasEdge.data,
        },
      ]);

      if (onEdgeConnect) {
        onEdgeConnect(canvasEdge);
      }
    },
    [viewId, onCommandDispatched, onEdgeConnect],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (!newConnection.source || !newConnection.target) return;

      const edgeData = (oldEdge.data || {}) as Record<string, unknown>;
      const hasSpecificHandle = Boolean(newConnection.sourceHandle || newConnection.targetHandle);

      const updatedCanvasEdge: CanvasEdge = {
        id: oldEdge.id,
        source: newConnection.source,
        target: newConnection.target,
        sourceHandle: newConnection.sourceHandle ?? undefined,
        targetHandle: newConnection.targetHandle ?? undefined,
        type: oldEdge.type ?? 'icepanel',
        label: typeof oldEdge.label === 'string' ? oldEdge.label : (edgeData.label as string) ?? '',
        data: {
          ...edgeData,
          sourceHandle: newConnection.sourceHandle ?? undefined,
          targetHandle: newConnection.targetHandle ?? undefined,
          routing: hasSpecificHandle ? 'manual' : (edgeData.routing ?? 'auto'),
        },
      };

      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));

      if (onEdgeReconnect) {
        onEdgeReconnect(oldEdge as unknown as CanvasEdge, newConnection, updatedCanvasEdge);
      }
    },
    [onEdgeReconnect],
  );

  const handleDeleteSelected = useCallback(async () => {
    if (isMutatingGraphRef.current) return;
    const curSelectedNodeIds = useCanvasStore.getState().selectedNodeIds;
    const curSelectedEdgeIds = useCanvasStore.getState().selectedEdgeIds;

    if (curSelectedNodeIds.length === 0 && curSelectedEdgeIds.length === 0) return;

    for (const nodeId of curSelectedNodeIds) {
      const nodeToDelete = nodes.find((n) => n.id === nodeId);
      if (!nodeToDelete) continue;
      const connectedEdges: CanvasEdge[] = edges
        .filter((e) => e.source === nodeId || e.target === nodeId)
        .map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          label: typeof e.label === 'string' ? e.label : undefined,
          animated: e.animated,
          data: e.data as Record<string, unknown>,
        }));

      const nodeData = (nodeToDelete.data ?? {}) as Record<string, unknown>;
      const canvasNode: CanvasNode = {
        id: nodeToDelete.id,
        type: nodeToDelete.type ?? 'system',
        position: { x: nodeToDelete.position.x, y: nodeToDelete.position.y },
        data: {
          label: typeof nodeData.label === 'string' ? nodeData.label : nodeToDelete.id,
          ...nodeData,
        },
      };

      const command = new DeleteNodeCommand({
        viewId,
        node: canvasNode,
        connectedEdges,
      });

      if (onCommandDispatched) {
        onCommandDispatched(command);
      }
      await defaultCommandDispatcher.dispatch(command);

      if (onNodeDelete) {
        onNodeDelete(nodeId);
      }
    }

    setNodes((nds) => nds.filter((n) => !curSelectedNodeIds.includes(n.id)));
    setEdges((eds) =>
      eds.filter(
        (e) =>
          !curSelectedEdgeIds.includes(e.id) &&
          !curSelectedNodeIds.includes(e.source) &&
          !curSelectedNodeIds.includes(e.target),
      ),
    );

    useCanvasStore.getState().clearSelection();
    if (onNodeSelect) {
      onNodeSelect(null);
    }
  }, [nodes, edges, viewId, onCommandDispatched, onNodeSelect, onNodeDelete]);

  const handleSelectTemplate = useCallback(
    (templateId: TemplateId) => {
      let objectCounter = 0;
      let connectionCounter = 0;
      const instantiated = instantiateTemplate({
        templateId,
        architectureId: 'arch-studio' as ArchitectureId,
        versionId: 'v1' as VersionId,
        createObjectId: () => `obj-${++objectCounter}-${Date.now().toString(36)}` as ObjectId,
        createConnectionId: () => `conn-${++connectionCounter}-${Date.now().toString(36)}` as ConnectionId,
      });

      const { nodes: projectedNodes, edges: projectedEdges } = projectViewModelToCanvas({
        objects: instantiated.objects,
        connections: instantiated.connections.map((c) => ({
          id: c.id,
          sourceId: c.sourceObjectId,
          targetId: c.targetObjectId,
          kind: c.kind,
          description: c.description,
        })),
      });

      const layoutNodes = projectedNodes.map(toAlignableNode);
      const layoutEdges: LayoutEdge[] = projectedEdges.map((e) => ({
        source: e.source,
        target: e.target,
      }));

      let positions: CanvasPosition[] = [];
      try {
        positions = applyLayout(layoutNodes, layoutEdges, 'layered');
      } catch {
        // Fallback to existing positions
      }

      const positionById = new Map(layoutNodes.map((n, i) => [n.id, positions[i] ?? n.position]));

      const laidOutNodes: CanvasNode[] = projectedNodes.map((n) => ({
        ...n,
        position: positionById.get(n.id) ?? n.position,
      }));

      setNodes(laidOutNodes.map(toFlowNode));
      setEdges(projectedEdges.map(toFlowEdge));
      useCanvasStore.getState().clearSelection();
      setIsTemplatePickerOpen(false);
      setTimeout(() => {
        try {
          reactFlow.fitView({ padding: 0.2, duration: 300 });
        } catch {
          // ignore
        }
      }, 50);
    },
    [reactFlow],
  );

  useEffect(() => {
    setNodes((currentNodes) => {
      const currentMap = new Map(currentNodes.map((n) => [n.id, n]));
      const newInitialMap = new Map<string, { x: number; y: number }>();

      const updatedNodes = initialNodes.map((node) => {
        newInitialMap.set(node.id, { x: node.position.x, y: node.position.y });
        const existing = currentMap.get(node.id);
        const flowNode = toFlowNode(node);
        if (existing) {
          const isSelected =
            node.selected ??
            (propSelectedNodeIds ? propSelectedNodeIds.includes(node.id) : existing.selected);

          const prevInitialPos = prevInitialPositionsRef.current.get(node.id);
          const positionChangedByParent =
            !prevInitialPos ||
            prevInitialPos.x !== node.position.x ||
            prevInitialPos.y !== node.position.y;

          const position = positionChangedByParent
            ? node.position
            : (existing.position ?? node.position);

          return {
            ...existing,
            ...flowNode,
            selected: isSelected,
            position,
            data: { ...existing.data, ...flowNode.data },
          };
        }
        return flowNode;
      });

      prevInitialPositionsRef.current = newInitialMap;
      return updatedNodes;
    });
  }, [initialNodes, propSelectedNodeIds]);

  useEffect(() => {
    setEdges((currentEdges) => {
      const currentMap = new Map(currentEdges.map((e) => [e.id, e]));
      return initialEdges.map((edge) => {
        const existing = currentMap.get(edge.id);
        const flowEdge = toFlowEdge(edge);
        if (existing) {
          const isSelected =
            edge.selected ??
            (propSelectedEdgeIds ? propSelectedEdgeIds.includes(edge.id) : existing.selected);

          return {
            ...existing,
            ...flowEdge,
            selected: isSelected,
            data: { ...existing.data, ...flowEdge.data },
          };
        }
        return flowEdge;
      });
    });
  }, [initialEdges, propSelectedEdgeIds]);

  // Keyboard shortcut listener: Space for pan, 'F' for fit-to-content, Escape for clearing selection, Delete/Backspace for removal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextInput(document.activeElement)) return;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isMod = isMac ? event.metaKey : event.ctrlKey;
      if (isMod && !event.shiftKey && (event.key === 'z' || event.key === 'Z')) {
        event.preventDefault();
        void handleUndo();
      } else if (
        (isMod && event.shiftKey && (event.key === 'z' || event.key === 'Z')) ||
        (!isMac && event.ctrlKey && (event.key === 'y' || event.key === 'Y'))
      ) {
        event.preventDefault();
        void handleRedo();
      } else if (event.code === 'Space' && !event.repeat) {
        useCanvasStore.getState().setIsSpacePanning(true);
      } else if (event.shiftKey && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        handleToggleFullscreen();
      } else if (event.altKey && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        useCanvasStore.getState().toggleFocusMode();
      } else if (!event.shiftKey && !event.altKey && !isMod && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        reactFlow.fitView({ padding: 0.2, duration: 250 });
      } else if (!event.shiftKey && !event.altKey && !isMod && (event.key === 'm' || event.key === 'M')) {
        event.preventDefault();
        useCanvasStore.getState().toggleMinimap();
      } else if (
        (event.key === 'Backspace' || event.key === 'Delete') &&
        (useCanvasStore.getState().selectedNodeIds.length > 0 ||
          useCanvasStore.getState().selectedEdgeIds.length > 0)
      ) {
        event.preventDefault();
        void handleDeleteSelected();
      } else if (event.code === 'Escape') {
        event.preventDefault();
        const hasSelection =
          useCanvasStore.getState().selectedNodeIds.length > 0 ||
          useCanvasStore.getState().selectedEdgeIds.length > 0;
        if (hasSelection) {
          useCanvasStore.getState().clearSelection();
          setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
          setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
          if (onNodeSelect) {
            onNodeSelect(null);
          }
        } else if (useCanvasStore.getState().isFocusMode) {
          useCanvasStore.getState().setIsFocusMode(false);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        useCanvasStore.getState().setIsSpacePanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [reactFlow, onNodeSelect, handleUndo, handleRedo, handleToggleFullscreen, handleDeleteSelected]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
      const selectedNodeIds = selectedNodes.map((n) => n.id);
      const selectedEdgeIds = selectedEdges.map((e) => e.id);

      // Prevent dropping selection if the user is currently editing an input or textarea
      if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0 && isTextInput(document.activeElement)) {
        return;
      }

      useCanvasStore.getState().setSelectedNodes(selectedNodeIds);
      useCanvasStore.getState().setSelectedEdges(selectedEdgeIds);

      if (onNodeSelect) {
        onNodeSelect(selectedNodeIds[0] ?? null);
      }
      if (onEdgeSelect) {
        onEdgeSelect(selectedEdgeIds[0] ?? null);
      }
    },
    [onNodeSelect, onEdgeSelect]
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (onEdgeSelect) {
        onEdgeSelect(edge.id);
      }
    },
    [onEdgeSelect]
  );

  const onMoveEnd = useCallback((_event: unknown, viewport: Viewport) => {
    useCanvasStore.getState().setViewport({
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom,
    });
  }, []);

  const onNodeMouseEnter = useCallback((_event: React.MouseEvent, node: Node) => {
    useCanvasStore.getState().setHoveredNode(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    useCanvasStore.getState().setHoveredNode(null);
  }, []);

  const handleZoomIn = () => {
    reactFlow.zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    reactFlow.zoomOut({ duration: 200 });
  };

  const handleFitView = () => {
    reactFlow.fitView({ padding: 0.2, duration: 250 });
  };

  const handleResetZoom = () => {
    reactFlow.zoomTo(DEFAULT_ZOOM, { duration: 200 });
  };

  const onPaneClick = useCallback(() => {
    useCanvasStore.getState().clearSelection();
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
    if (onNodeSelect) {
      onNodeSelect(null);
    }
    if (onEdgeSelect) {
      onEdgeSelect(null);
    }
  }, [onNodeSelect, onEdgeSelect]);

  return (
    <div
      ref={containerRef}
      data-testid="infinite-canvas-container"
      className={`w-full h-full relative bg-slate-950 select-none ${
        isSpacePanning ? 'cursor-grab active:cursor-grabbing' : ''
      } ${className}`}
    >
      {/* Node position indicators for SSR verification & inspection */}
      <div data-testid="canvas-nodes-data" className="hidden" aria-hidden="true">
        {nodes.map((node) => (
          <div
            key={node.id}
            data-testid={`node-pos-${node.id}`}
            data-x={node.position.x}
            data-y={node.position.y}
          >
            {node.id}: ({node.position.x}, {node.position.y})
          </div>
        ))}
      </div>

      <ReactFlow
        nodes={displayedNodes}
        edges={displayedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'icepanel' }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        edgesReconnectable={true}
        onEdgeClick={handleEdgeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        onSelectionChange={onSelectionChange}
        onPaneClick={() => {
          onPaneClick();
          setEditingNodeId(null);
          setEditingEdgeId(null);
        }}
        onMoveEnd={onMoveEnd}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onSelectionDragStop={handleSelectionDragStop}
        selectionMode={'partial' as SelectionMode}
        selectionKeyCode="Shift"
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        selectionOnDrag={isBoxSelectMode}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        panActivationKeyCode="Space"
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
        fitView
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls
          className="bg-slate-800 border-slate-700 text-slate-200"
          showInteractive={false}
        />
        {isMinimapVisible && (
          <div data-testid="minimap">
            <MiniMap
              className="bg-slate-900 border border-slate-800 rounded shadow-md"
              nodeColor={getMiniMapNodeColor}
              nodeStrokeWidth={2}
              maskColor="rgba(15, 23, 42, 0.7)"
              pannable
              zoomable
            />
          </div>
        )}

        {/* Top-Center Shape Palette & Inserter Toolbar */}
        {showPalette && (
          <Panel position="top-center" className="m-3">
            <ShapePalette
              onAddShape={handleAddNode}
              onOpenTemplates={showTemplatePicker ? () => setIsTemplatePickerOpen(true) : undefined}
              onDeleteSelected={handleDeleteSelected}
              hasSelection={totalSelected > 0}
              disabled={isMutatingGraph}
            />
          </Panel>
        )}

        {/* Active Mode & Selection Indicators */}
        {(isSpacePanning || isFocusMode || totalSelected > 0) ? (
          <Panel position="top-left" className="m-3">
            <div
              data-testid="canvas-status-badge"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-900/90 border border-slate-700/80 shadow-md backdrop-blur-sm text-xs font-mono text-slate-300"
            >
              {isSpacePanning && (
                <span
                  data-testid="pan-mode-indicator"
                  className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px]"
                >
                  PAN MODE (SPACE)
                </span>
              )}
              {isFocusMode && (
                <span
                  data-testid="focus-mode-badge"
                  className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]"
                >
                  FOCUS MODE {selectedNodeIds.length > 0 ? `(${selectedNodeIds.length} ISOLATED)` : '(SELECT TO ISOLATE)'}
                </span>
              )}
              {totalSelected > 1 && (
                <span
                  data-testid="multi-selection-badge"
                  className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/40 text-[10px]"
                >
                  MULTI-SELECT ({selectedNodeIds.length} OBJECTS)
                </span>
              )}
              {totalSelected === 1 && (
                <span
                  data-testid="selection-badge"
                  className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px]"
                >
                  1 SELECTED (ESC TO CLEAR)
                </span>
              )}
            </div>
          </Panel>
        ) : (
          <div data-testid="canvas-status-badge" className="hidden" aria-hidden="true" />
        )}

        {/* Top-Right Pan & Zoom Controls Toolbar */}
        <Panel position="top-right" className="m-3">
          <div
            data-testid="pan-zoom-toolbar"
            className="flex items-center gap-1 p-1 rounded-md bg-slate-900/90 border border-slate-700/80 shadow-md backdrop-blur-sm text-xs text-slate-200"
          >
            <button
              type="button"
              data-testid="zoom-out-btn"
              onClick={handleZoomOut}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Zoom Out (-)"
            >
              −
            </button>
            <button
              type="button"
              data-testid="reset-zoom-btn"
              onClick={handleResetZoom}
              className="px-2 h-7 flex items-center justify-center rounded hover:bg-slate-800 font-mono text-xs text-slate-300 hover:text-white transition-colors"
              title="Reset Zoom to 100%"
            >
              {Math.round(currentZoom * 100)}%
            </button>
            <button
              type="button"
              data-testid="zoom-in-btn"
              onClick={handleZoomIn}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Zoom In (+)"
            >
              +
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5" />
            <button
              type="button"
              data-testid="undo-btn"
              onClick={handleUndo}
              disabled={!canUndo || isMutatingGraph}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white transition-colors"
              title="Undo (Cmd+Z)"
            >
              ↶
            </button>
            <button
              type="button"
              data-testid="redo-btn"
              onClick={handleRedo}
              disabled={!canRedo || isMutatingGraph}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white transition-colors"
              title="Redo (Cmd+Shift+Z)"
            >
              ↷
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5" />
            <button
              type="button"
              data-testid="fit-view-btn"
              onClick={handleFitView}
              className="px-2 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition-colors"
              title="Fit to content (F)"
            >
              Fit (F)
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5" />
            <button
              type="button"
              data-testid="box-select-btn"
              onClick={() => useCanvasStore.getState().toggleBoxSelectMode()}
              className={`px-2 h-7 flex items-center justify-center rounded text-[11px] font-medium transition-colors ${
                isBoxSelectMode
                  ? 'bg-violet-600 hover:bg-violet-700 text-white border border-violet-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Toggle Box Select (drag to marquee-select objects)"
            >
              {isBoxSelectMode ? '✦ BOX SELECT' : '⬚ Box Select'}
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5" />
            <button
              type="button"
              data-testid="focus-mode-btn"
              onClick={() => useCanvasStore.getState().toggleFocusMode()}
              className={`px-2 h-7 flex items-center justify-center rounded text-[11px] font-medium transition-colors ${
                isFocusMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Toggle Focus Mode (Alt+F) — isolates selected objects"
            >
              {isFocusMode ? '🎯 Focused' : '🎯 Focus'}
            </button>
            <button
              type="button"
              data-testid="toggle-minimap-btn"
              onClick={() => useCanvasStore.getState().toggleMinimap()}
              className={`px-2 h-7 flex items-center justify-center rounded text-[11px] font-medium transition-colors ${
                isMinimapVisible
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-slate-800/50 hover:bg-slate-700 text-slate-500 hover:text-slate-300 line-through'
              }`}
              title="Toggle Minimap (M)"
            >
              🗺 Map
            </button>
            <button
              type="button"
              data-testid="fullscreen-btn"
              onClick={handleToggleFullscreen}
              className={`w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors ${
                isFullscreen ? 'text-blue-400 bg-slate-800' : ''
              }`}
              title={isFullscreen ? 'Exit Fullscreen (Shift+F)' : 'Fullscreen (Shift+F)'}
            >
              {isFullscreen ? '⤓' : '⤢'}
            </button>
            {totalSelected > 0 && (
              <>
                <div className="w-px h-4 bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  data-testid="clear-selection-btn"
                  onClick={onPaneClick}
                  className="px-2 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px]"
                  title="Deselect All (Esc)"
                >
                  Clear ({totalSelected})
                </button>
              </>
            )}
          </div>
        </Panel>

        {/* Bottom-Center Alignment Toolbar — shown for multi-selection (F014) */}
        {selectedNodeIds.length > 1 && (
          <Panel position="bottom-center" className="mb-3">
            <AlignmentToolbar
              onAlign={handleAlign}
              onDistribute={handleDistribute}
              canDistribute={selectedNodeIds.length >= 3}
              disabled={isMutatingGraph}
              snapEnabled={isSnapToGridEnabled}
              onToggleSnap={() => useCanvasStore.getState().toggleSnapToGrid()}
            />
          </Panel>
        )}

        {/* Bottom-Left Auto-Layout Menu — always available, whole-graph (F015) */}
        {nodes.length > 1 && (
          <Panel position="bottom-left" className="m-3">
            <LayoutMenu
              engines={listLayoutEngines()}
              onApply={handleApplyLayout}
              disabled={isMutatingGraph}
            />
          </Panel>
        )}
      </ReactFlow>

      {/* Template Picker Modal Overlay */}
      {isTemplatePickerOpen && (
        <div
          data-testid="template-modal-overlay"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsTemplatePickerOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] h-[600px] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <TemplatePanel
              onSelectTemplate={handleSelectTemplate}
              onClose={() => setIsTemplatePickerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Interactive infinite canvas powered by React Flow (ADR-0002).
 * Wrapped in ReactFlowProvider to enable full viewport/zoom control.
 */
export function InfiniteCanvas(props: InfiniteCanvasProps): JSX.Element {
  return (
    <ReactFlowProvider>
      <InfiniteCanvasContent {...props} />
    </ReactFlowProvider>
  );
}

export default InfiniteCanvas;
