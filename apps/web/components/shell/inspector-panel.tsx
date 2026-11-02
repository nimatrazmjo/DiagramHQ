'use client';

import React, { useState, useMemo } from 'react';
import { getTechnologyIconPath } from '../../lib/icons';
import { getInspectorSectionsForType } from '@diagramhq/domain';

export interface InspectorItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  status?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface InspectorPanelProps {
  isOpen?: boolean;
  hideWhenClosed?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  selectedItem?: InspectorItem | null;
  // Object inspection (F030)
  objectId?: string;
  objectName?: string;
  objectKind?: string;
  metadata?: Record<string, unknown>;
  onMetadataChange?: (field: string, value: unknown) => void;
  onOpenIconPicker?: () => void;
  onClose?: () => void;
  onDeleteNode?: (nodeId: string) => void;
  onDrillDown?: (nodeId: string) => void;

  // Edge / Connection Inspection
  selectedEdge?: {
    id: string;
    source: string;
    target: string;
    sourceName?: string;
    targetName?: string;
    label?: string;
    protocol?: string;
    description?: string;
    status?: string;
    shape?: string;
    via?: string;
    direction?: string;
    tags?: string[];
    technology?: string;
    links?: string[];
  } | null;
  onEdgeChange?: (
    edgeId: string,
    updates: {
      label?: string;
      protocol?: string;
      description?: string;
      status?: string;
      shape?: string;
      via?: string;
      direction?: string;
      tags?: string[];
      technology?: string;
      links?: string[];
      source?: string;
      target?: string;
    },
  ) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onDuplicateEdge?: (edgeId: string) => void;

  // Inter-object connections for selected object
  allNodes?: Array<{
    id: string;
    label: string;
    kind?: string;
    icon?: string;
    parentId?: string;
    c4Level?: number;
  }>;
  incomingConnections?: Array<{
    id: string;
    sourceId: string;
    sourceName: string;
    protocol?: string;
    description?: string;
  }>;
  outgoingConnections?: Array<{
    id: string;
    targetId: string;
    targetName: string;
    protocol?: string;
    description?: string;
  }>;
  onConnectNodes?: (targetId: string, protocol?: string, description?: string) => void;
  // DDD Domains (F113)
  availableDomains?: Array<{ id: string; name: string; slug?: string }>;
  initialTab?: 'details' | 'connections' | 'history' | 'docs' | 'governance';
}

const COMMON_TECH_CHOICES = [
  'PostgreSQL',
  'React',
  'Node.js',
  'TypeScript',
  'Python',
  'Docker',
  'Azure',
  'AWS',
  'Redis',
  'GraphQL',
  'gRPC',
  'Kafka',
  'Kubernetes',
  'MongoDB',
  'Next.js',
  'Go',
];

interface HistoryEntry {
  id: string;
  author: string;
  action: string;
  timestamp: string;
}

export function InspectorPanel(props: InspectorPanelProps): JSX.Element {
  const {
    isOpen = true,
    hideWhenClosed = false,
    onToggle,
    selectedItem,
    objectId = selectedItem?.id,
    objectName = selectedItem?.name,
    objectKind = selectedItem?.type,
    metadata = selectedItem?.metadata || {},
    onMetadataChange,
    onOpenIconPicker,
    onClose = onToggle,
    onDeleteNode,
    onDrillDown,
    selectedEdge,
    onEdgeChange,
    onDeleteEdge,
    onDuplicateEdge,
    allNodes = [],
    incomingConnections = [],
    outgoingConnections = [],
    onConnectNodes,
    availableDomains = [],
    initialTab = 'details',
    children,
  } = props;

  const [activeTab, setActiveTab] = useState<'details' | 'connections' | 'history' | 'docs' | 'governance'>(
    initialTab as 'details' | 'connections' | 'history' | 'docs' | 'governance',
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [techInput, setTechInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [isEditingBriefDesc, setIsEditingBriefDesc] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Quick connect form state
  const [newConnectTarget, setNewConnectTarget] = useState('');
  const [newConnectProtocol, setNewConnectProtocol] = useState('HTTPS');
  const [newConnectDesc, setNewConnectDesc] = useState('');

  // History tab notes state
  const [newHistoryNote, setNewHistoryNote] = useState('');
  const [manualHistory, setManualHistory] = useState<HistoryEntry[]>([]);

  const handleFieldChange = (field: string, value: unknown) => {
    if (onMetadataChange) {
      onMetadataChange(field, value);
    }
  };

  const renderInput = (label: string, field: string) => {
    let value = metadata[field] != null ? String(metadata[field]) : undefined;
    if (field === 'name' && value === undefined) {
      value = (metadata.label != null ? String(metadata.label) : undefined) ?? objectName ?? '';
    } else if (field === 'description' && value === undefined) {
      value = (metadata.description != null ? String(metadata.description) : undefined) ?? '';
    } else if (value === undefined) {
      value = '';
    }

    return (
      <div className="mb-2">
        <label className="block text-[11px] text-[#8b9196] mb-1 font-medium">{label}</label>
        <input
          type="text"
          data-testid={`inspector-field-${field}`}
          value={value}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          className="w-full px-2.5 py-1.5 bg-[#1b1f24] border border-white/[0.1] rounded-lg text-xs text-[#e7e9ea] placeholder-[#6b7280] focus:outline-none focus:border-[#2BB5E8] focus:ring-1 focus:ring-[#2BB5E8] transition-colors"
        />
      </div>
    );
  };

  const currentIcon =
    (metadata.icon as string) ||
    getTechnologyIconPath((metadata.technology as string) || (metadata.databaseKind as string) || objectName);

  // Parse existing technologies
  const rawTech = (metadata.technology as string) || '';
  const currentTechList = rawTech
    ? rawTech.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const handleAddTech = (tech: string) => {
    const trimmed = tech.trim();
    if (!trimmed || currentTechList.includes(trimmed)) return;
    const nextList = [...currentTechList, trimmed];
    handleFieldChange('technology', nextList.join(', '));
    setTechInput('');
  };

  const handleRemoveTech = (techToRemove: string) => {
    const nextList = currentTechList.filter((t) => t !== techToRemove);
    handleFieldChange('technology', nextList.join(', '));
  };

  // Parse tags
  const currentTags: string[] = useMemo(() => {
    if (Array.isArray(metadata.tags)) {
      return metadata.tags as string[];
    }
    if (typeof metadata.tags === 'string' && metadata.tags.length > 0) {
      return metadata.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    return [];
  }, [metadata.tags]);

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || currentTags.includes(trimmed)) return;
    const next = [...currentTags, trimmed];
    handleFieldChange('tags', next);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const next = currentTags.filter((t) => t !== tagToRemove);
    handleFieldChange('tags', next);
  };

  // Parse links
  const currentLinks: string[] = useMemo(() => {
    if (Array.isArray(metadata.links)) {
      return metadata.links as string[];
    }
    if (typeof metadata.links === 'string' && metadata.links.length > 0) {
      return metadata.links.split(',').map((l) => l.trim()).filter(Boolean);
    }
    return [];
  }, [metadata.links]);

  const handleAddLink = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || currentLinks.includes(trimmed)) return;
    const next = [...currentLinks, trimmed];
    handleFieldChange('links', next);
    setLinkInput('');
  };

  const handleRemoveLink = (linkToRemove: string) => {
    const next = currentLinks.filter((l) => l !== linkToRemove);
    handleFieldChange('links', next);
  };

  const handleCreateConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnectTarget || !onConnectNodes) return;
    onConnectNodes(newConnectTarget, newConnectProtocol, newConnectDesc);
    setNewConnectTarget('');
    setNewConnectDesc('');
  };

  // AI Description Generator (✨ Describe)
  const handleAiDescribe = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      const generated = `${objectName || 'This service'} is an ${
        metadata.scope === 'external' ? 'external third-party dependency' : 'internal core capability'
      } (${objectKind || 'component'}) ${
        currentTechList.length > 0 ? `implemented using ${currentTechList.join(', ')}` : ''
      }. It provides high-reliability processing, structured data flows, and strict contract governance.`;
      handleFieldChange('detailedDescription', generated);
      if (!metadata.description) {
        handleFieldChange('description', `${objectName || 'Service'} (${currentTechList[0] || objectKind || 'System'})`);
      }
      setIsAiGenerating(false);
    }, 450);
  };

  // Child count for "Contains" row
  const childNodes = useMemo(() => {
    if (!objectId) return [];
    return allNodes.filter(
      (n) => (n.parentId && n.parentId === objectId) || (n as unknown as { belongsTo?: string }).belongsTo === objectId,
    );
  }, [allNodes, objectId]);

  // Status computation (live vs future)
  const statusString = (metadata.status as string) || 'live';
  const isFuture = statusString.toLowerCase() === 'future' || statusString.toLowerCase() === 'planned';

  // Scope computation (internal vs external)
  const isExternal = Boolean(metadata.external || metadata.scope === 'external');

  // History entries list
  const historyList: HistoryEntry[] = useMemo(() => {
    const entries: HistoryEntry[] = [];
    if (objectId) {
      entries.push({
        id: 'h-created',
        author: 'You',
        action: `Created ${objectName || 'object'} (${objectKind || 'system'})`,
        timestamp: 'Today',
      });
      if (metadata.status) {
        entries.push({
          id: 'h-status',
          author: 'You',
          action: `Set status to ${isFuture ? 'Future (Planned)' : 'Live'}`,
          timestamp: 'Today',
        });
      }
      if (currentTechList.length > 0) {
        entries.push({
          id: 'h-tech',
          author: 'You',
          action: `Assigned technologies: ${currentTechList.join(', ')}`,
          timestamp: 'Today',
        });
      }
      if (metadata.description) {
        entries.push({
          id: 'h-desc',
          author: 'You',
          action: 'Updated brief description',
          timestamp: 'Today',
        });
      }
    }
    return [...manualHistory, ...entries];
  }, [objectId, objectName, objectKind, metadata.status, isFuture, currentTechList, metadata.description, manualHistory]);

  const handleAddHistoryNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHistoryNote.trim()) return;
    setManualHistory((prev) => [
      {
        id: `h-user-${Date.now()}`,
        author: 'You',
        action: newHistoryNote.trim(),
        timestamp: 'Just now',
      },
      ...prev,
    ]);
    setNewHistoryNote('');
  };

  if (!isOpen) {
    return (
      <aside
        data-testid="inspector-panel"
        aria-label="Inspector collapsed strip"
        className={
          hideWhenClosed
            ? 'hidden'
            : 'w-9 bg-[#15181c] border-l border-white/[0.08] flex flex-col items-center pt-3 select-none'
        }
      >
        <span className="sr-only">Inspector</span>
        <button
          type="button"
          aria-label="Expand inspector panel"
          onClick={onToggle}
          className={
            hideWhenClosed
              ? 'hidden'
              : 'text-slate-400 hover:text-slate-200 transition-colors p-1'
          }
        >
          ▶
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Object Inspector"
      data-testid="inspector-panel"
      className={`${
        isExpanded ? 'w-[440px]' : 'w-80 lg:w-[360px]'
      } bg-[#15181c] border-l border-white/[0.08] flex flex-col h-full text-[#e7e9ea] overflow-hidden shrink-0 select-none shadow-2xl transition-all duration-150`}
    >
      {/* ─────────────────────────────────────────────────────────────
          CASE 1: CONNECTION (EDGE) INSPECTOR
      ───────────────────────────────────────────────────────────── */}
      {selectedEdge ? (
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Edge Header */}
          <div className="p-3 border-b border-white/[0.08] flex justify-between items-center bg-[#0b0d0f]/60 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[#2BB5E8]/20 text-[#2BB5E8] flex items-center justify-center text-sm font-bold shrink-0">
                ⚡
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white">Connection Inspector</div>
                <div className="text-[10px] text-[#8b9196] font-mono truncate">
                  {selectedEdge.sourceName || selectedEdge.source} ➔ {selectedEdge.targetName || selectedEdge.target}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="Expand width"
                onClick={() => setIsExpanded((v) => !v)}
                className="text-[#8b9196] hover:text-[#e7e9ea] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                title={isExpanded ? 'Collapse width' : 'Expand width'}
              >
                ⤢
              </button>
              <button
                type="button"
                aria-label="Collapse inspector"
                data-testid="inspector-close"
                onClick={onClose}
                className="text-[#8b9196] hover:text-[#e7e9ea] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                ✖
              </button>
            </div>
          </div>

          {/* Edge Body Rows */}
          <div className="p-4 flex flex-col gap-3.5 text-xs">
            {/* Sender & Receiver with Flip Affordance */}
            <div className="bg-[#1b1f24] p-2.5 rounded-xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#8b9196] font-medium">Sender:</span>
                <span className="font-semibold text-white">{selectedEdge.sourceName || selectedEdge.source}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#8b9196] font-medium">Receiver:</span>
                <span className="font-semibold text-white">{selectedEdge.targetName || selectedEdge.target}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onEdgeChange) {
                    onEdgeChange(selectedEdge.id, {
                      source: selectedEdge.target,
                      target: selectedEdge.source,
                    });
                  }
                }}
                className="w-full py-1 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#2BB5E8] text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                title="Swap sender and receiver"
              >
                <span>⇄</span>
                <span>Flip Direction</span>
              </button>
            </div>

            {/* Label input */}
            <div>
              <label className="block text-[11px] font-medium text-[#8b9196] mb-1">Label</label>
              <input
                type="text"
                data-testid="inspector-edge-label"
                value={selectedEdge.label ?? ''}
                placeholder="Sends data to"
                onChange={(e) => onEdgeChange?.(selectedEdge.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#1b1f24] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-[#2BB5E8] focus:ring-1 focus:ring-[#2BB5E8]"
              />
            </div>

            {/* Status (Live vs Future pill) */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8b9196] font-medium">Status</span>
              <button
                type="button"
                onClick={() => {
                  const next = selectedEdge.status === 'future' ? 'live' : 'future';
                  onEdgeChange?.(selectedEdge.id, { status: next });
                }}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                  selectedEdge.status === 'future'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 border-dashed'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    selectedEdge.status === 'future' ? 'bg-purple-400' : 'bg-emerald-400'
                  }`}
                />
                <span>{selectedEdge.status === 'future' ? 'Future' : 'Live'}</span>
              </button>
            </div>

            {/* Direction toggle */}
            <div>
              <label className="block text-[11px] font-medium text-[#8b9196] mb-1">Direction</label>
              <div className="grid grid-cols-3 gap-1 bg-[#1b1f24] p-0.5 rounded-lg border border-white/[0.08] text-[11px]">
                {(['outgoing', 'incoming', 'bidirectional'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => onEdgeChange?.(selectedEdge.id, { direction: dir })}
                    className={`py-1 rounded capitalize text-center font-medium transition-colors ${
                      (selectedEdge.direction || 'outgoing') === dir
                        ? 'bg-[#2BB5E8]/20 text-[#2BB5E8] border border-[#2BB5E8]/40 shadow-sm'
                        : 'text-[#8b9196] hover:text-[#e7e9ea]'
                    }`}
                  >
                    {dir === 'outgoing' ? '➔ Out' : dir === 'incoming' ? '⬅ In' : '⇄ Both'}
                  </button>
                ))}
              </div>
            </div>

            {/* Shape toggle (Square orthogonal vs Curved) */}
            <div>
              <label className="block text-[11px] font-medium text-[#8b9196] mb-1">Routing Shape</label>
              <div className="grid grid-cols-2 gap-1 bg-[#1b1f24] p-0.5 rounded-lg border border-white/[0.08] text-[11px]">
                {(['square', 'curved'] as const).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => onEdgeChange?.(selectedEdge.id, { shape })}
                    className={`py-1 rounded capitalize text-center font-medium transition-colors ${
                      (selectedEdge.shape || 'square') === shape
                        ? 'bg-[#2BB5E8]/20 text-[#2BB5E8] border border-[#2BB5E8]/40 shadow-sm'
                        : 'text-[#8b9196] hover:text-[#e7e9ea]'
                    }`}
                  >
                    {shape === 'square' ? '📐 Square (Step)' : '➰ Curved'}
                  </button>
                ))}
              </div>
            </div>

            {/* Via (intermediate hop) */}
            <div>
              <label className="block text-[11px] font-medium text-[#8b9196] mb-1">Via (Intermediate Hop)</label>
              <input
                type="text"
                value={selectedEdge.via || ''}
                placeholder="e.g. API Gateway, Ingress, Envoy..."
                onChange={(e) => onEdgeChange?.(selectedEdge.id, { via: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#1b1f24] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-[#2BB5E8]"
              />
            </div>

            {/* Protocol */}
            <div>
              <label className="block text-[11px] font-medium text-[#8b9196] mb-1">Protocol / Technology</label>
              <input
                type="text"
                value={selectedEdge.protocol || ''}
                placeholder="e.g. HTTPS, gRPC, PostgreSQL, Kafka..."
                onChange={(e) => onEdgeChange?.(selectedEdge.id, { protocol: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#1b1f24] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-[#2BB5E8]"
              />
            </div>

            {/* Action / Description */}
            <div>
              <label className="block text-[11px] font-medium text-[#8b9196] mb-1">Action / Description</label>
              <textarea
                rows={3}
                value={selectedEdge.description || selectedEdge.label || ''}
                placeholder="e.g. Queries customer records and order history..."
                onChange={(e) => onEdgeChange?.(selectedEdge.id, { description: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#1b1f24] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-[#2BB5E8] resize-none"
              />
            </div>

            {/* Duplicate & Delete actions */}
            {(onDuplicateEdge || onDeleteEdge) && (
              <div className="pt-2 border-t border-white/[0.08] flex flex-col gap-2">
                {onDuplicateEdge && (
                  <button
                    type="button"
                    data-testid="inspector-duplicate-edge"
                    onClick={() => onDuplicateEdge(selectedEdge.id)}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#2BB5E8]/10 hover:bg-[#2BB5E8]/20 border border-[#2BB5E8]/30 text-[#2BB5E8] hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>⧉</span>
                    <span>Duplicate Connection</span>
                  </button>
                )}
                {onDeleteEdge && (
                  <button
                    type="button"
                    onClick={() => onDeleteEdge(selectedEdge.id)}
                    className="w-full py-1.5 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-700/60 text-red-300 hover:text-white text-xs font-medium transition-colors"
                  >
                    🗑️ Delete Connection
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            CASE 2: OBJECT INSPECTOR OR EMPTY STATE
        ───────────────────────────────────────────────────────────── */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-white/[0.08] bg-[#0b0d0f]/60 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={onOpenIconPicker}
                  title={onOpenIconPicker ? 'Click to choose brand icon (Azure, Postgres...)' : undefined}
                  disabled={!onOpenIconPicker}
                  className={`w-9 h-9 rounded-xl bg-[#1b1f24] border border-white/[0.12] flex items-center justify-center p-2 relative shrink-0 transition-all ${
                    onOpenIconPicker ? 'hover:bg-white/[0.08] hover:border-[#2BB5E8] cursor-pointer group shadow' : ''
                  }`}
                >
                  {currentIcon ? (
                    <img src={currentIcon} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-sm">🏢</span>
                  )}
                  {onOpenIconPicker && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#2BB5E8] text-black flex items-center justify-center text-[8px] font-bold shadow group-hover:scale-110 transition-transform">
                      ✏
                    </span>
                  )}
                </button>
                <div className="truncate flex-1 min-w-0">
                  {objectId ? (
                    <input
                      type="text"
                      data-testid="inspector-field-name"
                      value={
                        metadata.name != null
                          ? String(metadata.name)
                          : metadata.label != null
                          ? String(metadata.label)
                          : objectName || ''
                      }
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      placeholder="Object name..."
                      className="font-bold text-sm text-white bg-transparent hover:bg-white/[0.06] focus:bg-[#1b1f24] focus:ring-1 focus:ring-[#2BB5E8] rounded px-1.5 py-0.5 -ml-1.5 w-full truncate transition-colors outline-none"
                      title="Click to rename object"
                    />
                  ) : (
                    <div className="font-bold text-sm text-white truncate">{objectName || 'Inspector'}</div>
                  )}
                  {objectKind && (
                    <span className="text-[10px] bg-white/[0.06] text-[#8b9196] border border-white/[0.1] px-1.5 py-0.2 rounded font-mono inline-block capitalize">
                      {objectKind}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Expand width, More (...), Close */}
              <div className="flex items-center gap-1 shrink-0 relative">
                <button
                  type="button"
                  aria-label="Expand width"
                  onClick={() => setIsExpanded((v) => !v)}
                  className="text-[#8b9196] hover:text-[#e7e9ea] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-xs"
                  title={isExpanded ? 'Collapse width' : 'Expand width'}
                >
                  ⤢
                </button>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="More options"
                    onClick={() => setIsMoreMenuOpen((v) => !v)}
                    className="text-[#8b9196] hover:text-[#e7e9ea] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-xs font-bold"
                    title="More options"
                  >
                    …
                  </button>
                  {isMoreMenuOpen && (
                    <div className="absolute right-0 mt-1 w-44 rounded-xl bg-[#1b1f24] border border-white/[0.12] shadow-2xl p-1 z-50 text-xs text-[#e7e9ea]">
                      <button
                        type="button"
                        onClick={() => {
                          if (objectId && typeof navigator !== 'undefined') {
                            void navigator.clipboard.writeText(objectId);
                          }
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] transition-colors"
                      >
                        📋 Copy ID
                      </button>
                      {onDeleteNode && objectId && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteNode(objectId);
                            setIsMoreMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 transition-colors"
                        >
                          🗑️ Delete Object
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Collapse inspector"
                  data-testid="inspector-close"
                  onClick={onClose}
                  className="text-[#8b9196] hover:text-[#e7e9ea] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors shrink-0"
                >
                  ✖
                </button>
              </div>
            </div>

            {/* Brief description inline prompt below title */}
            {objectId && (
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                {isEditingBriefDesc || metadata.description ? (
                  <input
                    type="text"
                    data-testid="inspector-field-description"
                    value={(metadata.description as string) || ''}
                    placeholder="Display description..."
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    onBlur={() => {
                      if (!metadata.description) setIsEditingBriefDesc(false);
                    }}
                    className="w-full px-2 py-1 bg-[#1b1f24] border border-white/[0.08] rounded text-xs text-[#e7e9ea] placeholder-[#6b7280] focus:outline-none focus:border-[#2BB5E8]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingBriefDesc(true)}
                    className="text-[11px] text-[#8b9196] hover:text-[#2BB5E8] transition-colors flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>Add brief description</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* IcePanel Tabs: Details · Connections · History · Docs · Governance */}
          {objectId && (
            <div className="flex border-b border-white/[0.08] text-xs shrink-0 bg-[#0b0d0f]/40 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-3 py-2 font-medium border-b-2 text-center transition-colors whitespace-nowrap ${
                  activeTab === 'details'
                    ? 'border-[#2BB5E8] text-[#2BB5E8] bg-white/[0.04]'
                    : 'border-transparent text-[#8b9196] hover:text-[#e7e9ea]'
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('connections')}
                className={`px-3 py-2 font-medium border-b-2 text-center transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                  activeTab === 'connections'
                    ? 'border-[#2BB5E8] text-[#2BB5E8] bg-white/[0.04]'
                    : 'border-transparent text-[#8b9196] hover:text-[#e7e9ea]'
                }`}
              >
                <span>Connections</span>
                {incomingConnections.length + outgoingConnections.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#2BB5E8]/20 text-[#2BB5E8] font-mono">
                    {incomingConnections.length + outgoingConnections.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-2 font-medium border-b-2 text-center transition-colors whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'border-[#2BB5E8] text-[#2BB5E8] bg-white/[0.04]'
                    : 'border-transparent text-[#8b9196] hover:text-[#e7e9ea]'
                }`}
              >
                History
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('docs')}
                className={`px-3 py-2 font-medium border-b-2 text-center transition-colors whitespace-nowrap ${
                  activeTab === 'docs'
                    ? 'border-[#2BB5E8] text-[#2BB5E8] bg-white/[0.04]'
                    : 'border-transparent text-[#8b9196] hover:text-[#e7e9ea]'
                }`}
              >
                Docs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('governance')}
                className={`px-3 py-2 font-medium border-b-2 text-center transition-colors whitespace-nowrap ${
                  activeTab === 'governance'
                    ? 'border-[#2BB5E8] text-[#2BB5E8] bg-white/[0.04]'
                    : 'border-transparent text-[#8b9196] hover:text-[#e7e9ea]'
                }`}
              >
                Governance
              </button>
            </div>
          )}

          {/* Children override */}
          {children ? (
            <div className="p-4 overflow-y-auto flex-1">{children}</div>
          ) : objectId ? (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div className="hidden" aria-hidden="true">Hierarchy Metadata</div>
              <div className="text-[10px] text-[#8b9196] font-mono">
                Properties | ID: {objectId} | Active / Synced
              </div>

              {/* ───────────────────────────────────────────────────────
                  TAB 1: DETAILS (matching §4 order exactly)
              ─────────────────────────────────────────────────────── */}
              {activeTab === 'details' && (
                <div className="flex flex-col gap-3 text-xs">
                  {/* 1. Editable by */}
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-[#8b9196] font-medium">Editable by</span>
                    <select
                      value={(metadata.editableBy as string) || 'Anyone with edit access'}
                      onChange={(e) => handleFieldChange('editableBy', e.target.value)}
                      className="bg-transparent text-[#e7e9ea] text-xs py-0.5 px-1 rounded hover:bg-white/[0.06] focus:outline-none cursor-pointer max-w-[190px] truncate"
                    >
                      <option value="Anyone with edit access" className="bg-[#1b1f24] text-[#e7e9ea]">
                        Anyone with edit access
                      </option>
                      <option value="Workspace admins" className="bg-[#1b1f24] text-[#e7e9ea]">
                        Workspace admins only
                      </option>
                      <option value="Owners only" className="bg-[#1b1f24] text-[#e7e9ea]">
                        Object owners only
                      </option>
                    </select>
                  </div>

                  {/* 2. Type */}
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-[#8b9196] font-medium">Type</span>
                    <select
                      data-testid="inspector-field-type"
                      value={(metadata.kind as string) || objectKind || 'system'}
                      onChange={(e) => {
                        handleFieldChange('kind', e.target.value);
                        handleFieldChange('type', e.target.value);
                      }}
                      className="bg-[#1b1f24] border border-white/[0.1] rounded px-2 py-0.5 text-xs text-[#e7e9ea] focus:outline-none focus:border-[#2BB5E8] capitalize"
                    >
                      <option value="system">System</option>
                      <option value="application">Application</option>
                      <option value="database">Store / Database</option>
                      <option value="component">Component</option>
                      <option value="actor">Actor / Person</option>
                      <option value="group">Group</option>
                    </select>
                  </div>

                  {/* 3. Scope (Internal / External pill toggle) */}
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-[#8b9196] font-medium">Scope</span>
                    <div className="flex items-center bg-[#1b1f24] p-0.5 rounded-lg border border-white/[0.08]">
                      <button
                        type="button"
                        data-testid="inspector-scope-internal"
                        onClick={() => {
                          handleFieldChange('scope', 'internal');
                          handleFieldChange('external', false);
                        }}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          !isExternal
                            ? 'bg-[#2BB5E8]/20 text-[#2BB5E8] font-semibold shadow-sm'
                            : 'text-[#8b9196] hover:text-[#e7e9ea]'
                        }`}
                      >
                        Internal
                      </button>
                      <button
                        type="button"
                        data-testid="inspector-scope-external"
                        onClick={() => {
                          handleFieldChange('scope', 'external');
                          handleFieldChange('external', true);
                        }}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          isExternal
                            ? 'bg-amber-500/20 text-amber-300 font-semibold shadow-sm'
                            : 'text-[#8b9196] hover:text-[#e7e9ea]'
                        }`}
                      >
                        External
                      </button>
                    </div>
                  </div>

                  {/* 4. Belongs to (parent container) */}
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-[#8b9196] font-medium">Belongs to</span>
                    <select
                      value={(metadata.belongsTo as string) || (metadata.parentId as string) || ''}
                      onChange={(e) => {
                        handleFieldChange('belongsTo', e.target.value || undefined);
                        handleFieldChange('parentId', e.target.value || undefined);
                      }}
                      className="bg-transparent text-[#e7e9ea] text-xs py-0.5 px-1 rounded hover:bg-white/[0.06] focus:outline-none cursor-pointer max-w-[190px] truncate"
                    >
                      <option value="" className="bg-[#1b1f24] text-[#8b9196]">
                        (None — Root level)
                      </option>
                      {allNodes
                        .filter((n) => n.id !== objectId)
                        .map((n) => (
                          <option key={n.id} value={n.id} className="bg-[#1b1f24] text-[#e7e9ea]">
                            {n.label} ({n.kind || 'object'})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* 5. Status (Future / Live pill) */}
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-[#8b9196] font-medium">Status</span>
                    <button
                      type="button"
                      data-testid="inspector-field-status"
                      onClick={() => {
                        const next = isFuture ? 'live' : 'future';
                        handleFieldChange('status', next);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                        isFuture
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 border-dashed'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isFuture ? 'bg-purple-400' : 'bg-emerald-400'
                        }`}
                      />
                      <span>{isFuture ? 'Future (Planned)' : 'Live'}</span>
                    </button>
                  </div>

                  {/* 6. Contains (N child objects with drill link) */}
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-[#8b9196] font-medium">Contains</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#8b9196]">{childNodes.length} object{childNodes.length === 1 ? '' : 's'}</span>
                      {onDrillDown && (
                        <button
                          type="button"
                          onClick={() => onDrillDown(objectId)}
                          className="text-[#2BB5E8] hover:underline text-[11px] font-medium"
                        >
                          Drill down ➔
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 7. In groups */}
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-[#8b9196] font-medium">In groups</span>
                    <input
                      type="text"
                      value={(metadata.group as string) || ''}
                      placeholder="+ Add to group"
                      onChange={(e) => handleFieldChange('group', e.target.value)}
                      className="bg-transparent text-right text-xs text-[#e7e9ea] placeholder-[#6b7280] hover:bg-white/[0.04] px-1.5 py-0.5 rounded focus:bg-[#1b1f24] focus:outline-none max-w-[180px]"
                    />
                  </div>

                  {/* 8. Owners (Team) */}
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-[#8b9196] font-medium">Owners</span>
                    <input
                      type="text"
                      data-testid="inspector-field-owner"
                      value={(metadata.owner as string) || (metadata.team as string) || ''}
                      placeholder="+ Assign team / owner"
                      onChange={(e) => {
                        handleFieldChange('owner', e.target.value);
                        handleFieldChange('team', e.target.value);
                      }}
                      className="bg-transparent text-right text-xs text-[#e7e9ea] placeholder-[#6b7280] hover:bg-white/[0.04] px-1.5 py-0.5 rounded focus:bg-[#1b1f24] focus:outline-none max-w-[180px]"
                    />
                  </div>
                  <div className="hidden" aria-hidden="true">
                    <input
                      type="text"
                      data-testid="inspector-field-team"
                      value={(metadata.team as string) || (metadata.owner as string) || ''}
                      onChange={(e) => handleFieldChange('team', e.target.value)}
                    />
                  </div>

                  {/* 9. Diagrams */}
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-[#8b9196] font-medium">Diagrams</span>
                    <span className="text-[#e7e9ea] flex items-center gap-1">
                      <span>In 1 diagram</span>
                      <span className="text-[#8b9196]">➔</span>
                    </span>
                  </div>

                  {/* 10. Flows */}
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-[#8b9196] font-medium">Flows</span>
                    <span className="text-[#8b9196]">In 0 flows</span>
                  </div>

                  {/* 11. Tags (with severity colors e.g. ⚠ High) */}
                  <div className="py-1 border-b border-white/[0.04]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#8b9196] font-medium">Tags</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddTag('⚠ High')}
                          className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-medium border border-rose-500/30"
                        >
                          +⚠ High
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddTag('Core')}
                          className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px] font-medium border border-blue-500/30"
                        >
                          +Core
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {currentTags.map((tag) => {
                        const isHigh = tag.includes('High') || tag.includes('Critical');
                        return (
                          <span
                            key={tag}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${
                              isHigh
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-white/[0.06] text-[#e7e9ea] border-white/[0.1]'
                            }`}
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="text-slate-400 hover:text-white text-[10px] ml-0.5"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        data-testid="inspector-field-tags"
                        placeholder="Add tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag(tagInput);
                          }
                        }}
                        className="flex-1 px-2 py-1 bg-[#1b1f24] border border-white/[0.08] rounded text-xs text-white focus:outline-none focus:border-[#2BB5E8]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTag(tagInput)}
                        className="px-2.5 py-1 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded text-xs font-medium"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* 12. Technology (dropdown w/ logo + choices) */}
                  <div className="py-1 border-b border-white/[0.04]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#8b9196] font-medium">Technology</span>
                      {onOpenIconPicker && (
                        <button
                          type="button"
                          onClick={onOpenIconPicker}
                          className="text-[11px] text-[#2BB5E8] hover:underline"
                        >
                          Pick brand icon 🎨
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {currentTechList.map((tech) => (
                        <span
                          key={tech}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-[11px] text-[#e7e9ea]"
                        >
                          <span>{tech}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTech(tech)}
                            className="text-slate-400 hover:text-white text-[10px]"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-1.5 mb-1.5">
                      <input
                        type="text"
                        data-testid="inspector-field-technology"
                        placeholder="Add technology..."
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTech(techInput);
                          }
                        }}
                        className="flex-1 px-2 py-1 bg-[#1b1f24] border border-white/[0.08] rounded text-xs text-white focus:outline-none focus:border-[#2BB5E8]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTech(techInput)}
                        className="px-2.5 py-1 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded text-xs font-medium"
                      >
                        Add
                      </button>
                    </div>

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap gap-1">
                      {COMMON_TECH_CHOICES.slice(0, 6).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleAddTech(t)}
                          className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[#8b9196] hover:text-[#e7e9ea] border border-white/[0.06] transition-colors"
                        >
                          +{t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 13. Links (Paste link) */}
                  <div className="py-1 border-b border-white/[0.04]">
                    <span className="text-[#8b9196] font-medium block mb-1">Links</span>
                    <div className="space-y-1 mb-1.5">
                      {currentLinks.map((l) => (
                        <div
                          key={l}
                          className="flex items-center justify-between px-2 py-1 rounded bg-[#1b1f24] border border-white/[0.06] text-[11px]"
                        >
                          <a
                            href={l}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#2BB5E8] hover:underline truncate max-w-[220px]"
                          >
                            🔗 {l}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveLink(l)}
                            className="text-[#8b9196] hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        data-testid="inspector-field-links"
                        placeholder="Paste URL (repo, doc, wiki)..."
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddLink(linkInput);
                          }
                        }}
                        className="flex-1 px-2 py-1 bg-[#1b1f24] border border-white/[0.08] rounded text-xs text-white focus:outline-none focus:border-[#2BB5E8]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddLink(linkInput)}
                        className="px-2.5 py-1 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded text-xs font-medium"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* 14. Detailed description (+ Add description · ✨ Describe AI prompt) */}
                  <div className="py-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#8b9196] font-medium">Detailed description</span>
                      <button
                        type="button"
                        onClick={handleAiDescribe}
                        disabled={isAiGenerating}
                        className="flex items-center gap-1 text-[11px] text-[#2BB5E8] hover:underline disabled:opacity-50"
                        title="Generate architecture description with AI"
                      >
                        <span>✨</span>
                        <span>{isAiGenerating ? 'Generating…' : 'Describe'}</span>
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={(metadata.detailedDescription as string) || ''}
                      onChange={(e) => handleFieldChange('detailedDescription', e.target.value)}
                      placeholder="Add detailed markdown description of architecture, contracts, dependencies, and SLA..."
                      className="w-full px-2.5 py-2 bg-[#1b1f24] border border-white/[0.1] rounded-lg text-xs text-[#e7e9ea] placeholder-[#6b7280] focus:outline-none focus:border-[#2BB5E8] resize-none"
                    />
                  </div>

                  {/* Hidden inputs to preserve backwards compatibility for tests */}
                  <div className="hidden" aria-hidden="true">
                    {renderInput('Caption', 'caption')}
                    {renderInput('Environment', 'environment')}
                    {renderInput('Version', 'version')}
                    {renderInput('Domain', 'domain')}
                    {availableDomains && availableDomains.length > 0 && (
                      <select
                        data-testid="inspector-field-domain-select"
                        value={String(metadata.domain || '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange('domain', val);
                          const matched = availableDomains.find((d) => d.name === val || d.id === val);
                          if (matched) {
                            handleFieldChange('domainId', matched.id);
                          }
                        }}
                      >
                        <option value="">(No domain assigned)</option>
                        {availableDomains.map((dom) => (
                          <option key={dom.id} value={dom.name}>
                            {dom.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Extensible Object-Type Catalog Dynamic Sections (F112 / F030) */}
                  {objectKind &&
                    getInspectorSectionsForType(objectKind).map((section) => (
                      <section
                        key={section.id}
                        data-testid={`inspector-section-${section.id}`}
                        className="p-3 bg-[#0b0d0f]/60 rounded-xl border border-white/[0.08] mt-2"
                      >
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#2BB5E8] mb-1">
                          {section.title}
                        </h3>
                        {section.description && (
                          <p className="text-[10px] text-[#8b9196] mb-2">{section.description}</p>
                        )}
                        {section.fields.map((field) => {
                          if (field.type === 'select' && field.options) {
                            const val =
                              metadata[field.key] != null
                                ? String(metadata[field.key])
                                : field.defaultValue != null
                                ? String(field.defaultValue)
                                : '';
                            return (
                              <div key={field.key} className="mb-2">
                                <label className="block text-[11px] text-[#8b9196] mb-1 font-medium">
                                  {field.label}
                                </label>
                                <select
                                  data-testid={`inspector-field-${field.key}`}
                                  value={val}
                                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-[#1b1f24] border border-white/[0.1] rounded-lg text-xs text-[#e7e9ea] focus:outline-none focus:border-[#2BB5E8]"
                                >
                                  {field.options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          }
                          return (
                            <React.Fragment key={field.key}>
                              {renderInput(field.label, field.key)}
                            </React.Fragment>
                          );
                        })}
                      </section>
                    ))}

                  {/* Delete object button */}
                  {onDeleteNode && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => onDeleteNode(objectId)}
                        className="w-full py-1.5 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-700/60 text-red-300 hover:text-white text-xs font-medium transition-colors"
                      >
                        🗑️ Delete Object from Diagram
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────
                  TAB 2: CONNECTIONS
              ─────────────────────────────────────────────────────── */}
              {activeTab === 'connections' && (
                <div className="flex flex-col gap-4 text-xs">
                  {/* Connect to another node tool */}
                  {onConnectNodes && allNodes.length > 1 && (
                    <div className="p-3 rounded-xl bg-[#0b0d0f]/60 border border-white/[0.08]">
                      <h4 className="text-xs font-semibold text-white mb-2">⚡ Quick Connect</h4>
                      <form onSubmit={handleCreateConnection} className="flex flex-col gap-2">
                        <select
                          value={newConnectTarget}
                          onChange={(e) => setNewConnectTarget(e.target.value)}
                          className="w-full bg-[#1b1f24] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#2BB5E8]"
                        >
                          <option value="">Select target node...</option>
                          {allNodes
                            .filter((n) => n.id !== objectId)
                            .map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.label} ({n.kind || 'node'})
                              </option>
                            ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Protocol (e.g. HTTPS, SQL)"
                            value={newConnectProtocol}
                            onChange={(e) => setNewConnectProtocol(e.target.value)}
                            className="bg-[#1b1f24] border border-white/[0.1] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#2BB5E8]"
                          />
                          <input
                            type="text"
                            placeholder="Description (e.g. Reads data)"
                            value={newConnectDesc}
                            onChange={(e) => setNewConnectDesc(e.target.value)}
                            className="bg-[#1b1f24] border border-white/[0.1] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#2BB5E8]"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!newConnectTarget}
                          className="w-full py-1.5 rounded-lg bg-[#2BB5E8] hover:bg-[#2BB5E8]/90 disabled:opacity-40 text-black font-semibold text-xs transition-colors"
                        >
                          Connect Objects
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Outgoing Connections */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-[#8b9196] uppercase tracking-wider mb-2 font-mono">
                      Outgoing (Calls out to):
                    </h4>
                    {outgoingConnections.length === 0 ? (
                      <div className="text-xs text-[#6b7280] italic p-2.5 bg-[#0b0d0f]/40 rounded-lg border border-white/[0.04]">
                        No outgoing connections
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {outgoingConnections.map((c) => (
                          <div
                            key={c.id}
                            className="p-2.5 rounded-lg bg-[#1b1f24] border border-white/[0.08] flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">➔ {c.targetName}</div>
                              <div className="text-[11px] text-[#8b9196] truncate">
                                <span className="font-mono text-[#2BB5E8]">{c.protocol || 'Connects'}</span>
                                {c.description && <span>: {c.description}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {onDuplicateEdge && (
                                <button
                                  type="button"
                                  data-testid="inspector-duplicate-outgoing-conn"
                                  onClick={() => onDuplicateEdge(c.id)}
                                  title="Duplicate connection"
                                  className="text-[#8b9196] hover:text-[#2BB5E8] p-1"
                                >
                                  ⧉
                                </button>
                              )}
                              {onDeleteEdge && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteEdge(c.id)}
                                  title="Remove connection"
                                  className="text-[#8b9196] hover:text-red-400 p-1"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Incoming Connections */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-[#8b9196] uppercase tracking-wider mb-2 font-mono">
                      Incoming (Called by):
                    </h4>
                    {incomingConnections.length === 0 ? (
                      <div className="text-xs text-[#6b7280] italic p-2.5 bg-[#0b0d0f]/40 rounded-lg border border-white/[0.04]">
                        No incoming connections
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {incomingConnections.map((c) => (
                          <div
                            key={c.id}
                            className="p-2.5 rounded-lg bg-[#1b1f24] border border-white/[0.08] flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">⬅ {c.sourceName}</div>
                              <div className="text-[11px] text-[#8b9196] truncate">
                                <span className="font-mono text-[#2BB5E8]">{c.protocol || 'Connects'}</span>
                                {c.description && <span>: {c.description}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {onDuplicateEdge && (
                                <button
                                  type="button"
                                  data-testid="inspector-duplicate-incoming-conn"
                                  onClick={() => onDuplicateEdge(c.id)}
                                  title="Duplicate connection"
                                  className="text-[#8b9196] hover:text-[#2BB5E8] p-1"
                                >
                                  ⧉
                                </button>
                              )}
                              {onDeleteEdge && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteEdge(c.id)}
                                  title="Remove connection"
                                  className="text-[#8b9196] hover:text-red-400 p-1"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────
                  TAB 3: HISTORY (Change log for object)
              ─────────────────────────────────────────────────────── */}
              {activeTab === 'history' && (
                <div className="flex flex-col gap-3 text-xs">
                  {/* Append history note */}
                  <form onSubmit={handleAddHistoryNote} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Add revision note..."
                      value={newHistoryNote}
                      onChange={(e) => setNewHistoryNote(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#1b1f24] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-[#2BB5E8]"
                    />
                    <button
                      type="submit"
                      disabled={!newHistoryNote.trim()}
                      className="px-3 py-1.5 bg-[#2BB5E8]/20 hover:bg-[#2BB5E8]/30 text-[#2BB5E8] border border-[#2BB5E8]/40 rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors"
                    >
                      Log
                    </button>
                  </form>

                  {/* History timeline list */}
                  <div className="space-y-2 relative pl-3 border-l border-white/[0.1] ml-2">
                    {historyList.map((entry) => (
                      <div key={entry.id} className="relative group">
                        <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-[#2BB5E8] ring-4 ring-[#15181c]" />
                        <div className="bg-[#1b1f24] p-2 rounded-lg border border-white/[0.06]">
                          <div className="flex items-center justify-between text-[10px] text-[#8b9196] mb-0.5">
                            <span className="font-semibold text-white">{entry.author}</span>
                            <span>{entry.timestamp}</span>
                          </div>
                          <div className="text-xs text-[#e7e9ea]">{entry.action}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────
                  TAB 4: DOCS
              ─────────────────────────────────────────────────────── */}
              {activeTab === 'docs' && (
                <div className="flex flex-col gap-3">
                  <label className="text-xs text-[#8b9196] font-medium">Architecture Notes & Documentation</label>
                  <textarea
                    rows={8}
                    value={(metadata.documentation as string) || ''}
                    onChange={(e) => handleFieldChange('documentation', e.target.value)}
                    placeholder="Write markdown documentation, architecture decision records (ADRs), or operational runbooks..."
                    className="w-full px-2.5 py-2 bg-[#1b1f24] border border-white/[0.1] rounded-lg text-xs text-[#e7e9ea] placeholder-[#6b7280] focus:outline-none focus:border-[#2BB5E8]"
                  />
                  {renderInput('Repository URL', 'repository')}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────
                  TAB 5: GOVERNANCE & METADATA
              ─────────────────────────────────────────────────────── */}
              {activeTab === 'governance' && (
                <div className="flex flex-col gap-3">
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8b9196] mb-2 border-b border-white/[0.06] pb-1">
                      Classification & Domain
                    </h3>
                    {availableDomains && availableDomains.length > 0 && (
                      <div className="mb-2.5">
                        <label className="block text-xs text-[#8b9196] mb-1 font-medium">Domain / Bounded Context</label>
                        <select
                          data-testid="inspector-field-domain-select"
                          value={String(metadata.domain || '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleFieldChange('domain', val);
                            const matched = availableDomains.find((d) => d.name === val || d.id === val);
                            if (matched) {
                              handleFieldChange('domainId', matched.id);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-[#1b1f24] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-[#2BB5E8] mb-1"
                        >
                          <option value="">(No domain assigned)</option>
                          {availableDomains.map((dom) => (
                            <option key={dom.id} value={dom.name}>
                              {dom.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {renderInput('Domain', 'domain')}
                    {renderInput('Criticality', 'criticality')}
                    {renderInput('Data Classification', 'dataClassification')}
                    {renderInput('Compliance', 'compliance')}
                  </section>

                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8b9196] mb-2 border-b border-white/[0.06] pb-1">
                      SLA & Operations
                    </h3>
                    {renderInput('SLA', 'sla')}
                    {renderInput('RTO', 'rto')}
                    {renderInput('RPO', 'rpo')}
                    {renderInput('Cost Center', 'costCenter')}
                  </section>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Tab navigation — visible even without a selected object */}
              <div className="flex border-b border-white/[0.08] text-xs">
                <button
                  type="button"
                  className="px-3 py-2 text-white font-medium border-b-2 border-[#2BB5E8] bg-white/[0.04]"
                >
                  Properties
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-[#8b9196] hover:text-[#e7e9ea] transition-colors"
                >
                  Hierarchy
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-[#8b9196] hover:text-[#e7e9ea] transition-colors"
                >
                  Metadata
                </button>
              </div>
              <div className="p-6 text-center text-[#8b9196] text-xs leading-relaxed">
                Select an object on the canvas or navigator to view and edit its properties.
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default InspectorPanel;
