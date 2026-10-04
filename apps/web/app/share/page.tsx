'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  verifyShareLink,
  resolveAnonymousViewState,
  createIcePanelBoutiqueModel,
  createArchitectureModel,
  type ArchitectureModel,
  type CanvasNode,
  type CanvasEdge,
  type FlowPlaybackState,
  type FlowWithSteps,
  type View,
  type ViewId,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ShareLinkPayload,
} from '@diagramhq/domain';
import {
  InfiniteCanvas,
  ReadOnlyBanner,
  FlowPlaybackToolbar,
  ExportModal,
} from '../../components/canvas';

function SharePageContent(): JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const diagramParam = searchParams.get('diagram');

  const boutiqueBaseline = useMemo(() => createIcePanelBoutiqueModel(), []);

  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    reason?: string;
    payload?: ShareLinkPayload;
  }>({ valid: true });

  const [nodes, setNodes] = useState<CanvasNode[]>(boutiqueBaseline.nodes);
  const [edges, setEdges] = useState<CanvasEdge[]>(boutiqueBaseline.edges);
  const [flows, setFlows] = useState<FlowWithSteps[]>(boutiqueBaseline.flows);
  const [viewTitle, setViewTitle] = useState<string>('Online Boutique (IcePanel Architecture)');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [, setSelectedEdgeId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [canvasKey, setCanvasKey] = useState(1);

  // Flow playback state
  const [isFlowPlaybackActive, setIsFlowPlaybackActive] = useState(true);
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const activeFlow = flows[activeFlowIndex] ?? flows[0];

  const [playbackState, setPlaybackState] = useState<FlowPlaybackState>({
    flowId: 'flow-user-purchase',
    totalSteps: activeFlow?.steps?.length ?? 27,
    currentStepIndex: 0,
    isPlaying: false,
    speedMultiplier: 1,
    isLooping: false,
  });

  // Verify and decode token on mount
  useEffect(() => {
    if (token) {
      try {
        const result = verifyShareLink(token);
        if (!result.valid) {
          setVerificationResult({ valid: false, reason: result.reason });
          return;
        }

        setVerificationResult({ valid: true, payload: result.payload });
        const resolved = resolveAnonymousViewState(result.payload);

        if (resolved.selectedObjectId) {
          setSelectedNodeId(resolved.selectedObjectId);
        }

        // If diagramData is packed into the payload, hydrate canvas from it
        if (resolved.diagramData) {
          const dData = resolved.diagramData;
          if (Array.isArray(dData.nodes) && dData.nodes.length > 0) {
            setNodes(dData.nodes as CanvasNode[]);
          }
          if (Array.isArray(dData.edges)) {
            setEdges(dData.edges as CanvasEdge[]);
          }
          if (Array.isArray(dData.flows) && dData.flows.length > 0) {
            setFlows(dData.flows as FlowWithSteps[]);
          }
          if (typeof dData.title === 'string' && dData.title) {
            setViewTitle(dData.title);
          }
        }
      } catch {
        // If token fails decoding, fallback gracefully to the IcePanel Boutique model
        setVerificationResult({ valid: true });
      }
    } else if (diagramParam === 'online-boutique' || !token) {
      // Default to IcePanel Boutique
      setNodes(boutiqueBaseline.nodes);
      setEdges(boutiqueBaseline.edges);
      setFlows(boutiqueBaseline.flows);
      setViewTitle('Online Boutique - Apps & Stores (IcePanel Reimagined Flows)');
    }
  }, [token, diagramParam, boutiqueBaseline]);

  // Update playback state when active flow changes
  useEffect(() => {
    if (activeFlow) {
      setPlaybackState((prev) => ({
        ...prev,
        currentStepIndex: 0,
        totalSteps: activeFlow.steps.length,
      }));
    }
  }, [activeFlow]);

  // Current step details
  const currentStep = activeFlow?.steps?.[playbackState.currentStepIndex];

  // Auto-play timer
  useEffect(() => {
    if (!playbackState.isPlaying || !activeFlow) return;

    const intervalMs = Math.max(300, 1800 / playbackState.speedMultiplier);
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
    }, intervalMs);

    return () => clearInterval(timer);
  }, [playbackState.isPlaying, playbackState.speedMultiplier, playbackState.isLooping, activeFlow]);

  const handlePlay = useCallback(() => {
    setPlaybackState((prev) => ({
      ...prev,
      isPlaying: true,
      currentStepIndex: prev.currentStepIndex >= prev.totalSteps - 1 ? 0 : prev.currentStepIndex,
    }));
  }, []);

  const handlePause = useCallback(() => {
    setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const handleNext = useCallback(() => {
    setPlaybackState((prev) => ({
      ...prev,
      currentStepIndex: Math.min(prev.totalSteps - 1, prev.currentStepIndex + 1),
    }));
  }, []);

  const handlePrev = useCallback(() => {
    setPlaybackState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
    }));
  }, []);

  const handleRestart = useCallback(() => {
    setPlaybackState((prev) => ({
      ...prev,
      currentStepIndex: 0,
      isPlaying: false,
    }));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackState((prev) => ({ ...prev, speedMultiplier: speed }));
  }, []);

  const handleToggleLoop = useCallback(() => {
    setPlaybackState((prev) => ({ ...prev, isLooping: !prev.isLooping }));
  }, []);

  const handleResetCamera = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setCanvasKey((k) => k + 1);
  }, []);

  const handleNodeDragStop = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, position } : n)),
    );
  }, []);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId],
  );

  const sharedModel: ArchitectureModel = useMemo(() => {
    return createArchitectureModel(
      {
        id: 'arch-shared' as ArchitectureId,
        workspaceId: 'default' as WorkspaceId,
        name: viewTitle,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'v1' as VersionId,
        architectureId: 'arch-shared' as ArchitectureId,
        name: 'main',
        kind: 'main',
        status: 'open',
        createdAt: new Date(),
      },
      boutiqueBaseline.objects,
      boutiqueBaseline.connections,
    );
  }, [viewTitle, boutiqueBaseline]);

  const currentView: View = useMemo(
    () => ({
      id: 'view-shared' as ViewId,
      architectureId: 'arch-shared' as ArchitectureId,
      name: viewTitle,
      kind: 'container',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    [viewTitle],
  );

  if (!verificationResult.valid) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-3xl">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Share Link Unavailable</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          {verificationResult.reason === 'expired'
            ? 'This share link has expired. Please contact the author for a refreshed view link.'
            : 'The share link appears malformed or corrupted. Please verify the URL.'}
        </p>
        <Link
          href="/studio"
          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
        >
          Open Interactive Studio
        </Link>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden flex flex-col select-none">
      {/* Read-Only Top Navigation & Control Banner */}
      <ReadOnlyBanner
        viewName={viewTitle}
        selectedObjectName={
          selectedNode ? String(selectedNode.data?.label || selectedNode.id) : null
        }
        onResetView={handleResetCamera}
      />

      {/* Floating Action Controls */}
      <div className="fixed top-4 right-6 z-40 flex items-center gap-2">
        {/* Flow Selector if multiple flows */}
        {flows.length > 1 && (
          <select
            data-testid="share-flow-select"
            value={activeFlowIndex}
            onChange={(e) => setActiveFlowIndex(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-sky-300 font-medium shadow-lg backdrop-blur-md focus:outline-none focus:border-sky-500"
          >
            {flows.map((f, i) => (
              <option key={f.id} value={i}>
                {f.name} ({f.steps.length} steps)
              </option>
            ))}
          </select>
        )}

        {/* Toggle Flow Playback Button */}
        <button
          type="button"
          data-testid="toggle-flow-playback-btn"
          onClick={() => setIsFlowPlaybackActive((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border shadow-lg backdrop-blur-md transition-all ${
            isFlowPlaybackActive
              ? 'bg-sky-500 text-white border-sky-400 shadow-sky-950/50'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title="Toggle sequence playback animation"
        >
          <span>⚡</span>
          <span>Flow Trace</span>
        </button>

        {/* Export Button */}
        <button
          type="button"
          data-testid="toggle-export-btn"
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700 shadow-lg backdrop-blur-md transition-colors"
          title="Export Diagram"
        >
          <span>📥</span>
          <span>Export</span>
        </button>

        {/* Studio Button */}
        <Link
          href="/studio"
          data-testid="open-in-studio-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-950/50 backdrop-blur-md transition-colors"
          title="Open in Interactive Studio"
        >
          <span>🎨</span>
          <span>Studio</span>
        </Link>
      </div>

      {/* Main Interactive Diagram Canvas */}
      <div className="flex-1 w-full h-full">
        <InfiniteCanvas
          key={canvasKey}
          initialNodes={nodes}
          initialEdges={edges}
          showPalette={false}
          showTemplatePicker={false}
          onNodeSelect={(nodeId) => setSelectedNodeId(nodeId)}
          onEdgeSelect={(edgeId) => setSelectedEdgeId(edgeId)}
          onNodeDragStop={handleNodeDragStop}
        />
      </div>

      {/* Flow Playback Toolbar */}
      {isFlowPlaybackActive && activeFlow && (
        <FlowPlaybackToolbar
          state={playbackState}
          currentStepNote={currentStep?.note}
          persona={activeFlow.persona}
          actorAction={currentStep?.actorAction}
          userIntent={currentStep?.userIntent}
          onPlay={handlePlay}
          onPause={handlePause}
          onNext={handleNext}
          onPrev={handlePrev}
          onRestart={handleRestart}
          onSpeedChange={handleSpeedChange}
          onToggleLoop={handleToggleLoop}
        />
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          model={sharedModel}
          currentView={currentView}
          views={[currentView]}
        />
      )}
    </div>
  );
}

export default function SharePage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-sm font-medium text-slate-300">Loading shared diagram...</span>
          </div>
        </div>
      }
    >
      <SharePageContent />
    </Suspense>
  );
}

