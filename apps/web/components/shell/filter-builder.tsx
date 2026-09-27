"use client";

import React, { useState } from 'react';
import { type ViewFilter } from '@diagramhq/domain';

export interface FilterBuilderProps {
  initialFilter?: ViewFilter;
  onFilterChange?: (filter: ViewFilter) => void;
  onSaveView?: (name: string, filter: ViewFilter) => void;
}

const FILTER_KEYS = [
  'team',
  'technology',
  'environment',
  'domain',
  'owner',
  'status',
  'tag',
  'criticality',
  'dataClassification',
  'cloud',
  'region',
  'repository',
  'kind'
];

export function FilterBuilder({ initialFilter = {}, onFilterChange, onSaveView }: FilterBuilderProps) {
  const [filter, setFilter] = useState<ViewFilter>(initialFilter);
  const [viewName, setViewName] = useState<string>('');

  const handleFieldChange = (key: string, value: string) => {
    const newFilter = { ...filter };
    if (!value) {
      delete newFilter[key];
    } else {
      newFilter[key] = value;
    }
    setFilter(newFilter);
    onFilterChange?.(newFilter);
  };

  const handleSave = () => {
    if (onSaveView && viewName.trim()) {
      onSaveView(viewName, filter);
    }
  };

  return (
    <div data-testid="filter-builder" className="filter-builder">
      <h3>Filter Builder</h3>
      <div className="filter-fields">
        {FILTER_KEYS.map((key) => (
          <div key={key} className="filter-field">
            <label htmlFor={`filter-${key}`}>{key}</label>
            <input
              id={`filter-${key}`}
              type="text"
              value={(filter[key] as string) || ''}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              placeholder={`Filter by ${key}`}
            />
          </div>
        ))}
      </div>
      <div className="filter-actions">
        <input 
          type="text" 
          data-testid="view-name-input"
          value={viewName} 
          onChange={(e) => setViewName(e.target.value)} 
          placeholder="View Name" 
        />
        <button data-testid="save-view-button" onClick={handleSave} disabled={!viewName.trim()}>
          Save as View
        </button>
      </div>
    </div>
  );
}
