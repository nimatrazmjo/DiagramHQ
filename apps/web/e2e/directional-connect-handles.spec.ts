import { test, expect } from '@playwright/test';

test.describe('Directional Proximity Connect (+) Handles', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('Plus icon does not show on right side when hovering center; shows at closest connection edge (top, right, bottom, left)', async ({
    page,
  }) => {
    await page.goto('/studio?harness=1');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    const node = page.locator('.react-flow__node').first();
    await expect(node).toBeVisible();

    const box = await node.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const rightBtn = node.locator('button[data-testid="quick-insert-btn"][data-direction="right"]');
    const leftBtn = node.locator('button[data-testid="quick-insert-btn"][data-direction="left"]');
    const topBtn = node.locator('button[data-testid="quick-insert-btn"][data-direction="top"]');
    const bottomBtn = node.locator('button[data-testid="quick-insert-btn"][data-direction="bottom"]');

    // 1. Hover in the center of the node
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(150);

    // On general hover in the center/body, + icon should NOT show on the right side (or anywhere)
    await expect(rightBtn).toBeHidden();
    await expect(leftBtn).toBeHidden();
    await expect(topBtn).toBeHidden();
    await expect(bottomBtn).toBeHidden();

    // 2. Move mouse to right connection location
    await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2);
    await page.waitForTimeout(150);

    // Right + icon MUST appear, others remain hidden
    await expect(rightBtn).toBeVisible();
    await expect(leftBtn).toBeHidden();
    await expect(topBtn).toBeHidden();
    await expect(bottomBtn).toBeHidden();

    // 3. Move mouse to top connection location
    await page.mouse.move(box.x + box.width / 2, box.y + 5);
    await page.waitForTimeout(150);

    // Top + icon MUST appear, others remain hidden
    await expect(topBtn).toBeVisible();
    await expect(rightBtn).toBeHidden();
    await expect(leftBtn).toBeHidden();
    await expect(bottomBtn).toBeHidden();

    // 4. Move mouse to bottom connection location
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 5);
    await page.waitForTimeout(150);

    // Bottom + icon MUST appear, others remain hidden
    await expect(bottomBtn).toBeVisible();
    await expect(topBtn).toBeHidden();
    await expect(rightBtn).toBeHidden();
    await expect(leftBtn).toBeHidden();

    // 5. Move mouse to left connection location
    await page.mouse.move(box.x + 5, box.y + box.height / 2);
    await page.waitForTimeout(150);

    // Left + icon MUST appear, others remain hidden
    await expect(leftBtn).toBeVisible();
    await expect(bottomBtn).toBeHidden();
    await expect(topBtn).toBeHidden();
    await expect(rightBtn).toBeHidden();

    // 6. Move mouse back to center
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(150);

    // All + icons MUST hide again
    await expect(leftBtn).toBeHidden();
    await expect(bottomBtn).toBeHidden();
    await expect(topBtn).toBeHidden();
    await expect(rightBtn).toBeHidden();
  });

  test('Clicking a directional (+) handle opens quick connect popover and inserts connected node', async ({
    page,
  }) => {
    await page.goto('/studio?harness=1');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    const initialNodesCount = await page.locator('.react-flow__node').count();
    const initialEdgesCount = await page.locator('.react-flow__edge').count();

    const node = page.locator('.react-flow__node').first();
    const box = await node.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Hover near bottom connection location
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 5);
    const bottomBtn = node.locator('button[data-testid="quick-insert-btn"][data-direction="bottom"]');
    await expect(bottomBtn).toBeVisible();

    // Click the bottom + button
    await bottomBtn.click();

    // Popover should appear
    const popover = page.locator('[data-testid="quick-connect-popover"]');
    await expect(popover).toBeVisible({ timeout: 5000 });

    // Select "System" object to insert below
    await popover.locator('[data-testid="quick-connect-new-system"]').click();

    // Verify a new node and edge are created
    await expect(page.locator('.react-flow__node')).toHaveCount(initialNodesCount + 1, {
      timeout: 5000,
    });
    await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdgesCount + 1, {
      timeout: 5000,
    });
  });
});
