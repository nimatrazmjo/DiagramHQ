import { describe, it, expect } from 'vitest';
import {
  runArchitectureReview,
  type ArchitectureReviewContext,
} from './ai-architecture-review';
import type { ObjectId, ConnectionId, ArchitectureId, VersionId, TeamId } from './ids';
import type { ModelObject, ModelConnection } from './types';
import type { ObjectOwnership } from './teams';

describe('AI Architecture Review Agent (F069)', () => {
  const archId = 'arch-rev-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  it('1. Acceptance Test: Seeded violations produce the expected REQUEST_CHANGES verdict', () => {
    // Seeded violations:
    // 1. Circular dependency: Service A -> Service B -> Service C -> Service A
    // 2. Missing owner on Service B
    // 3. Unapproved external dependency: External Vendor X
    // 4. Missing backup/DR on datastore: Core Database
    // 5. PII to third party: Connection from Service A to External Vendor X sends customer PII password

    const serviceA: ModelObject = {
      id: 'app-service-a' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Order Service',
      kind: 'application',
      position: { x: 100, y: 100 },
      metadata: { owner: 'Commerce Team' },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const serviceB: ModelObject = {
      id: 'app-service-b' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Payment Service',
      kind: 'application',
      position: { x: 300, y: 100 },
      // Note: No owner assigned (violation #2)
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const serviceC: ModelObject = {
      id: 'app-service-c' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Fulfillment Service',
      kind: 'application',
      position: { x: 500, y: 100 },
      metadata: { owner: 'Logistics Team' },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const unapprovedVendor: ModelObject = {
      id: 'ext-unapproved' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Shady Third-Party Analytics',
      kind: 'external',
      position: { x: 100, y: 300 },
      // Note: Not whitelisted or approved (violation #3)
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const unbackedDb: ModelObject = {
      id: 'sto-db' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Core Ledger Database',
      kind: 'store',
      position: { x: 300, y: 300 },
      metadata: { owner: 'DBA Team' },
      // Note: No backupEnabled or drConfigured (violation #4)
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    // Connections creating cycle: A -> B -> C -> A (violation #1)
    const connAtoB: ModelConnection = {
      id: 'con-a-b' as ConnectionId,
      architectureId: archId,
      versionId: v1,
      sourceObjectId: serviceA.id,
      targetObjectId: serviceB.id,
      label: 'Call Payment',
      kind: 'sync',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const connBtoC: ModelConnection = {
      id: 'con-b-c' as ConnectionId,
      architectureId: archId,
      versionId: v1,
      sourceObjectId: serviceB.id,
      targetObjectId: serviceC.id,
      label: 'Trigger Fulfillment',
      kind: 'sync',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const connCtoA: ModelConnection = {
      id: 'con-c-a' as ConnectionId,
      architectureId: archId,
      versionId: v1,
      sourceObjectId: serviceC.id,
      targetObjectId: serviceA.id,
      label: 'Callback Order Status',
      kind: 'sync',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    // Connection sending PII to unapproved third party (violation #5)
    const connPiiToVendor: ModelConnection = {
      id: 'con-pii-vendor' as ConnectionId,
      architectureId: archId,
      versionId: v1,
      sourceObjectId: serviceA.id,
      targetObjectId: unapprovedVendor.id,
      label: 'Transmit customer PII password and card tokens',
      kind: 'sync',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const seededContext: ArchitectureReviewContext = {
      objects: [serviceA, serviceB, serviceC, unapprovedVendor, unbackedDb],
      connections: [connAtoB, connBtoC, connCtoA, connPiiToVendor],
      ownerships: [],
      approvedExternalIds: [], // Empty whitelist
    };

    const report = runArchitectureReview(seededContext);

    // Assert Verdict
    expect(report.verdict).toBe('REQUEST_CHANGES');
    expect(report.summary).toContain('REQUEST_CHANGES');

    // Assert all 5 pre-merge checklist rules failed with specific details
    const cycleItem = report.checklist.find((c) => c.ruleId === 'no_circular_dependencies');
    expect(cycleItem?.status).toBe('FAIL');
    expect(cycleItem?.details).toContain('Order Service');

    const ownerItem = report.checklist.find((c) => c.ruleId === 'owners_present');
    expect(ownerItem?.status).toBe('FAIL');
    expect(ownerItem?.affectedEntityIds).toContain(serviceB.id);

    const externalItem = report.checklist.find((c) => c.ruleId === 'no_unapproved_external_dependencies');
    expect(externalItem?.status).toBe('FAIL');
    expect(externalItem?.affectedEntityIds).toContain(unapprovedVendor.id);

    const backupItem = report.checklist.find((c) => c.ruleId === 'backup_dr_configured');
    expect(backupItem?.status).toBe('FAIL');
    expect(backupItem?.affectedEntityIds).toContain(unbackedDb.id);

    const piiItem = report.checklist.find((c) => c.ruleId === 'no_pii_to_third_parties');
    expect(piiItem?.status).toBe('FAIL');
    expect(piiItem?.affectedEntityIds).toContain(connPiiToVendor.id);

    // Violations list
    expect(report.violations.length).toBe(5);
  });

  it('2. Acceptance Test: Clean architecture with acyclic graph, valid owners, approved vendors, DR, and zero PII leaks returns APPROVE', () => {
    const gateway: ModelObject = {
      id: 'app-gateway' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'API Gateway',
      kind: 'application',
      position: { x: 100, y: 100 },
      metadata: { owner: 'Platform Team' },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const payments: ModelObject = {
      id: 'app-payments' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Payments Backend',
      kind: 'application',
      position: { x: 300, y: 100 },
      metadata: { owner: 'Billing Team' },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const stripeVendor: ModelObject = {
      id: 'ext-stripe' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Stripe Payments',
      kind: 'external',
      position: { x: 500, y: 100 },
      metadata: { approved: true },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const secureDb: ModelObject = {
      id: 'sto-secure' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Transactions DB',
      kind: 'store',
      position: { x: 300, y: 300 },
      metadata: {
        owner: 'Billing Team',
        backupEnabled: true,
        drConfigured: true,
      },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const conn1: ModelConnection = {
      id: 'con-1' as ConnectionId,
      architectureId: archId,
      versionId: v1,
      sourceObjectId: gateway.id,
      targetObjectId: payments.id,
      label: 'Submit Checkout',
      kind: 'sync',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const conn2: ModelConnection = {
      id: 'con-2' as ConnectionId,
      architectureId: archId,
      versionId: v1,
      sourceObjectId: payments.id,
      targetObjectId: stripeVendor.id,
      label: 'Charge Card Token',
      kind: 'sync',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const conn3: ModelConnection = {
      id: 'con-3' as ConnectionId,
      architectureId: archId,
      versionId: v1,
      sourceObjectId: payments.id,
      targetObjectId: secureDb.id,
      label: 'Store Receipt',
      kind: 'sync',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const cleanContext: ArchitectureReviewContext = {
      objects: [gateway, payments, stripeVendor, secureDb],
      connections: [conn1, conn2, conn3],
      approvedExternalIds: [stripeVendor.id],
    };

    const report = runArchitectureReview(cleanContext);

    expect(report.verdict).toBe('APPROVE');
    expect(report.summary).toContain('APPROVE');
    expect(report.checklist.every((c) => c.status === 'PASS')).toBe(true);
    expect(report.violations.length).toBe(0);
  });

  it('3. Supports ObjectOwnership records as team owner assignments', () => {
    const microservice: ModelObject = {
      id: 'app-micro' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Microservice',
      kind: 'application',
      position: { x: 100, y: 100 },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const ownershipRecord: ObjectOwnership = {
      objectId: microservice.id,
      primaryTeamId: 'team-backend' as TeamId,
      updatedAt: new Date('2026-10-01'),
    };

    const report = runArchitectureReview({
      objects: [microservice],
      connections: [],
      ownerships: [ownershipRecord],
    });

    const ownerCheck = report.checklist.find((c) => c.ruleId === 'owners_present');
    expect(ownerCheck?.status).toBe('PASS');
    expect(report.verdict).toBe('APPROVE');
  });
});
