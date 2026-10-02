import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ArchitectureRulesModal } from './components/canvas/rules-panel';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from '@diagramhq/domain';

describe('Architecture Rules Canvas UI (F086)', () => {
  const archId = 'arch-prod-rules' as ArchitectureId;
  const verId = 'ver-prod-v1' as VersionId;
  const wsId = 'ws-main' as unknown as WorkspaceId;

  const mockCompliantModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'Compliant Platform',
      defaultVersionId: verId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.0.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: 'obj_user' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'End User',
        kind: 'actor',
        description: 'Customer',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_app' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'Secure API Service',
        kind: 'application',
        description: 'Main service',
        metadata: {
          owner: 'Security Core Team', // Owner required satisfied
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'conn_secure' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: 'obj_user' as unknown as ObjectId,
        targetObjectId: 'obj_app' as unknown as ObjectId,
        label: 'Auth Login',
        kind: 'sync',
        description: 'HTTPS login',
        metadata: {
          auth: 'OAuth2 / PKCE', // Auth required satisfied
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const mockViolatingModel: ArchitectureModel = {
    ...mockCompliantModel,
    objects: [
      {
        id: 'obj_unowned_svc' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'Unowned Service',
        kind: 'application',
        description: '',
        metadata: {}, // Missing owner!
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [],
  };

  it('renders 100% compliant banner and 4/4 passing rules for compliant model', () => {
    const html = renderToString(
      <ArchitectureRulesModal
        isOpen={true}
        onClose={vi.fn()}
        model={mockCompliantModel}
      />
    );

    expect(html).toContain('Organization Architecture Rules (F086)');
    expect(html).toContain('Model is 100% Policy Compliant');
    expect(html).toContain('4 / 4 Rules Passing');
    expect(html).toContain('Owner Required');
    expect(html).toContain('External API Authentication Required');
    expect(html).toContain('No Cross-Service Direct Database Access');
    expect(html).toContain('PII Flow Restrictions');
  });

  it('renders non-compliant status and violation cards for violating model', () => {
    const html = renderToString(
      <ArchitectureRulesModal
        isOpen={true}
        onClose={vi.fn()}
        model={mockViolatingModel}
      />
    );

    expect(html).toContain('NON-COMPLIANT');
    expect(html).toContain('POLICY ERRORS');
    expect(html).toContain('Unowned Service');
    expect(html).toContain('ORG-RULE-001');
    expect(html).toContain('Remediation:');
  });

  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <ArchitectureRulesModal
        isOpen={false}
        onClose={vi.fn()}
        model={mockCompliantModel}
      />
    );

    expect(html).toBe('');
  });
});
