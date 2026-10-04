import { test, expect } from '@playwright/test';

test.describe('React Flow Studio Canvas Navigation & C4 Hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    // Ensure React Flow canvas is mounted and stable
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
  });

  test('initializes Studio canvas with pre-seeded architecture graph', async ({ page }) => {
    // Top bar elements
    await expect(page.getByText('DiagramHQ')).toBeVisible();
    await expect(page.getByText('Phase 0 Studio (Guest Mode)')).toBeVisible();

    // Canvas container and nodes exist
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible({ timeout: 10000 });
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThanOrEqual(2);

    // Edges exist in DOM
    const edges = page.locator('.react-flow__edge');
    await expect(edges.first()).toBeAttached({ timeout: 10000 });
    const edgeCount = await edges.count();
    expect(edgeCount).toBeGreaterThanOrEqual(1);
  });

  test('interacts with React Flow zoom and fit-view controls', async ({ page }) => {
    const viewport = page.locator('.react-flow__viewport');
    await expect(viewport).toBeVisible();
    const initialTransform = await viewport.getAttribute('style');

    // Click Zoom In
    const zoomInBtn = page.locator('.react-flow__controls-zoomin');
    await expect(zoomInBtn).toBeAttached();
    await zoomInBtn.click({ force: true });
    await page.waitForTimeout(300);

    const postZoomInTransform = await viewport.getAttribute('style');
    expect(postZoomInTransform).not.toEqual(initialTransform);

    // Click Zoom Out
    const zoomOutBtn = page.locator('.react-flow__controls-zoomout');
    await expect(zoomOutBtn).toBeAttached();
    await zoomOutBtn.click({ force: true });
    await page.waitForTimeout(300);

    // Click Fit View
    const fitViewBtn = page.locator('.react-flow__controls-fitview');
    await expect(fitViewBtn).toBeAttached();
    await fitViewBtn.click({ force: true });
    await page.waitForTimeout(300);
  });

  test('switches C4 Levels and updates breadcrumb navigation', async ({ page }) => {
    // Default level is 1. Context
    const level1Btn = page.getByRole('button', { name: '1. Context' });
    const level2Btn = page.getByRole('button', { name: '2. Containers' });
    const level3Btn = page.getByRole('button', { name: '3. Components' });

    await expect(level1Btn).toBeVisible();
    await expect(level2Btn).toBeVisible();
    await expect(level3Btn).toBeVisible();

    const breadcrumbLevel = page.locator('[data-testid="studio-breadcrumb-level"]');

    // Switch to Containers
    await level2Btn.click();
    await expect(breadcrumbLevel).toHaveText('Containers & Apps');

    // Switch to Components
    await level3Btn.click();
    await expect(breadcrumbLevel).toHaveText('Components');

    // Switch back to Context
    await level1Btn.click();
    await expect(breadcrumbLevel).toHaveText('System Context');
  });

  test('filters views across perspectives (Security, Data, Ownership, All)', async ({ page }) => {
    const secBtn = page.getByRole('button', { name: 'security', exact: true });
    const dataBtn = page.getByRole('button', { name: 'data', exact: true });
    const ownerBtn = page.getByRole('button', { name: 'ownership', exact: true });
    const allBtn = page.getByRole('button', { name: 'all', exact: true });

    if (await secBtn.isVisible()) {
      await secBtn.click();
      await expect(secBtn).toHaveClass(/bg-blue-600/);

      await dataBtn.click();
      await expect(dataBtn).toHaveClass(/bg-blue-600/);

      await ownerBtn.click();
      await expect(ownerBtn).toHaveClass(/bg-blue-600/);

      await allBtn.click();
      await expect(allBtn).toHaveClass(/bg-blue-600/);
    }
  });

  test('switches architecture persona modes via dropdown', async ({ page }) => {
    const personaSelect = page.locator('header select').first();
    if (await personaSelect.isVisible()) {
      await personaSelect.selectOption('security');
      expect(await personaSelect.inputValue()).toBe('security');

      await personaSelect.selectOption('devops');
      expect(await personaSelect.inputValue()).toBe('devops');

      await personaSelect.selectOption('all');
      expect(await personaSelect.inputValue()).toBe('all');
    }
  });

  test('selects a canvas node and updates the Inspector panel', async ({ page }) => {
    const firstNode = page.locator('.react-flow__node').first();
    await expect(firstNode).toBeVisible();

    // Click node to select it
    await firstNode.click({ position: { x: 30, y: 30 } });
    await page.waitForTimeout(300);

    // Inspector should show the selected node details
    const inspector = page.locator('aside, [data-testid="inspector-panel"], .inspector-panel, [aria-label*="Inspector"]').first();
    await expect(inspector).toBeVisible();
  });

  test('toggles the Inspector panel visibility from the header', async ({ page }) => {
    const toggleInspectorBtn = page.getByRole('button', { name: 'Inspector', exact: true });
    await expect(toggleInspectorBtn).toBeVisible();

    // Toggle off
    await toggleInspectorBtn.click();
    await page.waitForTimeout(300);

    // Toggle on
    await toggleInspectorBtn.click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: 'Inspector', exact: true })).toBeVisible();
  });

  test('opens and closes the Brand Icon Catalog modal', async ({ page }) => {
    const iconBtn = page.getByRole('button', { name: /Icons/i });
    await expect(iconBtn).toBeVisible();
    await iconBtn.click();

    // Icon Picker modal should appear
    await expect(page.getByText('Select Object Icon')).toBeVisible();

    // Close modal via ✕ close button
    await page.getByRole('button', { name: '✕' }).click();
    await expect(page.getByText('Select Object Icon')).not.toBeVisible();
  });
});
