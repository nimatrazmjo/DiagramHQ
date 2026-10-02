'use client';

import React, { useState } from 'react';
import {
  type ArchitectureId,
  type VersionId,
  type GcpProjectScanInput,
  type GcpImportResult,
  type GcpResourceType,
  ALL_GCP_RESOURCE_TYPES,
  createMockGcpProject,
  importGcpProject,
} from '@diagramhq/domain';

export interface GcpImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  architectureId?: ArchitectureId;
  versionId?: VersionId;
  onImportSuccess?: (result: GcpImportResult) => void;
}

export function GcpImportModal({
  isOpen,
  onClose,
  architectureId = 'arch-prod' as ArchitectureId,
  versionId = 'ver-main' as VersionId,
  onImportSuccess,
}: GcpImportModalProps): React.JSX.Element | null {
  const [projectId, setProjectId] = useState('gcp-production-corp');
  const [organizationId, setOrganizationId] = useState('organizations/1234567890');
  const [region, setRegion] = useState('us-central1');
  const [includeVpc, setIncludeVpc] = useState(true);
  const [mapConnections, setMapConnections] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<GcpResourceType[]>([...ALL_GCP_RESOURCE_TYPES]);
  const [scanData, setScanData] = useState<GcpProjectScanInput | null>(() =>
    createMockGcpProject('gcp-production-corp', 'us-central1')
  );
  const [importResult, setImportResult] = useState<GcpImportResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleResourceType = (type: GcpResourceType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleScanMockProject = () => {
    setIsScanning(true);
    setNotification(null);
    setTimeout(() => {
      const data = createMockGcpProject(projectId, region);
      setScanData(data);
      setIsScanning(false);
      setNotification(`Successfully scanned GCP Project ${projectId} (${data.resources.length} resources found)`);
    }, 300);
  };

  const handleImport = () => {
    if (!scanData) return;

    const result = importGcpProject(scanData, {
      architectureId,
      versionId,
      includeVpcContainment: includeVpc,
      mapConnections,
      resourceTypeFilter: selectedTypes,
    });

    setImportResult(result);
    setNotification(`Imported ${result.mappedObjectCount} GCP objects and ${result.mappedConnectionCount} connections.`);
    if (onImportSuccess) {
      onImportSuccess(result);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gcp-import-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '880px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1a73e8 0%, #174ea6 100%)',
            color: '#ffffff',
          }}
        >
          <div>
            <h2 id="gcp-import-title" style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#fbbc04' }}>☁</span> Google Cloud Infrastructure Import (F080)
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#d2e3fc' }}>
              Import and map Google Cloud resources (Compute Engine, GKE, Cloud Run, Cloud SQL, Pub/Sub) into the architecture model.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#d2e3fc',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Configuration Bar */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              GCP PROJECT ID
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="my-gcp-project-id"
              style={{
                width: '100%',
                padding: '0.375rem 0.625rem',
                fontSize: '0.8125rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              ORGANIZATION ID
            </label>
            <input
              type="text"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              placeholder="organizations/1234567890"
              style={{
                width: '100%',
                padding: '0.375rem 0.625rem',
                fontSize: '0.8125rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              PRIMARY REGION
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{
                width: '100%',
                padding: '0.375rem 0.625rem',
                fontSize: '0.8125rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="us-central1">us-central1 (Iowa)</option>
              <option value="us-east4">us-east4 (N. Virginia)</option>
              <option value="europe-west1">europe-west1 (Belgium)</option>
              <option value="asia-east1">asia-east1 (Taiwan)</option>
            </select>
          </div>
        </div>

        {/* Resource Type Filter Chips */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
            SUPPORTED GCP RESOURCE TYPES ({selectedTypes.length}/{ALL_GCP_RESOURCE_TYPES.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {ALL_GCP_RESOURCE_TYPES.map((type) => {
              const active = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleResourceType(type)}
                  style={{
                    padding: '0.25rem 0.625rem',
                    fontSize: '0.75rem',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: active ? '#1a73e8' : '#cbd5e1',
                    backgroundColor: active ? '#e8f0fe' : '#ffffff',
                    color: active ? '#1967d2' : '#64748b',
                    cursor: 'pointer',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {type.toUpperCase().replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeVpc}
                onChange={(e) => setIncludeVpc(e.target.checked)}
              />
              Map VPC Network boundaries & containment
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mapConnections}
                onChange={(e) => setMapConnections(e.target.checked)}
              />
              Derive inter-resource connections
            </label>

            <button
              onClick={handleScanMockProject}
              disabled={isScanning}
              style={{
                marginLeft: 'auto',
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f1f5f9',
                cursor: 'pointer',
                color: '#334155',
              }}
            >
              {isScanning ? 'Scanning...' : 'Rescan GCP Project'}
            </button>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#ecfdf5',
              borderBottom: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>✓ {notification}</span>
            <button
              onClick={() => setNotification(null)}
              style={{ background: 'transparent', border: 'none', color: '#065f46', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Discovered Resources List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>
              Discovered GCP Inventory ({scanData ? scanData.resources.length : 0} items)
            </h3>
            {importResult && (
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                ✓ Mapped: {importResult.mappedObjectCount} Objects | {importResult.mappedConnectionCount} Connections
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {scanData?.resources.map((res) => {
              const isIncluded = selectedTypes.includes(res.resourceType);
              return (
                <div
                  key={res.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: isIncluded ? '#ffffff' : '#f8fafc',
                    opacity: isIncluded ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.125rem 0.375rem',
                          borderRadius: '4px',
                          backgroundColor: '#e8f0fe',
                          color: '#1967d2',
                        }}
                      >
                        {res.resourceType.toUpperCase()}
                      </span>
                      <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>{res.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({res.region})</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      {res.id}
                    </div>
                  </div>

                  {res.dependencies && res.dependencies.length > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '12px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                        }}
                      >
                        {res.dependencies.length} interactions
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Provider: <code style={{ color: '#1a73e8' }}>Google Cloud Platform (Workload Identity)</code>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.375rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                color: '#334155',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              style={{
                padding: '0.375rem 1.25rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#1a73e8',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Import to Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
