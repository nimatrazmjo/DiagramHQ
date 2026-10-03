import { describe, it, expect } from 'vitest';
import { computeArchitectureHealth } from './architecture-health';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const archId = 'arch-health-test' as ArchitectureId;
const verId = 'ver-health-v1' as VersionId;
const wsId = 'ws-health-main' as unknown as WorkspaceId;

function mkObj(
  id: string,
  name: string,
  kind: string = 'application',
  opts: {
    description?: string | null;
    owner?: string;
    team?: string;
    metadata?: Record<string, unknown>;
  } = {}
) {
  const metadata: Record<string, unknown> = { ...(opts.metadata || {}) };
  if (opts.owner) metadata.owner = opts.owner;
  if (opts.team) metadata.team = opts.team;

  return {
    id: id as unknown as ObjectId,
    architectureId: archId,
    versionId: verId,
    parentId: null,
    name,
    kind: kind as 'actor' | 'application' | 'store' | 'component' | 'system' | 'group',
    description: opts.description !== undefined ? opts.description : 'Standard production component service description.',
    position: { x: 0, y: 0 },
    metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mkConn(
  id: string,
  src: string,
  tgt: string,
  label?: string,
  metadata?: Record<string, unknown>
) {
  return {
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
  };
}

function mkModel(
  objects: ReturnType<typeof mkObj>[],
  connections: ReturnType<typeof mkConn>[] = [],
  archDescription: string = 'Enterprise cloud platform architecture overview description.'
): ArchitectureModel {
  return {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'Health Test Architecture',
      description: archDescription,
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
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Architecture Health Engine (F129)', () => {
  it('computes high composite health score and all 5 categories for a well-formed model', () => {
    const user = mkObj('obj-user', 'Mobile User', 'actor', {
      description: 'End-user client accessing the system via iOS/Android.',
    });
    const api = mkObj('obj-api', 'Gateway API', 'application', {
      description: 'Public API gateway routing and authenticating inbound client traffic.',
      owner: 'platform-team',
      metadata: { public: true, authScheme: 'OAuth2' },
    });
    const db = mkObj('obj-db', 'PostgreSQL DB', 'store', {
      description: 'Primary relational database storing transactional orders and users.',
      owner: 'data-team',
      metadata: { encryptionAtRest: true },
    });

    const conn1 = mkConn('c1', 'obj-user', 'obj-api', 'HTTPS');
    const conn2 = mkConn('c2', 'obj-api', 'obj-db', 'SQL');

    const model = mkModel([user, api, db], [conn1, conn2]);
    const report = computeArchitectureHealth(model);

    expect(report.compositeScore).toBeGreaterThanOrEqual(80);
    expect(report.overallStatus).toBe('healthy');
    expect(report.categories).toHaveLength(5);

    const categoryNames = report.categories.map((c) => c.category);
    expect(categoryNames).toEqual(
      expect.arrayContaining(['dependencies', 'documentation', 'security', 'ownership', 'drift'])
    );

    // Dependencies category check
    const depCat = report.categories.find((c) => c.category === 'dependencies')!;
    expect(depCat.score).toBe(100);
    expect(depCat.errorCount).toBe(0);

    // Analytics check
    expect(report.analytics.totalObjects).toBe(3);
    expect(report.analytics.totalConnections).toBe(2);
    expect(report.analytics.cyclicDependencyCount).toBe(0);
    expect(report.analytics.ownershipCoverage).toBe(100);
    expect(report.analytics.documentationCoverage).toBe(100);
    expect(report.analytics.changeAnalytics.hasBaseline).toBe(false);
  });

  it('detects seeded dependency gaps: cycles and dangling connections', () => {
    const s1 = mkObj('s1', 'Service 1', 'application', {
      description: 'Service 1 participating in cyclic chain.',
      owner: 'core-team',
    });
    const s2 = mkObj('s2', 'Service 2', 'application', {
      description: 'Service 2 participating in cyclic chain.',
      owner: 'core-team',
    });
    const s3 = mkObj('s3', 'Service 3', 'application', {
      description: 'Service 3 participating in cyclic chain.',
      owner: 'core-team',
    });

    // Create cycle: s1 -> s2 -> s3 -> s1
    const c12 = mkConn('c12', 's1', 's2');
    const c23 = mkConn('c23', 's2', 's3');
    const c31 = mkConn('c31', 's3', 's1');
    // Create dangling connection pointing to ghost node
    const cDangling = mkConn('cDang', 's1', 'ghost-target');

    const model = mkModel([s1, s2, s3], [c12, c23, c31, cDangling]);
    const report = computeArchitectureHealth(model);

    const depCat = report.categories.find((c) => c.category === 'dependencies')!;
    expect(depCat.score).toBeLessThan(80);
    expect(depCat.errorCount).toBeGreaterThanOrEqual(2); // cycle + dangling

    const cycleFinding = report.findings.find((f) => f.title === 'Cyclic Dependency Detected');
    expect(cycleFinding).toBeDefined();
    expect(cycleFinding?.category).toBe('dependencies');
    expect(cycleFinding?.severity).toBe('error');

    const danglingFinding = report.findings.find((f) => f.title === 'Dangling Connection Endpoint');
    expect(danglingFinding).toBeDefined();

    expect(report.analytics.cyclicDependencyCount).toBe(1);
  });

  it('detects seeded documentation gaps and degrades documentation score', () => {
    const wellDoc = mkObj('o1', 'Documented Service', 'application', {
      description: 'Extensively detailed architectural description of this critical service.',
      owner: 'team-a',
    });
    const noDoc1 = mkObj('o2', 'Mystery Component', 'component', {
      description: null,
      owner: 'team-b',
    });
    const shortDoc = mkObj('o3', 'Tiny Service', 'application', {
      description: 'short',
      owner: 'team-c',
    });

    const model = mkModel([wellDoc, noDoc1, shortDoc], [], ''); // empty arch description too
    const report = computeArchitectureHealth(model);

    const docCat = report.categories.find((c) => c.category === 'documentation')!;
    expect(docCat.score).toBeLessThan(50);
    expect(docCat.status).toBe('critical');

    const docFindings = report.findings.filter((f) => f.category === 'documentation');
    expect(docFindings.length).toBeGreaterThanOrEqual(2);
    expect(report.analytics.documentedObjects).toBe(1);
    expect(report.analytics.documentationCoverage).toBe(33);
  });

  it('detects seeded security gaps and flags exposures', () => {
    const pubApi = mkObj('pub-api', 'Insecure Gateway', 'application', {
      description: 'Public API facing the internet without required authentication.',
      owner: 'edge-team',
      metadata: { public: true, authScheme: null }, // unsecured public endpoint
    });
    const plainDb = mkObj('plain-db', 'Unencrypted User DB', 'store', {
      description: 'Database storing sensitive user profiles without encryption at rest.',
      owner: 'data-team',
      metadata: { encryptionAtRest: false, sensitiveData: true, sensitiveTypes: ['PII'] },
    });

    const conn = mkConn('c-api-db', 'pub-api', 'plain-db');
    const model = mkModel([pubApi, plainDb], [conn]);

    const report = computeArchitectureHealth(model);
    const secCat = report.categories.find((c) => c.category === 'security')!;
    expect(secCat.score).toBeLessThan(100);
    expect(secCat.errorCount + secCat.warningCount).toBeGreaterThan(0);

    const secFindings = report.findings.filter((f) => f.category === 'security');
    expect(secFindings.length).toBeGreaterThan(0);
    expect(report.analytics.securityExposureCount).toBeGreaterThan(0);
  });

  it('detects seeded ownership gaps and flags missing owners', () => {
    const owned = mkObj('o-owned', 'Owned Worker', 'application', {
      description: 'Background queue processor owned by batch team.',
      team: 'batch-eng',
    });
    const orphan1 = mkObj('o-orphan1', 'Abandoned Service', 'application', {
      description: 'Legacy service with no assigned engineering team or owner.',
      metadata: {},
    });
    const orphan2 = mkObj('o-orphan2', 'Forgotten Cache', 'store', {
      description: 'Redis cache instance left without owner.',
      metadata: {},
    });

    const model = mkModel([owned, orphan1, orphan2]);
    const report = computeArchitectureHealth(model);

    const ownCat = report.categories.find((c) => c.category === 'ownership')!;
    expect(ownCat.score).toBe(33);
    expect(ownCat.findingCount).toBe(2);

    const ownFindings = report.findings.filter((f) => f.category === 'ownership');
    expect(ownFindings).toHaveLength(2);
    expect(report.analytics.ownedObjects).toBe(1);
    expect(report.analytics.ownershipCoverage).toBe(33);
  });

  it('detects architecture drift against actual model', () => {
    const docObj = mkObj('doc-svc', 'Documented Service', 'application', {
      description: 'Documented microservice in cloud.',
      owner: 'cloud-team',
    });
    const docModel = mkModel([docObj]);

    const actualObj1 = mkObj('doc-svc', 'Documented Service', 'application', {
      description: 'Documented microservice in cloud.',
      owner: 'cloud-team',
    });
    const unmanagedObj = mkObj('unmanaged-db', 'Rogue Shadow DB', 'store', {
      description: 'Unmanaged cloud database discovered in AWS account.',
      owner: 'unknown',
    });
    const actualModel = mkModel([actualObj1, unmanagedObj]);

    const report = computeArchitectureHealth(docModel, { actualModel });
    const driftCat = report.categories.find((c) => c.category === 'drift')!;

    expect(driftCat.score).toBeLessThan(100);
    expect(driftCat.findingCount).toBeGreaterThan(0);
    expect(report.analytics.driftItemCount).toBeGreaterThan(0);

    const driftFinding = report.findings.find((f) => f.category === 'drift');
    expect(driftFinding).toBeDefined();
  });

  it('computes change analytics against a baseline model', () => {
    // Baseline model: 1 service, 0 docs, no owner
    const baseObj = mkObj('svc-core', 'Core Service', 'application', {
      description: null,
    });
    const baseline = mkModel([baseObj], [], '');

    // Current model: documented, owned, and 1 additional database added
    const currentObj1 = mkObj('svc-core', 'Core Service', 'application', {
      description: 'Detailed description for core service explaining responsibilities.',
      owner: 'core-team',
    });
    const currentObj2 = mkObj('db-core', 'Core Database', 'store', {
      description: 'Relational database with encryption at rest.',
      owner: 'core-team',
      metadata: { encryptionAtRest: true },
    });
    const currentConn = mkConn('c-conn', 'svc-core', 'db-core');
    const current = mkModel([currentObj1, currentObj2], [currentConn]);

    const report = computeArchitectureHealth(current, { baselineModel: baseline });
    const change = report.analytics.changeAnalytics;

    expect(change.hasBaseline).toBe(true);
    expect(change.scoreDelta).toBeGreaterThan(0);
    expect(change.trend).toBe('improving');
    expect(change.addedObjectsCount).toBe(1); // db-core added
    expect(change.modifiedObjectsCount).toBe(1); // svc-core description modified
    expect(change.addedConnectionsCount).toBe(1);
    expect(change.summary).toContain('Health improved');
  });
});
