import { test, expect } from '@playwright/test';

test.describe('Studio Inspector Visibility on Selection and Background Click', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('Inspector is hidden when unselected and background is clicked, shown when selected', async ({
    page,
  }) => {
    // 1. Load studio with test harness nodes
    await page.goto('/studio?harness=1');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
    const firstNode = page.locator('.react-flow__node').first();
    await expect(firstNode).toBeVisible({ timeout: 10000 });

    const inspector = page.locator('[data-testid="inspector-panel"]');

    // Initially when nothing is selected, the right menu (inspector) MUST be hidden
    await expect(inspector).toBeHidden();

    // 2. Click the node on the canvas to select it
    await firstNode.click({ position: { x: 30, y: 30 } });

    // With a node selected, the right inspector panel MUST be visible
    await expect(inspector).toBeVisible();

    // 3. User clicks on empty canvas background / pane (below the nodes at y=600)
    const canvasPane = page.locator('.react-flow__pane');
    await canvasPane.click({ position: { x: 100, y: 600 } });

    // When background is clicked, the right menu MUST hide
    await expect(inspector).toBeHidden();

    // 4. Click the node again
    await firstNode.click({ position: { x: 30, y: 30 } });

    // Inspector MUST be shown again
    await expect(inspector).toBeVisible();

    // 5. Press Escape to clear selection
    await page.keyboard.press('Escape');

    // When unselected via Escape, inspector MUST hide
    await expect(inspector).toBeHidden();

    // 6. Click on a connection/edge in the diagram
    const edgePill = page.locator('[data-testid="edge-pill-badge"]').first();
    if (await edgePill.isVisible()) {
      await edgePill.click();
      // When a connection is selected, inspector MUST show connection properties
      await expect(inspector).toBeVisible();

      // Click on background again
      await canvasPane.click({ position: { x: 100, y: 600 } });
      await expect(inspector).toBeHidden();
    }
  });
});
