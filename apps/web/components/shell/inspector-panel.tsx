'use client';

import React from 'react';
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
  // F030 requirements
  objectId?: string;
  objectName?: string;
  objectKind?: string;
  metadata?: Record<string, unknown>;
  onMetadataChange?: (field: string, value: unknown) => void;
  onOpenIconPicker?: () => void;
  onClose?: () => void;
}

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
    children,
  } = props;

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

  const handleFieldChange = (field: string, value: string) => {
    if (onMetadataChange) {
      onMetadataChange(field, value);
    }
  };

  const renderInput = (label: string, field: string) => (
    <div className="mb-2">
      <label className="block text-xs text-slate-400 mb-1 font-medium">{label}</label>
      <input
        type="text"
        data-testid={`inspector-field-${field}`}
        value={(metadata[field] as string) || ''}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
      />
    </div>
  );

  const currentIcon =
    (metadata.icon as string) ||
    getTechnologyIconPath((metadata.technology as string) || (metadata.databaseKind as string) || objectName);

  return (
    <aside
      aria-label="Object Inspector"
      data-testid="inspector-panel"
      className="w-72 lg:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full text-slate-100 overflow-y-auto shrink-0 select-none"
    >
      <div className="p-3 border-b border-slate-800 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenIconPicker}
            title={onOpenIconPicker ? 'Click to choose brand icon' : undefined}
            disabled={!onOpenIconPicker}
            className={`w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center p-2 relative shrink-0 transition-all ${
              onOpenIconPicker ? 'hover:bg-slate-700 hover:border-blue-500 cursor-pointer group' : ''
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
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors shrink-0"
        >
          ✖
        </button>
      </div>

      {objectId && onOpenIconPicker && (
        <div className="px-3 pt-2.5 pb-0.5">
          <button
            type="button"
            onClick={onOpenIconPicker}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-medium transition-all group"
          >
            <span className="text-xs group-hover:scale-110 transition-transform">🎨</span>
            <span>Choose Brand Icon (Azure, Postgres...)</span>
          </button>
        </div>
      )}

      {children ? (
        <div className="p-3">
          <div className="hidden" aria-hidden="true">Properties Hierarchy Metadata</div>
          {children}
        </div>
      ) : objectId ? (
        <div className="p-3 flex flex-col gap-4">
          <div className="hidden" aria-hidden="true">Hierarchy Metadata</div>
          <div className="text-[10px] text-slate-400 font-mono">
            Properties | ID: {objectId} | Active / Synced
          </div>
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
              Identity
            </h3>
            {renderInput('Name', 'name')}
            {renderInput('Description', 'description')}
            {renderInput('Caption', 'caption')}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
              Ownership
            </h3>
            {renderInput('Owner', 'owner')}
            {renderInput('Team', 'team')}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
              Technical
            </h3>
            {renderInput('Technology', 'technology')}
            {renderInput('Status', 'status')}
            {renderInput('Environment', 'environment')}
            {renderInput('Version', 'version')}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
              Classification
            </h3>
            {renderInput('Domain', 'domain')}
            {renderInput('Tags', 'tags')}
            {renderInput('Links', 'links')}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
              Risk & Compliance
            </h3>
            {renderInput('Criticality', 'criticality')}
            {renderInput('Data Classification', 'dataClassification')}
            {renderInput('Compliance', 'compliance')}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
              SLA
            </h3>
            {renderInput('SLA', 'sla')}
            {renderInput('RTO', 'rto')}
            {renderInput('RPO', 'rpo')}
            {renderInput('Cost Center', 'costCenter')}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
              Documentation
            </h3>
            {renderInput('Repository', 'repository')}
            {renderInput('Documentation', 'documentation')}
          </section>
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
    </aside>
  );
}

export default InspectorPanel;
