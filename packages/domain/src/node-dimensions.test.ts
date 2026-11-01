import { describe, it, expect } from 'vitest';
import { calculateDynamicNodeDimensions } from './node-dimensions';

describe('calculateDynamicNodeDimensions', () => {
  it('calculates minimum height for a basic node with short label', () => {
    const dims = calculateDynamicNodeDimensions({ label: 'Store' });
    expect(dims.minHeight).toBeGreaterThanOrEqual(80);
    expect(dims.minWidth).toBeGreaterThanOrEqual(160);
  });

  it('increases minimum height when description is present (such as Billing Service)', () => {
    const withoutDesc = calculateDynamicNodeDimensions({
      label: 'Billing Service',
      systemType: 'Third-Party',
      nodeType: 'system',
    });

    const withDesc = calculateDynamicNodeDimensions({
      label: 'Billing Service',
      description: 'External recurring subscription provider (Stripe)',
      systemType: 'Third-Party',
      nodeType: 'system',
    });

    // The description has 50 characters, adding at least 2 lines of text
    expect(withDesc.minHeight).toBeGreaterThan(withoutDesc.minHeight + 25);
    expect(withDesc.minHeight).toBeGreaterThanOrEqual(130);
  });

  it('scales minimum height when font size is increased', () => {
    const normalFont = calculateDynamicNodeDimensions({
      label: 'Billing Service',
      description: 'External recurring subscription provider (Stripe)',
      fontSize: 16,
    });

    const largeFont = calculateDynamicNodeDimensions({
      label: 'Billing Service',
      description: 'External recurring subscription provider (Stripe)',
      fontSize: 24,
    });

    expect(largeFont.minHeight).toBeGreaterThan(normalFont.minHeight);
    expect(largeFont.minWidth).toBeGreaterThanOrEqual(normalFont.minWidth);
  });

  it('increases minimum height for long/wrapping labels', () => {
    const shortLabel = calculateDynamicNodeDimensions({
      label: 'API',
    });

    const longLabel = calculateDynamicNodeDimensions({
      label: 'Enterprise Global Multi-Region Payment and Billing Gateway Processing Center',
    });

    expect(longLabel.minHeight).toBeGreaterThan(shortLabel.minHeight + 30);
  });

  it('accounts for domain metadata in footer', () => {
    const withoutDomain = calculateDynamicNodeDimensions({
      label: 'Billing Service',
    });

    const withDomain = calculateDynamicNodeDimensions({
      label: 'Billing Service',
      domain: 'Billing & Payments',
    });

    expect(withDomain.minHeight).toBeGreaterThan(withoutDomain.minHeight + 10);
  });

  it('handles empty or missing parameters safely without throwing', () => {
    const dims = calculateDynamicNodeDimensions({});
    expect(dims.minHeight).toBeGreaterThan(0);
    expect(dims.minWidth).toBeGreaterThan(0);
  });
});
