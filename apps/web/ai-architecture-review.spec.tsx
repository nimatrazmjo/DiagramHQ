import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  runArchitectureReview,
  type ArchitectureReviewContext,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
  type ModelObject,
  type ModelConnection,
} from '@diagramhq/domain';
import {
  ReviewVerdictBadge,
  ArchitectureReviewModal,
} from './components/canvas/ai-architecture-review-modal';

describe('AI Architecture Review Integration & UI (F069)', () => {
  const archId = 'arch-review-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  // Seeded architecture with 5 specific violations:
  // 1. Circular dependency: Service A -> Service B -> Service A
  // 2. Missing owner on Service B
  // 3. Unapproved external dependency: Untrusted Ad Tracker
  // 4. Missing backup/DR on datastore: Raw Analytics DB
  // 5. Direct customer PII flow to external third party
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
    // Missing owner
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const untrustedTracker: ModelObject = {
    id: 'ext-untrusted' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Untrusted Ad Tracker',
    kind: 'actor',
    metadata: { external: true },
    position: { x: 500, y: 100 },
    // Unapproved
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const rawAnalyticsDb: ModelObject = {
    id: 'sto-analytics' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Raw Analytics DB',
    kind: 'store',
    position: { x: 300, y: 300 },
    metadata: { owner: 'Data Team' },
    // Missing backup/DR
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const connAtoB: ModelConnection = {
    id: 'con-a-b' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: serviceA.id,
    targetObjectId: serviceB.id,
    label: 'Forward Charge',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const connBtoA: ModelConnection = {
    id: 'con-b-a' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: serviceB.id,
    targetObjectId: serviceA.id,
    label: 'Sync Status Loop',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const connPiiExfil: ModelConnection = {
    id: 'con-pii-exfil' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: serviceA.id,
    targetObjectId: untrustedTracker.id,
    label: 'Send customer PII password and tokens',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const seededViolationContext: ArchitectureReviewContext = {
    objects: [serviceA, serviceB, untrustedTracker, rawAnalyticsDb],
    connections: [connAtoB, connBtoA, connPiiExfil],
    ownerships: [],
    approvedExternalIds: [],
  };

  it('1. Acceptance Test: Seeded violations produce the expected REQUEST_CHANGES verdict', () => {
    const report = runArchitectureReview(seededViolationContext);

    // Pre-merge checklist: no circular dep, owners present, no unapproved external dep, backup/DR, no PII to third parties
    expect(report.verdict).toBe('REQUEST_CHANGES');
    expect(report.violations.length).toBe(5);

    const checklistMap = new Map(report.checklist.map((c) => [c.ruleId, c]));
    expect(checklistMap.get('no_circular_dependencies')?.status).toBe('FAIL');
    expect(checklistMap.get('owners_present')?.status).toBe('FAIL');
    expect(checklistMap.get('no_unapproved_external_dependencies')?.status).toBe('FAIL');
    expect(checklistMap.get('backup_dr_configured')?.status).toBe('FAIL');
    expect(checklistMap.get('no_pii_to_third_parties')?.status).toBe('FAIL');
  });

  it('2. Acceptance Test: Compliant architecture produces APPROVE verdict', () => {
    const compliantService: ModelObject = {
      id: 'app-compliant' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Compliant Backend',
      kind: 'application',
      position: { x: 100, y: 100 },
      metadata: { owner: 'Core Platform Team' },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const compliantDb: ModelObject = {
      id: 'sto-compliant' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Compliant DB',
      kind: 'store',
      position: { x: 300, y: 100 },
      metadata: {
        owner: 'Core Platform Team',
        backupEnabled: true,
        drConfigured: true,
      },
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const conn: ModelConnection = {
      id: 'con-comp' as ConnectionId,
      architectureId: archId,
      versionId: v1,
      sourceObjectId: compliantService.id,
      targetObjectId: compliantDb.id,
      label: 'Read/Write Storage',
      kind: 'sync',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };

    const report = runArchitectureReview({
      objects: [compliantService, compliantDb],
      connections: [conn],
    });

    expect(report.verdict).toBe('APPROVE');
    expect(report.checklist.every((c) => c.status === 'PASS')).toBe(true);
    expect(report.violations.length).toBe(0);
  });

  it('3. UI Component Rendering: ReviewVerdictBadge and ArchitectureReviewModal', () => {
    const report = runArchitectureReview(seededViolationContext);

    // Badge rendering
    const requestBadgeHtml = renderToString(<ReviewVerdictBadge verdict="REQUEST_CHANGES" />);
    expect(requestBadgeHtml).toContain('REQUEST CHANGES');

    const approveBadgeHtml = renderToString(<ReviewVerdictBadge verdict="APPROVE" />);
    expect(approveBadgeHtml).toContain('APPROVED');

    // Modal rendering
    const modalHtml = renderToString(
      <ArchitectureReviewModal
        isOpen={true}
        onClose={vi.fn()}
        report={report}
        onRerunReview={vi.fn()}
        onSelectEntity={vi.fn()}
      />
    );

    expect(modalHtml).toContain('Architecture Review Dialog');
    expect(modalHtml).toContain('AI Architecture Review Agent');
    expect(modalHtml).toContain('Pre-Merge Governance Checklist');
    expect(modalHtml).toContain('No Circular Dependencies');
    expect(modalHtml).toContain('Team Ownership Assigned');
    expect(modalHtml).toContain('Approved External Dependencies');
    expect(modalHtml).toContain('Backup &amp; Disaster Recovery (DR)');
    expect(modalHtml).toContain('No PII Transmission to Third Parties');
    expect(modalHtml).toContain('Blocking Violations');
    expect(modalHtml).toContain('Required Remediation');
  });
});
