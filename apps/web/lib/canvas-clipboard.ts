import type { Node, Edge } from '@xyflow/react';

export interface CanvasClipboardData {
  nodes: Node[];
  edges: Edge[];
}

let inMemoryClipboard: CanvasClipboardData | null = null;

/**
 * Stores the given nodes and internal edges into the in-app canvas clipboard.
 */
export function setCanvasClipboard(data: CanvasClipboardData): void {
  inMemoryClipboard = {
    nodes: data.nodes.map((n) => ({
      ...n,
      position: { ...n.position },
      data: n.data ? { ...n.data } : {},
    })),
    edges: data.edges.map((e) => ({
      ...e,
      data: e.data ? { ...e.data } : undefined,
    })),
  };
}

/**
 * Retrieves the current contents of the in-app canvas clipboard.
 */
export function getCanvasClipboard(): CanvasClipboardData | null {
  if (!inMemoryClipboard) return null;
  return {
    nodes: inMemoryClipboard.nodes.map((n) => ({
      ...n,
      position: { ...n.position },
      data: n.data ? { ...n.data } : {},
    })),
    edges: inMemoryClipboard.edges.map((e) => ({
      ...e,
      data: e.data ? { ...e.data } : undefined,
    })),
  };
}

/**
 * Clears the in-app canvas clipboard.
 */
export function clearCanvasClipboard(): void {
  inMemoryClipboard = null;
}
