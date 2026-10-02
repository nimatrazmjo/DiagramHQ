import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  resolveDependencyRationale,
  queryModelGroundedQA,
  type ArchitectureGroundedContext,
  type ModelObject,
  type ModelConnection,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
  type ModelCitation,
} from '@diagramhq/domain';
import {
  CitationBadge,
  AICopilotPanel,
} from './components/canvas/ai-copilot-panel';

describe('AI Architecture Copilot Integration & UI (F062)', () => {
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  const edgeGateway: ModelObject = {
    id: 'app-gateway' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Edge API Gateway',
    kind: 'application',
    position: { x: 100, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const authService: ModelObject = {
    id: 'app-auth' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Authentication Service',
    kind: 'application',
    position: { x: 300, y: 300 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const dbService: ModelObject = {
    id: 'sto-db' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Primary Database',
    kind: 'store',
    position: { x: 500, y: 300 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const gwAuthConn: ModelConnection = {
    id: 'con-gw-auth' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: edgeGateway.id,
    targetObjectId: authService.id,
    label: 'Authorize JWT Token',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const context: ArchitectureGroundedContext = {
    objects: [edgeGateway, authService, dbService],
    connections: [gwAuthConn],
  };

  it('1. Acceptance Test: "why does X depend on Y" cites the real connection and object IDs', () => {
    // 1. Resolve dependency rationale directly
    const rationale = resolveDependencyRationale(edgeGateway.id, authService.id, context);

    expect(rationale.direct).toBe(true);
    expect(rationale.connection?.id).toBe('con-gw-auth');
    expect(rationale.explanation).toContain('con-gw-auth');
    expect(rationale.explanation).toContain('app-gateway');
    expect(rationale.explanation).toContain('app-auth');

    // 2. Query grounded Q&A
    const response = queryModelGroundedQA(
      'Why does Edge API Gateway depend on Authentication Service?',
      context
    );

    expect(response.role).toBe('assistant');
    expect(response.content).toContain('con-gw-auth');
    expect(response.citations.some((c) => c.id === 'con-gw-auth')).toBe(true);
    expect(response.citations.some((c) => c.id === 'app-gateway')).toBe(true);
    expect(response.citations.some((c) => c.id === 'app-auth')).toBe(true);
  });

  it('2. renders <CitationBadge /> with kind icon and ID label', () => {
    const citation: ModelCitation = {
      kind: 'connection',
      id: 'con-gw-auth',
      name: 'Authorize JWT Token',
    };

    const onClick = vi.fn();
    const html = renderToString(<CitationBadge citation={citation} onClick={onClick} />);

    expect(html).toContain('con-gw-auth');
    expect(html).toContain('Authorize JWT Token');
  });

  it('3. renders <AICopilotPanel /> in open and closed states with context stats and citations', () => {
    const onClose = vi.fn();
    const onSelectEntity = vi.fn();

    const openHtml = renderToString(
      <AICopilotPanel
        isOpen={true}
        onClose={onClose}
        context={context}
        onSelectEntity={onSelectEntity}
      />
    );

    expect(openHtml).toContain('Architecture Copilot');
    expect(openHtml).toContain('Grounded');
    expect(openHtml).toContain('3 objects');
    expect(openHtml).toContain('1 connections');
    expect(openHtml).toContain('Ask anything about the architecture...');
    expect(openHtml).toContain('app-gateway');

    // Closed state renders empty
    const closedHtml = renderToString(
      <AICopilotPanel
        isOpen={false}
        onClose={onClose}
        context={context}
      />
    );
    expect(closedHtml).toBe('');
  });
});
