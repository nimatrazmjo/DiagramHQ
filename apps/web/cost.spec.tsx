import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CostVisualizationModal } from './components/canvas/cost-panel';
import type { ArchitectureId, VersionId } from '@diagramhq/domain';

describe('Cost Visualization Canvas UI (F128)', () => {
  const archId = 'arch-prod-cost' as ArchitectureId;
  const verId = 'ver-prod-v1' as VersionId;

  it('renders CostVisualizationModal with header, currency selector, KPIs, and category breakdown', () => {
    const html = renderToString(
      <CostVisualizationModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
        onApplyCostsToCanvas={vi.fn()}
      />
    );

    expect(html).toContain('Architecture Cost Intelligence (F128)');
    expect(html).toContain('TOTAL MONTHLY SPEND');
    expect(html).toContain('HOURLY RUN RATE');
    expect(html).toContain('TOP COST DRIVER');
    expect(html).toContain('Cost Rollup by Category (Compute / Database / Storage / Networking)');
    expect(html).toContain('COMPUTE');
    expect(html).toContain('DATABASE');
    expect(html).toContain('STORAGE');
    expect(html).toContain('NETWORKING');
    expect(html).toContain('Attach Cost Overlays to Canvas Nodes');
  });

  it('renders closed state returning null without rendering modal content', () => {
    const html = renderToString(
      <CostVisualizationModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('renders per-service cost items with category allocations and evidence', () => {
    const html = renderToString(
      <CostVisualizationModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
      />
    );

    expect(html).toContain('Orders API Service');
    expect(html).toContain('Orders Aurora PostgreSQL');
    expect(html).toContain('Customer Documents S3 Bucket');
    expect(html).toContain('Production VPC &amp; NAT Gateway');
    expect(html).toContain('View Details ▾');
  });
});
