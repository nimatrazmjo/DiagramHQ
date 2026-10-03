'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type DocGenerationContext,
  type ObjectDocPage,
  type ObjectKind,
  type ObjectId,
  buildArchitectureDocTree,
  searchDocTree,
  generateObjectDocPage,
  generateArchitectureOverviewDocPage,
} from '@diagramhq/domain';

export interface ArchitectureDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  selectedObjectId?: string;
  context?: DocGenerationContext;
  onSelectNode?: (nodeId: string) => void;
}

type TabType = 'overview' | 'connections' | 'hierarchy' | 'markdown' | 'artifacts';

// ============================================================================
// Badges and Styling Helpers
// ============================================================================

function KindBadge({ kind }: { kind: ObjectKind | 'architecture' | string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    architecture: { bg: '#312e81', text: '#c7d2fe' },
    system: { bg: '#1e3a8a', text: '#93c5fd' },
    application: { bg: '#064e3b', text: '#6ee7b7' },
    component: { bg: '#581c87', text: '#d8b4fe' },
    store: { bg: '#78350f', text: '#fde68a' },
    actor: { bg: '#831843', text: '#fbcfe8' },
    group: { bg: '#1e293b', text: '#94a3b8' },
  };

  const fallback = { bg: '#1e293b', text: '#94a3b8' };
  const s = styles[kind] ?? fallback;

  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {(kind || '').toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const clean = (status || 'active').toLowerCase();
  const styles: Record<string, { bg: string; text: string }> = {
    active: { bg: '#064e3b', text: '#6ee7b7' },
    planned: { bg: '#1e3a8a', text: '#93c5fd' },
    deprecated: { bg: '#78350f', text: '#fde68a' },
    retired: { bg: '#7f1d1d', text: '#fca5a5' },
  };

  const fallback = { bg: '#064e3b', text: '#6ee7b7' };
  const s = styles[clean] ?? fallback;

  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
      }}
    >
      {status || 'ACTIVE'}
    </span>
  );
}

function CriticalityBadge({ criticality }: { criticality?: string }) {
  if (!criticality) return null;
  const clean = criticality.toLowerCase();
  const styles: Record<string, { bg: string; text: string }> = {
    critical: { bg: '#7f1d1d', text: '#fca5a5' },
    high: { bg: '#831843', text: '#fbcfe8' },
    medium: { bg: '#78350f', text: '#fde68a' },
    low: { bg: '#1e3a8a', text: '#93c5fd' },
  };

  const fallback = { bg: '#1e3a8a', text: '#93c5fd' };
  const s = styles[clean] ?? fallback;

  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: 700,
      }}
    >
      {`${criticality.toUpperCase()} CRITICALITY`}
    </span>
  );
}

// ============================================================================
// Main Modal Component
// ============================================================================

export function ArchitectureDocumentationModal({
  isOpen,
  onClose,
  model,
  selectedObjectId,
  context,
  onSelectNode,
}: ArchitectureDocumentationModalProps) {
  const [activeNodeId, setActiveNodeId] = useState<string>(
    selectedObjectId || 'architecture-root',
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copied, setCopied] = useState<boolean>(false);

  // Synchronize when selectedObjectId prop changes
  React.useEffect(() => {
    if (selectedObjectId) {
      setActiveNodeId(selectedObjectId);
    }
  }, [selectedObjectId]);

  // Build full documentation tree
  const tree = useMemo(() => {
    return buildArchitectureDocTree(model);
  }, [model]);

  // Search filtered nodes list
  const filteredTreeNodes = useMemo(() => {
    return searchDocTree(tree, searchQuery);
  }, [tree, searchQuery]);

  // Generate active documentation page
  const docPage: ObjectDocPage = useMemo(() => {
    if (!activeNodeId || activeNodeId === 'architecture-root') {
      return generateArchitectureOverviewDocPage(model, context);
    }
    const cleanId = activeNodeId.startsWith('doc-')
      ? activeNodeId.replace(/^doc-/, '')
      : activeNodeId;

    const exists = model.objects.some((o) => o.id === cleanId);
    if (!exists) {
      return generateArchitectureOverviewDocPage(model, context);
    }
    return generateObjectDocPage(cleanId as ObjectId, model, context);
  }, [activeNodeId, model, context]);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(docPage.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectObject = (objectId: string) => {
    setActiveNodeId(objectId);
  };

  const handleJumpToCanvas = (objectId?: ObjectId) => {
    if (objectId && onSelectNode) {
      onSelectNode(objectId);
      onClose();
    }
  };

  return (
    <div
      data-testid="architecture-documentation-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '95vw',
          maxWidth: '1360px',
          height: '88vh',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #334155',
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '16px',
                color: '#ffffff',
              }}
            >
              📖
            </div>
            <div>
              <h2
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  margin: 0,
                  color: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Architecture Living Documentation</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#94a3b8',
                    backgroundColor: '#0f172a',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                  }}
                >
                  {`${model.objects.length} Objects`}
                </span>
              </h2>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                {`System: ${model.architecture.name}`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              data-testid="copy-markdown-btn"
              onClick={handleCopyMarkdown}
              style={{
                background: '#334155',
                color: '#f8fafc',
                border: '1px solid #475569',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {copied ? '✓ Copied Markdown' : '📋 Copy Markdown'}
            </button>

            {docPage.objectId && (
              <button
                data-testid="jump-canvas-btn"
                onClick={() => handleJumpToCanvas(docPage.objectId)}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Target in Canvas
              </button>
            )}

            <button
              data-testid="close-documentation-btn"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Breadcrumb Navigation Bar */}
        <div
          data-testid="doc-breadcrumbs-bar"
          style={{
            padding: '8px 20px',
            backgroundColor: '#090d16',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#94a3b8',
            flexShrink: 0,
            overflowX: 'auto',
          }}
        >
          <span style={{ color: '#64748b' }}>Location:</span>
          {docPage.breadcrumbs.map((crumb, idx) => {
            const isLast = idx === docPage.breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id || idx}>
                {idx > 0 && <span style={{ color: '#475569' }}>/</span>}
                <button
                  onClick={() => handleSelectObject(crumb.objectId || 'architecture-root')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: isLast ? '#38bdf8' : '#cbd5e1',
                    fontWeight: isLast ? 700 : 500,
                    cursor: 'pointer',
                    textDecoration: isLast ? 'none' : 'underline',
                  }}
                >
                  {crumb.title}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Main Body (2 Columns: Tree Sidebar & Doc Content) */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left Navigation Tree Sidebar */}
          <div
            data-testid="doc-tree-sidebar"
            style={{
              width: '320px',
              flexShrink: 0,
              borderRight: '1px solid #334155',
              backgroundColor: '#0b1120',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Tree Search Box */}
            <div style={{ padding: '12px', borderBottom: '1px solid #1e293b' }}>
              <input
                data-testid="doc-tree-search"
                type="text"
                placeholder="Filter architecture tree..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Tree Navigation List */}
            <div
              data-testid="doc-tree-list"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 6px',
              }}
            >
              {/* Architecture Root Item */}
              <button
                data-testid="doc-tree-root-item"
                onClick={() => handleSelectObject('architecture-root')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: activeNodeId === 'architecture-root' ? '#1e293b' : 'transparent',
                  border: activeNodeId === 'architecture-root' ? '1px solid #3b82f6' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  marginBottom: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: activeNodeId === 'architecture-root' ? '#38bdf8' : '#f8fafc',
                  fontWeight: activeNodeId === 'architecture-root' ? 700 : 500,
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏛️</span>
                  <span>{tree.root.title}</span>
                </div>
                <KindBadge kind="architecture" />
              </button>

              {/* Subsystem & Component Tree Nodes */}
              {filteredTreeNodes
                .filter((n) => n.id !== 'architecture-root')
                .map((node) => {
                  const isSelected = activeNodeId === node.objectId || activeNodeId === node.id;
                  const indentPx = Math.max(0, (node.depth - 1) * 16);

                  return (
                    <button
                      key={node.id}
                      data-testid={`doc-tree-node-${node.objectId || node.id}`}
                      onClick={() => handleSelectObject(node.objectId || node.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: isSelected ? '#1e293b' : 'transparent',
                        border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        paddingLeft: `${8 + indentPx}px`,
                        marginBottom: '2px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: isSelected ? '#38bdf8' : '#cbd5e1',
                        fontSize: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {node.depth > 1 ? '↳' : '•'}
                        </span>
                        <span style={{ fontWeight: isSelected ? 700 : 500 }}>{node.title}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {(node.inboundCount > 0 || node.outboundCount > 0) && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: '#94a3b8',
                              background: '#1e293b',
                              padding: '1px 4px',
                              borderRadius: '3px',
                            }}
                          >
                            {`${node.inboundCount}in/${node.outboundCount}out`}
                          </span>
                        )}
                        <KindBadge kind={node.kind} />
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Right Main Content Area (Active Doc Page) */}
          <div
            data-testid="doc-page-content"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0f172a',
              overflow: 'hidden',
            }}
          >
            {/* Doc Header Banner */}
            <div
              style={{
                padding: '20px 24px 16px 24px',
                borderBottom: '1px solid #1e293b',
                backgroundColor: '#131d31',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <KindBadge kind={docPage.kind} />
                    <StatusBadge status={docPage.metadata.status} />
                    <CriticalityBadge criticality={docPage.metadata.criticality} />
                    {docPage.metadata.team && (
                      <span
                        style={{
                          background: '#1e293b',
                          color: '#94a3b8',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                      >
                        {`Team: ${docPage.metadata.team}`}
                      </span>
                    )}
                  </div>

                  <h1
                    data-testid="doc-page-title"
                    style={{
                      fontSize: '22px',
                      fontWeight: 800,
                      margin: '0 0 6px 0',
                      color: '#f8fafc',
                    }}
                  >
                    {docPage.title}
                  </h1>

                  <p
                    data-testid="doc-page-description"
                    style={{
                      fontSize: '13px',
                      color: '#cbd5e1',
                      margin: 0,
                      lineHeight: '1.5',
                      maxWidth: '900px',
                    }}
                  >
                    {docPage.description}
                  </p>
                </div>

                {docPage.parent && (
                  <div
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      textAlign: 'right',
                    }}
                  >
                    <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase' }}>
                      Enclosed In
                    </div>
                    <button
                      onClick={() => handleSelectObject(docPage.parent!.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        marginTop: '2px',
                      }}
                    >
                      {docPage.parent.name}
                    </button>
                  </div>
                )}
              </div>

              {/* Tab Navigation */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '18px',
                  borderTop: '1px solid #1e293b',
                  paddingTop: '12px',
                }}
              >
                {(
                  [
                    { id: 'overview', label: 'Overview & Metadata' },
                    {
                      id: 'connections',
                      label: `Connections (${docPage.inboundConnections.length + docPage.outboundConnections.length})`,
                    },
                    {
                      id: 'hierarchy',
                      label: `Hierarchy (${docPage.children.length})`,
                    },
                    { id: 'markdown', label: 'Markdown Spec' },
                    {
                      id: 'artifacts',
                      label: `Artifacts (${docPage.associatedAdrs.length + docPage.associatedFlows.length + docPage.associatedViews.length})`,
                    },
                  ] as const
                ).map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      data-testid={`tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        background: isActive ? '#2563eb' : '#1e293b',
                        color: isActive ? '#ffffff' : '#94a3b8',
                        border: '1px solid',
                        borderColor: isActive ? '#3b82f6' : '#334155',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content Panes */}
            <div
              data-testid="doc-tab-content"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
              }}
            >
              {/* TAB 1: Overview & Metadata */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Technical & Governance Spec Cards */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                        Technology
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginTop: '4px' }}>
                        {docPage.metadata.technology || 'Unspecified'}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                        Domain
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginTop: '4px' }}>
                        {docPage.metadata.domain || 'General Core'}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                        Environment
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginTop: '4px' }}>
                        {docPage.metadata.environment || 'Production'}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                        SLA / Availability
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginTop: '4px' }}>
                        {docPage.metadata.sla || 'Standard tier'}
                      </div>
                    </div>
                  </div>

                  {/* Structured Sections */}
                  {docPage.sections.map((section) => (
                    <div
                      key={section.id}
                      style={{
                        backgroundColor: '#131d31',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        padding: '16px',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          margin: '0 0 10px 0',
                          color: '#38bdf8',
                        }}
                      >
                        {section.title}
                      </h3>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#cbd5e1',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {section.content}
                      </div>
                    </div>
                  ))}

                  {/* Tags and Custom Metadata Fields */}
                  {docPage.metadata.tags.length > 0 && (
                    <div
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '14px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                        Architectural Tags
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {docPage.metadata.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              background: '#334155',
                              color: '#f8fafc',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}
                          >
                            {`#${tag}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Connections & Interfaces */}
              {activeTab === 'connections' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Inbound Callers Table */}
                  <div
                    style={{
                      backgroundColor: '#131d31',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '16px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        margin: '0 0 12px 0',
                        color: '#6ee7b7',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>Inbound Integrations (Who Calls This)</span>
                      <span
                        style={{
                          fontSize: '11px',
                          background: '#064e3b',
                          color: '#6ee7b7',
                          padding: '2px 6px',
                          borderRadius: '10px',
                        }}
                      >
                        {`${docPage.inboundConnections.length}`}
                      </span>
                    </h3>

                    {docPage.inboundConnections.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        No inbound caller connections recorded.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                            <th style={{ padding: '8px' }}>Caller System</th>
                            <th style={{ padding: '8px' }}>Kind</th>
                            <th style={{ padding: '8px' }}>Label / Action</th>
                            <th style={{ padding: '8px' }}>Protocol</th>
                            <th style={{ padding: '8px' }}>Technology</th>
                          </tr>
                        </thead>
                        <tbody>
                          {docPage.inboundConnections.map((conn) => (
                            <tr
                              key={conn.connectionId}
                              style={{ borderBottom: '1px solid #1e293b' }}
                            >
                              <td style={{ padding: '8px', fontWeight: 600 }}>
                                <button
                                  onClick={() => handleSelectObject(conn.sourceId)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#38bdf8',
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontWeight: 600,
                                  }}
                                >
                                  {conn.sourceName}
                                </button>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <KindBadge kind={conn.sourceKind} />
                              </td>
                              <td style={{ padding: '8px', color: '#cbd5e1' }}>
                                {conn.label || conn.description || 'Calls'}
                              </td>
                              <td style={{ padding: '8px', color: '#94a3b8' }}>
                                {conn.protocol || conn.kind}
                              </td>
                              <td style={{ padding: '8px', color: '#94a3b8' }}>
                                {conn.technology || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Outbound Dependencies Table */}
                  <div
                    style={{
                      backgroundColor: '#131d31',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '16px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        margin: '0 0 12px 0',
                        color: '#fde68a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>Outbound Dependencies (What This Relies On)</span>
                      <span
                        style={{
                          fontSize: '11px',
                          background: '#78350f',
                          color: '#fde68a',
                          padding: '2px 6px',
                          borderRadius: '10px',
                        }}
                      >
                        {`${docPage.outboundConnections.length}`}
                      </span>
                    </h3>

                    {docPage.outboundConnections.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        No outbound downstream dependencies recorded.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                            <th style={{ padding: '8px' }}>Target Component</th>
                            <th style={{ padding: '8px' }}>Kind</th>
                            <th style={{ padding: '8px' }}>Description</th>
                            <th style={{ padding: '8px' }}>Protocol</th>
                            <th style={{ padding: '8px' }}>Technology</th>
                          </tr>
                        </thead>
                        <tbody>
                          {docPage.outboundConnections.map((conn) => (
                            <tr
                              key={conn.connectionId}
                              style={{ borderBottom: '1px solid #1e293b' }}
                            >
                              <td style={{ padding: '8px', fontWeight: 600 }}>
                                <button
                                  onClick={() => handleSelectObject(conn.targetId)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#38bdf8',
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontWeight: 600,
                                  }}
                                >
                                  {conn.targetName}
                                </button>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <KindBadge kind={conn.targetKind} />
                              </td>
                              <td style={{ padding: '8px', color: '#cbd5e1' }}>
                                {conn.label || conn.description || 'Depends on'}
                              </td>
                              <td style={{ padding: '8px', color: '#94a3b8' }}>
                                {conn.protocol || conn.kind}
                              </td>
                              <td style={{ padding: '8px', color: '#94a3b8' }}>
                                {conn.technology || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Hierarchy & Subcomponents */}
              {activeTab === 'hierarchy' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      backgroundColor: '#131d31',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '16px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px 0', color: '#d8b4fe' }}>
                      {`Contained Subcomponents (${docPage.children.length})`}
                    </h3>

                    {docPage.children.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        This object contains no child components or nested containers.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                        {docPage.children.map((child) => (
                          <div
                            key={child.objectId}
                            style={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <KindBadge kind={child.kind} />
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{child.technology || '-'}</span>
                              </div>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#f8fafc' }}>
                                {child.name}
                              </h4>
                              {child.description && (
                                <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                                  {child.description}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => handleSelectObject(child.objectId)}
                              style={{
                                marginTop: '12px',
                                background: '#334155',
                                border: '1px solid #475569',
                                color: '#38bdf8',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                alignSelf: 'flex-start',
                              }}
                            >
                              Open Doc Page →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Markdown Spec */}
              {activeTab === 'markdown' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      GitHub Flavored Markdown Document representation
                    </span>
                    <button
                      onClick={handleCopyMarkdown}
                      style={{
                        background: '#334155',
                        color: '#f8fafc',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre
                    data-testid="doc-markdown-pre"
                    style={{
                      backgroundColor: '#090d16',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '16px',
                      color: '#cbd5e1',
                      fontSize: '12px',
                      lineHeight: '1.5',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {docPage.markdown}
                  </pre>
                </div>
              )}

              {/* TAB 5: Associated Artifacts */}
              {activeTab === 'artifacts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* ADRs */}
                  <div
                    style={{
                      backgroundColor: '#131d31',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '16px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px 0', color: '#38bdf8' }}>
                      {`Architecture Decision Records (${docPage.associatedAdrs.length})`}
                    </h3>
                    {docPage.associatedAdrs.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        No Architecture Decision Records (ADRs) attached to this entity.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {docPage.associatedAdrs.map((adr) => (
                          <div
                            key={adr.adrId}
                            style={{
                              backgroundColor: '#1e293b',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              border: '1px solid #334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '13px' }}>
                                {`ADR-${String(adr.number).padStart(3, '0')}: `}
                              </span>
                              <span style={{ color: '#cbd5e1', fontSize: '13px' }}>{adr.title}</span>
                            </div>
                            <span
                              style={{
                                background: '#064e3b',
                                color: '#6ee7b7',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              {adr.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Flows */}
                  <div
                    style={{
                      backgroundColor: '#131d31',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '16px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px 0', color: '#a78bfa' }}>
                      {`Execution Flows (${docPage.associatedFlows.length})`}
                    </h3>
                    {docPage.associatedFlows.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        No execution flows currently reference this entity.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {docPage.associatedFlows.map((flow) => (
                          <div
                            key={flow.flowId}
                            style={{
                              backgroundColor: '#1e293b',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              border: '1px solid #334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>
                                {flow.name}
                              </span>
                              {flow.description && (
                                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                                  {flow.description}
                                </p>
                              )}
                            </div>
                            <span
                              style={{
                                background: '#1e293b',
                                color: '#93c5fd',
                                border: '1px solid #3b82f6',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                              }}
                            >
                              {flow.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
