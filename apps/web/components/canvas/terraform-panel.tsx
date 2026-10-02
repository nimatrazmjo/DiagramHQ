'use client';

import React, { useState } from 'react';
import {
  type ArchitectureId,
  type VersionId,
  type TerraformFile,
  type TerraformConfigScanInput,
  type TerraformImportResult,
  type TerraformProvider,
  createMockTerraformRepo,
  importTerraformConfig,
} from '@diagramhq/domain';

export interface TerraformImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  architectureId?: ArchitectureId;
  versionId?: VersionId;
  onImportSuccess?: (result: TerraformImportResult) => void;
}

const ALL_PROVIDERS: TerraformProvider[] = ['aws', 'azurerm', 'google', 'kubernetes'];

export function TerraformImportModal({
  isOpen,
  onClose,
  architectureId = 'arch-prod' as ArchitectureId,
  versionId = 'ver-main' as VersionId,
  onImportSuccess,
}: TerraformImportModalProps): React.JSX.Element | null {
  const [repositoryUrl, setRepositoryUrl] = useState('https://github.com/diagramhq/infra-production');
  const [groupByModule, setGroupByModule] = useState(true);
  const [inferConnections, setInferConnections] = useState(true);
  const [selectedProviders, setSelectedProviders] = useState<TerraformProvider[]>([...ALL_PROVIDERS]);
  const [files, setFiles] = useState<TerraformFile[]>(() => createMockTerraformRepo().files);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [stateJson, setStateJson] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'state' | 'preview'>('preview');
  const [importResult, setImportResult] = useState<TerraformImportResult | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleProvider = (provider: TerraformProvider) => {
    setSelectedProviders((prev) =>
      prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]
    );
  };

  const handleLoadSampleRepo = () => {
    const mockRepo = createMockTerraformRepo();
    setFiles(mockRepo.files);
    setRepositoryUrl(mockRepo.repositoryUrl || 'https://github.com/diagramhq/infra-production');
    setActiveFileIndex(0);
    setImportResult(null);
    setNotification('Loaded sample Terraform microservices repository (4 HCL files).');
  };

  const getScanInput = (): TerraformConfigScanInput => ({
    repositoryUrl,
    files,
    stateJson: stateJson.trim() ? stateJson.trim() : undefined,
  });

  const previewScan = (): TerraformImportResult => {
    return importTerraformConfig(getScanInput(), {
      architectureId,
      versionId,
      groupByModule,
      inferConnections,
      filterProviders: selectedProviders,
    });
  };

  const currentPreview = previewScan();

  const handleImport = () => {
    const result = importTerraformConfig(getScanInput(), {
      architectureId,
      versionId,
      groupByModule,
      inferConnections,
      filterProviders: selectedProviders,
    });

    setImportResult(result);
    setNotification(
      `Successfully mapped ${result.objects.length} architecture objects and ${result.connections.length} connections from Terraform IaC.`
    );
    if (onImportSuccess) {
      onImportSuccess(result);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terraform-import-modal-title"
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
        {/* Modal Header */}
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
                backgroundColor: '#7b42bc',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              TF
            </span>
            <div>
              <h2
                id="terraform-import-modal-title"
                style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}
              >
                Terraform IaC Importer
              </h2>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                Parse HCL configurations and state files into DiagramHQ architecture models
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
          {/* Notification Banner */}
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

          {/* Repo Configuration */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                Git Repository URL
              </label>
              <input
                type="text"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
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
                onClick={handleLoadSampleRepo}
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
                Load Sample IaC Repo
              </button>
            </div>
          </div>

          {/* Provider Filter Chips */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Cloud Providers & Filter
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {ALL_PROVIDERS.map((p) => {
                const active = selectedProviders.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleProvider(p)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: active ? '#7b42bc' : '#e2e8f0',
                      backgroundColor: active ? '#f3e8ff' : '#ffffff',
                      color: active ? '#6b21a8' : '#64748b',
                    }}
                  >
                    {p.toUpperCase()}
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
                checked={groupByModule}
                onChange={(e) => setGroupByModule(e.target.checked)}
              />
              <span>Group Resources by Module (C4 Container Hierarchy)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={inferConnections}
                onChange={(e) => setInferConnections(e.target.checked)}
              />
              <span>Infer Inter-Resource Dependencies (References &amp; depends_on)</span>
            </label>
          </div>

          {/* Navigation Tabs */}
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
                color: activeTab === 'preview' ? '#7b42bc' : '#64748b',
                borderBottom: activeTab === 'preview' ? '2px solid #7b42bc' : '2px solid transparent',
              }}
            >
              Discovered Architecture Preview ({currentPreview.objects.length} Objects)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('files')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: activeTab === 'files' ? '#7b42bc' : '#64748b',
                borderBottom: activeTab === 'files' ? '2px solid #7b42bc' : '2px solid transparent',
              }}
            >
              Terraform Files ({files.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('state')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: activeTab === 'state' ? '#7b42bc' : '#64748b',
                borderBottom: activeTab === 'state' ? '2px solid #7b42bc' : '2px solid transparent',
              }}
            >
              Terraform State JSON
            </button>
          </div>

          {/* Tab 1: Preview */}
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
                <div style={{ padding: '0.75rem', backgroundColor: '#faf5ff', borderRadius: '6px', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b21a8', fontWeight: 600 }}>RESOURCES</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#581c87' }}>{currentPreview.summary.resourceCount}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>MODULES</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#14532d' }}>{currentPreview.summary.moduleCount}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>INFERRED CONNECTIONS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a' }}>{currentPreview.summary.connectionCount}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#fff7ed', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9a3412', fontWeight: 600 }}>OUTPUTS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c2d12' }}>{currentPreview.outputs.length}</div>
                </div>
              </div>

              {/* Inventory Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Resource Address</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Provider</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Kind</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Module</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPreview.resources.map((res) => (
                      <tr key={res.address} data-testid="tf-resource-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                          {res.address}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span
                            style={{
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                            }}
                          >
                            {res.provider.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span
                            style={{
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px',
                              fontSize: '0.6875rem',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 600,
                            }}
                          >
                            {res.type}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>
                          {res.module || 'root'}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontSize: '0.75rem' }}>
                          {res.location.filePath}:{res.location.line}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Files */}
          {activeTab === 'files' && (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                {files.map((file, idx) => (
                  <button
                    key={file.filePath}
                    type="button"
                    onClick={() => setActiveFileIndex(idx)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid #cbd5e1',
                      backgroundColor: activeFileIndex === idx ? '#7b42bc' : '#ffffff',
                      color: activeFileIndex === idx ? '#ffffff' : '#334155',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.filePath}
                  </button>
                ))}
              </div>
              <textarea
                value={files[activeFileIndex]?.content || ''}
                onChange={(e) => {
                  const newContent = e.target.value;
                  setFiles((prev) =>
                    prev.map((f, i) => (i === activeFileIndex ? { ...f, content: newContent } : f))
                  );
                }}
                rows={12}
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

          {/* Tab 3: State JSON */}
          {activeTab === 'state' && (
            <div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Paste raw <code>terraform.tfstate</code> or <code>terraform show -json</code> output here:
              </p>
              <textarea
                value={stateJson}
                onChange={(e) => setStateJson(e.target.value)}
                placeholder='{\n  "version": 4,\n  "resources": [...] \n}'
                rows={12}
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

        {/* Modal Footer */}
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
                backgroundColor: '#7b42bc',
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
