import { describe, expect, it } from 'vitest';
import type { WorkspaceId } from './ids';
import {
  getMarketplaceItemBySlug,
  installMarketplaceItem,
  queryMarketplaceCatalog,
  uninstallMarketplaceItem,
  upgradeMarketplaceItem,
  type MarketplaceItemType,
} from './marketplace';

describe('Marketplace & Extensions Ecosystem (F133)', () => {
  const workspaceId = 'ws_production_platform' as WorkspaceId;

  describe('Catalog & Extension Types', () => {
    it('provides built-in extensions across all 6 core categories', () => {
      const requiredTypes: MarketplaceItemType[] = [
        'template',
        'integration_plugin',
        'technology_catalog',
        'ai_agent',
        'rule',
        'compliance_pack',
      ];

      for (const type of requiredTypes) {
        const items = queryMarketplaceCatalog({ type });
        expect(items.length).toBeGreaterThan(0);
        expect(items.every((it) => it.type === type)).toBe(true);
      }
    });

    it('finds extensions by slug and supports full-text search', () => {
      const pciItem = getMarketplaceItemBySlug('pci-payment-gateway-blueprint');
      expect(pciItem).toBeDefined();
      expect(pciItem?.name).toContain('PCI DSS');

      const searchResults = queryMarketplaceCatalog({ query: 'datadog' });
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].slug).toBe('datadog-live-telemetry-overlay');

      const verifiedResults = queryMarketplaceCatalog({ verifiedOnly: true });
      expect(verifiedResults.every((it) => it.publisher.verified)).toBe(true);
    });
  });

  describe('Installation, Upgrade, and Uninstallation Flows', () => {
    it('installs a marketplace item and records installation state', () => {
      const item = getMarketplaceItemBySlug('datadog-live-telemetry-overlay');
      expect(item).toBeDefined();

      const result = installMarketplaceItem(workspaceId, item!);
      expect(result.alreadyInstalled).toBe(false);
      expect(result.record.id).toMatch(/^ins_/);
      expect(result.record.workspaceId).toBe(workspaceId);
      expect(result.record.itemSlug).toBe(item!.slug);
      expect(result.record.installedAssetIds).toEqual(item!.assets.map((a) => a.id));
      expect(result.installedAssets.length).toBe(item!.assets.length);

      // Idempotent install
      const reinstall = installMarketplaceItem(workspaceId, item!, [result.record]);
      expect(reinstall.alreadyInstalled).toBe(true);
      expect(reinstall.record.id).toBe(result.record.id);
    });

    it('upgrades and uninstalls items smoothly', () => {
      const item = getMarketplaceItemBySlug('autonomous-finops-cost-guard-agent')!;
      const { record } = installMarketplaceItem(workspaceId, item);

      // Upgrade
      const upgradedItem = { ...item, version: '2.0.0' };
      const upgradedRecord = upgradeMarketplaceItem(record, upgradedItem);
      expect(upgradedRecord.installedVersion).toBe('2.0.0');

      // Uninstall
      const remaining = uninstallMarketplaceItem(record.id, [upgradedRecord]);
      expect(remaining.length).toBe(0);
    });
  });

  describe('Acceptance Criteria: Install a template pack; assets appear', () => {
    it('installs a template pack and confirms all architectural assets appear', () => {
      // 1. Locate the PCI DSS v4.0 Payment Gateway Blueprint template pack
      const templatePack = getMarketplaceItemBySlug('pci-payment-gateway-blueprint');
      expect(templatePack).toBeDefined();
      expect(templatePack?.type).toBe('template');

      // 2. Perform installation flow into workspace
      const installResult = installMarketplaceItem(workspaceId, templatePack!);

      // 3. Acceptance Criteria Check: assets appear
      expect(installResult.record.status).toBe('active');
      expect(installResult.installedAssets.length).toBeGreaterThan(0);

      // Ensure model objects, diagram views, and configurations appear
      const modelObjects = installResult.installedAssets.filter(
        (a) => a.kind === 'model_object',
      );
      const diagramViews = installResult.installedAssets.filter(
        (a) => a.kind === 'diagram_view',
      );

      expect(modelObjects.length).toBe(2);
      expect(modelObjects.map((m) => m.name)).toContain('PAN Tokenization & HSM Vault');
      expect(modelObjects.map((m) => m.name)).toContain('Public Inbound Payment Gateway');

      expect(diagramViews.length).toBe(1);
      expect(diagramViews[0].name).toBe('PCI Boundary & Cardholder Flow');

      expect(installResult.record.installedAssetIds).toContain('ast_obj_cde_vault');
      expect(installResult.record.installedAssetIds).toContain('ast_obj_payment_gateway');
      expect(installResult.record.installedAssetIds).toContain('ast_view_pci_overview');
    });
  });
});
