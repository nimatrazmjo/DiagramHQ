'use client';

import React, { useState, useMemo } from 'react';
import type { CanvasNode, View, ModelObject } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';

export interface IcePanelSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  c4Level: 1 | 2 | 3;
  onSelectC4Level: (level: 1 | 2 | 3) => void;
  nodes: CanvasNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onAddNode: (
    kind: 'system' | 'application' | 'database' | 'queue' | 'person' | 'component',
    customData?: { label?: string; technology?: string; icon?: string; description?: string }
  ) => void;
  onOpenIconPicker?: () => void;
  // Real Views (F145)
  views?: View[];
  activeViewId?: string;
  onSelectView?: (viewId: string) => void;
  onCreateView?: (input: { name: string; kind?: string; level?: number; description?: string }) => void;
  onDeleteView?: (viewId: string) => void;
  allModelObjects?: ModelObject[];
  onAddObjectToActiveView?: (objectId: string) => void;
  onRemoveObjectFromActiveView?: (objectId: string) => void;
}

export type ModelCategory = 'actor' | 'system' | 'application' | 'database' | 'queue' | 'component';

interface CategoryConfig {
  kind: ModelCategory;
  title: string;
  icon: string;
  color: string;
  badgeBg: string;
  accentBorder: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    kind: 'actor',
    title: 'Actors & Users',
    icon: '👤',
    color: 'text-pink-400',
    badgeBg: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
    accentBorder: 'border-l-pink-500',
  },
  {
    kind: 'system',
    title: 'Software Systems',
    icon: '🏢',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    accentBorder: 'border-l-blue-500',
  },
  {
    kind: 'application',
    title: 'Apps & Services',
    icon: '⚡',
    color: 'text-sky-400',
    badgeBg: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    accentBorder: 'border-l-sky-500',
  },
  {
    kind: 'database',
    title: 'Databases & Stores',
    icon: '🗄️',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    accentBorder: 'border-l-amber-500',
  },
  {
    kind: 'queue',
    title: 'Queues & Streams',
    icon: '📬',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    accentBorder: 'border-l-purple-500',
  },
  {
    kind: 'component',
    title: 'Components',
    icon: '🧩',
    color: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    accentBorder: 'border-l-indigo-500',
  },
];

export function IcePanelSidebar({
  isOpen,
  onToggle,
  c4Level,
  onSelectC4Level,
  nodes,
  selectedNodeId,
  onSelectNode,
  onAddNode,
  views,
  activeViewId,
  onSelectView,
  onCreateView,
  onDeleteView,
  allModelObjects,
  onAddObjectToActiveView,
  onRemoveObjectFromActiveView,
}: IcePanelSidebarProps): JSX.Element {
  const [sidebarTab, setSidebarTab] = useState<'diagrams' | 'model'>('model');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    actor: true,
    system: true,
    application: true,
    database: true,
    queue: true,
    component: true,
  });

  // Quick Object Creation Modal / State
  const [isCreatingObject, setIsCreatingObject] = useState(false);
  const [newObjectName, setNewObjectName] = useState('');
  const [newObjectKind, setNewObjectKind] = useState<ModelCategory>('application');
  const [newObjectTech, setNewObjectTech] = useState('');
  const [newObjectDesc, setNewObjectDesc] = useState('');

  // Quick View Creation State (F145)
  const [isCreatingView, setIsCreatingView] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewKind, setNewViewKind] = useState<string>('context');

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Active canvas node IDs
  const activeNodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  // Group objects by category (either from allModelObjects or from nodes)
  const groupedNodes = useMemo(() => {
    const map = new Map<
      ModelCategory,
      Array<{
        id: string;
        label: string;
        technology?: string;
        category: ModelCategory;
        isInActiveView: boolean;
        icon?: string;
      }>
    >();

    for (const cat of CATEGORIES) {
      map.set(cat.kind, []);
    }

    const q = searchQuery.trim().toLowerCase();

    if (allModelObjects && allModelObjects.length > 0) {
      for (const obj of allModelObjects) {
        const label = obj.name || obj.id;
        const tech = (obj.metadata?.technology as string) || '';
        if (q && !label.toLowerCase().includes(q) && !tech.toLowerCase().includes(q)) {
          continue;
        }

        let category: ModelCategory = 'application';
        if (obj.kind === 'system') category = 'system';
        else if (obj.kind === 'actor') category = 'actor';
        else if (obj.kind === 'store') category = 'database';
        else if (obj.kind === 'component') category = 'component';
        else if (obj.kind === 'application') category = 'application';

        const list = map.get(category) ?? [];
        list.push({
          id: obj.id,
          label,
          technology: tech,
          category,
          isInActiveView: activeNodeIds.has(obj.id),
        });
        map.set(category, list);
      }
    } else {
      for (const node of nodes) {
        const type = (node.type || 'application') as string;
        const data = (node.data || {}) as Record<string, unknown>;
        const label = String(data.label || node.id);
        const tech = String(data.technology || data.databaseKind || '');

        if (q && !label.toLowerCase().includes(q) && !tech.toLowerCase().includes(q)) {
          continue;
        }

        let category: ModelCategory = 'application';
        if (type === 'system' || type === 'c4Context') category = 'system';
        else if (type === 'person' || type === 'actor') category = 'actor';
        else if (type === 'database' || type === 'store') category = 'database';
        else if (type === 'queue') category = 'queue';
        else if (type === 'component' || type === 'c4Component') category = 'component';
        else if (type === 'application' || type === 'c4Container') category = 'application';

        const list = map.get(category) ?? [];
        list.push({
          id: node.id,
          label,
          technology: tech,
          category,
          isInActiveView: true,
          icon: data.icon as string | undefined,
        });
        map.set(category, list);
      }
    }

    return map;
  }, [allModelObjects, nodes, activeNodeIds, searchQuery]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetKind = newObjectKind === 'actor' ? 'person' : newObjectKind;
    onAddNode(targetKind, {
      label: newObjectName.trim(),
      technology: newObjectTech.trim() || undefined,
      description: newObjectDesc.trim() || undefined,
    });

    setNewObjectName('');
    setNewObjectTech('');
    setNewObjectDesc('');
    setIsCreatingObject(false);
  };

  if (!isOpen) {
    return (
      <aside
        aria-label="Model navigator collapsed"
        className="w-10 bg-slate-900 border-r border-slate-800 flex flex-col items-center pt-3 select-none z-10 shrink-0"
      >
        <button
          type="button"
          aria-label="Expand model navigator"
          onClick={onToggle}
          title="Expand Model Navigator & Diagrams (IcePanel style)"
          className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          ▶
        </button>
        <div className="mt-8 flex flex-col items-center gap-6 text-[10px] uppercase font-mono text-slate-500 [writing-mode:vertical-rl] tracking-widest">
          <span>Model Catalog</span>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="IcePanel Model & Diagrams Navigator"
      data-testid="icepanel-sidebar"
      className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-100 select-none z-10 shrink-0 overflow-hidden"
    >
      {/* Top Header: Tabs for Diagrams vs Model */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 flex-1">
          <button
            type="button"
            data-testid="sidebar-model-tab"
            onClick={() => setSidebarTab('model')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sidebarTab === 'model'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🧊</span>
            <span>Model Objects</span>
          </button>
          <button
            type="button"
            data-testid="sidebar-diagrams-tab"
            onClick={() => setSidebarTab('diagrams')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sidebarTab === 'diagrams'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🗺️</span>
            <span>Diagrams</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onToggle}
          title="Collapse Sidebar"
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition-colors shrink-0"
        >
          ◀
        </button>
      </div>

      {/* TAB 1: MODEL CATALOG */}
      {sidebarTab === 'model' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search bar & Add Button */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Search model objects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              data-testid="sidebar-create-object-btn"
              onClick={() => setIsCreatingObject(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition-colors shrink-0"
              title="Add new object to model"
            >
              <span>+</span>
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>

          {/* Quick Create Inline Popover */}
          {isCreatingObject && (
            <div className="p-3 border-b border-slate-800 bg-slate-950/90 animate-in fade-in duration-150 shrink-0">
              <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <span>New Model Object</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingObject(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Object Name (e.g. Auth Service)..."
                  value={newObjectName}
                  onChange={(e) => setNewObjectName(e.target.value)}
                  autoFocus
                  required
                  className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newObjectKind}
                    onChange={(e) => setNewObjectKind(e.target.value as ModelCategory)}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="system">🏢 System</option>
                    <option value="application">⚡ App / Service</option>
                    <option value="database">🗄️ Database</option>
                    <option value="queue">📬 Queue</option>
                    <option value="actor">👤 Actor</option>
                    <option value="component">🧩 Component</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Tech (e.g. Postgres, Azure)"
                    value={newObjectTech}
                    onChange={(e) => setNewObjectTech(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Brief description (optional)..."
                  value={newObjectDesc}
                  onChange={(e) => setNewObjectDesc(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingObject(false)}
                    className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow"
                  >
                    Create & Add
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Model Categories & Objects Tree */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
            {CATEGORIES.map((cat) => {
              const items = groupedNodes.get(cat.kind) ?? [];
              const isExpanded = expandedCategories[cat.kind] ?? true;

              return (
                <div key={cat.kind} className="pt-1.5 first:pt-0">
                  <div
                    onClick={() => toggleCategory(cat.kind)}
                    className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer text-xs font-semibold text-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 transition-transform duration-150">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span>{cat.icon}</span>
                      <span>{cat.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                        {items.length}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const kindToAdd = cat.kind === 'actor' ? 'person' : cat.kind;
                          onAddNode(kindToAdd);
                        }}
                        title={`Add new ${cat.kind}`}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Category Items List */}
                  {isExpanded && (
                    <div className="pl-3 pr-1 py-1 space-y-1">
                      {items.length === 0 ? (
                        <div className="text-[11px] text-slate-500 italic py-1 pl-2">
                          No {cat.title.toLowerCase()} in model
                        </div>
                      ) : (
                        items.map((item) => {
                          const label = item.label;
                          const tech = item.technology || '';
                          const isSelected = selectedNodeId === item.id;
                          const brandIcon =
                            item.icon ||
                            getTechnologyIconPath(tech || label);

                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                if (item.isInActiveView) {
                                  onSelectNode(item.id);
                                }
                              }}
                              className={`group flex items-center justify-between p-1.5 rounded-lg transition-all border ${
                                isSelected
                                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                                  : item.isInActiveView
                                  ? 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
                                  : 'bg-slate-950/20 border-slate-800/40 hover:bg-slate-900/60 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center p-0.5 shrink-0">
                                  {brandIcon ? (
                                    <img src={brandIcon} alt="" className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-[10px]">{cat.icon}</span>
                                  )}
                                </div>
                                <div className="truncate">
                                  <div className="text-xs font-medium truncate">{label}</div>
                                  {tech && (
                                    <div className="text-[10px] text-slate-400 truncate font-mono">
                                      {tech}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                {item.isInActiveView ? (
                                  <>
                                    <span className="text-[9px] font-mono text-emerald-400 px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30">
                                      In View
                                    </span>
                                    {onRemoveObjectFromActiveView && (
                                      <button
                                        type="button"
                                        data-testid={`remove-from-view-${item.id}`}
                                        title="Remove from this view (keeps in model)"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onRemoveObjectFromActiveView(item.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-0.5 rounded hover:bg-slate-800 transition-opacity text-xs"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  onAddObjectToActiveView && (
                                    <button
                                      type="button"
                                      data-testid={`add-to-view-${item.id}`}
                                      title="Add object to active view (1 click)"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onAddObjectToActiveView(item.id);
                                      }}
                                      className="text-[10px] bg-blue-600/80 hover:bg-blue-600 text-white px-2 py-0.5 rounded font-medium shadow-sm transition-colors"
                                    >
                                      + Add
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DIAGRAMS / VIEWS */}
      {sidebarTab === 'diagrams' && (
        <div className="flex flex-col flex-1 overflow-hidden p-3 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Architecture Views
              </div>
              {onCreateView && (
                <button
                  type="button"
                  data-testid="create-view-open-btn"
                  onClick={() => setIsCreatingView((v) => !v)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
                >
                  {isCreatingView ? 'Cancel' : '+ New View'}
                </button>
              )}
            </div>

            {/* Inline New View Form */}
            {isCreatingView && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newViewName.trim()) return;
                  let level = 1;
                  if (newViewKind === 'container') level = 2;
                  else if (newViewKind === 'component') level = 3;
                  onCreateView?.({
                    name: newViewName.trim(),
                    kind: newViewKind,
                    level,
                  });
                  setNewViewName('');
                  setIsCreatingView(false);
                }}
                className="mb-3 p-2.5 bg-slate-950/80 border border-blue-500/40 rounded-xl space-y-2"
              >
                <input
                  type="text"
                  placeholder="View Name (e.g. Data Flow, Security)"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  data-testid="new-view-name-input"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newViewKind}
                    onChange={(e) => setNewViewKind(e.target.value)}
                    data-testid="new-view-kind-select"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="context">System Context (L1)</option>
                    <option value="container">Containers & Apps (L2)</option>
                    <option value="component">Components & Modules (L3)</option>
                    <option value="security">Security Architecture</option>
                    <option value="data">Data Lineage & Flow</option>
                    <option value="custom">Custom View</option>
                  </select>
                  <button
                    type="submit"
                    data-testid="confirm-create-view-btn"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded-lg font-medium shadow-sm transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {/* List of Real Architecture Views */}
            {views && views.length > 0 ? (
              <div className="space-y-2">
                {views.map((view) => {
                  const isActive = view.id === activeViewId;
                  return (
                    <div
                      key={view.id}
                      data-testid={`view-item-${view.id}`}
                      onClick={() => onSelectView?.(view.id)}
                      className={`group p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                          : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium truncate">{view.name}</span>
                          {isActive && (
                            <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.2 rounded font-mono font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                          <span className="uppercase">{view.kind || 'context'}</span>
                          {view.level ? <span>L{view.level}</span> : null}
                        </div>
                      </div>

                      {views.length > 1 && onDeleteView && (
                        <button
                          type="button"
                          data-testid={`delete-view-btn-${view.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteView(view.id);
                          }}
                          title="Delete view (objects remain in model)"
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-all text-xs"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  {
                    level: 1 as const,
                    title: '1. System Context View',
                    desc: 'High-level business boundaries, external systems, and users.',
                    badge: 'Context (L1)',
                    icon: '🌐',
                  },
                  {
                    level: 2 as const,
                    title: '2. Containers & Applications',
                    desc: 'Microservices, APIs, frontend clients, and databases.',
                    badge: 'Container (L2)',
                    icon: '📦',
                  },
                  {
                    level: 3 as const,
                    title: '3. Components & Modules',
                    desc: 'Internal modules, controllers, repositories, and services.',
                    badge: 'Component (L3)',
                    icon: '🧩',
                  },
                ].map((view) => {
                  const isActive = c4Level === view.level;
                  return (
                    <div
                      key={view.level}
                      onClick={() => onSelectC4Level(view.level)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isActive
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                          : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 font-medium text-xs">
                          <span>{view.icon}</span>
                          <span>{view.title}</span>
                        </div>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                            isActive
                              ? 'bg-blue-500 text-white border-blue-400'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {view.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {view.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">IcePanel Concept:</span> In C4 modelling, every diagram is a window into the same underlying model. Objects created in any view remain part of your architecture catalogue.
          </div>
        </div>
      )}
    </aside>
  );
}
