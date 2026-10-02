'use client';

import React, { useState } from 'react';
import {
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ModelObject,
  type CurrencyCode,
  type CostCategory,
  type ArchitectureCostReport,
  type ResourceCost,
  ALL_COST_CATEGORIES,
  createMockCostDataset,
  calculateArchitectureCostReport,
} from '@diagramhq/domain';

export interface CostVisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  architectureId?: ArchitectureId;
  versionId?: VersionId;
  objects?: ModelObject[];
  initialCosts?: ResourceCost[];
  onApplyCostsToCanvas?: (costs: ResourceCost[]) => void;
}

export function CostVisualizationModal({
  isOpen,
  onClose,
  architectureId = 'arch-prod' as ArchitectureId,
  versionId = 'ver-main' as VersionId,
  objects = [],
  initialCosts,
  onApplyCostsToCanvas,
}: CostVisualizationModalProps): React.JSX.Element | null {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [selectedCategory, setSelectedCategory] = useState<CostCategory | 'all'>('all');
  const [expandedServiceName, setExpandedServiceName] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Fallback objects if empty list provided
  const effectiveObjects: ModelObject[] =
    objects.length > 0
      ? objects
      : [
          {
            id: 'obj_app_orders' as unknown as ObjectId,
            architectureId,
            versionId,
            parentId: null,
            name: 'Orders API Service',
            kind: 'application',
            description: 'Core orders API',
            position: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'obj_sto_pg' as unknown as ObjectId,
            architectureId,
            versionId,
            parentId: null,
            name: 'Orders Aurora PostgreSQL',
            kind: 'store',
            description: 'Primary transactional database',
            position: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'obj_sto_s3' as unknown as ObjectId,
            architectureId,
            versionId,
            parentId: null,
            name: 'Customer Documents S3 Bucket',
            kind: 'store',
            description: 'Archival storage',
            position: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'obj_grp_vpc' as unknown as ObjectId,
            architectureId,
            versionId,
            parentId: null,
            name: 'Production VPC & NAT Gateway',
            kind: 'group',
            description: 'Networking and routing',
            position: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

  const costs: ResourceCost[] =
    initialCosts || createMockCostDataset(architectureId, effectiveObjects);

  const report: ArchitectureCostReport = calculateArchitectureCostReport({
    architectureId,
    versionId,
    objects: effectiveObjects,
    costs,
    currency,
  });

  if (!isOpen) return null;

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';

  const filteredServices = report.byService.filter((s) => {
    if (selectedCategory === 'all') return true;
    return (s.byCategory[selectedCategory] || 0) > 0;
  });

  const handleApplyToCanvas = () => {
    if (onApplyCostsToCanvas) {
      onApplyCostsToCanvas(costs);
    }
    setNotification(
      `Attached cost overlays to ${costs.length} architecture nodes on canvas (${currencySymbol}${report.totalMonthlyCost.toLocaleString()}/mo).`
    );
  };

  const categoryColor: Record<CostCategory, { bg: string; text: string; border: string }> = {
    compute: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
    database: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    storage: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    networking: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    messaging: { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
    other: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cost-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div>
            <h2
              id="cost-modal-title"
              style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}
            >
              Architecture Cost Intelligence (F128)
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Real-time cloud infrastructure cost estimation, per-service rollups, and category breakdown
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Currency selector */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              aria-label="Select Currency"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>

            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Notification Banner */}
          {notification && (
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{notification}</span>
              <button
                onClick={() => setNotification(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1e40af' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '14px 18px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TOTAL MONTHLY SPEND</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {currencySymbol}
                {report.totalMonthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
                ≈ {currencySymbol}{(report.totalMonthlyCost * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })} / year
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '14px 18px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>HOURLY RUN RATE</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {currencySymbol}
                {report.totalHourlyCost.toFixed(3)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Across {report.byService.length} services
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '14px 18px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TOP COST DRIVER</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {report.byService[0]?.serviceName || 'N/A'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {report.byService[0]
                  ? `${currencySymbol}${report.byService[0].totalMonthly}/mo (${Math.round(
                      (report.byService[0].totalMonthly / report.totalMonthlyCost) * 100
                    )}%)`
                  : ''}
              </div>
            </div>
          </div>

          {/* Category Rollup Breakdown (Acceptance Criteria: compute/db/storage/networking) */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
              Cost Rollup by Category (Compute / Database / Storage / Networking)
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
              }}
            >
              {ALL_COST_CATEGORIES.map((cat) => {
                const amount = report.byCategory[cat] || 0;
                const pct = report.totalMonthlyCost > 0 ? (amount / report.totalMonthlyCost) * 100 : 0;
                const col = categoryColor[cat];

                return (
                  <div
                    key={cat}
                    data-testid={`category-card-${cat}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      backgroundColor: col.bg,
                      border: `1px solid ${col.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: col.text,
                      }}
                    >
                      {cat.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: col.text }}>
                      {currencySymbol}
                      {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.85, color: col.text }}>
                      {pct.toFixed(1)}% of total
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-Service Cost Rollup Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Per-Service Cost Rollup ({filteredServices.length} items):
              </div>

              {/* Filter chips */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setSelectedCategory('all')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: selectedCategory === 'all' ? '#0f172a' : '#ffffff',
                    color: selectedCategory === 'all' ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  All
                </button>
                {ALL_COST_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      textTransform: 'capitalize',
                      border: '1px solid #cbd5e1',
                      backgroundColor: selectedCategory === cat ? '#0f172a' : '#ffffff',
                      color: selectedCategory === cat ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Service list */}
            <div
              data-testid="services-cost-list"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '360px',
                overflowY: 'auto',
              }}
            >
              {filteredServices.map((service) => {
                const isExpanded = expandedServiceName === service.serviceName;

                return (
                  <div
                    key={service.serviceName}
                    data-testid={`service-cost-item-${service.serviceName}`}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                          {service.serviceName}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            padding: '2px 8px',
                            borderRadius: '12px',
                          }}
                        >
                          {service.itemCount} resource{service.itemCount > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                            {currencySymbol}
                            {service.totalMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>/mo</span>
                        </div>

                        <button
                          onClick={() =>
                            setExpandedServiceName(isExpanded ? null : service.serviceName)
                          }
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#0284c7',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                        >
                          {isExpanded ? 'Hide Details ▴' : 'View Details ▾'}
                        </button>
                      </div>
                    </div>

                    {/* Category allocation tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {Object.entries(service.byCategory).map(([cat, val]) => {
                        if (val <= 0) return null;
                        const col = categoryColor[cat as CostCategory];
                        return (
                          <span
                            key={cat}
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              backgroundColor: col.bg,
                              color: col.text,
                              border: `1px solid ${col.border}`,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {cat}: {currencySymbol}
                            {val.toFixed(2)}
                          </span>
                        );
                      })}
                    </div>

                    {/* Expandable Evidence Details */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '6px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '10px 14px',
                          fontSize: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          Grounded Billing Evidence & Resource Breakdown
                        </div>
                        {service.items.map((item, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '4px 0',
                              borderBottom: i < service.items.length - 1 ? '1px dashed #e2e8f0' : 'none',
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 500, color: '#334155' }}>
                                Meter ID: <code>{item.evidence.meterId}</code>
                              </span>
                              <span style={{ color: '#64748b', marginLeft: '8px' }}>
                                (Account: {item.evidence.billingAccountId})
                              </span>
                            </div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {currencySymbol}
                              {item.monthlyCost.toFixed(2)}/mo
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            Close
          </button>

          <button
            onClick={handleApplyToCanvas}
            data-testid="apply-cost-overlay-btn"
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🏷️</span> Attach Cost Overlays to Canvas Nodes
          </button>
        </div>
      </div>
    </div>
  );
}
