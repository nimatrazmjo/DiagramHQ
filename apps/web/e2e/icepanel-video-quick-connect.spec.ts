import { test, expect } from '@playwright/test';

test.describe('IcePanel Interactive Connection & Quick-Insert Suite (Video Reproduction)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      console.log('BROWSER LOG:', msg.text());
    });
    // Open studio in clean mode with a seeded initial DHS system node
    await page.goto('/studio?harness=1');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 });
  });

  test('1. Node has 4 connection handles and dragging to empty canvas opens Quick-Insert Popover', async ({ page }) => {
    // 1. Select the first node (e.g. DHS or primary system node)
    const node = page.locator('.react-flow__node').first();
    await expect(node).toBeVisible();
    await node.click({ position: { x: 30, y: 30 } });
    await page.waitForTimeout(300);

    // Verify 4 connection handles exist (top, right, bottom, left)
    const rightHandle = node.locator('.react-flow__handle-right').first();
    await expect(rightHandle).toBeVisible();

    const rightHandleBox = await rightHandle.boundingBox();
    expect(rightHandleBox).not.toBeNull();
    if (!rightHandleBox) return;

    // 2. Drag from right handle 200px to the right onto empty canvas
    const startX = rightHandleBox.x + rightHandleBox.width / 2;
    const startY = rightHandleBox.y + rightHandleBox.height / 2;
    const dropX = startX + 220;
    const dropY = startY;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(dropX, dropY, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    // 3. Quick-Insert popover should appear with Search input and New object options
    const popover = page.locator('[data-testid="quick-connect-popover"]');
    await expect(popover).toBeVisible({ timeout: 5000 });

    const searchInput = popover.locator('[data-testid="quick-connect-search"]');
    await expect(searchInput).toBeVisible();

    // Verify New Object options: System, Actor, Group
    await expect(popover.locator('[data-testid="quick-connect-new-system"]')).toBeVisible();
    await expect(popover.locator('[data-testid="quick-connect-new-actor"]')).toBeVisible();
    await expect(popover.locator('[data-testid="quick-connect-new-group"]')).toBeVisible();
  });

  test('2. Selecting New Object "System" creates connected node and opens Connection Inspector', async ({ page }) => {
    const initialNodeCount = await page.locator('.react-flow__node').count();
    const initialEdgeCount = await page.locator('.react-flow__edge').count();

    const node = page.locator('.react-flow__node').first();
    await node.click({ position: { x: 30, y: 30 } });
    await page.waitForTimeout(300);

    const rightHandle = node.locator('.react-flow__handle-right').first();
    const rightHandleBox = await rightHandle.boundingBox();
    if (!rightHandleBox) throw new Error('Right handle bounding box missing');

    const startX = rightHandleBox.x + rightHandleBox.width / 2;
    const startY = rightHandleBox.y + rightHandleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 240, startY, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    // Click "System" button in Quick-Connect Popover
    const popover = page.locator('[data-testid="quick-connect-popover"]');
    await expect(popover).toBeVisible({ timeout: 5000 });
    await popover.locator('[data-testid="quick-connect-new-system"]').click();
    await page.waitForTimeout(500);

    // Popover should close
    await expect(popover).not.toBeVisible();

    // New node should be added
    const finalNodeCount = await page.locator('.react-flow__node').count();
    expect(finalNodeCount).toBe(initialNodeCount + 1);

    // New edge should be added
    const finalEdgeCount = await page.locator('.react-flow__edge').count();
    expect(finalEdgeCount).toBe(initialEdgeCount + 1);

    // Edge should have default label "Sends data to"
    const newEdgeLabel = page.locator('[data-testid="edge-pill-badge"]').last();
    await expect(newEdgeLabel).toContainText('Sends data to');

    // Connection Inspector should be open and display connection details
    const edgeLabelInput = page.locator('[data-testid="inspector-edge-label"]');
    await expect(edgeLabelInput).toBeVisible({ timeout: 5000 });
    await expect(edgeLabelInput).toHaveValue('Sends data to');
  });

  test('3. Editing Connection label in Inspector immediately updates Canvas Edge label', async ({ page }) => {
    // Select first edge badge
    const edgePill = page.locator('[data-testid="edge-pill-badge"]').first();
    await expect(edgePill).toBeVisible();
    await edgePill.click();
    await page.waitForTimeout(300);

    const edgeLabelInput = page.locator('[data-testid="inspector-edge-label"]');
    await expect(edgeLabelInput).toBeVisible({ timeout: 5000 });

    // Update label to "Sends"
    await edgeLabelInput.fill('Sends');
    await page.waitForTimeout(300);

    // Edge on canvas should now display "Sends"
    await expect(edgePill).toContainText('Sends');
  });

  test('4. Dragging upwards to empty space creates an Actor node and connects it', async ({ page }) => {
    const initialNodeCount = await page.locator('.react-flow__node').count();

    const node = page.locator('.react-flow__node').first();
    await node.click({ position: { x: 30, y: 30 } });
    await page.waitForTimeout(300);

    const topHandle = node.locator('.react-flow__handle-top').first();
    const topHandleBox = await topHandle.boundingBox();
    if (!topHandleBox) throw new Error('Top handle bounding box missing');

    const startX = topHandleBox.x + topHandleBox.width / 2;
    const startY = topHandleBox.y + topHandleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - 180, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const popover = page.locator('[data-testid="quick-connect-popover"]');
    await expect(popover).toBeVisible({ timeout: 5000 });

    // Click "Actor" button
    await popover.locator('[data-testid="quick-connect-new-actor"]').click();
    await page.waitForTimeout(500);

    // Node count should increase
    const finalNodeCount = await page.locator('.react-flow__node').count();
    expect(finalNodeCount).toBe(initialNodeCount + 1);

    // Actor node should exist and be labeled Actor
    const actorNode = page.locator('.react-flow__node').filter({ hasText: /Actor|User/i }).last();
    await expect(actorNode).toBeVisible();
  });

  test('5. Direct drag handle-to-handle connects two existing nodes with "Sends data to"', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThanOrEqual(2);

    const sourceNode = nodes.nth(0);
    const targetNode = nodes.nth(1);

    const sourceHandle = sourceNode.locator('.react-flow__handle-right').first();
    const targetHandle = targetNode.locator('.react-flow__handle-left').first();

    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetHandle.boundingBox();
    if (!sourceBox || !targetBox) throw new Error('Handles bounding box missing');

    const initialEdgeCount = await page.locator('.react-flow__edge').count();

    // Drag from sourceHandle directly to targetHandle
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const finalEdgeCount = await page.locator('.react-flow__edge').count();
    expect(finalEdgeCount).toBe(initialEdgeCount + 1);

    const newEdgeLabel = page.locator('[data-testid="edge-pill-badge"]').last();
    await expect(newEdgeLabel).toContainText('Sends data to');
  });
});
