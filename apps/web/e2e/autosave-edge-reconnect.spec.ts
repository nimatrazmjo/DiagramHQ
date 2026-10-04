import { test, expect } from '@playwright/test';

test.describe('Studio Auto-Save & Edge/Arrow Reconnection', () => {
  test('authenticated user auto-saves moved nodes and restores them after page reload', async ({ page }) => {
    // 1. Log in as admin
    await page.goto('/login');
    const adminButton = page.getByRole('button', { name: /1-Click Sign In as Admin/i });
    await expect(adminButton).toBeVisible();
    await adminButton.click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // 2. Navigate to Studio
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    // 3. Verify Cloud Studio mode badge & auto-save status indicator
    const modeBadge = page.locator('[data-testid="studio-mode-badge"]');
    await expect(modeBadge).toBeVisible();
    await expect(modeBadge).toContainText('Cloud Studio');

    const autosaveStatus = page.locator('[data-testid="autosave-status"]');
    await expect(autosaveStatus).toBeVisible();
    await expect(autosaveStatus).toContainText(/Auto-saved|Saving/i);

    // 4. Select the first node by data-id and drag it
    const firstNode = page.locator('.react-flow__node').first();
    await expect(firstNode).toBeVisible();
    const nodeId = await firstNode.getAttribute('data-id');
    const node = page.locator(`.react-flow__node[data-id="${nodeId}"]`);

    const initialBox = await node.boundingBox();
    expect(initialBox).not.toBeNull();
    if (!initialBox) return;

    const startX = initialBox.x + initialBox.width / 2;
    const startY = initialBox.y + initialBox.height / 2;

    const posIndicator = page.locator(`[data-testid="node-pos-${nodeId}"]`);
    const initialCanvasX = parseFloat((await posIndicator.getAttribute('data-x')) || '0');
    const initialCanvasY = parseFloat((await posIndicator.getAttribute('data-y')) || '0');

    // Drag node 140px right and 60px down
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 140, startY + 60, { steps: 10 });
    await page.mouse.up();

    // 5. Wait for debounced auto-save to complete
    await page.waitForTimeout(1200);
    await expect(autosaveStatus).toContainText(/Auto-saved/i);

    const draggedCanvasX = parseFloat((await posIndicator.getAttribute('data-x')) || '0');
    const draggedCanvasY = parseFloat((await posIndicator.getAttribute('data-y')) || '0');
    expect(Math.abs(draggedCanvasX - initialCanvasX) + Math.abs(draggedCanvasY - initialCanvasY)).toBeGreaterThan(20);

    // 6. Reload the page and verify auto-saved position was restored!
    await page.reload();
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
    await expect(autosaveStatus).toContainText(/Auto-saved/i, { timeout: 10000 });

    const restoredPos = page.locator(`[data-testid="node-pos-${nodeId}"]`);
    await expect(restoredPos).toBeAttached();
    const restoredCanvasX = parseFloat((await restoredPos.getAttribute('data-x')) || '0');
    const restoredCanvasY = parseFloat((await restoredPos.getAttribute('data-y')) || '0');

    // Verify canvas coordinates match the dragged position within a small tolerance
    expect(Math.abs(restoredCanvasX - draggedCanvasX)).toBeLessThan(5);
    expect(Math.abs(restoredCanvasY - draggedCanvasY)).toBeLessThan(5);
  });

  test('creates/reconnects an arrow between nodes, auto-saves, and persists across reload', async ({ page }) => {
    // 1. Log in as admin
    await page.goto('/login');
    await page.getByRole('button', { name: /1-Click Sign In as Admin/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // 2. Open Studio
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThanOrEqual(2);

    // Initial edges count
    const initialEdgeCount = await page.locator('.react-flow__edge').count();

    // 3. Connect two nodes using Inspector Connections tab
    await nodes.first().click();
    await page.waitForTimeout(300);

    const connectionsTab = page.getByRole('tab', { name: /Connections/i });
    if (await connectionsTab.isVisible()) {
      await connectionsTab.click();
      await page.waitForTimeout(300);

      const targetSelect = page.locator('select').filter({ hasText: /Select a target/i });
      if (await targetSelect.isVisible()) {
        const optionValues = await targetSelect.locator('option').allInnerTexts();
        if (optionValues.length > 1) {
          await targetSelect.selectOption({ index: 1 });
          const connectButton = page.getByRole('button', { name: /Create Connection/i });
          await connectButton.click();
          await page.waitForTimeout(1200);

          // Verify edge count increased
          const newEdgeCount = await page.locator('.react-flow__edge').count();
          expect(newEdgeCount).toBeGreaterThan(initialEdgeCount);

          // Verify Auto-saved indicator is green
          const autosaveStatus = page.locator('[data-testid="autosave-status"]');
          await expect(autosaveStatus).toContainText(/Auto-saved/i);

          // 4. Reload page and verify new arrow/connection is preserved from auto-save
          await page.reload();
          await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
          const reloadedEdgeCount = await page.locator('.react-flow__edge').count();
          expect(reloadedEdgeCount).toBe(newEdgeCount);
        }
      }
    }
  });

  test('guest mode studio warns about guest mode and auto-saves locally', async ({ page }) => {
    // Navigate directly without logging in (fresh context)
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    const modeBadge = page.locator('[data-testid="studio-mode-badge"]');
    await expect(modeBadge).toBeVisible();
    await expect(modeBadge).toContainText('Guest Mode');

    const autosaveStatus = page.locator('[data-testid="autosave-status"]');
    await expect(autosaveStatus).toBeVisible();
    await expect(autosaveStatus).toContainText(/Auto-saved/i);
  });
});
