import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  type SimulatedFeatureKey,
  SIMULATED_FEATURE_KEYS,
  REAL_STUDIO_CONTROLS,
  PREVIEW_BADGE_TEXT,
  isPreviewFeature,
  isRealControl,
  getPreviewConfig,
  getAllPreviewFeatures,
  PreviewBadge,
  PreviewAffordance,
} from './lib/preview-flags';

describe('F136 — Preview Flags & Registry (lib/preview-flags.ts)', () => {
  it('registers all 10 simulated features with complete metadata', () => {
    const expectedKeys: SimulatedFeatureKey[] = [
      'branches',
      'presence',
      'versionHistory',
      'visualDiff',
      'pullRequests',
      'comments',
      'aiCopilot',
      'aiGeneration',
      'aiReview',
      'aiAdr',
    ];

    expect(SIMULATED_FEATURE_KEYS).toHaveLength(expectedKeys.length);
    for (const key of expectedKeys) {
      expect(SIMULATED_FEATURE_KEYS).toContain(key);
      const config = getPreviewConfig(key);
      expect(config).toBeDefined();
      expect(config.id).toBe(key);
      expect(config.label).toBeTruthy();
      expect(config.badgeText).toBe(PREVIEW_BADGE_TEXT);
      expect(config.tooltip).toContain('Preview — not saved');
      expect(config.isSimulated).toBe(true);
      expect(config.simulatedDataSource).toBeTruthy();
      expect(config.description).toBeTruthy();
    }
  });

  it('correctly identifies simulated vs real controls', () => {
    // Simulated
    expect(isPreviewFeature('branches')).toBe(true);
    expect(isPreviewFeature('presence')).toBe(true);
    expect(isPreviewFeature('aiCopilot')).toBe(true);
    expect(isPreviewFeature('comments')).toBe(true);
    expect(isPreviewFeature('pullRequests')).toBe(true);

    // Real controls must not be in preview registry
    expect(isPreviewFeature('add')).toBe(false);
    expect(isPreviewFeature('connect')).toBe(false);
    expect(isPreviewFeature('inspector')).toBe(false);
    expect(isPreviewFeature('autosave')).toBe(false);
    expect(isPreviewFeature('export')).toBe(false);
    expect(isPreviewFeature('layout')).toBe(false);
    expect(isPreviewFeature('undo')).toBe(false);
    expect(isPreviewFeature('share-link')).toBe(false);

    // Check isRealControl
    for (const realControl of REAL_STUDIO_CONTROLS) {
      expect(isRealControl(realControl)).toBe(true);
    }
    expect(isRealControl('branches')).toBe(false);
    expect(isRealControl('aiCopilot')).toBe(false);
  });

  it('renders PreviewBadge with consistent text and testid', () => {
    const html = renderToString(React.createElement(PreviewBadge, { feature: 'aiCopilot' }));
    expect(html).toContain('data-testid="preview-badge"');
    expect(html).toContain('data-feature="aiCopilot"');
    expect(html).toContain('Preview — not saved');
  });

  it('renders PreviewAffordance wrapping children with preview data attributes', () => {
    const child = React.createElement('button', { 'data-testid': 'sample-btn' }, 'Click me');
    const html = renderToString(
      React.createElement(PreviewAffordance, { feature: 'branches' }, child),
    );

    expect(html).toContain('data-preview="true"');
    expect(html).toContain('data-preview-feature="branches"');
    expect(html).toContain('data-testid="sample-btn"');
    expect(html).toContain('data-testid="preview-badge"');
    expect(html).toContain('Preview — not saved');
  });

  it('returns all preview features from getAllPreviewFeatures()', () => {
    const all = getAllPreviewFeatures();
    expect(all).toHaveLength(10);
    expect(all.every((f) => f.isSimulated)).toBe(true);
    expect(all.every((f) => f.badgeText === PREVIEW_BADGE_TEXT)).toBe(true);
  });
});
