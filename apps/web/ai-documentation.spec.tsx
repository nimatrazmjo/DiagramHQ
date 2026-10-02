import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  generateObjectDocumentation,
  generateSystemArchitectureDocumentation,
  refreshDocumentationOnModelChange,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
  type ModelObject,
  type ModelConnection,
} from '@diagramhq/domain';
import {
  AIDocumentationCard,
  DocumentationViewerModal,
} from './components/canvas/ai-documentation-modal';

describe('AI Architecture Documentation Integration & UI (F068)', () => {
  const archId = 'arch-doc-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  const authService: ModelObject = {
    id: 'app-auth' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Auth Gateway',
    kind: 'application',
    description: 'OAuth2 and session gateway handling token validation',
    position: { x: 100, y: 100 },
    metadata: {
      owner: 'Platform Security Team',
      tags: ['security', 'core-api'],
    },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const redisStore: ModelObject = {
    id: 'sto-redis' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Session Cache',
    kind: 'store',
    description: 'Redis cluster for fast TTL session token lookups',
    position: { x: 400, y: 100 },
    metadata: {
      owner: 'Infra Ops',
    },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const authSessionConn: ModelConnection = {
    id: 'con-auth-cache' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: authService.id,
    targetObjectId: redisStore.id,
    label: 'Cache Session Token',
    description: 'Direct in-memory token lookup',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const testContext = {
    objects: [authService, redisStore],
    connections: [authSessionConn],
  };

  it('1. Acceptance Test: Auto-generate object documentation grounded in metadata + connections (not invented)', () => {
    const doc = generateObjectDocumentation({
      targetObjectId: authService.id,
      versionId: v1,
      context: testContext,
    });

    expect(doc).toBeDefined();
    expect(doc.type).toBe('component');
    expect(doc.title).toContain('Auth Gateway');
    expect(doc.targetId).toBe(authService.id);

    // Verify all grounded references point strictly to real model entities
    expect(doc.groundedReferences.length).toBeGreaterThan(0);
    const validIds = new Set<string>([authService.id, redisStore.id, authSessionConn.id]);
    for (const ref of doc.groundedReferences) {
      expect(validIds.has(ref.id)).toBe(true);
    }

    // Verify metadata was captured
    const overviewSection = doc.sections.find((s) => s.title.toLowerCase().includes('overview'));
    expect(overviewSection).toBeDefined();
    expect(overviewSection?.content).toContain('OAuth2 and session gateway');

    // Verify connection was captured
    const commsSection = doc.sections.find((s) => s.title.toLowerCase().includes('dependencies'));
    expect(commsSection).toBeDefined();
    expect(commsSection?.content).toContain('Session Cache');
    expect(commsSection?.content).toContain('Cache Session Token');
  });

  it('2. Acceptance Test: Auto-generate system architecture documentation grounded in model topology', () => {
    const sysDoc = generateSystemArchitectureDocumentation(v1, testContext, 'System Architecture Specification');

    expect(sysDoc.type).toBe('architecture');
    expect(sysDoc.title).toBe('System Architecture Specification');
    expect(sysDoc.sections.length).toBeGreaterThanOrEqual(3);

    // Invariant: zero hallucinations — every grounded reference must exist in context
    const validIds = new Set<string>([authService.id, redisStore.id]);
    for (const ref of sysDoc.groundedReferences) {
      expect(validIds.has(ref.id)).toBe(true);
    }

    const catalogSection = sysDoc.sections.find((s) => s.title.toLowerCase().includes('catalog'));
    expect(catalogSection?.content).toContain('Auth Gateway');
    expect(catalogSection?.content).toContain('Session Cache');
  });

  it('3. Acceptance Test: Keeps current on change (refreshDocumentationOnModelChange)', () => {
    const originalDoc = generateObjectDocumentation({
      targetObjectId: authService.id,
      versionId: v1,
      context: testContext,
    });
    expect(originalDoc.groundedReferences.length).toBe(3);

    // Add a new database object connected to authService
    const postgresStore: ModelObject = {
      id: 'sto-postgres' as ObjectId,
      architectureId: archId,
      versionId: 'ver-v2' as VersionId,
      name: 'Primary User Database',
      kind: 'store',
      position: { x: 100, y: 300 },
      createdAt: new Date('2026-10-02'),
      updatedAt: new Date('2026-10-02'),
    };

    const newConn: ModelConnection = {
      id: 'con-auth-db' as ConnectionId,
      architectureId: archId,
      versionId: 'ver-v2' as VersionId,
      sourceObjectId: authService.id,
      targetObjectId: postgresStore.id,
      label: 'Query Credentials',
      kind: 'sync',
      createdAt: new Date('2026-10-02'),
      updatedAt: new Date('2026-10-02'),
    };

    const updatedContext = {
      objects: [authService, redisStore, postgresStore],
      connections: [authSessionConn, newConn],
    };

    const refreshedDoc = refreshDocumentationOnModelChange(
      originalDoc,
      updatedContext,
      'ver-v2' as VersionId
    );

    expect(refreshedDoc.versionId).toBe('ver-v2');
    expect(refreshedDoc.groundedReferences.length).toBe(5);
    expect(refreshedDoc.groundedReferences.some((r) => r.id === postgresStore.id)).toBe(true);
    expect(refreshedDoc.groundedReferences.some((r) => r.id === newConn.id)).toBe(true);

    const commsSection = refreshedDoc.sections.find((s) => s.title.toLowerCase().includes('dependencies'));
    expect(commsSection?.content).toContain('Primary User Database');
    expect(commsSection?.content).toContain('Query Credentials');
  });

  it('4. UI Component Rendering: AIDocumentationCard and DocumentationViewerModal', () => {
    const doc = generateObjectDocumentation({
      targetObjectId: authService.id,
      versionId: v1,
      context: testContext,
    });

    const cardHtml = renderToString(
      <AIDocumentationCard
        documentation={doc}
        onOpen={vi.fn()}
        onRefresh={vi.fn()}
      />
    );
    expect(cardHtml).toContain('Grounded Component Spec');
    expect(cardHtml).toContain('Auth Gateway');
    expect(cardHtml).toContain('sections');
    expect(cardHtml).toContain('grounded references');

    const modalHtml = renderToString(
      <DocumentationViewerModal
        isOpen={true}
        onClose={vi.fn()}
        documentation={doc}
        onRefresh={vi.fn()}
        onSelectReference={vi.fn()}
      />
    );
    expect(modalHtml).toContain('Architecture Documentation Dialog');
    expect(modalHtml).toContain('Auth Gateway');
    expect(modalHtml).toContain('100% grounded in model topology');
    expect(modalHtml).toContain('Overview');
    expect(modalHtml).toContain('Outbound Dependencies');
  });
});
