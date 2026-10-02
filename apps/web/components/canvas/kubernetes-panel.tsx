'use client';

import React, { useState } from 'react';
import {
  type ArchitectureId,
  type VersionId,
  type K8sResourceType,
  type K8sImportResult,
  ALL_K8S_RESOURCE_TYPES,
  createMockKubernetesManifests,
  importKubernetesManifests,
} from '@diagramhq/domain';

export interface KubernetesImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  architectureId?: ArchitectureId;
  versionId?: VersionId;
  onImportSuccess?: (result: K8sImportResult) => void;
}

export function KubernetesImportModal({
  isOpen,
  onClose,
  architectureId = 'arch-prod' as ArchitectureId,
  versionId = 'ver-main' as VersionId,
  onImportSuccess,
}: KubernetesImportModalProps): React.JSX.Element | null {
  const [clusterName, setClusterName] = useState('production-k8s');
  const [groupByNamespace, setGroupByNamespace] = useState(true);
  const [inferConnections, setInferConnections] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<K8sResourceType[]>([...ALL_K8S_RESOURCE_TYPES]);
  const [manifestContent, setManifestContent] = useState(() => createMockKubernetesManifests());
  const [activeTab, setActiveTab] = useState<'preview' | 'manifest'>('preview');
  const [importResult, setImportResult] = useState<K8sImportResult | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleResourceType = (type: K8sResourceType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleLoadSampleManifests = () => {
    const sample = createMockKubernetesManifests();
    setManifestContent(sample);
    setClusterName('production-k8s');
    setImportResult(null);
    setNotification('Loaded sample production Kubernetes microservices stack (11 manifests).');
  };

  const previewScan = (): K8sImportResult => {
    return importKubernetesManifests(
      { manifestContent, clusterName },
      {
        architectureId,
        versionId,
        clusterName,
        groupByNamespace,
        inferConnections,
        filterResourceTypes: selectedTypes,
      }
    );
  };

  const currentPreview = previewScan();

  const handleImport = () => {
    const result = importKubernetesManifests(
      { manifestContent, clusterName },
      {
        architectureId,
        versionId,
        clusterName,
        groupByNamespace,
        inferConnections,
        filterResourceTypes: selectedTypes,
      }
    );

    setImportResult(result);
    setNotification(
      `Successfully mapped ${result.objects.length} Kubernetes objects and ${result.connections.length} topology connections.`
    );
    if (onImportSuccess) {
      onImportSuccess(result);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="k8s-import-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
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
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#326ce5',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              K8S
            </span>
            <div>
              <h2
                id="k8s-import-modal-title"
                style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}
              >
                Kubernetes Cluster Topology Importer (F082)
              </h2>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                Import cluster topology, workloads, networking, and persistent storage into DiagramHQ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '1.25rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Notification */}
          {notification && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                backgroundColor: '#f0fdf4',
                color: '#166534',
                fontSize: '0.875rem',
                border: '1px solid #bbf7d0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{notification}</span>
              <button
                type="button"
                onClick={() => setNotification(null)}
                style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Cluster Name & Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                Kubernetes Cluster Name
              </label>
              <input
                type="text"
                value={clusterName}
                onChange={(e) => setClusterName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={handleLoadSampleManifests}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Load Sample Stack
              </button>
            </div>
          </div>

          {/* K8s Resource Filter Chips */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Supported Kubernetes Kinds & Filter
            </label>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {ALL_K8S_RESOURCE_TYPES.map((t) => {
                const active = selectedTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleResourceType(t)}
                    style={{
                      padding: '0.25rem 0.625rem',
                      borderRadius: '9999px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: active ? '#326ce5' : '#e2e8f0',
                      backgroundColor: active ? '#eff6ff' : '#ffffff',
                      color: active ? '#1e40af' : '#64748b',
                    }}
                  >
                    {t.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options Toggles */}
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={groupByNamespace}
                onChange={(e) => setGroupByNamespace(e.target.checked)}
              />
              <span>Group Resources by Namespace (Multi-Tenant Containment)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={inferConnections}
                onChange={(e) => setInferConnections(e.target.checked)}
              />
              <span>Infer Topology Interactions (Ingress → Service → Pods → PVC/Secrets)</span>
            </label>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: activeTab === 'preview' ? '#326ce5' : '#64748b',
                borderBottom: activeTab === 'preview' ? '2px solid #326ce5' : '2px solid transparent',
              }}
            >
              Discovered Topology Preview ({currentPreview.objects.length} Objects)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manifest')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: activeTab === 'manifest' ? '#326ce5' : '#64748b',
                borderBottom: activeTab === 'manifest' ? '2px solid #326ce5' : '2px solid transparent',
              }}
            >
              YAML Manifest Editor
            </button>
          </div>

          {/* Tab Content: Preview */}
          {activeTab === 'preview' && (
            <div>
              {/* Summary Stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>RESOURCES</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a' }}>{currentPreview.summary.totalResources}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>NAMESPACES</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#14532d' }}>{currentPreview.summary.namespaceCount}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#faf5ff', borderRadius: '6px', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b21a8', fontWeight: 600 }}>TOPOLOGY LINKS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#581c87' }}>{currentPreview.summary.mappedConnectionCount}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#fff7ed', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9a3412', fontWeight: 600 }}>TOTAL OBJECTS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c2d12' }}>{currentPreview.objects.length}</div>
                </div>
              </div>

              {/* Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Resource Name</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Kind</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Namespace</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>API Version</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPreview.resources.map((res) => (
                      <tr key={res.id} data-testid="k8s-resource-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                          {res.name}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span
                            style={{
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px',
                              fontSize: '0.6875rem',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 700,
                            }}
                          >
                            {res.kind}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>
                          {res.namespace}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontSize: '0.75rem' }}>
                          {res.apiVersion}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontSize: '0.75rem' }}>
                          Doc #{res.location.docIndex + 1} : L{res.location.line}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Content: Manifest */}
          {activeTab === 'manifest' && (
            <div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Multi-document Kubernetes YAML manifests (separate documents with <code>---</code>):
              </p>
              <textarea
                value={manifestContent}
                onChange={(e) => setManifestContent(e.target.value)}
                rows={14}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.8125rem',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            {importResult
              ? `Imported ${importResult.objects.length} ModelObjects · ${importResult.connections.length} Connections`
              : `${currentPreview.objects.length} ModelObjects · ${currentPreview.connections.length} Connections mapped`}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#326ce5',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              Import to Architecture Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
