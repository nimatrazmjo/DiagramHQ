import { test, expect } from '@playwright/test';

test.describe('IcePanel Studio Inspector Parity (Phase C)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio?harness=1');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
  });

  test('selecting an object opens IcePanel Inspector with header actions, rename, and brief description prompt', async ({
    page,
  }) => {
    const inspector = page.getByTestId('inspector-panel');
    await expect(inspector).toBeHidden();

    // Select the first node on canvas
    const node = page.locator('.react-flow__node').first();
    await expect(node).toBeVisible();
    await node.click({ position: { x: 30, y: 30 } });

    // Inspector opens
    await expect(inspector).toBeVisible();

    // Header has object icon button
    const iconBtn = inspector.locator('button[title*="brand icon"]');
    await expect(iconBtn).toBeVisible();

    // Header has inline rename title
    const nameInput = inspector.getByTestId('inspector-field-name');
    await expect(nameInput).toBeVisible();
    const currentName = await nameInput.inputValue();
    expect(currentName.length).toBeGreaterThan(0);

    // Expand width toggle button ⤢
    const expandBtn = inspector.getByRole('button', { name: 'Expand width' });
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();
    await expect(inspector).toHaveClass(/w-\[440px\]/);
    await expandBtn.click();

    // More options menu (…)
    const moreBtn = inspector.getByRole('button', { name: 'More options' });
    await expect(moreBtn).toBeVisible();
    await moreBtn.click();
    await expect(inspector.getByText('📋 Copy ID')).toBeVisible();
    await expect(inspector.getByRole('button', { name: '🗑️ Delete Object', exact: true })).toBeVisible();
    await moreBtn.click();

    // Brief description input
    const briefDescInput = inspector.getByTestId('inspector-field-description');
    await expect(briefDescInput).toBeVisible();
    expect(await briefDescInput.inputValue()).toContain('Core');
  });

  test('renders Details tab with complete IcePanel 14-row structure', async ({ page }) => {
    const inspector = page.getByTestId('inspector-panel');
    const node = page.locator('.react-flow__node').first();
    await node.click({ position: { x: 30, y: 30 } });
    await expect(inspector).toBeVisible();

    // Verify Details tab is selected
    const detailsTab = inspector.getByRole('button', { name: 'Details' });
    await expect(detailsTab).toBeVisible();
    await detailsTab.click();

    // 1. Editable by
    await expect(inspector.getByText('Editable by')).toBeVisible();

    // 2. Type
    await expect(inspector.getByText('Type', { exact: true })).toBeVisible();
    await expect(inspector.getByTestId('inspector-field-type')).toBeVisible();

    // 3. Scope (Internal / External pill toggle)
    await expect(inspector.getByText('Scope', { exact: true })).toBeVisible();
    const internalBtn = inspector.getByTestId('inspector-scope-internal');
    const externalBtn = inspector.getByTestId('inspector-scope-external');
    await expect(internalBtn).toBeVisible();
    await expect(externalBtn).toBeVisible();

    // Toggle to external
    await externalBtn.click();
    await expect(externalBtn).toHaveClass(/bg-amber-500\/20/);
    await internalBtn.click();
    await expect(internalBtn).toHaveClass(/bg-\[#2BB5E8\]\/20/);

    // 4. Belongs to
    await expect(inspector.getByText('Belongs to', { exact: true })).toBeVisible();

    // 5. Status (Live vs Future pill)
    await expect(inspector.getByText('Status', { exact: true })).toBeVisible();
    const statusBtn = inspector.getByTestId('inspector-field-status');
    await expect(statusBtn).toBeVisible();
    await statusBtn.click();
    await expect(statusBtn).toContainText('Future');
    await statusBtn.click();
    await expect(statusBtn).toContainText('Live');

    // 6. Contains
    await expect(inspector.getByText('Contains', { exact: true })).toBeVisible();

    // 7. In groups
    await expect(inspector.getByText('In groups', { exact: true })).toBeVisible();

    // 8. Owners
    await expect(inspector.getByText('Owners', { exact: true })).toBeVisible();
    await expect(inspector.getByTestId('inspector-field-owner')).toBeVisible();

    // 9. Diagrams
    await expect(inspector.getByText('Diagrams', { exact: true })).toBeVisible();

    // 10. Flows
    await expect(inspector.getByText('Flows', { exact: true })).toBeVisible();

    // 11. Tags with severity chip (+⚠ High)
    await expect(inspector.getByText('Tags', { exact: true })).toBeVisible();
    const highTagBtn = inspector.getByRole('button', { name: '+⚠ High' });
    await expect(highTagBtn).toBeVisible();
    await highTagBtn.click();
    await expect(inspector.getByText('⚠ High', { exact: true })).toBeVisible();

    // 12. Technology
    await expect(inspector.getByText('Technology', { exact: true })).toBeVisible();
    await expect(inspector.getByTestId('inspector-field-technology')).toBeVisible();

    // 13. Links
    await expect(inspector.getByText('Links', { exact: true })).toBeVisible();
    await expect(inspector.getByTestId('inspector-field-links')).toBeVisible();

    // 14. Detailed description + ✨ Describe AI prompt
    await expect(inspector.getByText('Detailed description', { exact: true })).toBeVisible();
    const describeBtn = inspector.getByRole('button', { name: /Describe/i });
    await expect(describeBtn).toBeVisible();
    await describeBtn.click();
    await page.waitForTimeout(500);
    const textarea = inspector.locator('textarea[placeholder*="detailed markdown description"]');
    await expect(textarea).not.toHaveValue('');
  });

  test('renders Connections tab with Quick Connect form and existing connection list', async ({ page }) => {
    const inspector = page.getByTestId('inspector-panel');
    const node = page.locator('.react-flow__node').first();
    await node.click({ position: { x: 30, y: 30 } });
    await expect(inspector).toBeVisible();

    const connectionsTab = inspector.getByRole('button', { name: /Connections/i });
    await expect(connectionsTab).toBeVisible();
    await connectionsTab.click();

    // Quick Connect form
    await expect(inspector.getByText('⚡ Quick Connect')).toBeVisible();
    const targetSelect = inspector.locator('select').first();
    await expect(targetSelect).toBeVisible();

    const connectBtn = inspector.getByRole('button', { name: 'Connect Objects' });
    await expect(connectBtn).toBeVisible();
    await expect(connectBtn).toBeDisabled();

    // Select second node in dropdown
    const count = await targetSelect.locator('option').count();
    if (count > 1) {
      await targetSelect.selectOption({ index: 1 });
      await expect(connectBtn).toBeEnabled();
    }

    // Outgoing & Incoming connection headers
    await expect(inspector.getByText(/Outgoing/i)).toBeVisible();
    await expect(inspector.getByText(/Incoming/i)).toBeVisible();
  });

  test('renders History tab and allows logging audit notes', async ({ page }) => {
    const inspector = page.getByTestId('inspector-panel');
    const node = page.locator('.react-flow__node').first();
    await node.click({ position: { x: 30, y: 30 } });
    await expect(inspector).toBeVisible();

    const historyTab = inspector.getByRole('button', { name: 'History' });
    await expect(historyTab).toBeVisible();
    await historyTab.click();

    // Default object creation log is visible
    await expect(inspector.getByText(/Created/i)).toBeVisible();

    // Add a manual revision note
    const noteInput = inspector.locator('input[placeholder*="Add revision note"]');
    await expect(noteInput).toBeVisible();
    await noteInput.fill('Phase C security audit completed');
    const logBtn = inspector.getByRole('button', { name: 'Log' });
    await logBtn.click();

    // Note appears in timeline
    await expect(inspector.getByText('Phase C security audit completed')).toBeVisible();
  });

  test('selecting an edge opens Connection Inspector with Flip Direction, Shape, and Status controls', async ({
    page,
  }) => {
    // Click mid-edge label pill to select connection
    const edgePill = page.locator('[data-testid="edge-pill-badge"]').first();
    await expect(edgePill).toBeVisible();
    await edgePill.click();

    const inspector = page.getByTestId('inspector-panel');
    await expect(inspector).toBeVisible();
    await expect(inspector.getByText('Connection Inspector')).toBeVisible();

    // Sender & Receiver displayed
    await expect(inspector.getByText('Sender:')).toBeVisible();
    await expect(inspector.getByText('Receiver:')).toBeVisible();

    // Flip Direction button
    const flipBtn = inspector.getByRole('button', { name: /Flip Direction/i });
    await expect(flipBtn).toBeVisible();

    // Status pill
    const statusBtn = inspector.locator('button:has-text("Live"), button:has-text("Future")').first();
    await expect(statusBtn).toBeVisible();

    // Direction segmented control
    await expect(inspector.getByRole('button', { name: '➔ Out' })).toBeVisible();
    await expect(inspector.getByRole('button', { name: '⬅ In' })).toBeVisible();

    // Routing Shape segmented control
    const squareBtn = inspector.getByRole('button', { name: /Square/i });
    const curvedBtn = inspector.getByRole('button', { name: /Curved/i });
    await expect(squareBtn).toBeVisible();
    await expect(curvedBtn).toBeVisible();

    // Edge label input
    const edgeLabelInput = inspector.getByTestId('inspector-edge-label');
    await expect(edgeLabelInput).toBeVisible();

    // Duplicate Connection button
    const duplicateBtn = inspector.getByTestId('inspector-duplicate-edge');
    await expect(duplicateBtn).toBeVisible();
  });
});
