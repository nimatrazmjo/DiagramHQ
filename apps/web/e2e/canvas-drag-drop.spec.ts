import { test, expect } from '@playwright/test';

test.describe('Canvas Drag-and-Drop, Node Creation & Connections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
    // Wait for nodes to settle
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 });
  });

  test('drags and repositions a node on the canvas', async ({ page }) => {
    const node = page.locator('.react-flow__node').first();
    await expect(node).toBeVisible();

    const initialBoundingBox = await node.boundingBox();
    expect(initialBoundingBox).not.toBeNull();
    if (!initialBoundingBox) return;

    const startX = initialBoundingBox.x + initialBoundingBox.width / 2;
    const startY = initialBoundingBox.y + initialBoundingBox.height / 2;

    // Perform native mouse drag operation
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 140, startY + 90, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const updatedBoundingBox = await node.boundingBox();
    expect(updatedBoundingBox).not.toBeNull();
    if (!updatedBoundingBox) return;

    // Node coordinate position should have moved
    const movedX = Math.abs(updatedBoundingBox.x - initialBoundingBox.x);
    const movedY = Math.abs(updatedBoundingBox.y - initialBoundingBox.y);
    expect(movedX + movedY).toBeGreaterThan(20);
  });

  test('adds a new service node from the Model Navigator', async ({ page }) => {
    const initialCount = await page.locator('.react-flow__node').count();

    // Click Add new application button in left sidebar
    const addAppBtn = page.locator('button[title="Add new application"]');
    await expect(addAppBtn).toBeVisible();
    await addAppBtn.click();
    await page.waitForTimeout(400);

    const finalCount = await page.locator('.react-flow__node').count();
    expect(finalCount).toBeGreaterThan(initialCount);
  });

  test('adds a new database node from the Model Navigator', async ({ page }) => {
    const initialCount = await page.locator('.react-flow__node').count();

    // Click Add new database button in left sidebar
    const addDbBtn = page.locator('button[title="Add new database"]');
    await expect(addDbBtn).toBeVisible();
    await addDbBtn.click();
    await page.waitForTimeout(400);

    const finalCount = await page.locator('.react-flow__node').count();
    expect(finalCount).toBeGreaterThan(initialCount);
  });

  test('connects two nodes using the Inspector Connections tab', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThanOrEqual(2);

    // Click first node
    await nodes.first().click({ position: { x: 30, y: 30 } });
    await page.waitForTimeout(300);

    // Switch to Connections tab in Inspector
    const connectionsTab = page.getByRole('button', { name: 'Connections' });
    await expect(connectionsTab).toBeVisible();
    await connectionsTab.click();
    await page.waitForTimeout(200);

    // Select target node
    const targetSelect = page.locator('select').filter({ hasText: /Select target node/i }).first();
    await expect(targetSelect).toBeVisible();
    await targetSelect.selectOption({ index: 1 });

    // Fill protocol
    const protocolInput = page.getByPlaceholder(/Protocol/i);
    if (await protocolInput.isVisible()) {
      await protocolInput.fill('gRPC');
    }

    const initialEdgeCount = await page.locator('.react-flow__edge').count();

    // Click Connect Objects button
    const connectBtn = page.getByRole('button', { name: 'Connect Objects' });
    await expect(connectBtn).toBeVisible();
    await connectBtn.click();
    await page.waitForTimeout(400);

    const finalEdgeCount = await page.locator('.react-flow__edge').count();
    expect(finalEdgeCount).toBeGreaterThan(initialEdgeCount);
  });

  test('deletes a selected node via the Inspector panel', async ({ page }) => {
    // Add a node first so we don't clear the starter template completely
    const addDbBtn = page.locator('button[title="Add new database"]');
    await addDbBtn.click();
    await page.waitForTimeout(300);

    const currentCount = await page.locator('.react-flow__node').count();

    // Inspector should show Delete Object button for the newly selected node
    const deleteBtn = page.getByRole('button', { name: /Delete Object from Diagram/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    await page.waitForTimeout(400);

    const afterDeleteCount = await page.locator('.react-flow__node').count();
    expect(afterDeleteCount).toBeLessThan(currentCount);
  });

  test('resets canvas and shows empty state', async ({ page }) => {
    // Handle window confirm dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const resetBtn = page.getByRole('button', { name: /Reset/i });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await page.waitForTimeout(400);

    // Empty state should be visible
    await expect(page.getByText('Canvas is ready')).toBeVisible();
    await expect(page.getByRole('button', { name: /Load Reference Architecture/i })).toBeVisible();

    // Reload reference architecture
    await page.getByRole('button', { name: /Load Reference Architecture/i }).click();
    await page.waitForTimeout(400);

    const reloadedCount = await page.locator('.react-flow__node').count();
    expect(reloadedCount).toBeGreaterThanOrEqual(2);
  });
});
