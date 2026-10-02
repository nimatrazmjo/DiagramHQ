import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createADR,
  attachADRToEntity,
  getADRHistoryForObject,
  updateADRStatus,
  type ArchitectureDecisionRecord,
  type ObjectId,
  type DecisionId,
} from '@diagramhq/domain';
import { ADRBadge, ADRHistoryDrawer } from './components/canvas/adr-drawer';

describe('Architecture Decision Records (ADR) Integration & UI (F117)', () => {
  const gatewayObjId = 'app-gateway' as ObjectId;
  const authObjId = 'app-auth' as ObjectId;

  it('1. Acceptance Test: create an ADR, link it to an object, and view in history', () => {
    // 1. Create ADR
    const adr = createADR({
      number: 1,
      title: 'Adopt Envoy Proxy for Edge Traffic',
      context: 'Need high performance gRPC & HTTP/2 routing with rate limiting.',
      decision: 'Deploy Envoy proxy at the ingress boundary.',
      consequences: 'Low latency, zero-downtime reloads.',
      author: {
        id: 'usr-sarah',
        name: 'Sarah Chen',
      },
    });

    expect(adr.id).toBeDefined();
    expect(adr.number).toBe(1);
    expect(adr.status).toBe('proposed');

    // 2. Link ADR to object
    const linkedADR = attachADRToEntity(adr, {
      targetType: 'object',
      targetId: gatewayObjId,
    });
    expect(linkedADR.attachments).toHaveLength(1);
    expect(linkedADR.attachments[0]?.targetId).toBe(gatewayObjId);

    // Create another ADR for auth
    const authADR = createADR({
      number: 2,
      title: 'Adopt Keycloak for Authentication',
      context: 'Need centralized OIDC server.',
      decision: 'Use Keycloak 24.',
      consequences: 'Standard OAuth2 support.',
      attachments: [{ targetType: 'object', targetId: authObjId }],
    });

    // 3. Query history for gateway
    const history = getADRHistoryForObject([linkedADR, authADR], gatewayObjId);
    expect(history).toHaveLength(1);
    expect(history[0]?.title).toBe('Adopt Envoy Proxy for Edge Traffic');
    expect(history[0]?.number).toBe(1);

    // Update status
    const accepted = updateADRStatus(linkedADR, 'accepted');
    expect(accepted.status).toBe('accepted');
  });

  it('2. renders <ADRBadge /> with proper label and status pill', () => {
    const mockAdr: ArchitectureDecisionRecord = {
      id: 'dec_test1' as DecisionId,
      number: 42,
      title: 'Use Redis for Session Storage',
      status: 'accepted',
      context: 'High volume web traffic requires fast session lookups.',
      decision: 'Deploy Redis cluster.',
      consequences: 'Sub-millisecond latency.',
      alternatives: ['Memcached'],
      attachments: [{ targetType: 'object', targetId: gatewayObjId, attachedAt: '2026-10-01' }],
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };

    const onClick = vi.fn();
    const html = renderToString(<ADRBadge adr={mockAdr} onClick={onClick} />);

    expect(html).toContain('ADR-042');
    expect(html).toContain('Use Redis for Session Storage');
    expect(html).toContain('accepted');
  });

  it('3. renders <ADRHistoryDrawer /> in populated and empty states', () => {
    const mockAdr: ArchitectureDecisionRecord = {
      id: 'dec_test1' as DecisionId,
      number: 1,
      title: 'Adopt Envoy Proxy for Edge Traffic',
      status: 'accepted',
      context: 'Need high performance gRPC routing.',
      decision: 'Deploy Envoy proxy at the ingress boundary.',
      consequences: 'Low latency, zero-downtime reloads.',
      alternatives: ['NGINX', 'HAProxy'],
      attachments: [{ targetType: 'object', targetId: gatewayObjId, attachedAt: '2026-10-01' }],
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };

    const onClose = vi.fn();

    // Populated state
    const populatedHtml = renderToString(
      <ADRHistoryDrawer
        isOpen={true}
        onClose={onClose}
        entityName="Edge API Gateway"
        entityId={gatewayObjId}
        entityType="object"
        adrs={[mockAdr]}
      />
    );

    expect(populatedHtml).toContain('Architecture Decisions (ADR)');
    expect(populatedHtml).toContain('Edge API Gateway');
    expect(populatedHtml).toContain('Adopt Envoy Proxy for Edge Traffic');
    expect(populatedHtml).toContain('Need high performance gRPC routing.');
    expect(populatedHtml).toContain('Deploy Envoy proxy at the ingress boundary.');
    expect(populatedHtml).toContain('NGINX');

    // Empty state
    const emptyHtml = renderToString(
      <ADRHistoryDrawer
        isOpen={true}
        onClose={onClose}
        entityName="Empty Service"
        entityType="object"
        adrs={[]}
      />
    );

    expect(emptyHtml).toContain('No decision records attached');
    expect(emptyHtml).toContain('Create First ADR');

    // Closed state
    const closedHtml = renderToString(
      <ADRHistoryDrawer
        isOpen={false}
        onClose={onClose}
        adrs={[mockAdr]}
      />
    );
    expect(closedHtml).toBe('');
  });
});
