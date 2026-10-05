'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { ShapeKind } from './shape-palette';

export type ContextMenuType = 'node' | 'edge' | 'pane';

export interface ContextMenuState {
  type: ContextMenuType;
  x: number;
  y: number;
  flowX?: number;
  flowY?: number;
  node?: Node;
  edge?: Edge;
}

export interface CanvasContextMenuProps {
  menu: ContextMenuState | null;
  onClose: () => void;

  // Node actions
  onRenameNode?: (node: Node) => void;
  onDuplicateNode?: (node: Node) => void;
  onDeleteNode?: (node: Node) => void;
  onAddConnection?: (node: Node) => void;
  onAddToView?: (node: Node) => void;
  onDrillIn?: (node: Node) => void;

  // Edge actions
  onEditEdgeLabel?: (edge: Edge) => void;
  onReverseEdge?: (edge: Edge) => void;
  onDeleteEdge?: (edge: Edge) => void;

  // Pane actions
  onAddObject?: (kind: ShapeKind, position: { x: number; y: number }) => void;
  onPaste?: (position: { x: number; y: number }) => void;
  onSelectAll?: () => void;
  onFitView?: () => void;
  onAutoLayout?: () => void;
  canPaste?: boolean;
}

const OBJECT_KINDS: Array<{ kind: ShapeKind; label: string; icon: string }> = [
  { kind: 'application', label: 'Application Service', icon: 'app' },
  { kind: 'system', label: 'System Boundary', icon: 'system' },
  { kind: 'database', label: 'Database / Store', icon: 'db' },
  { kind: 'queue', label: 'Message Queue', icon: 'queue' },
  { kind: 'component', label: 'Component', icon: 'component' },
  { kind: 'person', label: 'User / Actor', icon: 'person' },
  { kind: 'group', label: 'Boundary Group', icon: 'group' },
];

/**
 * CanvasContextMenu renders a contextual right-click menu for nodes, edges, or the canvas pane.
 * It is keyboard-dismissible (Esc), closes on outside clicks or action clicks,
 * and clamps within viewport boundaries.
 */
export function CanvasContextMenu({
  menu,
  onClose,
  onRenameNode,
  onDuplicateNode,
  onDeleteNode,
  onAddConnection,
  onAddToView,
  onDrillIn,
  onEditEdgeLabel,
  onReverseEdge,
  onDeleteEdge,
  onAddObject,
  onPaste,
  onSelectAll,
  onFitView,
  onAutoLayout,
  canPaste = false,
}: CanvasContextMenuProps): JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number }>({
    x: menu?.x ?? 0,
    y: menu?.y ?? 0,
  });
  const [isAddSubmenuOpen, setIsAddSubmenuOpen] = useState(false);

  // Position adjustment and viewport boundary clamping
  useEffect(() => {
    if (!menu) return;
    const padding = 12;
    let targetX = menu.x;
    let targetY = menu.y;

    if (typeof window !== 'undefined') {
      const menuWidth = menuRef.current?.offsetWidth || 220;
      const menuHeight = menuRef.current?.offsetHeight || 260;

      if (targetX + menuWidth > window.innerWidth - padding) {
        targetX = Math.max(padding, window.innerWidth - menuWidth - padding);
      }
      if (targetY + menuHeight > window.innerHeight - padding) {
        targetY = Math.max(padding, window.innerHeight - menuHeight - padding);
      }
    }

    setAdjustedPos({ x: targetX, y: targetY });
  }, [menu]);

  // Keyboard dismiss (Escape) & outside click dismiss
  useEffect(() => {
    if (!menu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as globalThis.Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const nodeLabel =
    menu.node?.data && typeof menu.node.data.label === 'string'
      ? menu.node.data.label
      : menu.node?.id;

  const edgeLabel =
    typeof menu.edge?.label === 'string' && menu.edge.label.trim()
      ? menu.edge.label
      : (menu.edge?.data?.description as string) || 'Connection';

  return (
    <div
      ref={menuRef}
      data-testid="canvas-context-menu"
      style={{
        position: 'fixed',
        left: `${adjustedPos.x}px`,
        top: `${adjustedPos.y}px`,
        zIndex: 9999,
      }}
      className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-xl py-1.5 w-56 text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100 font-sans"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* 1. NODE CONTEXT MENU */}
      {menu.type === 'node' && menu.node && (
        <div data-testid="context-menu-node" className="flex flex-col text-xs">
          <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
            {nodeLabel}
          </div>

          {/* Rename */}
          <button
            type="button"
            data-testid="context-menu-item-rename"
            className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
            onClick={() => {
              onClose();
              if (onRenameNode && menu.node) onRenameNode(menu.node);
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Rename
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Enter</span>
          </button>

          {/* Duplicate */}
          <button
            type="button"
            data-testid="context-menu-item-duplicate"
            className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
            onClick={() => {
              onClose();
              if (onDuplicateNode && menu.node) onDuplicateNode(menu.node);
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Duplicate
            </span>
            <span className="text-[10px] text-slate-400 font-mono">⌘D</span>
          </button>

          {/* Add Connection */}
          <button
            type="button"
            data-testid="context-menu-item-add-connection"
            className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
            onClick={() => {
              onClose();
              if (onAddConnection && menu.node) onAddConnection(menu.node);
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
              Add connection
            </span>
            <span className="text-[10px] text-slate-400 font-mono">C</span>
          </button>

          {/* Add to View */}
          <button
            type="button"
            data-testid="context-menu-item-add-to-view"
            className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
            onClick={() => {
              onClose();
              if (onAddToView && menu.node) onAddToView(menu.node);
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Add to view
            </span>
          </button>

          {/* Drill in */}
          <button
            type="button"
            data-testid="context-menu-item-drill-in"
            className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
            onClick={() => {
              onClose();
              if (onDrillIn && menu.node) onDrillIn(menu.node);
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              Drill in
            </span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          {/* Delete */}
          <button
            type="button"
            data-testid="context-menu-item-delete"
            className="flex items-center justify-between px-3 py-1.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors text-left"
            onClick={() => {
              onClose();
              if (onDeleteNode && menu.node) onDeleteNode(menu.node);
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Delete
            </span>
            <span className="text-[10px] text-rose-400/80 font-mono">⌫</span>
          </button>
        </div>
      )}

      {/* 2. EDGE CONTEXT MENU */}
      {menu.type === 'edge' && menu.edge && (
        <div data-testid="context-menu-edge" className="flex flex-col text-xs">
          <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
            {edgeLabel}
          </div>

          {/* Edit Label */}
          <button
            type="button"
            data-testid="context-menu-item-edit-label"
            className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
            onClick={() => {
              onClose();
              if (onEditEdgeLabel && menu.edge) onEditEdgeLabel(menu.edge);
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Edit label
            </span>
            <span className="text-[10px] text-slate-400 font-mono">d-click</span>
          </button>

          {/* Reverse */}
          <button
            type="button"
            data-testid="context-menu-item-reverse"
            className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
            onClick={() => {
              onClose();
              if (onReverseEdge && menu.edge) onReverseEdge(menu.edge);
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m16 3 4 4-4 4" />
                <path d="M20 7H4" />
                <path d="m8 21-4-4 4-4" />
                <path d="M4 17h16" />
              </svg>
              Reverse direction
            </span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          {/* Delete Edge */}
          <button
            type="button"
            data-testid="context-menu-item-delete-edge"
            className="flex items-center justify-between px-3 py-1.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors text-left"
            onClick={() => {
              onClose();
              if (onDeleteEdge && menu.edge) onDeleteEdge(menu.edge);
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Delete connection
            </span>
            <span className="text-[10px] text-rose-400/80 font-mono">⌫</span>
          </button>
        </div>
      )}

      {/* 3. PANE CONTEXT MENU */}
      {menu.type === 'pane' && (
        <div data-testid="context-menu-pane" className="flex flex-col text-xs relative">
          {/* Add Object with flyout submenu */}
          <div
            className="relative"
            onMouseEnter={() => setIsAddSubmenuOpen(true)}
            onMouseLeave={() => setIsAddSubmenuOpen(false)}
          >
            <button
              type="button"
              data-testid="context-menu-item-add-object"
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
              onClick={() => setIsAddSubmenuOpen(!isAddSubmenuOpen)}
            >
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                Add object
              </span>
              <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {/* Submenu for object kinds */}
            {isAddSubmenuOpen && (
              <div
                data-testid="context-menu-add-submenu"
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: '-4px',
                }}
                className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-xl py-1.5 w-48 text-slate-200 ml-1 select-none animate-in fade-in duration-75"
              >
                {OBJECT_KINDS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    data-testid={`context-menu-subitem-${kind}`}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 hover:text-white transition-colors text-left text-xs"
                    onClick={() => {
                      onClose();
                      if (onAddObject) {
                        onAddObject(kind, {
                          x: menu.flowX ?? 250,
                          y: menu.flowY ?? 180,
                        });
                      }
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-sky-400/80" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Paste */}
          <button
            type="button"
            data-testid="context-menu-item-paste"
            disabled={!canPaste}
            className={`flex items-center justify-between px-3 py-1.5 transition-colors text-left ${
              canPaste
                ? 'hover:bg-slate-800/80 hover:text-white'
                : 'text-slate-400 cursor-not-allowed'
            }`}
            onClick={() => {
              if (!canPaste) return;
              onClose();
              if (onPaste) {
                onPaste({
                  x: menu.flowX ?? 250,
                  y: menu.flowY ?? 180,
                });
              }
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
              Paste
            </span>
            <span className="text-[10px] text-slate-400 font-mono">⌘V</span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          {/* Select All */}
          <button
            type="button"
            data-testid="context-menu-item-select-all"
            className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
            onClick={() => {
              onClose();
              if (onSelectAll) onSelectAll();
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
              </svg>
              Select all
            </span>
            <span className="text-[10px] text-slate-400 font-mono">⌘A</span>
          </button>

          {/* Fit View */}
          <button
            type="button"
            data-testid="context-menu-item-fit-view"
            className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
            onClick={() => {
              onClose();
              if (onFitView) onFitView();
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 3l-7 7" />
                <path d="M3 21l7-7" />
              </svg>
              Fit view
            </span>
            <span className="text-[10px] text-slate-400 font-mono">F</span>
          </button>

          {/* Auto Layout */}
          <button
            type="button"
            data-testid="context-menu-item-auto-layout"
            className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
            onClick={() => {
              onClose();
              if (onAutoLayout) onAutoLayout();
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Auto-layout
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
