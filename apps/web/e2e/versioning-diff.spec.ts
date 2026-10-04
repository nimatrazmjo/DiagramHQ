import { test, expect } from '@playwright/test';

/**
 * Playwright E2E: Architecture Versioning, Branching, Snapshots & Visual Diff Test Suite.
 *
 * Verifies:
 * 1. Active branch badge renders current branch 'main' with default indicator.
 * 2. Opening BranchSelector modal, switching to an existing branch ('feat/auth-v2'), and verifying badge update.
 * 3. Branch creation workflow with validation (prevent duplicate names) and switching to newly created branch.
 * 4. Version history timeline drawer displays live editable version state and immutable release snapshots.
 * 5. Full architecture snapshot modal displays comprehensive 6-dimension metrics (objects, connections, views, flows, docs, metadata).
 * 6. Visual architecture diff viewer displays added/modified/removed changes with filter badges and item inspection.
 */

test.describe('Architecture Versioning, Branching & Visual Diff Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
  });

  test('1. Active branch badge renders current branch "main" with default indicator and opens modal', async ({ page }) => {
    const branchBadge = page.locator('[data-testid="branch-badge"]');
    await expect(branchBadge).toBeVisible();

    // Verify default main branch name and tag
    const badgeName = page.locator('[data-testid="branch-badge-name"]');
    await expect(badgeName).toHaveText('main');
    await expect(branchBadge).toContainText('default');

    // Click branch badge to open branch selector modal
    await branchBadge.click();

    const branchSelector = page.locator('[data-testid="branch-selector"]');
    await expect(branchSelector).toBeVisible();
    await expect(branchSelector).toContainText('Switch Architecture Branch');

    // Verify existing branches are listed
    await expect(page.locator('[data-testid="branch-item-main"]')).toBeVisible();
    await expect(page.locator('[data-testid="branch-item-feat/auth-v2"]')).toBeVisible();

    // Close modal via close button
    const closeBtn = page.locator('[data-testid="branch-selector-close"]');
    await closeBtn.click();
    await expect(branchSelector).not.toBeVisible();
  });

  test('2. Switching active architecture branch updates badge status', async ({ page }) => {
    const branchBadge = page.locator('[data-testid="branch-badge"]');
    await branchBadge.click();

    // Select feature branch feat/auth-v2
    const featBranchItem = page.locator('[data-testid="branch-item-feat/auth-v2"]');
    await expect(featBranchItem).toBeVisible();
    await featBranchItem.click();

    // Modal should close and badge should update to feat/auth-v2 (feature)
    await expect(page.locator('[data-testid="branch-selector"]')).not.toBeVisible();
    const badgeName = page.locator('[data-testid="branch-badge-name"]');
    await expect(badgeName).toHaveText('feat/auth-v2');
    await expect(branchBadge).toContainText('feature');
  });

  test('3. Branch creation with duplicate name validation and creating new branch', async ({ page }) => {
    const branchBadge = page.locator('[data-testid="branch-badge"]');
    await branchBadge.click();

    // Click "Create New Branch" button
    const createToggleBtn = page.locator('[data-testid="branch-create-toggle-btn"]');
    await expect(createToggleBtn).toBeVisible();
    await createToggleBtn.click();

    const nameInput = page.locator('[data-testid="branch-name-input"]');
    const submitBtn = page.locator('[data-testid="branch-create-submit-btn"]');
    await expect(nameInput).toBeVisible();

    // 1. Try to create duplicate branch "main"
    await nameInput.fill('main');
    await submitBtn.click();

    const errorMsg = page.locator('[data-testid="branch-create-error"]');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText("Branch 'main' already exists");

    // 2. Create valid new branch
    await nameInput.fill('feat/payment-gateway');
    const descInput = page.locator('[data-testid="branch-desc-input"]');
    await descInput.fill('Stripe integration and billing webhooks');
    await submitBtn.click();

    // Modal closes and active branch updates to feat/payment-gateway
    await expect(page.locator('[data-testid="branch-selector"]')).not.toBeVisible();
    const badgeName = page.locator('[data-testid="branch-badge-name"]');
    await expect(badgeName).toHaveText('feat/payment-gateway');
  });

  test('4. Version history timeline drawer displays live editable state and immutable release snapshots', async ({ page }) => {
    const toggleVersionsBtn = page.locator('[data-testid="toggle-version-history-btn"]');
    await expect(toggleVersionsBtn).toBeVisible();
    await toggleVersionsBtn.click();

    // Drawer opens
    const drawer = page.locator('[data-testid="version-history-drawer"]');
    await expect(drawer).toBeVisible();

    // Live version node
    const liveVersionItem = page.locator('[data-testid="live-version-item"]');
    await expect(liveVersionItem).toBeVisible();
    await expect(liveVersionItem).toContainText('Live Editable');

    // Immutable release snapshot
    const snapshotItem = page.locator('[data-testid="snapshot-item"]').first();
    await expect(snapshotItem).toBeVisible();
    await expect(snapshotItem).toContainText('v1.0.0');
    await expect(snapshotItem).toContainText('Initial MVP Production Baseline');

    // Toggle button to close drawer
    await toggleVersionsBtn.click();
    await expect(drawer).not.toBeVisible();
  });

  test('5. Full architecture snapshot modal displays comprehensive 6-dimension metrics', async ({ page }) => {
    // Open version history drawer
    const toggleVersionsBtn = page.locator('[data-testid="toggle-version-history-btn"]');
    await toggleVersionsBtn.click();

    // Click "View" on snapshot v1.0.0
    const viewSnapshotBtn = page.locator('[data-testid="view-snapshot-v1.0.0"]');
    await expect(viewSnapshotBtn).toBeVisible();
    await viewSnapshotBtn.click();

    // Snapshot details modal should open
    const modal = page.locator('[data-testid="snapshot-details-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('v1.0.0 · Initial MVP Production Baseline');

    // Verify 6 architecture dimensions
    await expect(page.locator('[data-testid="metric-objects"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-connections"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-views"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-flows"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-docs"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-metadata"]')).toBeVisible();

    // Close modal
    const closeBtn = page.locator('[data-testid="snapshot-modal-close"]');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('6. Visual architecture diff viewer displays change breakdown and filters', async ({ page }) => {
    const toggleDiffBtn = page.locator('[data-testid="toggle-visual-diff-btn"]');
    await expect(toggleDiffBtn).toBeVisible();

    // Verify diff trigger button displays badge with added change count (+1)
    await expect(toggleDiffBtn).toContainText('+1');

    // Click to open visual diff modal
    await toggleDiffBtn.click();

    const diffModal = page.locator('[data-testid="visual-diff-viewer"]');
    await expect(diffModal).toBeVisible();
    await expect(diffModal).toContainText('Architecture Diff');
    await expect(diffModal).toContainText('main → feat/auth-v2');

    // Legend filters
    const filterAll = page.locator('[data-testid="diff-filter-all"]');
    const filterAdded = page.locator('[data-testid="diff-filter-added"]');
    const filterModified = page.locator('[data-testid="diff-filter-modified"]');
    await expect(filterAll).toBeVisible();
    await expect(filterAdded).toBeVisible();
    await expect(filterModified).toBeVisible();

    // Verify diff item for added Billing Microservice
    const addedItem = page.locator('[data-testid="diff-item-app-billing"]');
    await expect(addedItem).toBeVisible();
    await expect(addedItem).toContainText('Billing Microservice');
    await expect(addedItem).toContainText('added');

    // Filter only by Added changes
    await filterAdded.click();
    await expect(addedItem).toBeVisible();

    // Close diff viewer
    const closeBtn = page.locator('[data-testid="diff-viewer-close"]');
    await closeBtn.click();
    await expect(diffModal).not.toBeVisible();
  });
});
