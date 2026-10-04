import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  getMarketplaceItemBySlug,
  installMarketplaceItem,
  type WorkspaceId,
} from '@diagramhq/domain';
import { MarketplaceModal } from './components/enterprise/marketplace-modal';

describe('Marketplace & Extensions Ecosystem UI (F133)', () => {
  const workspaceId = 'ws_production_platform' as WorkspaceId;

  describe('MarketplaceModal Component Rendering', () => {
    it('renders marketplace modal with category filters, search, and extension cards', () => {
      const html = renderToString(
        <MarketplaceModal isOpen={true} onClose={() => {}} workspaceId={workspaceId} />
      );

      expect(html).toContain('Extension Marketplace');
      expect(html).toContain('F133 Verified');
      expect(html).toContain('All Extensions');
      expect(html).toContain('Templates');
      expect(html).toContain('Integrations');
      expect(html).toContain('Tech Catalogs');
      expect(html).toContain('AI Agents');
      expect(html).toContain('Rules &amp; Guardrails');
      expect(html).toContain('Compliance Packs');
      expect(html).toContain('Search extensions...');
      expect(html).toContain('Browse Catalog');
      expect(html).toContain('Installed (0)');
    });

    it('returns empty string when closed', () => {
      const html = renderToString(
        <MarketplaceModal isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe('');
    });
  });

  describe('Acceptance Criteria: Install a template pack; assets appear', () => {
    it('installs a template pack and verifies that all architectural assets appear in the workspace', () => {
      // 1. Locate the PCI template pack
      const templatePack = getMarketplaceItemBySlug('pci-payment-gateway-blueprint');
      expect(templatePack).toBeDefined();

      // 2. Perform installation flow
      const { record, installedAssets } = installMarketplaceItem(workspaceId, templatePack!);

      // Confirm domain output
      expect(record.status).toBe('active');
      expect(installedAssets.length).toBe(3);

      // 3. Render modal with installed template pack
      const html = renderToString(
        <MarketplaceModal
          isOpen={true}
          onClose={() => {}}
          workspaceId={workspaceId}
          initialInstallations={[record]}
        />
      );

      // 4. Verify installed assets appear
      expect(html).toContain('Installed (1)');
      // In the card for the installed template pack, button changes to 'Installed'
      expect(html).toContain('PCI DSS v4.0 Payment Gateway Blueprint');
      expect(html).toContain('Installed');
      expect(html).toContain('3 Assets Included');
    });
  });
});
