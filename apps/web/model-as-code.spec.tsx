import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  type ArchitectureId,
  type VersionId,
  type ArchitectureModel,
  type ObjectId,
  type ConnectionId,
  type WorkspaceId,
} from '@diagramhq/domain';
import { ModelAsCodeModal } from './components/canvas/model-as-code-panel';

describe('Model-as-Code & dhq CLI Canvas UI (F125)', () => {
  const archId = 'arch-payments' as ArchitectureId;
  const verId = 'ver-main' as VersionId;

  const sampleModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: 'ws-sample' as WorkspaceId,
      name: 'Global Payment Gateway',
      description: 'Distributed payment orchestration architecture',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'main',
      kind: 'branch',
      status: 'draft',
      createdAt: new Date(),
    },
    objects: [
      {
        id: 'obj-arch-payments-edge-proxy' as ObjectId,
        architectureId: archId,
        versionId: verId,
        name: 'Edge Proxy Gateway',
        kind: 'application',
        description: 'TLS termination and routing',
        metadata: {
          slug: 'edge-proxy',
          technology: ['Envoy', 'Fastify'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj-arch-payments-auth-svc' as ObjectId,
        architectureId: archId,
        versionId: verId,
        name: 'Auth Service',
        kind: 'component',
        description: 'Authentication tokens',
        metadata: {
          slug: 'auth-svc',
          technology: ['Go'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'conn-arch-payments-edge-proxy-auth-svc' as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: 'obj-arch-payments-edge-proxy' as ObjectId,
        targetObjectId: 'obj-arch-payments-auth-svc' as ObjectId,
        kind: 'sync',
        label: 'gRPC / TLS',
        metadata: {
          sourceSlug: 'edge-proxy',
          targetSlug: 'auth-svc',
          protocol: 'gRPC',
          port: 50051,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  it('renders ModelAsCodeModal with header, mode tabs, and YAML editor textarea', () => {
    const html = renderToString(
      <ModelAsCodeModal
        isOpen={true}
        onClose={vi.fn()}
        activeModel={sampleModel}
        onModelUpdate={vi.fn()}
      />
    );

    expect(html).toContain('Model-as-Code &amp; dhq CLI');
    expect(html).toContain('F125');
    expect(html).toContain('YAML 1.0');
    expect(html).toContain('YAML Definition');
    expect(html).toContain('Live Validation');
    expect(html).toContain('Diff Viewer');
    expect(html).toContain('dhq CLI Terminal');
    expect(html).toContain('Push to Canvas');
    expect(html).toContain('Pull');
    expect(html).toContain('Global Payment Gateway');
    expect(html).toContain('edge-proxy');
  });

  it('renders closed state returning null without rendering modal content', () => {
    const html = renderToString(
      <ModelAsCodeModal
        isOpen={false}
        onClose={vi.fn()}
        activeModel={sampleModel}
      />
    );
    expect(html).toBe('');
  });

  it('renders default starter YAML when active model is empty', () => {
    const html = renderToString(
      <ModelAsCodeModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Payment Platform Architecture');
    expect(html).toContain('customer-web-app');
    expect(html).toContain('dhq CLI Runtime Ready');
  });
});
