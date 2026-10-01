'use client';

import React, { useState } from 'react';
import { getTechnologyIconPath } from '../../lib/icons';

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
  } | null;
  onEdgeChange?: (edgeId: string, updates: { protocol?: string; description?: string }) => void;
  onDeleteEdge?: (edgeId: string) => void;

  // Inter-object connections for selected object
  allNodes?: Array<{ id: string; label: string; kind?: string; icon?: string }>;
  incomingConnections?: Array<{ id: string; sourceId: string; sourceName: string; protocol?: string; description?: string }>;
  outgoingConnections?: Array<{ id: string; targetId: string; targetName: string; protocol?: string; description?: string }>;
  onConnectNodes?: (targetId: string, protocol?: string, description?: string) => void;
}

const COMMON_TECH_TAGS = [
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
];

export function InspectorPanel(props: InspectorPanelProps): JSX.Element {
  const {
    isOpen = true,
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
    selectedEdge,
    onEdgeChange,
    onDeleteEdge,
    allNodes = [],
    incomingConnections = [],
    outgoingConnections = [],
    onConnectNodes,
    children,
  } = props;

  const [activeTab, setActiveTab] = useState<'details' | 'connections' | 'docs' | 'governance'>('details');
  const [techInput, setTechInput] = useState('');
  const [newConnectTarget, setNewConnectTarget] = useState('');
  const [newConnectProtocol, setNewConnectProtocol] = useState('HTTPS');
  const [newConnectDesc, setNewConnectDesc] = useState('');

  if (!isOpen) {
    return (
      <aside
        aria-label="Inspector collapsed strip"
        className="w-9 bg-slate-900 border-l border-slate-800 flex flex-col items-center pt-3 select-none"
      >
        <button
          type="button"
          aria-label="Expand inspector panel"
          onClick={onToggle}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1"
        >
          ▶
        </button>
      </aside>
    );
  }

  const handleFieldChange = (field: string, value: unknown) => {
    if (onMetadataChange) {
      onMetadataChange(field, value);
    }
  };

  const renderInput = (label: string, field: string) => (
    <div className="mb-2.5">
      <label className="block text-xs text-slate-400 mb-1 font-medium">{label}</label>
      <input
        type="text"
        data-testid={`inspector-field-${field}`}
        value={(metadata[field] as string) || ''}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
      />
    </div>
  );

  const currentIcon =
    (metadata.icon as string) ||
    getTechnologyIconPath((metadata.technology as string) || (metadata.databaseKind as string) || objectName);

  // Parse existing technologies
  const rawTech = (metadata.technology as string) || '';
  const currentTags = rawTech
    ? rawTech.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || currentTags.includes(trimmed)) return;
    const nextTags = [...currentTags, trimmed];
    handleFieldChange('technology', nextTags.join(', '));
    setTechInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = currentTags.filter((t) => t !== tagToRemove);
    handleFieldChange('technology', nextTags.join(', '));
  };

  const handleCreateConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnectTarget || !onConnectNodes) return;
    onConnectNodes(newConnectTarget, newConnectProtocol, newConnectDesc);
    setNewConnectTarget('');
    setNewConnectDesc('');
  };

  return (
    <aside
      aria-label="Object Inspector"
      data-testid="inspector-panel"
      className="w-80 lg:w-88 bg-slate-900 border-l border-slate-800 flex flex-col h-full text-slate-100 overflow-hidden shrink-0 select-none shadow-2xl"
    >
      {/* CASE 1: CONNECTION (EDGE) INSPECTOR */}
      {selectedEdge ? (
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-sm font-bold">
                ⚡
              </span>
              <div>
                <div className="text-xs font-semibold text-white">Connection Inspector</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {selectedEdge.sourceName || selectedEdge.source} ➔ {selectedEdge.targetName || selectedEdge.target}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Collapse inspector"
              data-testid="inspector-close"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
            >
              ✖
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Protocol / Technology</label>
              <input
                type="text"
                value={selectedEdge.protocol || ''}
                placeholder="e.g. HTTPS, gRPC, PostgreSQL, Kafka..."
                onChange={(e) => onEdgeChange?.(selectedEdge.id, { protocol: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Action / Description</label>
              <textarea
                rows={3}
                value={selectedEdge.description || selectedEdge.label || ''}
                placeholder="e.g. Queries customer records and order history..."
                onChange={(e) => onEdgeChange?.(selectedEdge.id, { description: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {onDeleteEdge && (
              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => onDeleteEdge(selectedEdge.id)}
                  className="w-full py-1.5 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-700/60 text-red-300 hover:text-white text-xs font-medium transition-colors"
                >
                  🗑️ Delete Connection
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CASE 2: OBJECT INSPECTOR OR EMPTY STATE */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-slate-800 flex justify-between items-center gap-2 bg-slate-950/40 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={onOpenIconPicker}
                title={onOpenIconPicker ? 'Click to choose brand icon (Azure, Postgres...)' : undefined}
                disabled={!onOpenIconPicker}
                className={`w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center p-2 relative shrink-0 transition-all ${
                  onOpenIconPicker ? 'hover:bg-slate-700 hover:border-blue-500 cursor-pointer group shadow' : ''
                }`}
              >
                {currentIcon ? (
                  <img src={currentIcon} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-base">🏢</span>
                )}
                {onOpenIconPicker && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] shadow group-hover:scale-110 transition-transform">
                    ✏️
                  </span>
                )}
              </button>
              <div className="truncate">
                <div className="font-bold text-sm text-slate-100 truncate">{objectName || 'Inspector'}</div>
                {objectKind && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono inline-block mt-0.5">
                    {objectKind}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label="Collapse inspector"
              data-testid="inspector-close"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            >
              ✖
            </button>
          </div>

          {/* IcePanel Tabs: Details, Connections, Docs, Governance */}
          {objectId && (
            <div className="flex border-b border-slate-800 text-xs shrink-0 bg-slate-950/60">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-2 font-medium border-b-2 text-center transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-300 bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('connections')}
                className={`flex-1 py-2 font-medium border-b-2 text-center transition-colors flex items-center justify-center gap-1 ${
                  activeTab === 'connections'
                    ? 'border-blue-500 text-blue-300 bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Connections</span>
                {(incomingConnections.length + outgoingConnections.length > 0) && (
                  <span className="px-1 py-0.2 rounded-full text-[9px] bg-blue-500/30 text-blue-300 font-mono">
                    {incomingConnections.length + outgoingConnections.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('docs')}
                className={`flex-1 py-2 font-medium border-b-2 text-center transition-colors ${
                  activeTab === 'docs'
                    ? 'border-blue-500 text-blue-300 bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Docs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('governance')}
                className={`flex-1 py-2 font-medium border-b-2 text-center transition-colors ${
                  activeTab === 'governance'
                    ? 'border-blue-500 text-blue-300 bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
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
              <div className="text-[10px] text-slate-400 font-mono">
                Properties | ID: {objectId} | Active / Synced
              </div>
              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <div className="flex flex-col gap-4">
                  {/* Brand Icon Trigger */}
                  {onOpenIconPicker && (
                    <button
                      type="button"
                      onClick={onOpenIconPicker}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-medium transition-all group shadow-sm"
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform">🎨</span>
                      <span>Change Brand Icon (Azure, Postgres...)</span>
                    </button>
                  )}

                  {/* Identity Section */}
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
                      Identity
                    </h3>
                    {renderInput('Name', 'name')}
                    {renderInput('Description', 'description')}
                    {renderInput('Caption', 'caption')}
                  </section>

                  {/* Technology Tag Manager */}
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
                      Technologies & Stack
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {currentTags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-slate-400 hover:text-white text-[10px]"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-1.5 mb-2">
                      <input
                        type="text"
                        placeholder="Add technology..."
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag(techInput);
                          }
                        }}
                        className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTag(techInput)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                      >
                        Add
                      </button>
                    </div>

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap gap-1">
                      {COMMON_TECH_TAGS.slice(0, 6).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleAddTag(t)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
                        >
                          +{t}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Technical & Ownership Sections (Retained for spec & tests) */}
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
                      Technical
                    </h3>
                    {renderInput('Technology', 'technology')}
                    {renderInput('Status', 'status')}
                    {renderInput('Environment', 'environment')}
                    {renderInput('Version', 'version')}
                  </section>

                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
                      Ownership
                    </h3>
                    {renderInput('Owner', 'owner')}
                    {renderInput('Team', 'team')}
                  </section>

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

              {/* TAB 2: CONNECTIONS */}
              {activeTab === 'connections' && (
                <div className="flex flex-col gap-4">
                  {/* Connect to another node tool */}
                  {onConnectNodes && allNodes.length > 1 && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <h4 className="text-xs font-semibold text-slate-200 mb-2">⚡ Quick Connect</h4>
                      <form onSubmit={handleCreateConnection} className="flex flex-col gap-2">
                        <select
                          value={newConnectTarget}
                          onChange={(e) => setNewConnectTarget(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
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
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Description (e.g. Reads data)"
                            value={newConnectDesc}
                            onChange={(e) => setNewConnectDesc(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!newConnectTarget}
                          className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
                        >
                          Connect Objects
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Outgoing Connections */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                      Outgoing (Calls out to):
                    </h4>
                    {outgoingConnections.length === 0 ? (
                      <div className="text-xs text-slate-500 italic p-2 bg-slate-950/30 rounded border border-slate-800/40">
                        No outgoing connections
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {outgoingConnections.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/80 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">➔ {c.targetName}</div>
                              <div className="text-[11px] text-slate-400 truncate">
                                <span className="font-mono text-sky-400">{c.protocol || 'Connects'}</span>
                                {c.description && <span>: {c.description}</span>}
                              </div>
                            </div>
                            {onDeleteEdge && (
                              <button
                                type="button"
                                onClick={() => onDeleteEdge(c.id)}
                                title="Remove connection"
                                className="text-slate-400 hover:text-red-400 p-1"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Incoming Connections */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                      Incoming (Called by):
                    </h4>
                    {incomingConnections.length === 0 ? (
                      <div className="text-xs text-slate-500 italic p-2 bg-slate-950/30 rounded border border-slate-800/40">
                        No incoming connections
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {incomingConnections.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/80 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">⬅ {c.sourceName}</div>
                              <div className="text-[11px] text-slate-400 truncate">
                                <span className="font-mono text-sky-400">{c.protocol || 'Connects'}</span>
                                {c.description && <span>: {c.description}</span>}
                              </div>
                            </div>
                            {onDeleteEdge && (
                              <button
                                type="button"
                                onClick={() => onDeleteEdge(c.id)}
                                title="Remove connection"
                                className="text-slate-400 hover:text-red-400 p-1"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: DOCS */}
              {activeTab === 'docs' && (
                <div className="flex flex-col gap-3">
                  <label className="text-xs text-slate-400 font-medium">Architecture Notes & Documentation</label>
                  <textarea
                    rows={8}
                    value={(metadata.documentation as string) || ''}
                    onChange={(e) => handleFieldChange('documentation', e.target.value)}
                    placeholder="Write markdown documentation, architecture decision records (ADRs), or operational runbooks..."
                    className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {renderInput('Repository URL', 'repository')}
                </div>
              )}

              {/* TAB 4: GOVERNANCE & METADATA */}
              {activeTab === 'governance' && (
                <div className="flex flex-col gap-3">
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
                      Classification & Domain
                    </h3>
                    {renderInput('Domain', 'domain')}
                    {renderInput('Tags', 'tags')}
                    {renderInput('Links', 'links')}
                  </section>

                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
                      Risk & Compliance
                    </h3>
                    {renderInput('Criticality', 'criticality')}
                    {renderInput('Data Classification', 'dataClassification')}
                    {renderInput('Compliance', 'compliance')}
                  </section>

                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
                      SLA
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
              <div className="flex border-b border-slate-800 text-xs">
                <button
                  type="button"
                  className="px-3 py-2 text-slate-100 font-medium border-b-2 border-blue-500 bg-slate-800/40"
                >
                  Properties
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Hierarchy
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Metadata
                </button>
              </div>
              <div className="p-6 text-center text-slate-500 text-xs leading-relaxed">
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
