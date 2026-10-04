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

  test('maintains moved node position after deselection and inspector re-renders', async ({ page }) => {

    // Select the first node by data-id so DOM re-ordering doesn't switch the target node
    const firstNode = page.locator('.react-flow__node').first();
    await expect(firstNode).toBeVisible();
    const nodeId = await firstNode.getAttribute('data-id');
    const node = page.locator(`.react-flow__node[data-id="${nodeId}"]`);

    const initialBox = await node.boundingBox();
    expect(initialBox).not.toBeNull();
    if (!initialBox) return;

    const startX = initialBox.x + initialBox.width / 2;
    const startY = initialBox.y + initialBox.height / 2;

    // Drag node 150px right and 80px down
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 150, startY + 80, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const draggedBox = await node.boundingBox();
    expect(draggedBox).not.toBeNull();
    if (!draggedBox) return;

    expect(Math.abs(draggedBox.x - initialBox.x)).toBeGreaterThan(50);
    expect(Math.abs(draggedBox.y - initialBox.y)).toBeGreaterThan(30);

    // Press Escape to deselect and trigger state update
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // Verify node coordinates did NOT snap back to original
    const boxAfterDeselect = await node.boundingBox();
    expect(boxAfterDeselect).not.toBeNull();
    if (!boxAfterDeselect) return;

    expect(Math.abs(boxAfterDeselect.x - draggedBox.x)).toBeLessThan(5);
    expect(Math.abs(boxAfterDeselect.y - draggedBox.y)).toBeLessThan(5);
  });

  test('drags node in Online Boutique template on /share and keeps position', async ({ page }) => {
    await page.goto('/share?diagram=online-boutique');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 });

    const node = page.locator('.react-flow__node').filter({ hasText: 'Frontend' }).first();
    await expect(node).toBeVisible();

    const initialBox = await node.boundingBox();
    expect(initialBox).not.toBeNull();
    if (!initialBox) return;

    const startX = initialBox.x + initialBox.width / 2;
    const startY = initialBox.y + initialBox.height / 2;

    // Drag Frontend node
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 120, startY + 70, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const draggedBox = await node.boundingBox();
    expect(draggedBox).not.toBeNull();
    if (!draggedBox) return;

    expect(Math.abs(draggedBox.x - initialBox.x)).toBeGreaterThan(40);
    expect(Math.abs(draggedBox.y - initialBox.y)).toBeGreaterThan(25);

    // Deselect by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    const boxAfterDeselect = await node.boundingBox();
    expect(boxAfterDeselect).not.toBeNull();
    if (!boxAfterDeselect) return;

    // Verify it stays at the new position
    expect(Math.abs(boxAfterDeselect.x - draggedBox.x)).toBeLessThan(5);
    expect(Math.abs(boxAfterDeselect.y - draggedBox.y)).toBeLessThan(5);
  });
});
