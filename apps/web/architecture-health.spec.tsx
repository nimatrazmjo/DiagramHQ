import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ArchitectureHealthModal } from './components/canvas/architecture-health-panel';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from '@diagramhq/domain';

describe('Architecture Health Canvas UI (F129)', () => {
  const archId = 'arch-health-ui-test' as ArchitectureId;
  const verId = 'ver-health-ui-v1' as VersionId;
  const wsId = 'ws-health-ui-main' as unknown as WorkspaceId;

  const mkObj = (
    id: string,
    name: string,
    kind: string,
    metadata?: Record<string, unknown>,
    description?: string | null
  ) => ({
    id: id as unknown as ObjectId,
    architectureId: archId,
    versionId: verId,
    parentId: null,
    name,
    kind: kind as 'actor' | 'application' | 'store' | 'component' | 'system' | 'group',
    description: description !== undefined ? description : 'Detailed description for system component.',
    position: null,
    metadata: metadata ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mkConn = (
    id: string,
    src: string,
    tgt: string,
    label?: string,
    metadata?: Record<string, unknown>
  ) => ({
    id: id as unknown as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: src as unknown as ObjectId,
    targetObjectId: tgt as unknown as ObjectId,
    kind: 'sync' as const,
    label: label ?? null,
    description: null,
    metadata: metadata ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mkModel = (
    objects: ReturnType<typeof mkObj>[],
    connections: ReturnType<typeof mkConn>[]
  ): ArchitectureModel => ({
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'Production Cloud Ecosystem',
      description: 'Production enterprise cloud microservices architecture overview.',
      defaultVersionId: verId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects,
    connections,
  });

  const sampleModel = mkModel(
    [
      mkObj('user', 'Web Client', 'actor', {}, 'Client browser accessing gateway'),
      mkObj('api', 'API Gateway', 'application', { owner: 'edge-team', public: true, authScheme: 'OAuth2' }),
      mkObj('db', 'PostgreSQL DB', 'store', { owner: 'data-team', encryptionAtRest: true }),
      mkObj('orphan', 'Mystery Microservice', 'application', {}, null), // missing description and owner
    ],
    [
      mkConn('c1', 'user', 'api', 'HTTPS'),
      mkConn('c2', 'api', 'db', 'SQL'),
    ]
  );

  it('renders modal with composite score, 5 categories, and findings', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <ArchitectureHealthModal
        isOpen={true}
        onClose={onClose}
        model={sampleModel}
      />
    );

    // Modal Title
    expect(html).toContain('Architecture Health Scorecard');

    // All 5 categories rendered
    expect(html).toContain('Dependencies &amp; Topology');
    expect(html).toContain('Documentation Coverage');
    expect(html).toContain('Security Architecture');
    expect(html).toContain('Ownership Governance');
    expect(html).toContain('Architecture Drift');

    // Top metrics cards rendered
    expect(html).toContain('Composite Score');
    expect(html).toContain('Ownership Coverage');
    expect(html).toContain('Doc Coverage');
    expect(html).toContain('Dependency Cycles');
    expect(html).toContain('Security Exposures');
    expect(html).toContain('Drift Items');

    // Action buttons rendered
    expect(html).toContain('Copy Summary');
    expect(html).toContain('Export JSON');

    // Gaps and findings rendered for orphan node
    expect(html).toContain('Missing Component Owner');
    expect(html).toContain('Missing Component Documentation');
  });

  it('renders change analytics when baseline model is supplied', () => {
    const baselineModel = mkModel(
      [
        mkObj('legacy-svc', 'Legacy Service', 'application', {}, null),
      ],
      []
    );

    const onClose = vi.fn();
    const html = renderToString(
      <ArchitectureHealthModal
        isOpen={true}
        onClose={onClose}
        model={sampleModel}
        baselineModel={baselineModel}
      />
    );

    expect(html).toContain('Change Analytics &amp; Trends');
    expect(html).toContain('Risk Level:');
    expect(html).toContain('added objects');
    expect(html).toContain('affected components');
  });

  it('renders null when isOpen is false', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <ArchitectureHealthModal
        isOpen={false}
        onClose={onClose}
        model={sampleModel}
      />
    );
    expect(html).toBe('');
  });
});
