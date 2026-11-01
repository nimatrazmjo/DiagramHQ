import { test, expect } from '@playwright/test';

test.describe('Duplicate Connections from Source to Destination', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('1. Duplicating connection via Inspector Duplicate Connection button creates parallel edge between same source and destination', async ({
    page,
  }) => {
    await page.goto('/studio?harness=1');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    const initialEdgeCount = await page.locator('.react-flow__edge').count();
    expect(initialEdgeCount).toBeGreaterThanOrEqual(1);

    // Select the first edge pill badge
    const edgePill = page.locator('[data-testid="edge-pill-badge"]').first();
    await expect(edgePill).toBeVisible();
    await edgePill.click();

    // Connection Inspector must open
    const duplicateBtn = page.locator('[data-testid="inspector-duplicate-edge"]');
    await expect(duplicateBtn).toBeVisible({ timeout: 5000 });

    // Click "Duplicate Connection" button
    await duplicateBtn.click();

    // Edge count must increase by 1
    await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdgeCount + 1, {
      timeout: 5000,
    });

    // The newly created duplicate edge should be selected and visible in inspector
    await expect(duplicateBtn).toBeVisible();
  });

  test('2. Duplicating connection via Edge Right-Click Context Menu creates duplicate edge', async ({
    page,
  }) => {
    await page.goto('/studio?harness=1');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    const initialEdgeCount = await page.locator('.react-flow__edge').count();

    // Right-click the first edge pill badge to open edge context menu
    const edgePill = page.locator('[data-testid="edge-pill-badge"]').first();
    await expect(edgePill).toBeVisible();
    await edgePill.click({ button: 'right' });

    // Context menu should appear with "Duplicate connection" item
    const contextItem = page.locator('[data-testid="context-menu-item-duplicate-edge"]');
    await expect(contextItem).toBeVisible({ timeout: 5000 });

    // Click duplicate connection
    await contextItem.click();

    // Edge count increases by 1
    await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdgeCount + 1, {
      timeout: 5000,
    });
  });

  test('3. Duplicating connection via Keyboard Shortcut (⌘D / Ctrl+D) with edge selected', async ({
    page,
  }) => {
    await page.goto('/studio?harness=1');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    const initialEdgeCount = await page.locator('.react-flow__edge').count();

    // Click edge to select it
    const edgePill = page.locator('[data-testid="edge-pill-badge"]').first();
    await expect(edgePill).toBeVisible();
    await edgePill.click();

    // Press keyboard shortcut to duplicate
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+d' : 'Control+d');

    // Edge count increases by 1
    await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdgeCount + 1, {
      timeout: 5000,
    });
  });

  test('4. Duplicate connections between same source and destination render distinct offset pill badges', async ({
    page,
  }) => {
    await page.goto('/studio?harness=1');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    // Select edge and duplicate it
    const edgePill = page.locator('[data-testid="edge-pill-badge"]').first();
    await expect(edgePill).toBeVisible();
    await edgePill.click();

    const duplicateBtn = page.locator('[data-testid="inspector-duplicate-edge"]');
    await expect(duplicateBtn).toBeVisible({ timeout: 5000 });
    await duplicateBtn.click();

    // Now we have multiple edge pill badges
    const badges = page.locator('[data-testid="edge-pill-badge"]');
    await expect(badges).toHaveCount(await page.locator('.react-flow__edge').count(), {
      timeout: 5000,
    });

    // Check the bounding boxes of the first two badges: they must not overlap directly
    const box1 = await badges.nth(0).boundingBox();
    const box2 = await badges.nth(1).boundingBox();
    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();

    if (box1 && box2) {
      // At least one coordinate (x or y) must be offset by more than a threshold
      const distance = Math.hypot(box1.x - box2.x, box1.y - box2.y);
      expect(distance).toBeGreaterThanOrEqual(15);
    }
  });
});
