'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type Flow,
  type FlowStep,
  type View,
  type ArchitectureDecisionRecord,
  type ObjectId,
  type ArchitecturePortalState,
  type PortalSearchResult,
  initArchitecturePortal,
  drillDownPortalToObject,
  navigatePortalUp,
  inspectPortalObject,
  getDependencyHighlighting,
  zoomPortalCamera,
  fitPortalCameraToNodes,
  initPortalFlowPlayback,
  stepPortalFlowPlayback,
  searchArchitecturePortal,
} from '@diagramhq/domain';

export interface ArchitecturePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  initialObjectId?: ObjectId;
  flows?: Flow[];
  flowSteps?: FlowStep[];
  views?: View[];
  adrs?: ArchitectureDecisionRecord[];
  onOpenDocPage?: (slug: string) => void;
}

export function ArchitecturePortalModal({
  isOpen,
  onClose,
  model,
  initialObjectId,
  flows = [],
  flowSteps = [],
  views = [],
  adrs = [],
  onOpenDocPage,
}: ArchitecturePortalModalProps): JSX.Element | null {
  // Initialize portal state
  const [portalState, setPortalState] = useState<ArchitecturePortalState>(() => {
    return initArchitecturePortal(model, { initialObjectId });
  });

  // Global search input and results
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchPopover, setShowSearchPopover] = useState(false);

  // Inspector and side drawer tab
  const [sideDrawerOpen, setSideDrawerOpen] = useState(true);

  // Search results
  const searchResults: PortalSearchResult[] = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchArchitecturePortal(model, searchQuery, {
      flows,
      views,
      adrs,
    });
  }, [model, searchQuery, flows, views, adrs]);

  if (!isOpen) return null;

  // Actions
  const handleSelectObject = (objectId: ObjectId) => {
    const inspector = inspectPortalObject(model, objectId, { flows, views, adrs });
    const highlighting = getDependencyHighlighting(model, objectId);

    setPortalState((prev) => ({
      ...prev,
      selectedObjectId: objectId,
      selectedConnectionId: null,
      inspector,
      highlightedDependencies: highlighting,
    }));
    setSideDrawerOpen(true);
  };

  const handleDrillDown = (objectId: ObjectId) => {
    const nextState = drillDownPortalToObject(portalState, model, objectId);
    setPortalState(nextState);
  };

  const handleNavigateUp = (breadcrumbIndex: number) => {
    const nextState = navigatePortalUp(portalState, model, breadcrumbIndex);
    setPortalState(nextState);
  };

  const handleZoom = (delta: number) => {
    setPortalState((prev) => ({
      ...prev,
      camera: zoomPortalCamera(prev.camera, delta),
    }));
  };

  const handleResetCamera = () => {
    setPortalState((prev) => ({
      ...prev,
      camera: fitPortalCameraToNodes(prev.drillDown.visibleNodes),
    }));
  };

  const handleSelectSearchResult = (result: PortalSearchResult) => {
    setShowSearchPopover(false);
    setSearchQuery('');

    if (result.type === 'object' && result.targetObjectId) {
      // If object belongs to a container or system not in view, drill down to its container
      if (result.targetParentId) {
        const nextState = drillDownPortalToObject(portalState, model, result.targetParentId);
        setPortalState(nextState);
      }
      handleSelectObject(result.targetObjectId);
    } else if (result.type === 'flow' && result.targetFlowId) {
      const selectedFlow = flows.find((f) => f.id === result.targetFlowId);
      if (selectedFlow) {
        handleStartFlow(selectedFlow);
      }
    } else if (result.type === 'doc' || result.type === 'adr') {
      onOpenDocPage?.(result.id);
    }
  };

  const handleStartFlow = (flow: Flow) => {
    const stepsForFlow = flowSteps.filter((s) => s.flowId === flow.id);
    const playback = initPortalFlowPlayback(flow, stepsForFlow, model.connections);
    setPortalState((prev) => ({
      ...prev,
      activeFlow: playback,
    }));
    setSideDrawerOpen(true);
  };

  const handleStepFlow = (delta: number) => {
    if (!portalState.activeFlow) return;
    const stepsForFlow = flowSteps.filter((s) => s.flowId === portalState.activeFlow?.flowId);
    const nextIndex = portalState.activeFlow.currentStepIndex + delta;
    const nextPlayback = stepPortalFlowPlayback(
      portalState.activeFlow,
      nextIndex,
      stepsForFlow,
      model.connections,
    );

    setPortalState((prev) => ({
      ...prev,
      activeFlow: nextPlayback,
    }));
  };

  const handleCloseFlow = () => {
    setPortalState((prev) => ({
      ...prev,
      activeFlow: null,
    }));
  };

  // Helper styles for object kinds
  const getKindColor = (kind: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      system: { bg: '#1e3a8a', border: '#3b82f6', text: '#93c5fd' },
      application: { bg: '#064e3b', border: '#10b981', text: '#6ee7b7' },
      component: { bg: '#581c87', border: '#8b5cf6', text: '#c4b5fd' },
      store: { bg: '#78350f', border: '#f59e0b', text: '#fde68a' },
      actor: { bg: '#831843', border: '#ec4899', text: '#fbcfe8' },
      group: { bg: '#1e293b', border: '#64748b', text: '#cbd5e1' },
    };
    return colors[kind] ?? { bg: '#1e293b', border: '#475569', text: '#cbd5e1' };
  };

  const visibleNodes = portalState.drillDown.visibleNodes;
  const currentLevel = portalState.drillDown.currentLevel;
  const breadcrumbs = portalState.drillDown.breadcrumbs;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#090d16',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      data-testid="architecture-portal-overlay"
    >
      {/* ==================================================================== */}
      {/* Top Header Bar */}
      {/* ==================================================================== */}
      <header
        style={{
          height: '60px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              padding: '6px 10px',
              backgroundColor: '#2563eb',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#ffffff',
            }}
          >
            DiagramHQ Portal
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                {portalState.architectureName}
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: '#065f46',
                  color: '#6ee7b7',
                }}
                data-testid="portal-mode-badge"
              >
                PUBLIC EXPLORER • NO ACCOUNT REQUIRED
              </span>
            </div>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div style={{ position: 'relative', width: '380px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchPopover(Boolean(e.target.value.trim()));
            }}
            onFocus={() => {
              if (searchQuery.trim()) setShowSearchPopover(true);
            }}
            placeholder="Search systems, components, flows, ADRs..."
            style={{
              width: '100%',
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none',
            }}
            data-testid="portal-search-input"
          />

          {showSearchPopover && (
            <div
              style={{
                position: 'absolute',
                top: '42px',
                left: 0,
                right: 0,
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                maxHeight: '340px',
                overflowY: 'auto',
                zIndex: 100,
                padding: '6px',
              }}
              data-testid="portal-search-popover"
            >
              {searchResults.length === 0 ? (
                <div style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                  No architectural entities found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#f8fafc',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      data-testid={`search-item-${res.id}`}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{res.title}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{res.subtitle}</div>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#0f172a',
                          color: '#38bdf8',
                          textTransform: 'uppercase',
                        }}
                      >
                        {res.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {flows.length > 0 && !portalState.activeFlow && (
            <select
              onChange={(e) => {
                const targetFlow = flows.find((f) => f.id === e.target.value);
                if (targetFlow) handleStartFlow(targetFlow);
              }}
              value=""
              style={{
                padding: '6px 12px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
                cursor: 'pointer',
              }}
              data-testid="select-flow-dropdown"
            >
              <option value="" disabled>
                Explore Execution Flow...
              </option>
              {flows.map((f) => (
                <option key={f.id} value={f.id}>
                  {`▶ ${f.name}`}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              backgroundColor: '#334155',
              border: 'none',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            data-testid="close-portal-btn"
          >
            Exit Explorer
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* Breadcrumb Navigation Bar & Level Indicator */}
      {/* ==================================================================== */}
      <div
        style={{
          height: '44px',
          backgroundColor: '#0b1120',
          borderBottom: '1px solid #1e293b',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <span style={{ color: '#64748b' }}>Navigation:</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={`crumb-${crumb.level}-${idx}`}>
              {idx > 0 && <span style={{ color: '#475569' }}>/</span>}
              <button
                type="button"
                onClick={() => handleNavigateUp(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: idx === breadcrumbs.length - 1 ? '#38bdf8' : '#94a3b8',
                  fontWeight: idx === breadcrumbs.length - 1 ? 700 : 500,
                  cursor: 'pointer',
                  textDecoration: idx < breadcrumbs.length - 1 ? 'underline' : 'none',
                }}
                data-testid={`breadcrumb-${idx}`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: '#1e3a8a',
              color: '#bfdbfe',
            }}
            data-testid="current-level-badge"
          >
            {`C4 LEVEL: ${currentLevel.toUpperCase()}`}
          </span>

          {breadcrumbs.length > 1 && (
            <button
              type="button"
              onClick={() => handleNavigateUp(breadcrumbs.length - 2)}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f8fafc',
                cursor: 'pointer',
              }}
              data-testid="drill-up-btn"
            >
              ↑ Up Level
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Main Canvas & Inspector Layout */}
      {/* ==================================================================== */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Canvas Viewport */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            backgroundColor: '#090d16',
            overflow: 'hidden',
            cursor: 'grab',
          }}
          data-testid="portal-canvas-viewport"
        >
          {/* Zoom & Fit Floating Controls */}
          <div
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '24px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
              zIndex: 10,
            }}
          >
            <button
              type="button"
              onClick={() => handleZoom(0.2)}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '14px',
                cursor: 'pointer',
              }}
              data-testid="zoom-in-btn"
            >
              +
            </button>
            <span style={{ fontSize: '11px', color: '#94a3b8', padding: '0 4px', minWidth: '40px', textAlign: 'center' }}>
              {`${Math.round(portalState.camera.zoom * 100)}%`}
            </span>
            <button
              type="button"
              onClick={() => handleZoom(-0.2)}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '14px',
                cursor: 'pointer',
              }}
              data-testid="zoom-out-btn"
            >
              −
            </button>
            <button
              type="button"
              onClick={handleResetCamera}
              style={{
                padding: '8px 12px',
                backgroundColor: '#1e293b',
                borderLeft: '1px solid #334155',
                border: 'none',
                color: '#38bdf8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              data-testid="reset-camera-btn"
            >
              Fit View
            </button>
          </div>

          {/* Rendered Nodes Container (Scaled with Camera) */}
          <div
            style={{
              position: 'absolute',
              top: '50px',
              left: '50px',
              transform: `scale(${portalState.camera.zoom})`,
              transformOrigin: 'top left',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '40px',
              maxWidth: '900px',
            }}
            data-testid="portal-nodes-container"
          >
            {visibleNodes.map((node) => {
              const isSelected = portalState.selectedObjectId === node.id;
              const isUpstream = portalState.highlightedDependencies?.upstreamNodeIds.includes(node.id);
              const isDownstream = portalState.highlightedDependencies?.downstreamNodeIds.includes(node.id);
              const kindColors = getKindColor(node.kind);

              let borderColor = kindColors.border;
              if (isSelected) borderColor = '#38bdf8';
              else if (isUpstream) borderColor = '#06b6d4';
              else if (isDownstream) borderColor = '#f59e0b';

              return (
                <div
                  key={node.id}
                  onClick={() => handleSelectObject(node.id)}
                  style={{
                    width: '260px',
                    backgroundColor: '#1e293b',
                    border: `2px solid ${borderColor}`,
                    borderRadius: '10px',
                    padding: '16px',
                    boxShadow: isSelected
                      ? '0 0 0 3px rgba(56, 189, 248, 0.4)'
                      : '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  data-testid={`portal-node-${node.id}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: kindColors.bg,
                        color: kindColors.text,
                      }}
                    >
                      {node.kind}
                    </span>
                    {node.status && (
                      <span style={{ fontSize: '10px', color: '#6ee7b7' }}>{node.status}</span>
                    )}
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                      {node.name}
                    </h3>
                    {node.description && (
                      <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                        {node.description}
                      </p>
                    )}
                  </div>

                  {node.technology && (
                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      <span style={{ color: '#64748b' }}>Tech: </span>
                      <code style={{ backgroundColor: '#0f172a', padding: '1px 5px', borderRadius: '4px' }}>
                        {node.technology}
                      </code>
                    </div>
                  )}

                  <div
                    style={{
                      borderTop: '1px solid #334155',
                      paddingTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#94a3b8',
                    }}
                  >
                    <span>{`${node.inboundCount} in • ${node.outboundCount} out`}</span>

                    {node.childCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDrillDown(node.id);
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#2563eb',
                          border: 'none',
                          borderRadius: '4px',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                        data-testid={`drilldown-btn-${node.id}`}
                      >
                        {`Drill Down (${node.childCount}) →`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* Right Side Drawer (Object Inspector or Flow Playback) */}
        {/* ==================================================================== */}
        {sideDrawerOpen && (
          <aside
            style={{
              width: '380px',
              backgroundColor: '#0f172a',
              borderLeft: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              overflowY: 'auto',
            }}
            data-testid="portal-side-drawer"
          >
            {/* Active Execution Flow Playback Mode */}
            {portalState.activeFlow ? (
              <div style={{ padding: '24px' }} data-testid="flow-playback-drawer">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      backgroundColor: '#1e3a8a',
                      color: '#93c5fd',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    Execution Flow Playback
                  </span>
                  <button
                    type="button"
                    onClick={handleCloseFlow}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
                  >
                    ✕ Close Flow
                  </button>
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
                  {portalState.activeFlow.flowName}
                </h2>
                {portalState.activeFlow.description && (
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
                    {portalState.activeFlow.description}
                  </p>
                )}

                {/* Step indicator */}
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                  }}
                  data-testid="flow-active-step-card"
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
                    {`Step ${(portalState.activeFlow.currentStepIndex + 1)} of ${Math.max(1, portalState.activeFlow.totalSteps)}`}
                  </div>

                  {portalState.activeFlow.activeStep ? (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                        {portalState.activeFlow.activeStep.label || 'Invokes downstream endpoint'}
                      </div>
                      {portalState.activeFlow.activeStep.note && (
                        <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0 }}>
                          {portalState.activeFlow.activeStep.note}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>No step information available.</div>
                  )}

                  {/* Playback step buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <button
                      type="button"
                      disabled={portalState.activeFlow.currentStepIndex <= 0}
                      onClick={() => handleStepFlow(-1)}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        backgroundColor: '#334155',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: portalState.activeFlow.currentStepIndex <= 0 ? 'not-allowed' : 'pointer',
                        opacity: portalState.activeFlow.currentStepIndex <= 0 ? 0.5 : 1,
                      }}
                      data-testid="flow-prev-step-btn"
                    >
                      ← Previous
                    </button>
                    <button
                      type="button"
                      disabled={portalState.activeFlow.currentStepIndex >= portalState.activeFlow.totalSteps - 1}
                      onClick={() => handleStepFlow(1)}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        backgroundColor: '#2563eb',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor:
                          portalState.activeFlow.currentStepIndex >= portalState.activeFlow.totalSteps - 1
                            ? 'not-allowed'
                            : 'pointer',
                        opacity:
                          portalState.activeFlow.currentStepIndex >= portalState.activeFlow.totalSteps - 1 ? 0.5 : 1,
                      }}
                      data-testid="flow-next-step-btn"
                    >
                      Next Step →
                    </button>
                  </div>
                </div>
              </div>
            ) : portalState.inspector ? (
              /* Object Inspector Mode */
              <div style={{ padding: '24px' }} data-testid="portal-object-inspector">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: getKindColor(portalState.inspector.object.kind).bg,
                      color: getKindColor(portalState.inspector.object.kind).text,
                    }}
                    data-testid="inspector-kind-badge"
                  >
                    {portalState.inspector.object.kind}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSideDrawerOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
                  >
                    ✕ Close
                  </button>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: '#f8fafc' }} data-testid="inspector-title">
                  {portalState.inspector.object.name}
                </h2>
                {portalState.inspector.object.description && (
                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                    {portalState.inspector.object.description}
                  </p>
                )}

                {/* Metadata Properties */}
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '12px',
                    marginBottom: '20px',
                  }}
                >
                  {portalState.inspector.object.technology && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Technology:</span>
                      <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {portalState.inspector.object.technology}
                      </span>
                    </div>
                  )}
                  {portalState.inspector.object.owner && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Owner:</span>
                      <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {portalState.inspector.object.owner}
                      </span>
                    </div>
                  )}
                  {portalState.inspector.object.sla && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>SLA Target:</span>
                      <span style={{ fontWeight: 600, color: '#34d399' }}>
                        {portalState.inspector.object.sla}
                      </span>
                    </div>
                  )}
                </div>

                {/* Contained Children (Subcomponents) */}
                {portalState.inspector.children.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>
                      {`Contained Subcomponents (${portalState.inspector.children.length})`}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {portalState.inspector.children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleDrillDown(portalState.inspector!.object.id)}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#f8fafc',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{child.name}</span>
                          <span style={{ fontSize: '11px', color: '#38bdf8' }}>Drill In →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inbound Callers (Upstream Dependencies) */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>
                    {`Inbound Callers (${portalState.inspector.inboundDependencies.length})`}
                  </div>
                  {portalState.inspector.inboundDependencies.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#475569' }}>No inbound callers connected.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {portalState.inspector.inboundDependencies.map((dep) => (
                        <div
                          key={`in-${dep.connectionId}`}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#1e293b',
                            borderRadius: '6px',
                            fontSize: '12px',
                          }}
                          data-testid="inbound-dep-card"
                        >
                          <div style={{ fontWeight: 600, color: '#38bdf8' }}>{dep.source.name}</div>
                          {dep.label && <div style={{ color: '#94a3b8', fontSize: '11px' }}>{dep.label}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outbound Downstream Dependencies */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>
                    {`Outbound Dependencies (${portalState.inspector.outboundDependencies.length})`}
                  </div>
                  {portalState.inspector.outboundDependencies.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#475569' }}>No outbound dependencies connected.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {portalState.inspector.outboundDependencies.map((dep) => (
                        <div
                          key={`out-${dep.connectionId}`}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#1e293b',
                            borderRadius: '6px',
                            fontSize: '12px',
                          }}
                          data-testid="outbound-dep-card"
                        >
                          <div style={{ fontWeight: 600, color: '#f59e0b' }}>{dep.target.name}</div>
                          {dep.label && <div style={{ color: '#94a3b8', fontSize: '11px' }}>{dep.label}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Associated ADRs */}
                {portalState.inspector.associatedAdrs.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>
                      {`Architecture Decisions (${portalState.inspector.associatedAdrs.length})`}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {portalState.inspector.associatedAdrs.map((adr) => (
                        <div
                          key={`adr-${adr.adrId}`}
                          onClick={() => onOpenDocPage?.(adr.adrId)}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#1e293b',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: onOpenDocPage ? 'pointer' : 'default',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                            {`ADR-${adr.number}: ${adr.title}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '24px', color: '#64748b', textAlign: 'center', marginTop: '60px' }}>
                Click any architectural entity on the canvas to inspect its dependencies and governance.
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
