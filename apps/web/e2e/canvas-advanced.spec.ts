import { test, expect, type Page } from '@playwright/test';

/**
 * Playwright E2E: Advanced Canvas Interactions, Multi-Select & Auto-Layout Suite.
 *
 * Verifies:
 * 1. Auto-layout menu rendering all registered graph layout engines (Grid, Radial, Hierarchical, Force-Directed).
 * 2. Applying an auto-layout algorithm recomputes graph coordinates and enables Undo.
 * 3. Undo and Redo buttons revert and re-apply graph layout changes across all nodes.
 * 4. Keyboard shortcuts for Undo and Redo operate the command history stack.
 * 5. Box-select mode toggle and marquee selection state.
 * 6. Multi-selection via Shift+Click activating the Alignment & Distribution toolbar.
 * 7. Focus mode and Minimap visibility controls.
 */

async function getCanvasNodePositions(page: Page) {
  const locators = page.locator('[data-testid="canvas-nodes-data"] > div');
  const count = await locators.count();
  const positions: Array<{ id: string; x: string | null; y: string | null }> = [];
  for (let i = 0; i < count; i++) {
    const loc = locators.nth(i);
    const testId = (await loc.getAttribute('data-testid')) ?? `node-${i}`;
    positions.push({
      id: testId,
      x: await loc.getAttribute('data-x'),
      y: await loc.getAttribute('data-y'),
    });
  }
  return positions;
}

test.describe('Advanced Canvas & Layouts Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
  });

  test('1. Auto-layout menu opens and displays registered layout engines', async ({ page }) => {
    const layoutMenu = page.locator('[data-testid="layout-menu"]');
    await expect(layoutMenu).toBeVisible();

    const toggleBtn = page.locator('[data-testid="layout-menu-toggle"]');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Verify layout options list is displayed
    const menuList = page.locator('[data-testid="layout-menu-list"]');
    await expect(menuList).toBeVisible();

    // Verify engines are listed
    await expect(page.locator('[data-testid="layout-option-grid"]')).toContainText('Grid');
    await expect(page.locator('[data-testid="layout-option-radial"]')).toContainText('Radial');
    await expect(page.locator('[data-testid="layout-option-forceDirected"]')).toContainText('Force-Directed');
    await expect(page.locator('[data-testid="layout-option-hierarchical"]')).toContainText('Hierarchical');
  });

  test('2. Applying an auto-layout algorithm recomputes graph coordinates and enables Undo', async ({ page }) => {
    // Capture initial positions of all nodes
    const initialPositions = await getCanvasNodePositions(page);
    expect(initialPositions.length).toBeGreaterThan(0);

    // Initially undo button should be disabled
    const undoBtn = page.locator('[data-testid="undo-btn"]');
    await expect(undoBtn).toBeDisabled();

    // Open layout menu and select Grid layout
    await page.locator('[data-testid="layout-menu-toggle"]').click();
    await page.locator('[data-testid="layout-option-grid"]').click();

    // After applying layout, undo button must become enabled
    await expect(undoBtn).toBeEnabled({ timeout: 5000 });

    // The node positions across the graph must have updated
    const updatedPositions = await getCanvasNodePositions(page);
    expect(updatedPositions).not.toEqual(initialPositions);
  });

  test('3. Undo and Redo buttons revert and re-apply graph layout changes', async ({ page }) => {
    const undoBtn = page.locator('[data-testid="undo-btn"]');
    const redoBtn = page.locator('[data-testid="redo-btn"]');

    const initialPositions = await getCanvasNodePositions(page);

    // Apply radial layout
    await page.locator('[data-testid="layout-menu-toggle"]').click();
    await page.locator('[data-testid="layout-option-radial"]').click();
    await expect(undoBtn).toBeEnabled({ timeout: 5000 });
    await expect(redoBtn).toBeDisabled();

    const layoutPositions = await getCanvasNodePositions(page);
    expect(layoutPositions).not.toEqual(initialPositions);

    // Click Undo
    await undoBtn.click();
    await expect(redoBtn).toBeEnabled({ timeout: 5000 });

    // Position after undo should revert back to initial positions
    const revertedPositions = await getCanvasNodePositions(page);
    expect(revertedPositions).toEqual(initialPositions);

    // Click Redo
    await redoBtn.click();
    await expect(undoBtn).toBeEnabled({ timeout: 5000 });
    const redonePositions = await getCanvasNodePositions(page);
    expect(redonePositions).toEqual(layoutPositions);
  });

  test('4. Keyboard shortcuts for Undo and Redo operate the command history stack', async ({ page }) => {
    const undoBtn = page.locator('[data-testid="undo-btn"]');
    const redoBtn = page.locator('[data-testid="redo-btn"]');

    // Apply hierarchical layout
    await page.locator('[data-testid="layout-menu-toggle"]').click();
    await page.locator('[data-testid="layout-option-hierarchical"]').click();
    await expect(undoBtn).toBeEnabled();

    // Dispatch Meta+Z or Control+Z to undo
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+z`);

    // Verify redo button becomes enabled via shortcut
    await expect(redoBtn).toBeEnabled({ timeout: 5000 });

    // Dispatch Redo shortcut
    await page.keyboard.press(`${modifier}+Shift+z`);
    await expect(undoBtn).toBeEnabled({ timeout: 5000 });
  });

  test('5. Box-select mode toggles marquee drag selection', async ({ page }) => {
    const boxSelectBtn = page.locator('[data-testid="box-select-btn"]');
    await expect(boxSelectBtn).toBeVisible();
    await expect(boxSelectBtn).toContainText('Box Select');

    // Toggle box select mode ON
    await boxSelectBtn.click();
    await expect(boxSelectBtn).toContainText('BOX SELECT');

    // Toggle box select mode OFF
    await boxSelectBtn.click();
    await expect(boxSelectBtn).toContainText('Box Select');
  });

  test('6. Multi-selection via Shift+Click displays Alignment Toolbar and Clear button', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThanOrEqual(2);

    // Click first node
    await nodes.nth(0).click();

    // Hold Shift and click second node
    await nodes.nth(1).click({ modifiers: ['Shift'] });

    // Multi-selection indicators
    const clearBtn = page.locator('[data-testid="clear-selection-btn"]');
    await expect(clearBtn).toBeVisible({ timeout: 5000 });
    await expect(clearBtn).toContainText('Clear');

    // Alignment Toolbar must be mounted for 2+ selected nodes
    const alignToolbar = page.locator('[data-testid="alignment-toolbar"]');
    await expect(alignToolbar).toBeVisible();

    // Verify alignment buttons
    await expect(page.locator('[data-testid="align-left-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="align-top-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="snap-to-grid-btn"]')).toBeVisible();

    // Test Snap-to-Grid toggle
    const snapBtn = page.locator('[data-testid="snap-to-grid-btn"]');
    await snapBtn.click();
    await expect(snapBtn).toContainText('SNAP');

    // Clear selection
    await clearBtn.click();
    await expect(alignToolbar).not.toBeVisible();
  });

  test('7. Focus mode isolates elements and Minimap toggle adjusts canvas visibility', async ({ page }) => {
    // Test Focus Mode toggle
    const focusBtn = page.locator('[data-testid="focus-mode-btn"]');
    await expect(focusBtn).toBeVisible();
    await expect(focusBtn).toContainText('Focus');

    await focusBtn.click();
    await expect(focusBtn).toContainText('Focused');
    await focusBtn.click();
    await expect(focusBtn).toContainText('Focus');

    // Test Minimap toggle
    const minimapBtn = page.locator('[data-testid="toggle-minimap-btn"]');
    await expect(minimapBtn).toBeVisible();

    // Minimap is attached in the DOM by default
    const minimap = page.locator('[data-testid="minimap"]');
    await expect(minimap).toBeAttached();

    // Click to hide minimap
    await minimapBtn.click();
    await expect(minimap).not.toBeAttached();

    // Click to restore minimap
    await minimapBtn.click();
    await expect(minimap).toBeAttached();

    // Test Fit View button executes without error
    const fitViewBtn = page.locator('[data-testid="fit-view-btn"]');
    await expect(fitViewBtn).toBeVisible();
    await fitViewBtn.click();
  });
});
