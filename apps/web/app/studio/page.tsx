'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  type CanvasNode,
  type CanvasEdge,
  type TemplateId,
  type PersonaMode,
  instantiateTemplate,
  projectViewModelToCanvas,
  applyLayout,
  type LayoutEdge,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
} from '@diagramhq/domain';
import { InfiniteCanvas, toAlignableNode } from '../../components/canvas';
import { InspectorPanel } from '../../components/shell/inspector-panel';
import { IconPickerModal } from '../../components/canvas/icon-picker-modal';

export default function StudioPage(): JSX.Element {
  // Pre-seed with the SaaS 3-tier starter architecture
  const [initialGraph] = useState(() => {
    let objCount = 0;
    let connCount = 0;
    const instantiated = instantiateTemplate({
      templateId: 'saas' as TemplateId,
      architectureId: 'arch-studio-init' as ArchitectureId,
      versionId: 'v1' as VersionId,
      createObjectId: () => `obj-${++objCount}` as ObjectId,
      createConnectionId: () => `conn-${++connCount}` as ConnectionId,
    });

    const { nodes: initNodes, edges: initEdges } = projectViewModelToCanvas({
      objects: instantiated.objects,
      connections: instantiated.connections.map((c) => ({
        id: c.id,
        sourceId: c.sourceObjectId,
        targetId: c.targetObjectId,
        kind: c.kind,
        description: c.description,
      })),
    });

    const layoutNodes = initNodes.map(toAlignableNode);
    const layoutEdges: LayoutEdge[] = initEdges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    try {
      const positions = applyLayout(layoutNodes, layoutEdges, 'layered');
      const posMap = new Map(layoutNodes.map((n, i) => [n.id, positions[i] ?? n.position]));
      return {
        nodes: initNodes.map((n) => ({ ...n, position: posMap.get(n.id) ?? n.position })),
        edges: initEdges,
      };
    } catch {
      return { nodes: initNodes, edges: initEdges };
    }
  });

  const [activeView, setActiveView] = useState<'all' | 'context' | 'container' | 'security' | 'data' | 'ownership'>('all');
  const [activePersona, setActivePersona] = useState<PersonaMode | 'all'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [canvasKey, setCanvasKey] = useState(1);
  const [currentNodes, setCurrentNodes] = useState<CanvasNode[]>(initialGraph.nodes);
  const [currentEdges, setCurrentEdges] = useState<CanvasEdge[]>(initialGraph.edges);

  // Selected node item for the Inspector panel
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return currentNodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, currentNodes]);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId && !isInspectorOpen) {
      setIsInspectorOpen(true);
    }
  }, [isInspectorOpen]);

  const handleMetadataChange = useCallback((field: string, value: unknown) => {
    if (!selectedNodeId) return;
    setCurrentNodes((prev) =>
      prev.map((n) => {
        if (n.id !== selectedNodeId) return n;
        const data = { ...n.data };
        if (field === 'name') {
          data.label = String(value);
        } else if (field === 'description') {
          data.description = String(value);
        } else {
          data[field] = value;
        }
        return { ...n, data };
      }),
    );
  }, [selectedNodeId]);

  const handleClearDiagram = useCallback(() => {
    if (window.confirm('Clear all objects and connections from the diagram?')) {
      setCurrentNodes([]);
      setCurrentEdges([]);
      setSelectedNodeId(null);
      setCanvasKey((k) => k + 1);
    }
  }, []);

  const handleExportJson = useCallback(() => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: currentNodes,
      edges: currentEdges,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagramhq-architecture-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [currentNodes, currentEdges]);

  const handleImportJson = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          setCurrentNodes(parsed.nodes);
          setCurrentEdges(parsed.edges);
          setSelectedNodeId(null);
          setCanvasKey((k) => k + 1);
        } else {
          alert('Invalid diagram format: nodes and edges must be arrays.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  // Filtered nodes based on active view and persona
  const displayNodes = useMemo(() => {
    return currentNodes.map((node) => {
      const data = { ...node.data };
      if (activePersona !== 'all') {
        data.personaView = true;
        data.personaMode = activePersona;
      }
      if (activeView === 'security') {
        data.securityView = true;
      } else if (activeView === 'data') {
        data.dataView = true;
      } else if (activeView === 'ownership') {
        data.ownershipView = true;
      }
      return { ...node, data };
    });
  }, [currentNodes, activeView, activePersona]);

  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [c4Level, setC4Level] = useState<1 | 2 | 3>(1);

  const handleLoadStarter = useCallback(() => {
    let objCount = 0;
    let connCount = 0;
    const instantiated = instantiateTemplate({
      templateId: 'saas' as TemplateId,
      architectureId: 'arch-studio-init' as ArchitectureId,
      versionId: 'v1' as VersionId,
      createObjectId: () => `obj-${++objCount}` as ObjectId,
      createConnectionId: () => `conn-${++connCount}` as ConnectionId,
    });

    const { nodes: initNodes, edges: initEdges } = projectViewModelToCanvas({
      objects: instantiated.objects,
      connections: instantiated.connections.map((c) => ({
        id: c.id,
        sourceId: c.sourceObjectId,
        targetId: c.targetObjectId,
        kind: c.kind,
        description: c.description,
      })),
    });

    const layoutNodes = initNodes.map(toAlignableNode);
    const layoutEdges: LayoutEdge[] = initEdges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    try {
      const positions = applyLayout(layoutNodes, layoutEdges, 'layered');
      const posMap = new Map(layoutNodes.map((n, i) => [n.id, positions[i] ?? n.position]));
      setCurrentNodes(initNodes.map((n) => ({ ...n, position: posMap.get(n.id) ?? n.position })));
      setCurrentEdges(initEdges);
    } catch {
      setCurrentNodes(initNodes);
      setCurrentEdges(initEdges);
    }
    setCanvasKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Studio Top Navigation Bar (IcePanel style) */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between gap-4 shrink-0 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-white font-bold text-base hover:text-blue-400 transition-colors"
          >
            <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-mono text-sm shadow-md shadow-blue-500/30">
              ⬡
            </span>
            <span>DiagramHQ</span>
          </Link>

          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            Phase 0 Studio (Guest Mode)
          </span>

          <span className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <span>Model:</span>
            <span className="font-semibold text-white">
              {c4Level === 1 ? 'System Context' : c4Level === 2 ? 'Containers & Apps' : 'Components'}
            </span>
          </span>
        </div>

        {/* IcePanel signature C4 Level Switcher, View & Persona Filters */}
        <div className="flex items-center gap-2">
          {/* C4 Level Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setC4Level(1);
                setActiveView('context');
              }}
              title="Level 1: System Context (High-level boundary)"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                c4Level === 1
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Context
            </button>
            <button
              type="button"
              onClick={() => {
                setC4Level(2);
                setActiveView('container');
              }}
              title="Level 2: Containers & Applications (Services, DBs, Queues)"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                c4Level === 2
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Containers
            </button>
            <button
              type="button"
              onClick={() => {
                setC4Level(3);
                setActiveView('all');
              }}
              title="Level 3: Components (Internal modules & controllers)"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                c4Level === 3
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3. Components
            </button>
          </div>

          {/* Perspective View Switcher */}
          <div className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-[11px] text-slate-400 px-1 font-mono">View:</span>
            {(['all', 'security', 'data', 'ownership'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                  activeView === view
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Persona Mode Switcher */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-[11px] text-slate-400 px-1 font-mono">Persona:</span>
            <select
              value={activePersona}
              onChange={(e) => setActivePersona(e.target.value as PersonaMode | 'all')}
              className="bg-transparent text-slate-200 text-xs py-1 px-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">Default (All)</option>
              <option value="developer" className="bg-slate-900 text-slate-200">Developer</option>
              <option value="architect" className="bg-slate-900 text-slate-200">Architect</option>
              <option value="security" className="bg-slate-900 text-slate-200">Security</option>
              <option value="devops" className="bg-slate-900 text-slate-200">DevOps</option>
              <option value="executive" className="bg-slate-900 text-slate-200">Executive</option>
              <option value="data-engineer" className="bg-slate-900 text-slate-200">Data Engineer</option>
              <option value="compliance" className="bg-slate-900 text-slate-200">Compliance</option>
            </select>
          </div>
        </div>

        {/* Quick Actions (Icons, Import, Export, Reset, Inspector) */}
        <div className="flex items-center gap-2">
          {/* Brand Icon catalog trigger */}
          <button
            type="button"
            onClick={() => setIsIconPickerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
            title="Browse official icons (Azure, AWS, Postgres, Claude, Python...)"
          >
            <span>🎨</span>
            <span className="hidden sm:inline">Icons</span>
          </button>

          <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors">
            📥 Import JSON
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            title="Export diagram as JSON"
          >
            📤 Export JSON
          </button>

          <button
            type="button"
            onClick={handleClearDiagram}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-red-900/40 text-xs font-medium text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-700 transition-colors"
            title="Clear canvas"
          >
            🧹 Reset
          </button>

          <button
            type="button"
            onClick={() => setIsInspectorOpen((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isInspectorOpen
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Inspector Sidebar"
          >
            Inspector
          </button>
        </div>
      </header>

      {/* Main Studio Body: Canvas + Collapsible Inspector */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Full-bleed Infinite Canvas */}
        <div className="flex-1 h-full w-full relative">
          <InfiniteCanvas
            key={canvasKey}
            initialNodes={displayNodes}
            initialEdges={currentEdges}
            onNodeSelect={handleNodeSelect}
            showPalette
            showTemplatePicker
            onNodeCreate={(newNode) => {
              setCurrentNodes((nds) => [...nds, newNode]);
            }}
            onEdgeConnect={(newEdge) => {
              setCurrentEdges((eds) => [...eds, newEdge]);
            }}
            onNodeDelete={(nodeId) => {
              setCurrentNodes((nds) => nds.filter((n) => n.id !== nodeId));
              setCurrentEdges((eds) =>
                eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
              );
            }}
          />

          {/* IcePanel Empty State Helper */}
          {currentNodes.length === 0 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-4">
              <div className="pointer-events-auto bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 max-w-sm text-center shadow-2xl backdrop-blur-md">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mx-auto mb-3">
                  🧊
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Canvas is ready</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Use the Insert toolbar on the left to add systems, services, and databases, or load a starter architecture.
                </p>
                <button
                  type="button"
                  onClick={handleLoadStarter}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/30 transition-all"
                >
                  🚀 Load Reference Architecture
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector Sidebar */}
        <InspectorPanel
          isOpen={isInspectorOpen}
          onToggle={() => setIsInspectorOpen((prev) => !prev)}
          objectId={selectedNode?.id}
          objectName={typeof selectedNode?.data.label === 'string' ? selectedNode.data.label : selectedNode?.id}
          objectKind={typeof selectedNode?.data.kind === 'string' ? selectedNode.data.kind : selectedNode?.type}
          metadata={selectedNode?.data as Record<string, unknown> | undefined}
          onMetadataChange={handleMetadataChange}
          onOpenIconPicker={() => setIsIconPickerOpen(true)}
        />
      </div>

      {/* Interactive Official Brand Icon Picker Modal */}
      <IconPickerModal
        isOpen={isIconPickerOpen}
        currentIcon={(selectedNode?.data.icon as string) ?? null}
        onSelectIcon={(iconPath) => handleMetadataChange('icon', iconPath)}
        onClose={() => setIsIconPickerOpen(false)}
      />
    </div>
  );
}
