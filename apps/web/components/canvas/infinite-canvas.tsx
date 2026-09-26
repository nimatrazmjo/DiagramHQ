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
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Viewport,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CanvasEdge, CanvasNode } from '@diagramhq/domain';
import {
  useCanvasStore,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from '../../lib/canvas-store';
import {
  MoveNodeCommand,
  defaultCommandDispatcher,
  type Command,
} from '../../lib/commands';
import { nodeTypes } from './custom-nodes';

export interface InfiniteCanvasProps {
  initialNodes?: CanvasNode[];
  initialEdges?: CanvasEdge[];
  onNodeSelect?: (nodeId: string | null) => void;
  isSpacePanning?: boolean;
  selectedNodeIds?: string[];
  selectedEdgeIds?: string[];
  className?: string;
  viewId?: string;
  onNodeDragStop?: (nodeId: string, position: { x: number; y: number }) => void;
  onCommandDispatched?: (command: Command) => void;
  persistFn?: (viewId: string, objectId: string, position: { x: number; y: number }) => Promise<void>;
  dragStopHandlerRef?: React.MutableRefObject<((event: unknown, node: Node) => void) | null>;
  onDragStopReady?: (handler: (event: unknown, node: Node) => void) => void;
}

export interface NodeDragStopHandlerOptions {
  getNodes: () => Node[];
  viewId?: string;
  persistFn?: (viewId: string, objectId: string, position: { x: number; y: number }) => Promise<void>;
  onCommandDispatched?: (command: Command) => void;
  onNodeDragStop?: (nodeId: string, position: { x: number; y: number }) => void;
  onPositionChange?: (nodeId: string, position: { x: number; y: number }) => void;
  dragStartPositions?: Map<string, { x: number; y: number }>;
}

export function createNodeDragStopHandler({
  getNodes,
  viewId,
  persistFn,
  onCommandDispatched,
  onNodeDragStop,
  onPositionChange,
  dragStartPositions,
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

    const newPosition = { x: node.position.x, y: node.position.y };

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
    type: edge.type ?? 'default',
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
  isSpacePanning: propIsSpacePanning,
  selectedNodeIds: propSelectedNodeIds,
  selectedEdgeIds: propSelectedEdgeIds,
  className = '',
  viewId,
  onNodeDragStop,
  onCommandDispatched,
  persistFn,
  dragStopHandlerRef,
  onDragStopReady,
}: InfiniteCanvasProps): JSX.Element {
  const [nodes, setNodes] = useState<Node[]>(() => initialNodes.map(toFlowNode));
  const [edges, setEdges] = useState<Edge[]>(() => initialEdges.map(toFlowEdge));
  const storeIsSpacePanning = useCanvasStore((s) => s.isSpacePanning);
  const isSpacePanning = propIsSpacePanning ?? storeIsSpacePanning;
  const storeSelectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const storeSelectedEdgeIds = useCanvasStore((s) => s.selectedEdgeIds);
  const selectedNodeIds = propSelectedNodeIds ?? storeSelectedNodeIds;
  const selectedEdgeIds = propSelectedEdgeIds ?? storeSelectedEdgeIds;
  const totalSelected = selectedNodeIds.length + selectedEdgeIds.length;
  const currentZoom = useCanvasStore((s) => s.viewport.zoom);
  const reactFlow = useReactFlow();

  const dragStartPositions = React.useRef<Map<string, { x: number; y: number }>>(new Map());

  const handleNodeDragStart = useCallback((_event: unknown, node: Node) => {
    const currentInState = nodes.find((n) => n.id === node.id);
    dragStartPositions.current.set(node.id, {
      x: currentInState ? currentInState.position.x : node.position.x,
      y: currentInState ? currentInState.position.y : node.position.y,
    });
  }, [nodes]);

  const handleNodeDragStop = useCallback(
    createNodeDragStopHandler({
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
    }),
    [nodes, viewId, persistFn, onCommandDispatched, onNodeDragStop]
  );

  if (dragStopHandlerRef) {
    dragStopHandlerRef.current = handleNodeDragStop;
  }
  if (onDragStopReady) {
    onDragStopReady(handleNodeDragStop);
  }

  useEffect(() => {
    setNodes(initialNodes.map(toFlowNode));
  }, [initialNodes]);

  useEffect(() => {
    setEdges(initialEdges.map(toFlowEdge));
  }, [initialEdges]);

  // Keyboard shortcut listener: Space for pan, 'F' for fit-to-content, Escape for clearing selection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextInput(document.activeElement)) return;

      if (event.code === 'Space' && !event.repeat) {
        useCanvasStore.getState().setIsSpacePanning(true);
      } else if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        reactFlow.fitView({ padding: 0.2, duration: 250 });
      } else if (event.code === 'Escape') {
        event.preventDefault();
        useCanvasStore.getState().clearSelection();
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
        setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
        if (onNodeSelect) {
          onNodeSelect(null);
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
  }, [reactFlow, onNodeSelect]);

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

      useCanvasStore.getState().setSelectedNodes(selectedNodeIds);
      useCanvasStore.getState().setSelectedEdges(selectedEdgeIds);

      if (onNodeSelect) {
        onNodeSelect(selectedNodeIds[0] ?? null);
      }
    },
    [onNodeSelect]
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
  }, [onNodeSelect]);

  return (
    <div
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
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onPaneClick={onPaneClick}
        onMoveEnd={onMoveEnd}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
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
        <MiniMap
          className="bg-slate-900 border border-slate-800 rounded"
          nodeColor="#64748b"
        />

        {/* Top-Left Canvas Badge */}
        <Panel position="top-left" className="m-3">
          <div
            data-testid="canvas-status-badge"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/90 border border-slate-700/80 shadow-md backdrop-blur-sm text-xs font-mono text-slate-300"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Infinite Canvas — React Flow Renderer (ADR-0002)</span>
            {isSpacePanning && (
              <span
                data-testid="pan-mode-indicator"
                className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px]"
              >
                PAN MODE (SPACE)
              </span>
            )}
            {totalSelected > 0 && (
              <span
                data-testid="selection-badge"
                className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px]"
              >
                {totalSelected} SELECTED (ESC TO CLEAR)
              </span>
            )}
          </div>
        </Panel>

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
              data-testid="fit-view-btn"
              onClick={handleFitView}
              className="px-2 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition-colors"
              title="Fit to content (F)"
            >
              Fit (F)
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
      </ReactFlow>
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
