# Current Task: F133 — Marketplace

**Status**: COMPLETE

## Description
Marketplace & Extensions Ecosystem (Phase 13 — Enterprise):
- Catalog & Installation Engine (`@diagramhq/domain`):
  - Catalog supporting 6 extension item types: Templates, Integration Plugins, Technology Catalogs, AI Agents, Rules, and Compliance Packs.
  - Verification & Publisher system (DiagramHQ Official, Verified Partner, Community).
  - Installation flow (`installMarketplaceItem`): Installs assets into target workspace, tracking installed asset IDs and configuration.
  - Uninstallation & upgrade flow (`uninstallMarketplaceItem`, `upgradeMarketplaceItem`).
- Web & Component Layer (`@diagramhq/web`):
  - `apps/web/components/enterprise/marketplace-modal.tsx`: Interactive modal with category tabs, search & filters, item detail drawer, 1-click install/uninstall buttons, and installed assets inventory view.
  - `apps/web/components/enterprise/index.ts`: Exported `MarketplaceModal`.
- Acceptance criteria:
  - Templates, integration plugins, technology catalogs, AI agents, rules, compliance packs; install flow
  - Test: install a template pack; assets appear.

- Feature ID: F133
- Phase: 13 — Enterprise
- Dependencies: F115

## Evidence
- Domain: `packages/domain/src/marketplace.ts`, `packages/domain/src/marketplace.test.ts` (5 tests passing)
- Web: `apps/web/components/enterprise/marketplace-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/marketplace.spec.tsx` (3 tests passing)
- Reviews: `.harness/reviews/F133-PR.md`, `.harness/reviews/F133-review.md`

## Next Feature
- **Phase 13 — Enterprise**: **F134 — Mobile** (Mobile web: view, search, comments, approvals, notifications, AI questions; canvas stays desktop-first; test: mobile viewport: view + approve a change + comment)
