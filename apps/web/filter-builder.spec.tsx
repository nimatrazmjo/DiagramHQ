import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { FilterBuilder } from './components/shell/filter-builder';
import { evaluateDynamicView, type FilterableObject } from '@diagramhq/domain';

describe('FilterBuilder (F036)', () => {
  it('renders filter-builder with all defined fields', () => {
    const html = renderToString(<FilterBuilder />);
    expect(html).toContain('data-testid="filter-builder"');
    
    const filterKeys = [
      'team', 'technology', 'environment', 'domain', 'owner',
      'status', 'tag', 'criticality', 'dataClassification',
      'cloud', 'region', 'repository', 'kind'
    ];
    
    for (const key of filterKeys) {
      expect(html).toContain(`id="filter-${key}"`);
    }
    
    expect(html).toContain('data-testid="view-name-input"');
    expect(html).toContain('data-testid="save-view-button"');
  });

  it('renders initial filter values correctly', () => {
    const html = renderToString(
      <FilterBuilder 
        initialFilter={{ team: 'Security', environment: 'production' }} 
      />
    );
    expect(html).toContain('value="Security"');
    expect(html).toContain('value="production"');
  });

  it('composed filter resolves to the expected set (Domain verification)', () => {
    // This satisfies the criteria: "Test: a composed filter resolves to the expected set."
    const objects: FilterableObject[] = [
      {
        id: '1',
        name: 'App1',
        kind: 'application',
        metadata: {
          team: 'Frontend',
          environment: 'production',
        }
      },
      {
        id: '2',
        name: 'App2',
        kind: 'application',
        metadata: {
          team: 'Backend',
          environment: 'production',
        }
      },
      {
        id: '3',
        name: 'App3',
        kind: 'application',
        metadata: {
          team: 'Frontend',
          environment: 'staging',
        }
      }
    ];

    // A composed filter (multi-attribute)
    const composedFilter = { team: 'Frontend', environment: 'production' };
    const result = evaluateDynamicView(objects, composedFilter);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('1');
  });
});
