'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type DependencyGraphReport,
  type DependencyEdge,
  type DependencyFilterOptions,
  type DependencyCategoryFilter,
  type DependencyTypeFilter,
  analyzeArchitectureDependencies,
} from '@diagramhq/domain';

export interface DependencyAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  onSelectNode?: (nodeId: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  runtime: { bg: '#1a3a5c', text: '#90caf9' },
  'compile-time': { bg: '#4a1a5c', text: '#ce93d8' },
  data: { bg: '#1a4a2e', text: '#a5d6a7' },
  external: { bg: '#4a3a1a', text: '#ffcc80' },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  direct: { bg: '#1a3a5c', text: '#90caf9' },
  indirect: { bg: '#3a1a1a', text: '#ef9a9a' },
};

function MetricCard({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        background: danger ? '#3b1414' : accent ? '#1a2a4a' : '#1e293b',
        border: `1px solid ${danger ? '#7f1d1d' : accent ? '#334d80' : '#334155'}`,
        borderRadius: '8px',
        padding: '12px 14px',
        minWidth: '90px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: danger ? '#fca5a5' : accent ? '#93c5fd' : '#e2e8f0',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.3 }}>
        {label}
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? { bg: '#1e293b', text: '#94a3b8' };
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        borderRadius: '4px',
        padding: '2px 7px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.03em',
        textTransform: 'capitalize',
      }}
    >
      {category}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors = TYPE_COLORS[type] ?? { bg: '#1e293b', text: '#94a3b8' };
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        borderRadius: '4px',
        padding: '2px 7px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {type}
    </span>
  );
}

function EdgeCard({
  edge,
  onSelectNode,
}: {
  edge: DependencyEdge;
  onSelectNode?: (nodeId: string) => void;
}) {
  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      {/* Source → Target */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => onSelectNode?.(edge.sourceObjectId as string)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: onSelectNode ? 'pointer' : 'default',
            color: '#93c5fd',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {edge.sourceName}
        </button>
        <span style={{ color: '#64748b', fontSize: '13px' }}>→</span>
        <button
          onClick={() => onSelectNode?.(edge.targetObjectId as string)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: onSelectNode ? 'pointer' : 'default',
            color: '#93c5fd',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {edge.targetName}
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px', flexShrink: 0 }}>
          <TypeBadge type={edge.type} />
          <CategoryBadge category={edge.category} />
        </div>
      </div>

      {/* Hop count + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#94a3b8' }}>
        <span>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '3px' }}
          >
            alt_route
          </span>
          {edge.hopCount} hop{edge.hopCount !== 1 ? 's' : ''}
        </span>
        {edge.label && (
          <span style={{ color: '#64748b', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {edge.label}
          </span>
        )}
      </div>
    </div>
  );
}

export function DependencyAnalysisModal({
  isOpen,
  onClose,
  model,
  onSelectNode,
}: DependencyAnalysisModalProps): React.JSX.Element | null {
  const [typeFilter, setTypeFilter] = useState<DependencyTypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<DependencyCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('all');

  const filterOptions = useMemo<DependencyFilterOptions>(() => {
    const opts: DependencyFilterOptions = {};
    if (typeFilter !== 'all') opts.type = typeFilter;
    if (categoryFilter !== 'all') opts.category = categoryFilter;
    return opts;
  }, [typeFilter, categoryFilter]);

  const report: DependencyGraphReport = useMemo(() => {
    return analyzeArchitectureDependencies(model, filterOptions);
  }, [model, filterOptions]);

  if (!isOpen) return null;

  // Apply search + node focus client-side (after domain filtering)
  const filteredEdges = report.edges.filter((edge) => {
    if (selectedNodeId !== 'all') {
      if (
        (edge.sourceObjectId as string) !== selectedNodeId &&
        (edge.targetObjectId as string) !== selectedNodeId
      )
        return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !edge.sourceName.toLowerCase().includes(q) &&
        !edge.targetName.toLowerCase().includes(q) &&
        !edge.category.toLowerCase().includes(q) &&
        !edge.type.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const handleNodeSelect = (nodeId: string) => {
    onSelectNode?.(nodeId);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dependency-analysis-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid #1e293b',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className="material-symbols-outlined"
              style={{ color: '#60a5fa', fontSize: '22px' }}
            >
              account_tree
            </span>
            <h2
              id="dependency-analysis-modal-title"
              style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}
            >
              Dependency Analysis
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        {/* ── Cycle Warning Banner ── */}
        {report.metrics.hasCycles && (
          <div
            role="alert"
            style={{
              background: '#450a0a',
              borderBottom: '1px solid #7f1d1d',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: '#fca5a5', fontSize: '18px' }}
            >
              error
            </span>
            <span style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 600 }}>
              {report.metrics.cycleCount} circular dependency{report.metrics.cycleCount !== 1 ? 'cycles' : ''} detected —
            </span>
            <span style={{ color: '#f87171', fontSize: '13px' }}>
              {report.cycles.map((c) => c.pathDescription).join(' | ')}
            </span>
          </div>
        )}

        {/* ── Metrics KPI row ── */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #1e293b',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              overflowX: 'auto',
            }}
          >
            <MetricCard label="Nodes" value={report.metrics.totalNodes} />
            <MetricCard label="Direct" value={report.metrics.directDependencyCount} accent />
            <MetricCard label="Indirect" value={report.metrics.indirectDependencyCount} />
            <MetricCard label="Runtime" value={report.metrics.runtimeCount} />
            <MetricCard label="Compile-time" value={report.metrics.compileTimeCount} />
            <MetricCard label="Data" value={report.metrics.dataCount} />
            <MetricCard label="External" value={report.metrics.externalCount} />
            <MetricCard
              label="Cycles"
              value={report.metrics.cycleCount}
              danger={report.metrics.hasCycles}
            />
          </div>
        </div>

        {/* ── Filters ── */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {/* Type filter */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>Type:</span>
            {(['all', 'direct', 'indirect'] as DependencyTypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  background: typeFilter === t ? '#1e40af' : '#1e293b',
                  color: typeFilter === t ? '#bfdbfe' : '#94a3b8',
                  border: `1px solid ${typeFilter === t ? '#3b82f6' : '#334155'}`,
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: typeFilter === t ? 600 : 400,
                  textTransform: 'capitalize',
                }}
              >
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as DependencyCategoryFilter)}
              style={{
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Categories</option>
              <option value="runtime">Runtime</option>
              <option value="compile-time">Compile-time</option>
              <option value="data">Data</option>
              <option value="external">External</option>
            </select>
          </div>

          {/* Node focus */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>Focus:</span>
            <select
              value={selectedNodeId}
              onChange={(e) => setSelectedNodeId(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                maxWidth: '160px',
              }}
            >
              <option value="all">All Nodes</option>
              {report.nodes.map((n) => (
                <option key={n.id as string} value={n.id as string}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px', color: '#64748b' }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search edges…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '13px',
                color: '#e2e8f0',
                outline: 'none',
                width: '180px',
              }}
            />
          </div>
        </div>

        {/* ── Edge List ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {filteredEdges.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '36px', display: 'block', marginBottom: '10px', color: '#334155' }}
              >
                account_tree
              </span>
              No dependencies match the current filters.
            </div>
          ) : (
            filteredEdges.map((edge) => (
              <EdgeCard key={edge.id} edge={edge} onSelectNode={handleNodeSelect} />
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {filteredEdges.length} of {report.directEdges.length + report.indirectEdges.length} edge
            {report.directEdges.length + report.indirectEdges.length !== 1 ? 's' : ''} shown
          </span>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              color: '#e2e8f0',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
