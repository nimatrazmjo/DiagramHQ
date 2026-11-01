import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import { SystemNode } from './components/canvas/system-node';
import { C4ContextNode } from './components/canvas/c4-context-node';
import { AppNode } from './components/canvas/app-node';
import {
  calculateDynamicNodeDimensions,
} from './components/canvas/node-dimension-utils';

describe('Dynamic Node Dimensions & Minimum Sizing', () => {
  const renderWithFlow = (element: React.ReactElement): string => {
    return renderToString(React.createElement(ReactFlowProvider, null, element));
  };

  const createTestNodeProps = (
    id: string,
    data: Record<string, unknown>,
    selected = false,
  ): NodeProps => ({
    id,
    data,
    selected,
    type: 'system',
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
    selectable: true,
    deletable: true,
    draggable: true,
  } as unknown as NodeProps);

  describe('calculateDynamicNodeDimensions calculation', () => {
    it('calculates proper minimum height for External System with description (Billing Service case)', () => {
      const dims = calculateDynamicNodeDimensions(
        {
          label: 'Billing Service',
          description: 'External recurring subscription provider (Stripe)',
          systemType: 'Third-Party',
          domain: undefined,
        },
        'system',
      );

      // The content requires top bar (28px), label (24px), 2-line description (34px),
      // bottom bar (24px), padding (24px), and spacing (8px) -> ~142px
      expect(dims.minHeight).toBeGreaterThanOrEqual(135);
      expect(dims.minWidth).toBeGreaterThanOrEqual(160);
    });

    it('scales dynamic minimum height when font size is increased', () => {
      const normalDims = calculateDynamicNodeDimensions(
        {
          label: 'Billing Service',
          description: 'External recurring subscription provider (Stripe)',
          fontSize: 16,
        },
        'system',
      );

      const largeDims = calculateDynamicNodeDimensions(
        {
          label: 'Billing Service',
          description: 'External recurring subscription provider (Stripe)',
          fontSize: 24,
        },
        'system',
      );

      expect(largeDims.minHeight).toBeGreaterThan(normalDims.minHeight);
      expect(largeDims.minWidth).toBeGreaterThanOrEqual(normalDims.minWidth);
    });

    it('scales dynamic minimum height for multi-line descriptions', () => {
      const shortDesc = calculateDynamicNodeDimensions(
        {
          label: 'Billing Service',
          description: 'Short desc',
        },
        'system',
      );

      const longDesc = calculateDynamicNodeDimensions(
        {
          label: 'Billing Service',
          description:
            'This is a much longer description spanning multiple lines of detailed information about billing and subscriptions.',
        },
        'system',
      );

      expect(longDesc.minHeight).toBeGreaterThan(shortDesc.minHeight + 20);
    });

    it('scales dynamic minimum height when label wraps over multiple lines', () => {
      const shortLabel = calculateDynamicNodeDimensions({ label: 'Store' });
      const longLabel = calculateDynamicNodeDimensions({
        label: 'Enterprise Global Multi-Region Payment and Subscription Billing Management Platform',
      });

      expect(longLabel.minHeight).toBeGreaterThan(shortLabel.minHeight + 35);
    });
  });

  describe('SystemNode rendering with dynamic dimensions', () => {
    it('renders External System with dynamic minHeight in style and on DiagramNodeResizer', () => {
      const props = createTestNodeProps(
        'sys-billing',
        {
          label: 'Billing Service',
          external: true,
          systemType: 'Third-Party',
          description: 'External recurring subscription provider (Stripe)',
        },
        true, // selected to render resizer
      );

      const html = renderWithFlow(React.createElement(SystemNode, props));

      // Container should have dynamic min-height applied in inline styles
      expect(html).toContain('min-height:');
      // Should not be hardcoded 70px in style
      expect(html).toMatch(/min-height:\s*1[3-9]\dpx/);
      expect(html).toContain('Billing Service');
      expect(html).toContain('External recurring subscription provider (Stripe)');
      expect(html).toContain('External System');
      expect(html).toContain('[Third-Party]');
    });

    it('supports custom fontSize on SystemNode label', () => {
      const props = createTestNodeProps(
        'sys-billing-custom-font',
        {
          label: 'Billing Service',
          external: true,
          fontSize: 22,
        },
      );

      const html = renderWithFlow(React.createElement(SystemNode, props));
      expect(html).toContain('font-size:22px');
    });
  });

  describe('C4ContextNode rendering with dynamic dimensions', () => {
    it('renders C4 External System with dynamic minHeight', () => {
      const props = createTestNodeProps(
        'c4-ext-sys',
        {
          label: 'Billing Service',
          c4Kind: 'external_system',
          description: 'External recurring subscription provider (Stripe)',
        },
        true,
      );

      const html = renderWithFlow(React.createElement(C4ContextNode, props));
      expect(html).toMatch(/min-height:\s*1[3-9]\dpx/);
      expect(html).toContain('Third-Party');
      expect(html).toContain('External System');
    });
  });

  describe('AppNode rendering with dynamic dimensions', () => {
    it('renders AppNode with dynamic minHeight', () => {
      const props = createTestNodeProps(
        'app-api',
        {
          label: 'API Gateway',
          technology: 'Node.js, Express, Envoy',
          description: 'Reverse proxy and API gateway routing requests',
        },
        true,
      );

      const html = renderWithFlow(React.createElement(AppNode, props));
      expect(html).toContain('min-height:');
      expect(html).toContain('API Gateway');
      expect(html).toContain('Node.js, Express, Envoy');
    });
  });

  describe('Connection handles without redundant (+) quick-insert handles', () => {
    it('does not render plus icon on SystemNode and retains standard handles', () => {
      const props = createTestNodeProps(
        'sys-dhs',
        {
          label: 'DHS',
          systemType: 'System',
        },
        true,
      );

      const html = renderWithFlow(React.createElement(SystemNode, props));
      expect(html).not.toContain('data-testid="quick-insert-btn"');
      expect(html).toContain('right-source');
      expect(html).toContain('left-source');
    });

    it('does not render plus icon on C4ContextNode and retains standard handles', () => {
      const props = createTestNodeProps(
        'c4-dhs',
        {
          label: 'DHS',
          systemType: 'System',
        },
        true,
      );

      const html = renderWithFlow(React.createElement(C4ContextNode, props));
      expect(html).not.toContain('data-testid="quick-insert-btn"');
      expect(html).toContain('right-source');
      expect(html).toContain('left-source');
    });
  });
});
