import { describe, it, expect } from 'vitest';
import {
  createDynamicViewOptions,
  isDynamicView,
  matchesViewFilter,
  evaluateDynamicView,
  type FilterableObject,
} from '@diagramhq/domain';

describe('Dynamic Views in Web Client (F035)', () => {
  it('creates dynamic view options with filter criteria', () => {
    const opts = createDynamicViewOptions('Core AWS Services', {
      cloud: 'AWS',
      environment: 'production',
      criticality: 'critical',
    });

    expect(opts.name).toBe('Core AWS Services');
    expect(opts.kind).toBe('custom');
    expect(isDynamicView(opts)).toBe(true);
  });

  it('filters objects by team, technology, environment, domain, owner, and status', () => {
    const objects: FilterableObject[] = [
      {
        id: '1',
        name: 'Auth Service',
        kind: 'application',
        metadata: {
          team: 'Security Team',
          technology: 'Node.js',
          environment: 'production',
          domain: 'Identity',
          owner: 'Sarah Connor',
          status: 'active',
          tags: ['security', 'auth'],
          criticality: 'critical',
          'data-classification': 'restricted',
          cloud: 'AWS',
          region: 'us-east-1',
          repository: 'https://github.com/org/auth-service',
        },
      },
      {
        id: '2',
        name: 'Reports Worker',
        kind: 'application',
        metadata: {
          team: 'Data Team',
          technology: 'Python',
          environment: 'staging',
          domain: 'Analytics',
          owner: 'John Doe',
          status: 'deprecated',
          tags: ['reporting'],
          criticality: 'low',
          'data-classification': 'internal',
          cloud: 'GCP',
          region: 'us-central1',
          repository: 'https://github.com/org/reports-worker',
        },
      },
    ];

    expect(evaluateDynamicView(objects, { team: 'Security Team' })).toHaveLength(1);
    expect(evaluateDynamicView(objects, { technology: 'Python' })).toHaveLength(1);
    expect(evaluateDynamicView(objects, { environment: 'production' })).toHaveLength(1);
    expect(evaluateDynamicView(objects, { domain: 'Identity' })).toHaveLength(1);
    expect(evaluateDynamicView(objects, { owner: 'Sarah Connor' })).toHaveLength(1);
    expect(evaluateDynamicView(objects, { status: 'deprecated' })).toHaveLength(1);
    expect(evaluateDynamicView(objects, { tag: 'security' })).toHaveLength(1);
    expect(evaluateDynamicView(objects, { criticality: 'critical' })).toHaveLength(1);
    expect(evaluateDynamicView(objects, { 'data-classification': 'restricted' })).toHaveLength(1);
    expect(evaluateDynamicView(objects, { cloud: 'GCP' })).toHaveLength(1);
    expect(evaluateDynamicView(objects, { region: 'us-east-1' })).toHaveLength(1);
    expect(evaluateDynamicView(objects, { repository: 'reports-worker' })).toHaveLength(1);
    const first = objects[0];
    expect(first).toBeDefined();
    if (first) {
      expect(matchesViewFilter(first, { team: 'Security Team' })).toBe(true);
    }
  });
});
