import { test, expect } from '@playwright/test';

test.describe('Phase G — IcePanel Model-Level Pages & Left Nav Rail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio?harness=1');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
  });

  test('Model Left Nav Rail renders all 9 tabs and displays Technologies catalog by default', async ({ page }) => {
    // 1. Switch to Model view
    await page.click('[data-testid="view-mode-model"]');
    await expect(page.locator('[data-testid="model-view-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-nav-rail"]')).toBeVisible();

    // 2. Verify all 9 vertical icon rail items
    const navItems = [
      'home',
      'domains',
      'objects',
      'flows',
      'connections',
      'dependencies',
      'teams',
      'technologies',
      'history',
    ];
    for (const item of navItems) {
      await expect(page.locator(`[data-testid="model-nav-${item}"]`)).toBeVisible();
    }

    // 3. Verify Technologies catalog page is visible
    await expect(page.locator('[data-testid="model-page-technologies"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-technologies-count"]')).toContainText('Total technologies: 15');
    await expect(page.locator('[data-testid="technologies-table"]')).toBeVisible();

    // 4. Test search filter in Technologies catalog
    const searchInput = page.locator('[data-testid="technologies-search-input"]');
    await searchInput.fill('Postgres');
    await expect(page.locator('[data-testid="tech-row-postgresql"]')).toBeVisible();
    await expect(page.locator('[data-testid="tech-row-react"]')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(page.locator('[data-testid="tech-row-react"]')).toBeVisible();

    // 5. Manage Technologies: Add new technology
    await page.click('[data-testid="manage-technologies-btn"]');
    const modal = page.locator('[data-testid="manage-technologies-modal"]');
    await expect(modal).toBeVisible();

    await page.fill('[data-testid="new-tech-name-input"]', 'Cassandra DB');
    await page.click('[data-testid="save-technology-btn"]');

    await expect(modal).not.toBeVisible();
    await expect(page.locator('[data-testid="total-technologies-count"]')).toContainText('Total technologies: 16');
    await expect(page.locator('[data-testid="tech-row-cassandra-db"]')).toBeVisible();
  });

  test('Dependencies page displays 3-column layout (Incoming / Focus / Outgoing) with interactive navigation', async ({ page }) => {
    // 1. Switch to Model view and navigate to Dependencies
    await page.click('[data-testid="view-mode-model"]');
    await page.click('[data-testid="model-nav-dependencies"]');

    // 2. Verify 3-column container
    await expect(page.locator('[data-testid="model-page-dependencies"]')).toBeVisible();
    await expect(page.locator('[data-testid="dependencies-3-column-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="dependencies-incoming-col"]')).toBeVisible();
    await expect(page.locator('[data-testid="dependencies-focus-col"]')).toBeVisible();
    await expect(page.locator('[data-testid="dependencies-outgoing-col"]')).toBeVisible();

    // 3. Verify focus card details
    const focusCard = page.locator('[data-testid="dependencies-focus-card"]');
    await expect(focusCard).toBeVisible();

    // 4. Change focus using dropdown selector
    const selector = page.locator('[data-testid="dependencies-focus-selector"]');
    await expect(selector).toBeVisible();
    await selector.selectOption({ value: 'app-web' });

    // Focus card should now display Web App
    await expect(focusCard).toContainText('Web App');

    // 5. Test search filter
    const depSearch = page.locator('[data-testid="dependencies-search-input"]');
    await depSearch.fill('Auth');
    await expect(selector).toContainText('Auth');
  });

  test('Seamless navigation across Domains, Objects, Flows, Home, and Back to Diagram', async ({ page }) => {
    // 1. Enter Model mode
    await page.click('[data-testid="view-mode-model"]');

    // 2. Navigate to Domains
    await page.click('[data-testid="model-nav-domains"]');
    await expect(page.locator('[data-testid="model-page-domains"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-domains-list"]')).toBeVisible();

    // 3. Navigate to Objects
    await page.click('[data-testid="model-nav-objects"]');
    await expect(page.locator('[data-testid="model-page-objects"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-objects-table"]')).toBeVisible();

    // 4. Navigate to Flows
    await page.click('[data-testid="model-nav-flows"]');
    await expect(page.locator('[data-testid="model-page-flows"]')).toBeVisible();

    // 5. Navigate to Home
    await page.click('[data-testid="model-nav-home"]');
    await expect(page.locator('[data-testid="model-page-home"]')).toBeVisible();

    // 6. Return to Diagram canvas via Home action button
    await page.click('[data-testid="home-open-diagram-btn"]');
    await expect(page.locator('[data-testid="model-view-banner"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="studio-breadcrumb"]')).toBeVisible();
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
  });
});
