'use client';

import React, { useState } from 'react';
import {
  type ArchitectureId,
  type VersionId,
  type AzureSubscriptionScanInput,
  type AzureImportResult,
  type AzureResourceType,
  ALL_AZURE_RESOURCE_TYPES,
  createMockAzureSubscription,
  importAzureSubscription,
} from '@diagramhq/domain';

export interface AzureImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  architectureId?: ArchitectureId;
  versionId?: VersionId;
  onImportSuccess?: (result: AzureImportResult) => void;
}

export function AzureImportModal({
  isOpen,
  onClose,
  architectureId = 'arch-prod' as ArchitectureId,
  versionId = 'ver-main' as VersionId,
  onImportSuccess,
}: AzureImportModalProps): React.JSX.Element | null {
  const [subscriptionId, setSubscriptionId] = useState('a1b2c3d4-e5f6-7890-abcd-1234567890ab');
  const [tenantId, setTenantId] = useState('11223344-5566-7788-99aa-bbccddeeff00');
  const [resourceGroup, setResourceGroup] = useState('rg-production-core');
  const [location, setLocation] = useState('eastus');
  const [includeVnet, setIncludeVnet] = useState(true);
  const [mapConnections, setMapConnections] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<AzureResourceType[]>([...ALL_AZURE_RESOURCE_TYPES]);
  const [scanData, setScanData] = useState<AzureSubscriptionScanInput | null>(() =>
    createMockAzureSubscription('a1b2c3d4-e5f6-7890-abcd-1234567890ab', 'rg-production-core', 'eastus')
  );
  const [importResult, setImportResult] = useState<AzureImportResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleResourceType = (type: AzureResourceType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleScanMockSubscription = () => {
    setIsScanning(true);
    setNotification(null);
    setTimeout(() => {
      const data = createMockAzureSubscription(subscriptionId, resourceGroup, location);
      setScanData(data);
      setIsScanning(false);
      setNotification(`Successfully scanned Azure Subscription ${subscriptionId} (${data.resources.length} resources found)`);
    }, 300);
  };

  const handleImport = () => {
    if (!scanData) return;

    const result = importAzureSubscription(scanData, {
      architectureId,
      versionId,
      includeVnetContainment: includeVnet,
      mapConnections,
      resourceTypeFilter: selectedTypes,
    });

    setImportResult(result);
    setNotification(`Imported ${result.mappedObjectCount} Azure objects and ${result.mappedConnectionCount} connections.`);
    if (onImportSuccess) {
      onImportSuccess(result);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="azure-import-title"
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
            background: 'linear-gradient(135deg, #0078d4 0%, #004578 100%)',
            color: '#ffffff',
          }}
        >
          <div>
            <h2 id="azure-import-title" style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#50e6ff' }}>☁</span> Azure Infrastructure Import (F079)
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#bae6fd' }}>
              Import and map Microsoft Azure resources (Compute, Databases, Ingress, Messaging) directly into the architecture model.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#bae6fd',
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
              AZURE SUBSCRIPTION ID
            </label>
            <input
              type="text"
              value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
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
              ENTRA ID TENANT ID
            </label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
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
              RESOURCE GROUP
            </label>
            <input
              type="text"
              value={resourceGroup}
              onChange={(e) => setResourceGroup(e.target.value)}
              placeholder="rg-production-core"
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
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '0.375rem 0.625rem',
                fontSize: '0.8125rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="eastus">East US</option>
              <option value="westeurope">West Europe</option>
              <option value="southeastasia">Southeast Asia</option>
              <option value="centralus">Central US</option>
            </select>
          </div>
        </div>

        {/* Resource Type Filter Chips */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
            SUPPORTED AZURE RESOURCE TYPES ({selectedTypes.length}/{ALL_AZURE_RESOURCE_TYPES.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {ALL_AZURE_RESOURCE_TYPES.map((type) => {
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
                    borderColor: active ? '#0078d4' : '#cbd5e1',
                    backgroundColor: active ? '#eff6ff' : '#ffffff',
                    color: active ? '#0078d4' : '#64748b',
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
                checked={includeVnet}
                onChange={(e) => setIncludeVnet(e.target.checked)}
              />
              Map VNet boundaries & containment
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
              onClick={handleScanMockSubscription}
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
              {isScanning ? 'Scanning...' : 'Rescan Subscription'}
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
              Discovered Azure Inventory ({scanData ? scanData.resources.length : 0} items)
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
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                        }}
                      >
                        {res.resourceType.toUpperCase()}
                      </span>
                      <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>{res.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({res.location})</span>
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
            Provider: <code style={{ color: '#0078d4' }}>Azure Cloud (ARM Entra ID Assumed)</code>
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
                backgroundColor: '#0078d4',
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
