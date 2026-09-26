'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
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
import { useCanvasStore } from '../../lib/canvas-store';
import { nodeTypes } from './custom-nodes';

export interface InfiniteCanvasProps {
  initialNodes?: CanvasNode[];
  initialEdges?: CanvasEdge[];
  onNodeSelect?: (nodeId: string | null) => void;
  className?: string;
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

/**
 * Interactive infinite canvas powered by React Flow (ADR-0002).
 * Model projections are rendered as nodes/edges, keeping transient
 * interaction state isolated in useCanvasStore without storing domain entities.
 */
export function InfiniteCanvas({
  initialNodes = [],
  initialEdges = [],
  onNodeSelect,
  className = '',
}: InfiniteCanvasProps): JSX.Element {
  const [nodes, setNodes] = useState<Node[]>(() => initialNodes.map(toFlowNode));
  const [edges, setEdges] = useState<Edge[]>(() => initialEdges.map(toFlowEdge));

  useEffect(() => {
    setNodes(initialNodes.map(toFlowNode));
  }, [initialNodes]);

  useEffect(() => {
    setEdges(initialEdges.map(toFlowEdge));
  }, [initialEdges]);

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

  return (
    <div
      data-testid="infinite-canvas-container"
      className={`w-full h-full relative bg-slate-950 ${className}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onMoveEnd={onMoveEnd}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        fitView
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="bg-slate-800 border-slate-700 text-slate-200" />
        <MiniMap
          className="bg-slate-900 border border-slate-800 rounded"
          nodeColor="#64748b"
        />
        <Panel position="top-left" className="m-3">
          <div
            data-testid="canvas-status-badge"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/90 border border-slate-700/80 shadow-md backdrop-blur-sm text-xs font-mono text-slate-300"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Infinite Canvas — React Flow Renderer (ADR-0002)</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default InfiniteCanvas;
