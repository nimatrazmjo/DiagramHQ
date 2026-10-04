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
  type FlowPlaybackState,
} from '@diagramhq/domain';
import { InfiniteCanvas, toAlignableNode, IcePanelSidebar, IconPickerModal, FlowPlaybackToolbar } from '../../components/canvas';
import { InspectorPanel } from '../../components/shell/inspector-panel';

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
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [canvasKey, setCanvasKey] = useState(1);
  const [currentNodes, setCurrentNodes] = useState<CanvasNode[]>(initialGraph.nodes);
  const [currentEdges, setCurrentEdges] = useState<CanvasEdge[]>(initialGraph.edges);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [c4Level, setC4Level] = useState<1 | 2 | 3>(1);
  const [isFlowPlaybackActive, setIsFlowPlaybackActive] = useState(false);
  const [playbackState, setPlaybackState] = useState<FlowPlaybackState>({
    flowId: 'studio-trace-flow',
    totalSteps: 4,
    currentStepIndex: 0,
    isPlaying: false,
    speedMultiplier: 1,
    isLooping: false,
  });

  const STARTER_FLOW_STEPS = useMemo(
    () => [
      { note: 'End User dispatches HTTPS authentication request to Web App' },
      { note: 'Web App proxies request with CSRF token to Edge API Gateway' },
      { note: 'API Gateway verifies TLS and invokes gRPC AuthenticateUser() on Auth Service' },
      { note: 'Auth Service executes query on Postgres Database and issues signed JWT' },
    ],
    [],
  );

  // Auto-advance timer when playing
  React.useEffect(() => {
    if (!isFlowPlaybackActive || !playbackState.isPlaying) return;
    const intervalTime = 1800 / playbackState.speedMultiplier;
    const timer = setInterval(() => {
      setPlaybackState((prev) => {
        if (prev.currentStepIndex >= prev.totalSteps - 1) {
          if (prev.isLooping) {
            return { ...prev, currentStepIndex: 0 };
          }
          return { ...prev, isPlaying: false };
        }
        return { ...prev, currentStepIndex: prev.currentStepIndex + 1 };
      });
    }, intervalTime);
    return () => clearInterval(timer);
  }, [isFlowPlaybackActive, playbackState.isPlaying, playbackState.speedMultiplier]);

  // Selected node item for Inspector
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return currentNodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, currentNodes]);

  // Selected edge item for Inspector
  const selectedEdgeData = useMemo(() => {
    if (!selectedEdgeId) return null;
    const edge = currentEdges.find((e) => e.id === selectedEdgeId);
    if (!edge) return null;

    const sourceNode = currentNodes.find((n) => n.id === edge.source);
    const targetNode = currentNodes.find((n) => n.id === edge.target);
    const edgeData = (edge.data || {}) as Record<string, unknown>;

    let protocol = (edgeData.protocol as string) || (edgeData.kind as string) || undefined;
    let description = (edgeData.description as string) || (edge.label as string) || undefined;
    if (!protocol && typeof edge.label === 'string' && edge.label.includes(':')) {
      const parts = edge.label.split(':');
      protocol = parts[0]?.trim() || undefined;
      description = parts.slice(1).join(':').trim() || undefined;
    }

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceName: (sourceNode?.data?.label as string) || edge.source,
      targetName: (targetNode?.data?.label as string) || edge.target,
      label: edge.label,
      protocol,
      description,
    };
  }, [selectedEdgeId, currentEdges, currentNodes]);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setSelectedEdgeId(null);
      if (!isInspectorOpen) setIsInspectorOpen(true);
    }
  }, [isInspectorOpen]);

  const handleEdgeSelect = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    if (edgeId) {
      setSelectedNodeId(null);
      if (!isInspectorOpen) setIsInspectorOpen(true);
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
          data.name = String(value);
        } else if (field === 'description') {
          data.description = String(value);
        } else {
          data[field] = value;
        }
        return { ...n, data };
      }),
    );
  }, [selectedNodeId]);

  const handleEdgeMetadataChange = useCallback((edgeId: string, updates: { protocol?: string; description?: string }) => {
    setCurrentEdges((prev) =>
      prev.map((e) => {
        if (e.id !== edgeId) return e;
        const data = { ...(e.data || {}), ...updates };
        const label = updates.protocol && updates.description
          ? `${updates.protocol}: ${updates.description}`
          : updates.protocol || updates.description || e.label;
        return { ...e, label, data };
      }),
    );
  }, []);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setCurrentEdges((prev) => prev.filter((e) => e.id !== edgeId));
    if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
  }, [selectedEdgeId]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setCurrentNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setCurrentEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  // Connect two nodes from the Inspector
  const handleConnectNodesFromInspector = useCallback((targetId: string, protocol?: string, description?: string) => {
    if (!selectedNodeId || !targetId || selectedNodeId === targetId) return;

    const newEdge: CanvasEdge = {
      id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source: selectedNodeId,
      target: targetId,
      type: 'icepanel',
      label: protocol && description ? `${protocol}: ${description}` : protocol || description || 'connects to',
      data: {
        protocol: protocol || 'HTTPS',
        description: description || undefined,
      },
    };

    setCurrentEdges((prev) => [...prev, newEdge]);
  }, [selectedNodeId]);

  // Add node from Sidebar or Palette
  const handleAddNode = useCallback((
    kind: 'system' | 'application' | 'database' | 'queue' | 'person' | 'component',
    customData?: { label?: string; technology?: string; icon?: string; description?: string }
  ) => {
    const id = `${kind}-${Date.now().toString().slice(-5)}`;
    const defaultLabels: Record<string, string> = {
      system: 'New System',
      application: 'New Service',
      database: 'New Database',
      queue: 'New Message Queue',
      person: 'New Actor',
      component: 'New Component',
    };

    const label = customData?.label || defaultLabels[kind] || 'New Object';
    const offset = (currentNodes.length % 6) * 40;

    const newNode: CanvasNode = {
      id,
      type: kind,
      position: { x: 280 + offset, y: 160 + offset },
      data: {
        label,
        kind,
        technology: customData?.technology,
        description: customData?.description || 'Newly created architecture element.',
        icon: customData?.icon,
        status: 'Active',
      },
    };

    setCurrentNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    if (!isInspectorOpen) setIsInspectorOpen(true);
  }, [currentNodes.length, isInspectorOpen]);

  const handleClearDiagram = useCallback(() => {
    if (window.confirm('Clear all objects and connections from the diagram?')) {
      setCurrentNodes([]);
      setCurrentEdges([]);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
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
          setSelectedEdgeId(null);
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
      return {
        ...node,
        selected: node.id === selectedNodeId,
        data,
      };
    });
  }, [currentNodes, activeView, activePersona, selectedNodeId]);

  // Connections formatted for the Inspector
  const incomingConnectionsForSelectedNode = useMemo(() => {
    if (!selectedNodeId) return [];
    return currentEdges
      .filter((e) => e.target === selectedNodeId)
      .map((e) => {
        const sourceNode = currentNodes.find((n) => n.id === e.source);
        const data = (e.data || {}) as Record<string, unknown>;
        return {
          id: e.id,
          sourceId: e.source,
          sourceName: (sourceNode?.data?.label as string) || e.source,
          protocol: (data.protocol as string) || undefined,
          description: (data.description as string) || (e.label as string) || undefined,
        };
      });
  }, [selectedNodeId, currentEdges, currentNodes]);

  const outgoingConnectionsForSelectedNode = useMemo(() => {
    if (!selectedNodeId) return [];
    return currentEdges
      .filter((e) => e.source === selectedNodeId)
      .map((e) => {
        const targetNode = currentNodes.find((n) => n.id === e.target);
        const data = (e.data || {}) as Record<string, unknown>;
        return {
          id: e.id,
          targetId: e.target,
          targetName: (targetNode?.data?.label as string) || e.target,
          protocol: (data.protocol as string) || undefined,
          description: (data.description as string) || (e.label as string) || undefined,
        };
      });
  }, [selectedNodeId, currentEdges, currentNodes]);

  const allNodesForInspector = useMemo(() => {
    return currentNodes.map((n) => ({
      id: n.id,
      label: (n.data?.label as string) || n.id,
      kind: (n.data?.kind as string) || n.type,
      icon: (n.data?.icon as string) || undefined,
    }));
  }, [currentNodes]);

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

          {/* Breadcrumb Hierarchy (IcePanel style) */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="text-slate-600">/</span>
            <span>Model</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold">
              {c4Level === 1 ? 'System Context' : c4Level === 2 ? 'Containers & Apps' : 'Components'}
            </span>
          </div>
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
          <div className="hidden xl:flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
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

        {/* Quick Actions & Admin Superuser Pill */}
        <div className="flex items-center gap-2">
          {/* Admin Status Pill */}
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
            title="Admin full access enabled (Switch to Dashboard)"
          >
            <span>👑</span>
            <span className="font-semibold">Admin (Owner)</span>
          </Link>

          {/* Brand Icon catalog trigger */}
          <button
            type="button"
            onClick={() => setIsIconPickerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
            title="Browse official brand icons (Azure, AWS, Postgres, Claude, Python...)"
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
            data-testid="toggle-flow-playback-btn"
            onClick={() => {
              setIsFlowPlaybackActive((prev) => !prev);
              setPlaybackState((prev) => ({ ...prev, currentStepIndex: 0, isPlaying: false }));
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isFlowPlaybackActive
                ? 'bg-sky-600/30 text-sky-300 border-sky-500/50 shadow-sm shadow-sky-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Toggle Flow Trace Playback"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Trace Flow</span>
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

      {/* Main Studio Body: Left Sidebar + Canvas + Right Inspector */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* IcePanel Left Sidebar: Model Objects Tree & Diagram Views */}
        <IcePanelSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          c4Level={c4Level}
          onSelectC4Level={(lvl) => {
            setC4Level(lvl);
            if (lvl === 1) setActiveView('context');
            else if (lvl === 2) setActiveView('container');
            else setActiveView('all');
          }}
          nodes={currentNodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleNodeSelect}
          onAddNode={handleAddNode}
          onOpenIconPicker={() => setIsIconPickerOpen(true)}
        />

        {/* Full-bleed Infinite Canvas */}
        <div className="flex-1 h-full w-full relative">
          <InfiniteCanvas
            key={canvasKey}
            initialNodes={displayNodes}
            initialEdges={currentEdges}
            selectedNodeIds={selectedNodeId ? [selectedNodeId] : []}
            selectedEdgeIds={selectedEdgeId ? [selectedEdgeId] : []}
            onNodeSelect={handleNodeSelect}
            onEdgeSelect={handleEdgeSelect}
            showPalette
            showTemplatePicker
            onNodeCreate={(newNode) => {
              setCurrentNodes((nds) => [...nds, newNode]);
            }}
            onEdgeConnect={(newEdge) => {
              setCurrentEdges((eds) => [...eds, newEdge]);
            }}
            onNodeDelete={handleDeleteNode}
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
                  Use the Model Tree on the left or the Insert bar to add systems, services, and databases, or load a starter architecture.
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

          {/* Flow Playback Interactive Toolbar */}
          {isFlowPlaybackActive && (
            <FlowPlaybackToolbar
              state={playbackState}
              currentStepNote={STARTER_FLOW_STEPS[playbackState.currentStepIndex]?.note}
              persona="Security Architect"
              actorAction="Validates Auth Token"
              userIntent="End-to-end token verification trace"
              onPlay={() => setPlaybackState((s) => ({ ...s, isPlaying: true }))}
              onPause={() => setPlaybackState((s) => ({ ...s, isPlaying: false }))}
              onNext={() =>
                setPlaybackState((s) => ({
                  ...s,
                  currentStepIndex:
                    s.currentStepIndex < s.totalSteps - 1
                      ? s.currentStepIndex + 1
                      : s.isLooping
                      ? 0
                      : s.currentStepIndex,
                }))
              }
              onPrev={() =>
                setPlaybackState((s) => ({
                  ...s,
                  currentStepIndex: Math.max(s.currentStepIndex - 1, 0),
                }))
              }
              onRestart={() =>
                setPlaybackState((s) => ({
                  ...s,
                  currentStepIndex: 0,
                  isPlaying: false,
                }))
              }
              onSpeedChange={(speed) =>
                setPlaybackState((s) => ({ ...s, speedMultiplier: speed }))
              }
              onToggleLoop={() =>
                setPlaybackState((s) => ({ ...s, isLooping: !s.isLooping }))
              }
            />
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
          onDeleteNode={handleDeleteNode}
          selectedEdge={selectedEdgeData}
          onEdgeChange={handleEdgeMetadataChange}
          onDeleteEdge={handleDeleteEdge}
          allNodes={allNodesForInspector}
          incomingConnections={incomingConnectionsForSelectedNode}
          outgoingConnections={outgoingConnectionsForSelectedNode}
          onConnectNodes={handleConnectNodesFromInspector}
        />
      </div>

      {/* Interactive Official Brand Icon Picker Modal */}
      <IconPickerModal
        isOpen={isIconPickerOpen}
        currentIcon={(selectedNode?.data.icon as string) ?? null}
        onSelectIcon={(iconPath) => {
          handleMetadataChange('icon', iconPath);
          setIsIconPickerOpen(false);
        }}
        onClose={() => setIsIconPickerOpen(false)}
      />
    </div>
  );
}
