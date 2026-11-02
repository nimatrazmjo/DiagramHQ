import { test, expect } from '@playwright/test';

test.describe('Phase D — IcePanel C4 Navigation & Views Model', () => {
  test.beforeEach(async ({ page }) => {
    // Open Studio in test harness mode to pre-seed test objects
    await page.goto('/studio?harness=1');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="studio-breadcrumb"]')).toBeVisible();
  });

  test('Breadcrumb diagrams popover lists diagrams, shows active checkmark, and creates new diagram', async ({ page }) => {
    // 1. Locate and click breadcrumb diagrams button
    const diagramsBtn = page.locator('[data-testid="breadcrumb-diagrams-btn"]');
    await expect(diagramsBtn).toBeVisible();
    await expect(diagramsBtn).toContainText('Diagrams');
    await diagramsBtn.click();

    // 2. Diagrams popover opens
    const popover = page.locator('[data-testid="breadcrumb-diagrams-popover"]');
    await expect(popover).toBeVisible();

    // 3. Verify default System Context diagram is listed with active checkmark
    const defaultDiagramItem = page.locator('[data-testid^="breadcrumb-diagram-item-"]').first();
    await expect(defaultDiagramItem).toBeVisible();
    await expect(defaultDiagramItem).toContainText('System Context');
    await expect(defaultDiagramItem).toContainText('✓');

    // 4. Click "+ New diagram" button
    const createDiagramBtn = page.locator('[data-testid="breadcrumb-create-diagram-btn"]');
    await expect(createDiagramBtn).toBeVisible();
    await createDiagramBtn.click();

    // Popover closes after creation and diagram switches
    await expect(popover).toBeHidden();

    // 5. Re-open popover to confirm the new diagram was added
    await diagramsBtn.click();
    await expect(popover).toBeVisible();
    const diagramItems = page.locator('[data-testid^="breadcrumb-diagram-item-"]');
    await expect(diagramItems).toHaveCount(2);
  });

  test('Segmented toggle switches between Diagram and Model modes with synchronized banner and sidebar', async ({ page }) => {
    // 1. Switch to Model mode via top bar segmented button
    const modelModeBtn = page.locator('[data-testid="view-mode-model"]');
    await expect(modelModeBtn).toBeVisible();
    await modelModeBtn.click();

    // 2. Canvas banner appears
    const modelBanner = page.locator('[data-testid="model-view-banner"]');
    await expect(modelBanner).toBeVisible();
    await expect(modelBanner).toContainText('Model View:');
    await expect(modelBanner).toContainText('Showing all');

    // 3. Sidebar automatically syncs to Model tab
    const sidebarModelTab = page.locator('[data-testid="sidebar-model-tab"]');
    await expect(sidebarModelTab).toHaveClass(/bg-blue-600/);

    // 4. Click "Back to Diagram" on the banner
    const backBtn = page.locator('[data-testid="model-view-back-btn"]');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // 5. Banner is dismissed and top bar is back in Diagram mode
    await expect(modelBanner).toBeHidden();
    const diagramModeBtn = page.locator('[data-testid="view-mode-diagram"]');
    await expect(diagramModeBtn).toHaveClass(/text-\[#2BB5E8\]/);
  });

  test('Drill down via Inspector descends into child diagram, updates C4 level and breadcrumbs', async ({ page }) => {
    // 1. Select a System node on canvas (e.g., Payment Gateway or System)
    const systemNode = page.locator('.react-flow__node').first();
    await expect(systemNode).toBeVisible();
    await systemNode.click();

    // 2. Open Inspector and click "Drill down ➔"
    const drillDownBtn = page.locator('[data-testid="inspector-drill-down-btn"]');
    await expect(drillDownBtn).toBeVisible();
    await drillDownBtn.click();

    // 3. Verify C4 Level tab switched to 2. Containers
    const level2Btn = page.locator('[data-testid="c4-level-2-btn"]');
    await expect(level2Btn).toHaveClass(/bg-blue-600/);

    // 4. Verify breadcrumbs updated
    const breadcrumbLevel = page.locator('[data-testid="studio-breadcrumb-level"]');
    await expect(breadcrumbLevel).toHaveText('Containers & Apps');

    // 5. Ascend back to Level 1
    const level1Btn = page.locator('[data-testid="c4-level-1-btn"]');
    await level1Btn.click();
    await expect(breadcrumbLevel).toHaveText('System Context');
  });

  test('Model Objects catalog allows 1-click addition of existing objects to current view', async ({ page }) => {
    // 1. Ensure sidebar is open and on Model Objects tab
    const sidebar = page.locator('[data-testid="icepanel-sidebar"]');
    await expect(sidebar).toBeVisible();

    const sidebarModelTab = page.locator('[data-testid="sidebar-model-tab"]');
    await sidebarModelTab.click();

    // 2. Locate any "+ Add" button for an object not currently in active view
    const addBtn = page.locator('[data-testid^="add-to-view-"]').first();
    if (await addBtn.isVisible()) {
      const btnId = await addBtn.getAttribute('data-testid');
      const objectId = btnId?.replace('add-to-view-', '');

      await addBtn.click();

      // 3. Confirm the object row now displays "In View"
      if (objectId) {
        const removeBtn = page.locator(`[data-testid="remove-from-view-${objectId}"]`);
        await expect(removeBtn).toBeAttached();
      }
    }
  });
});
