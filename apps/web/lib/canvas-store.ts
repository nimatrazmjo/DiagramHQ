import { create } from 'zustand';
import type { CanvasViewport } from '@diagramhq/domain';

/**
 * Transient UI store for infinite canvas interactions (ADR-0002).
 * Strictly conforms to Layer Boundaries Rule 4:
 * Canvas holds no domain model entities in Zustand.
 * Only viewport, transient selection, and hover state are managed here.
 */
export interface CanvasStoreState {
  viewport: CanvasViewport;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  hoveredNodeId: string | null;

  setViewport: (viewport: CanvasViewport) => void;
  setSelectedNodes: (ids: string[]) => void;
  setSelectedEdges: (ids: string[]) => void;
  clearSelection: () => void;
  setHoveredNode: (id: string | null) => void;
}

export const useCanvasStore = create<CanvasStoreState>((set) => ({
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeIds: [],
  selectedEdgeIds: [],
  hoveredNodeId: null,

  setViewport: (viewport: CanvasViewport) => set({ viewport }),
  setSelectedNodes: (ids: string[]) => set({ selectedNodeIds: ids }),
  setSelectedEdges: (ids: string[]) => set({ selectedEdgeIds: ids }),
  clearSelection: () => set({ selectedNodeIds: [], selectedEdgeIds: [] }),
  setHoveredNode: (id: string | null) => set({ hoveredNodeId: id }),
}));
