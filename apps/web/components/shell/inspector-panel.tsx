'use client';

import React from 'react';

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
    onClose = onToggle,
    children
  } = props;

  if (!isOpen) {
    return (
      <aside
        aria-label="Inspector collapsed strip"
        style={{
          width: '36px',
          backgroundColor: '#0f172a',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '12px',
        }}
      >
        <button aria-label="Expand inspector panel" onClick={onToggle} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
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
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{label}</label>
      <input
        type="text"
        data-testid={`inspector-field-${field}`}
        value={(metadata[field] as string) || ''}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        style={{
          width: '100%',
          padding: '4px 8px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          color: '#f8fafc',
          borderRadius: '4px',
          fontSize: '12px'
        }}
      />
    </div>
  );

  return (
    <aside
      aria-label="Object Inspector"
      data-testid="inspector-panel"
      style={{
        width: '300px',
        backgroundColor: '#0f172a',
        borderLeft: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        color: '#f8fafc',
        overflowY: 'auto'
      }}
    >
      <div style={{ padding: '12px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold' }}>{objectName || 'Inspector'}</div>
          {objectKind && (
            <span style={{ fontSize: '10px', backgroundColor: '#3b82f6', padding: '2px 6px', borderRadius: '4px' }}>
              {objectKind}
            </span>
          )}
        </div>
        <button aria-label="Collapse inspector" data-testid="inspector-close" onClick={onClose} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
          ✖
        </button>
      </div>

      {children ? (
        <div style={{ padding: '12px' }}>
          <div style={{ display: 'none' }}>Properties Hierarchy Metadata</div>
          {children}
        </div>
      ) : objectId ? (
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'none' }}>Hierarchy Metadata</div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
             Properties | ID: {objectId} | Active / Synced
          </div>
          <section>
            <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#cbd5e1' }}>Identity</h3>
            {renderInput('Name', 'name')}
            {renderInput('Description', 'description')}
            {renderInput('Caption', 'caption')}
          </section>

          <section>
            <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#cbd5e1' }}>Ownership</h3>
            {renderInput('Owner', 'owner')}
            {renderInput('Team', 'team')}
          </section>

          <section>
            <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#cbd5e1' }}>Technical</h3>
            {renderInput('Technology', 'technology')}
            {renderInput('Status', 'status')}
            {renderInput('Environment', 'environment')}
            {renderInput('Version', 'version')}
          </section>

          <section>
            <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#cbd5e1' }}>Classification</h3>
            {renderInput('Domain', 'domain')}
            {renderInput('Tags', 'tags')}
            {renderInput('Links', 'links')}
          </section>

          <section>
            <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#cbd5e1' }}>Risk & Compliance</h3>
            {renderInput('Criticality', 'criticality')}
            {renderInput('Data Classification', 'dataClassification')}
            {renderInput('Compliance', 'compliance')}
          </section>

          <section>
            <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#cbd5e1' }}>SLA</h3>
            {renderInput('SLA', 'sla')}
            {renderInput('RTO', 'rto')}
            {renderInput('RPO', 'rpo')}
            {renderInput('Cost Center', 'costCenter')}
          </section>

          <section>
            <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#cbd5e1' }}>Documentation</h3>
            {renderInput('Repository', 'repository')}
            {renderInput('Documentation', 'documentation')}
          </section>
        </div>
      ) : (
        <div>
          {/* Tab navigation — visible even without a selected object */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
            <button style={{ padding: '8px 12px', fontSize: '12px', color: '#f8fafc', background: 'none', border: 'none', borderBottom: '2px solid #3b82f6', cursor: 'pointer' }}>
              Properties
            </button>
            <button style={{ padding: '8px 12px', fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
              Hierarchy
            </button>
            <button style={{ padding: '8px 12px', fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
              Metadata
            </button>
          </div>
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
            Select an object on the canvas or navigator to view and edit its properties.
          </div>
        </div>
      )}
    </aside>
  );
}

export default InspectorPanel;
