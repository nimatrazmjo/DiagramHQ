import { describe, it, expect } from 'vitest';
import {
  createADR,
  attachADRToEntity,
  detachADRFromEntity,
  updateADRStatus,
  getADRHistoryForObject,
  getADRsForVersion,
  getADRsForConnection,
} from './adrs';
import type { ObjectId, ConnectionId, VersionId } from './ids';

describe('Architecture Decision Records (F117)', () => {
  const objGatewayId = 'app-gateway' as ObjectId;
  const objAuthId = 'app-auth' as ObjectId;
  const connId = 'con-gw-auth' as ConnectionId;
  const ver1Id = 'ver-v1' as VersionId;

  it('1. Acceptance Test: create an ADR, link it to an object, and view in history', () => {
    // 1. Create ADR
    const adr1 = createADR({
      number: 1,
      title: 'ADR-001: Adopt Envoy for API Gateway',
      context: 'Need high performance edge proxy supporting gRPC, HTTP/2, and rate limiting.',
      decision: 'Deploy Envoy proxy at the edge layer.',
      consequences: 'Low latency, high throughput, requires Lua / Wasm filters for custom auth logic.',
      alternatives: ['NGINX', 'Traefik', 'Kong'],
      author: {
        id: 'usr-1',
        name: 'Sarah Chen',
        email: 'sarah@diagramhq.com',
      },
    });

    expect(adr1.id).toBeDefined();
    expect(adr1.id.startsWith('dec_')).toBe(true);
    expect(adr1.title).toBe('ADR-001: Adopt Envoy for API Gateway');
    expect(adr1.status).toBe('proposed');
    expect(adr1.attachments).toHaveLength(0);

    // 2. Link / Attach ADR to architecture object
    const linkedADR1 = attachADRToEntity(adr1, {
      targetType: 'object',
      targetId: objGatewayId,
    });

    expect(linkedADR1.attachments).toHaveLength(1);
    expect(linkedADR1.attachments[0].targetType).toBe('object');
    expect(linkedADR1.attachments[0].targetId).toBe(objGatewayId);

    // Create a second ADR attached to the same object
    const adr2 = createADR({
      number: 2,
      title: 'ADR-002: TLS Termination & Cert Rotation Strategy',
      context: 'Need automated TLS termination on Gateway with Let\'s Encrypt.',
      decision: 'Use cert-manager automated rotation with edge TLS termination.',
      consequences: 'Internal services communicate via mTLS.',
      attachments: [{ targetType: 'object', targetId: objGatewayId }],
    });

    // Create an unrelated ADR attached to auth
    const adr3 = createADR({
      number: 3,
      title: 'ADR-003: Migrate to Keycloak',
      context: 'Auth service needs externalized identity provider.',
      decision: 'Deploy Keycloak with OpenID Connect.',
      consequences: 'Standardized OAuth2/OIDC flows.',
      attachments: [{ targetType: 'object', targetId: objAuthId }],
    });

    // 3. See it in history for object
    const gatewayHistory = getADRHistoryForObject([linkedADR1, adr2, adr3], objGatewayId);
    expect(gatewayHistory).toHaveLength(2);
    expect(gatewayHistory.map((a) => a.number)).toEqual([1, 2]);
    expect(gatewayHistory.map((a) => a.title)).toEqual([
      'ADR-001: Adopt Envoy for API Gateway',
      'ADR-002: TLS Termination & Cert Rotation Strategy',
    ]);

    const authHistory = getADRHistoryForObject([linkedADR1, adr2, adr3], objAuthId);
    expect(authHistory).toHaveLength(1);
    expect(authHistory[0].title).toBe('ADR-003: Migrate to Keycloak');
  });

  it('2. supports status updates and lifecycle transitions', () => {
    const adr = createADR({
      title: 'Database Partitioning Strategy',
      context: 'Ledger table exceeds 500 million rows.',
      decision: 'Implement time-based declarative partitioning in Postgres.',
      consequences: 'Query performance improves; partition maintenance required.',
    });

    expect(adr.status).toBe('proposed');

    const accepted = updateADRStatus(adr, 'accepted');
    expect(accepted.status).toBe('accepted');
    expect(new Date(accepted.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(adr.updatedAt).getTime());

    const superseded = updateADRStatus(accepted, 'superseded');
    expect(superseded.status).toBe('superseded');
  });

  it('3. supports polymorphic attachment and detachment (connection, version)', () => {
    let adr = createADR({
      title: 'ADR-004: gRPC Protocol between Gateway and Auth',
      context: 'Need strongly-typed sub-millisecond RPC for auth token validation.',
      decision: 'Use Protobuf definitions with gRPC over HTTP/2.',
      consequences: 'Fast inter-service communication.',
    });

    // Attach to connection
    adr = attachADRToEntity(adr, {
      targetType: 'connection',
      targetId: connId,
    });
    // Attach to version milestone
    adr = attachADRToEntity(adr, {
      targetType: 'version',
      targetId: ver1Id,
    });

    expect(adr.attachments).toHaveLength(2);

    const forConn = getADRsForConnection([adr], connId);
    expect(forConn).toHaveLength(1);
    expect(forConn[0].id).toBe(adr.id);

    const forVer = getADRsForVersion([adr], ver1Id);
    expect(forVer).toHaveLength(1);
    expect(forVer[0].id).toBe(adr.id);

    // Detach from connection
    const detached = detachADRFromEntity(adr, connId);
    expect(detached.attachments).toHaveLength(1);
    expect(getADRsForConnection([detached], connId)).toHaveLength(0);
  });

  it('4. validates required fields', () => {
    expect(() =>
      createADR({
        title: '',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
      })
    ).toThrow('ADR title cannot be empty');

    expect(() =>
      createADR({
        title: 'Title',
        context: '',
        decision: 'Decision',
        consequences: 'Consequences',
      })
    ).toThrow('ADR context cannot be empty');

    expect(() =>
      createADR({
        title: 'Title',
        context: 'Context',
        decision: '',
        consequences: 'Consequences',
      })
    ).toThrow('ADR decision cannot be empty');
  });
});
