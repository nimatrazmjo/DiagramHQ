import type {
  CanvasEdge,
  CanvasInteractionHandler,
  CanvasNode,
  CanvasRenderer,
  CanvasViewport,
} from '@diagramhq/domain';

export interface ReactFlowInstanceBridge {
  setViewport?: (viewport: CanvasViewport) => void;
  getViewport?: () => CanvasViewport;
  fitView?: () => void;
}

/**
 * Concrete implementation of framework-agnostic CanvasRenderer adapting React Flow
 * (ADR-0002, MODULES.md §7).
 * Encapsulates mounting, rendering, viewport management, and interaction handling.
 */
export class ReactFlowCanvasRenderer implements CanvasRenderer<HTMLElement> {
  readonly name: string = 'react-flow';

  private container: HTMLElement | null = null;
  private nodes: CanvasNode[] = [];
  private edges: CanvasEdge[] = [];
  private viewport: CanvasViewport = { x: 0, y: 0, zoom: 1 };
  private interactionHandler: CanvasInteractionHandler | null = null;
  private bridge: ReactFlowInstanceBridge | null = null;
  private renderListeners: Set<(nodes: CanvasNode[], edges: CanvasEdge[]) => void> = new Set();
  private viewportListeners: Set<(viewport: CanvasViewport) => void> = new Set();

  mount(container: HTMLElement): void {
    this.container = container;
  }

  unmount(): void {
    this.container = null;
    this.bridge = null;
    this.renderListeners.clear();
    this.viewportListeners.clear();
  }

  render(nodes: CanvasNode[], edges: CanvasEdge[]): void {
    this.nodes = [...nodes];
    this.edges = [...edges];
    for (const listener of this.renderListeners) {
      listener(this.nodes, this.edges);
    }
  }

  setViewport(viewport: CanvasViewport): void {
    this.viewport = { ...viewport };
    if (this.bridge?.setViewport) {
      this.bridge.setViewport(this.viewport);
    }
    for (const listener of this.viewportListeners) {
      listener(this.viewport);
    }
    if (this.interactionHandler?.onViewportChange) {
      this.interactionHandler.onViewportChange(this.viewport);
    }
  }

  getViewport(): CanvasViewport {
    if (this.bridge?.getViewport) {
      return this.bridge.getViewport();
    }
    return { ...this.viewport };
  }

  fitView(): void {
    if (this.bridge?.fitView) {
      this.bridge.fitView();
    }
  }

  setInteractionHandler(handler: CanvasInteractionHandler): void {
    this.interactionHandler = handler;
  }

  getInteractionHandler(): CanvasInteractionHandler | null {
    return this.interactionHandler;
  }

  getNodes(): CanvasNode[] {
    return [...this.nodes];
  }

  getEdges(): CanvasEdge[] {
    return [...this.edges];
  }

  getContainer(): HTMLElement | null {
    return this.container;
  }

  isMounted(): boolean {
    return this.container !== null;
  }

  attachBridge(bridge: ReactFlowInstanceBridge): void {
    this.bridge = bridge;
  }

  onRender(listener: (nodes: CanvasNode[], edges: CanvasEdge[]) => void): () => void {
    this.renderListeners.add(listener);
    return () => {
      this.renderListeners.delete(listener);
    };
  }

  onViewportChange(listener: (viewport: CanvasViewport) => void): () => void {
    this.viewportListeners.add(listener);
    return () => {
      this.viewportListeners.delete(listener);
    };
  }
}
