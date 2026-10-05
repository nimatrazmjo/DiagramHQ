import type { CanvasEdge, CanvasNode } from '@diagramhq/domain';
import type { Node, Edge } from '@xyflow/react';
import type { Command, StateSetFn } from './command';

export interface DuplicateSelectionCommandParams {
  viewId?: string;
  nodes: CanvasNode[];
  edges?: CanvasEdge[];
  persistCreateFn?: (viewId: string, nodes: CanvasNode[], edges: CanvasEdge[]) => Promise<void>;
  persistDeleteFn?: (viewId: string, nodeIds: string[], edgeIds: string[]) => Promise<void>;
}

export class DuplicateSelectionCommand implements Command<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> {
  readonly id: string;
  readonly name = 'DuplicateSelection';

  constructor(public readonly params: DuplicateSelectionCommandParams) {
    this.id = `duplicate-selection-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async execute(): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> {
    if (this.params.persistCreateFn && this.params.viewId) {
      await this.params.persistCreateFn(this.params.viewId, this.params.nodes, this.params.edges ?? []);
    }
    return { nodes: this.params.nodes, edges: this.params.edges ?? [] };
  }

  async undo(): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> {
    if (this.params.persistDeleteFn && this.params.viewId) {
      const nodeIds = this.params.nodes.map((n) => n.id);
      const edgeIds = (this.params.edges ?? []).map((e) => e.id);
      await this.params.persistDeleteFn(this.params.viewId, nodeIds, edgeIds);
    }
    return { nodes: this.params.nodes, edges: this.params.edges ?? [] };
  }

  applyCanvasUpdate(
    setNodes: StateSetFn<Node>,
    setEdges: StateSetFn<Edge>,
    mode: 'execute' | 'undo',
  ): void {
    if (mode === 'undo') {
      const nodeIds = new Set(this.params.nodes.map((n) => n.id));
      const edgeIds = new Set((this.params.edges ?? []).map((e) => e.id));
      setNodes((nds) => nds.filter((n) => !nodeIds.has(n.id)));
      setEdges((eds) => eds.filter((e) => !edgeIds.has(e.id)));
    } else {
      setNodes((nds) => {
        const existing = new Set(nds.map((n) => n.id));
        const toAdd = this.params.nodes
          .filter((n) => !existing.has(n.id))
          .map((n) => ({
            id: n.id,
            type: n.type,
            position: { ...n.position },
            data: { ...n.data },
            ...(n.width != null ? { width: n.width } : {}),
            ...(n.height != null ? { height: n.height } : {}),
          }));
        return [...nds, ...toAdd];
      });
      if (this.params.edges && this.params.edges.length > 0) {
        setEdges((eds) => {
          const existing = new Set(eds.map((e) => e.id));
          const toAdd = this.params.edges!
            .filter((e) => !existing.has(e.id))
            .map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              type: e.type ?? 'icepanel',
              label: e.label,
              animated: e.animated,
              data: e.data ? { ...e.data } : undefined,
            }));
          return [...eds, ...toAdd];
        });
      }
    }
  }
}
