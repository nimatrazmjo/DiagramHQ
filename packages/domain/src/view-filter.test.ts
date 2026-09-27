import { describe, it, expect } from 'vitest';
import {
  matchesViewFilter,
  evaluateDynamicView,
  type FilterableObject,
} from './view-filter';

describe('Dynamic View Filtering (F035)', () => {
  const sampleObject: FilterableObject = {
    id: 'obj-1',
    name: 'Order Service',
    kind: 'application',
    metadata: {
      team: 'Checkout Team',
      technology: ['NestJS', 'PostgreSQL'],
      environment: 'production',
      domain: 'Billing & Payments',
      owner: 'Alice Chen',
      status: 'active',
      tags: ['tier-1', 'pci-dss', 'core'],
      criticality: 'critical',
      'data-classification': 'restricted',
      cloud: 'AWS',
      region: 'us-east-1',
      repository: 'https://github.com/org/order-service',
    },
  };

  it('matches all 12 filter criteria individually', () => {
    // 1. Team
    expect(matchesViewFilter(sampleObject, { team: 'Checkout Team' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { team: 'Billing Team' })).toBe(false);

    // 2. Technology
    expect(matchesViewFilter(sampleObject, { technology: 'NestJS' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { technology: 'Go' })).toBe(false);

    // 3. Environment
    expect(matchesViewFilter(sampleObject, { environment: 'production' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { environment: 'staging' })).toBe(false);

    // 4. Domain
    expect(matchesViewFilter(sampleObject, { domain: 'Billing & Payments' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { domain: 'Logistics' })).toBe(false);

    // 5. Owner
    expect(matchesViewFilter(sampleObject, { owner: 'Alice Chen' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { owner: 'Bob Smith' })).toBe(false);

    // 6. Status
    expect(matchesViewFilter(sampleObject, { status: 'active' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { status: 'deprecated' })).toBe(false);

    // 7. Tag
    expect(matchesViewFilter(sampleObject, { tag: 'pci-dss' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { tag: 'non-existent' })).toBe(false);

    // 8. Criticality
    expect(matchesViewFilter(sampleObject, { criticality: 'critical' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { criticality: 'low' })).toBe(false);

    // 9. Data classification
    expect(matchesViewFilter(sampleObject, { 'data-classification': 'restricted' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { dataClassification: 'restricted' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { 'data-classification': 'public' })).toBe(false);

    // 10. Cloud
    expect(matchesViewFilter(sampleObject, { cloud: 'AWS' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { cloud: 'GCP' })).toBe(false);

    // 11. Region
    expect(matchesViewFilter(sampleObject, { region: 'us-east-1' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { region: 'eu-central-1' })).toBe(false);

    // 12. Repository
    expect(matchesViewFilter(sampleObject, { repository: 'github.com/org/order-service' })).toBe(true);
    expect(matchesViewFilter(sampleObject, { repository: 'gitlab.com' })).toBe(false);
  });

  it('evaluates dynamic views over multiple objects', () => {
    const obj2: FilterableObject = {
      id: 'obj-2',
      name: 'Analytics Worker',
      kind: 'application',
      metadata: {
        team: 'Data Team',
        technology: 'Python',
        environment: 'staging',
        domain: 'BI',
        owner: 'Bob',
        status: 'active',
        tags: ['internal'],
        criticality: 'low',
        'data-classification': 'internal',
        cloud: 'GCP',
        region: 'us-central1',
        repository: 'https://github.com/org/analytics-worker',
      },
    };

    const list = [sampleObject, obj2];

    const awsViews = evaluateDynamicView(list, { cloud: 'AWS' });
    expect(awsViews).toHaveLength(1);
    expect(awsViews[0].id).toBe('obj-1');

    const activeViews = evaluateDynamicView(list, { status: 'active' });
    expect(activeViews).toHaveLength(2);

    const dataTeamViews = evaluateDynamicView(list, { team: 'Data Team' });
    expect(dataTeamViews).toHaveLength(1);
    expect(dataTeamViews[0].id).toBe('obj-2');
  });

  it('returns all objects when filter is empty or null', () => {
    const list = [sampleObject];
    expect(evaluateDynamicView(list, {})).toEqual(list);
    expect(evaluateDynamicView(list, null)).toEqual(list);
    expect(evaluateDynamicView(list, undefined)).toEqual(list);
  });
});
