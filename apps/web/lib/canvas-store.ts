import { create } from 'zustand';
import type { CanvasViewport } from '@diagramhq/domain';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4.0;
export const DEFAULT_ZOOM = 1.0;

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(zoom * 100) / 100));
}

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
  isSpacePanning: boolean;
  isBoxSelectMode: boolean;
  isSnapToGridEnabled: boolean;

  setViewport: (viewport: CanvasViewport) => void;
  setSelectedNodes: (ids: string[]) => void;
  setSelectedEdges: (ids: string[]) => void;
  selectNode: (id: string, multi?: boolean) => void;
  selectEdge: (id: string, multi?: boolean) => void;
  toggleNodeSelection: (id: string) => void;
  toggleEdgeSelection: (id: string) => void;
  isNodeSelected: (id: string) => boolean;
  isEdgeSelected: (id: string) => boolean;
  clearSelection: () => void;
  setHoveredNode: (id: string | null) => void;
  setIsSpacePanning: (isPanning: boolean) => void;
  toggleBoxSelectMode: () => void;
  setBoxSelectMode: (enabled: boolean) => void;
  toggleSnapToGrid: () => void;
  setSnapToGrid: (enabled: boolean) => void;
  zoomIn: (step?: number) => void;
  zoomOut: (step?: number) => void;
  resetZoom: () => void;
}

export const useCanvasStore = create<CanvasStoreState>((set, get) => ({
  viewport: { x: 0, y: 0, zoom: DEFAULT_ZOOM },
  selectedNodeIds: [],
  selectedEdgeIds: [],
  hoveredNodeId: null,
  isSpacePanning: false,
  isBoxSelectMode: false,
  isSnapToGridEnabled: false,

  setViewport: (viewport: CanvasViewport) =>
    set({
      viewport: {
        x: viewport.x,
        y: viewport.y,
        zoom: clampZoom(viewport.zoom),
      },
    }),
  setSelectedNodes: (ids: string[]) => set({ selectedNodeIds: ids }),
  setSelectedEdges: (ids: string[]) => set({ selectedEdgeIds: ids }),

  selectNode: (id: string, multi = false) =>
    set((state) => {
      if (multi) {
        const exists = state.selectedNodeIds.includes(id);
        return {
          selectedNodeIds: exists
            ? state.selectedNodeIds.filter((nodeId) => nodeId !== id)
            : [...state.selectedNodeIds, id],
        };
      }
      return { selectedNodeIds: [id], selectedEdgeIds: [] };
    }),

  selectEdge: (id: string, multi = false) =>
    set((state) => {
      if (multi) {
        const exists = state.selectedEdgeIds.includes(id);
        return {
          selectedEdgeIds: exists
            ? state.selectedEdgeIds.filter((edgeId) => edgeId !== id)
            : [...state.selectedEdgeIds, id],
        };
      }
      return { selectedEdgeIds: [id], selectedNodeIds: [] };
    }),

  isNodeSelected: (id: string) => get().selectedNodeIds.includes(id),
  isEdgeSelected: (id: string) => get().selectedEdgeIds.includes(id),

  toggleNodeSelection: (id: string) =>
    set((state) => {
      const exists = state.selectedNodeIds.includes(id);
      return {
        selectedNodeIds: exists
          ? state.selectedNodeIds.filter((nodeId) => nodeId !== id)
          : [...state.selectedNodeIds, id],
      };
    }),

  toggleEdgeSelection: (id: string) =>
    set((state) => {
      const exists = state.selectedEdgeIds.includes(id);
      return {
        selectedEdgeIds: exists
          ? state.selectedEdgeIds.filter((edgeId) => edgeId !== id)
          : [...state.selectedEdgeIds, id],
      };
    }),

  clearSelection: () => set({ selectedNodeIds: [], selectedEdgeIds: [] }),
  setHoveredNode: (id: string | null) => set({ hoveredNodeId: id }),
  setIsSpacePanning: (isPanning: boolean) => set({ isSpacePanning: isPanning }),
  toggleBoxSelectMode: () =>
    set((state) => ({ isBoxSelectMode: !state.isBoxSelectMode })),
  setBoxSelectMode: (enabled: boolean) => set({ isBoxSelectMode: enabled }),
  toggleSnapToGrid: () =>
    set((state) => ({ isSnapToGridEnabled: !state.isSnapToGridEnabled })),
  setSnapToGrid: (enabled: boolean) => set({ isSnapToGridEnabled: enabled }),

  zoomIn: (step = 0.2) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: clampZoom(state.viewport.zoom + step),
      },
    })),

  zoomOut: (step = 0.2) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: clampZoom(state.viewport.zoom - step),
      },
    })),

  resetZoom: () =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: DEFAULT_ZOOM,
      },
    })),
}));
