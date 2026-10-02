import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { KubernetesImportModal } from './components/canvas/kubernetes-panel';
import type { ArchitectureId, VersionId } from '@diagramhq/domain';

describe('Kubernetes Topology Import Canvas UI (F082)', () => {
  const archId = 'arch-prod-k8s' as ArchitectureId;
  const verId = 'ver-prod-v1' as VersionId;

  it('renders KubernetesImportModal with header, cluster input, resource chips, and discovered topology table', () => {
    const html = renderToString(
      <KubernetesImportModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
        onImportSuccess={vi.fn()}
      />
    );

    expect(html).toContain('Kubernetes Cluster Topology Importer (F082)');
    expect(html).toContain('production-k8s');
    expect(html).toContain('Load Sample Stack');
    expect(html).toContain('DEPLOYMENT');
    expect(html).toContain('STATEFULSET');
    expect(html).toContain('SERVICE');
    expect(html).toContain('INGRESS');
    expect(html).toContain('CONFIGMAP');
    expect(html).toContain('SECRET');
    expect(html).toContain('PV');
    expect(html).toContain('PVC');
    expect(html).toContain('CRONJOB');
    expect(html).toContain('Group Resources by Namespace');
    expect(html).toContain('Infer Topology Interactions');
    expect(html).toContain('Discovered Topology Preview');
    expect(html).toContain('Import to Architecture Model');
  });

  it('renders closed state returning null without rendering modal content', () => {
    const html = renderToString(
      <KubernetesImportModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('renders discovered sample Kubernetes resources across workloads, networking, and storage', () => {
    const html = renderToString(
      <KubernetesImportModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
      />
    );

    expect(html).toContain('edge-ingress');
    expect(html).toContain('api-gateway-service');
    expect(html).toContain('api-gateway-deployment');
    expect(html).toContain('postgres-statefulset');
    expect(html).toContain('postgres-data-pvc');
    expect(html).toContain('production-pv-storage');
    expect(html).toContain('gateway-config');
    expect(html).toContain('jwt-secrets');
    expect(html).toContain('nightly-backup-cronjob');
    expect(html).toContain('debug-bastion-pod');
  });
});
