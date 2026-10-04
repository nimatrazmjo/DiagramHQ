import { test, expect, type Page } from '@playwright/test';

/**
 * Playwright E2E: Interactive Flows, Sequence Tracing & Playback Controls.
 *
 * Verifies:
 * 1. Trace flows catalog view (/workspace/:id/flows), metrics counters, and badges (authenticated).
 * 2. Instant client-side search filtering across flow names and tags.
 * 3. Sequence diagram accordion timeline inspection with multi-protocol traces (HTTPS, gRPC, TCP).
 * 4. Studio canvas interactive flow playback toolbar activation.
 * 5. Step forward / step previous manual controls and step note descriptions.
 * 6. Play / pause auto-advance state changes and playback speed multiplier.
 * 7. Flow restart and looping mode controls.
 * 8. Direct cross-linking between flows explorer and interactive studio canvas.
 */

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  const adminBtn = page.getByRole('button', { name: /1-Click Sign In as Admin/i });
  await adminBtn.click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe('Flows, Sequence Tracing & Interactive Playback Suite', () => {
  test('1. Workspace trace flows explorer lists flows with passing/draft status and stats', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/workspace/default/flows');

    // Page title and description
    await expect(page.locator('h1')).toContainText('Trace Flows');
    await expect(page.getByText('End-to-end interaction sequences and message traces')).toBeVisible();

    // Summary counters
    await expect(page.getByText('3 total')).toBeVisible();
    await expect(page.getByText('2 passing')).toBeVisible();
    await expect(page.getByText('1 draft')).toBeVisible();

    // Flow items
    await expect(page.getByText('Customer Login & Token Issuance')).toBeVisible();
    await expect(page.getByText('Payment Checkout & Settlement')).toBeVisible();
    await expect(page.getByText('Silent Token Refresh')).toBeVisible();

    // Status badges
    const passingBadges = page.locator('span:has-text("Passing")');
    await expect(passingBadges.first()).toBeVisible();
    const draftBadge = page.locator('span:has-text("Draft")');
    await expect(draftBadge).toBeVisible();

    // Tags
    await expect(page.locator('text=OAuth2').first()).toBeVisible();
    await expect(page.locator('text=PCI-DSS').first()).toBeVisible();
  });

  test('2. Instant search filter isolates targeted flows and updates results', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/workspace/default/flows');

    const searchInput = page.getByPlaceholder('Search flows...');
    await expect(searchInput).toBeVisible();

    // Filter by "Payment"
    await searchInput.fill('Payment');
    await expect(page.getByText('Payment Checkout & Settlement')).toBeVisible();
    await expect(page.getByText('Customer Login & Token Issuance')).not.toBeVisible();
    await expect(page.getByText('Silent Token Refresh')).not.toBeVisible();

    // Filter by tag "PCI-DSS"
    await searchInput.fill('PCI-DSS');
    await expect(page.getByText('Payment Checkout & Settlement')).toBeVisible();
    await expect(page.getByText('Customer Login & Token Issuance')).not.toBeVisible();

    // Filter by non-existent query
    await searchInput.fill('NonExistentServiceQuery');
    await expect(page.getByText('No flows match "NonExistentServiceQuery"')).toBeVisible();

    // Clear search restores all flows
    await searchInput.fill('');
    await expect(page.getByText('Customer Login & Token Issuance')).toBeVisible();
    await expect(page.getByText('Payment Checkout & Settlement')).toBeVisible();
    await expect(page.getByText('Silent Token Refresh')).toBeVisible();
  });

  test('3. Sequence diagram accordion expands/collapses step timeline with protocols', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/workspace/default/flows');

    // First flow is expanded by default with 6 steps
    await expect(page.getByText('6 steps')).toBeVisible();
    await expect(page.getByText('End-to-end trace of a customer authenticating')).toBeVisible();

    // Verify step participants and protocols
    await expect(page.getByText('End User').first()).toBeVisible();
    await expect(page.getByText('Customer Web App').first()).toBeVisible();
    await expect(page.getByText('POST /api/v1/auth/login')).toBeVisible();
    await expect(page.getByText('HTTPS / REST').first()).toBeVisible();
    await expect(page.getByText('gRPC / TLS').first()).toBeVisible();
    await expect(page.getByText('TCP 5432').first()).toBeVisible();

    // Click to collapse first flow
    await page.getByRole('button', { name: /Customer Login & Token Issuance/i }).click();
    await expect(page.getByText('End-to-end trace of a customer authenticating')).not.toBeVisible();

    // Expand second flow "Payment Checkout & Settlement"
    await page.getByRole('button', { name: /Payment Checkout & Settlement/i }).click();
    await expect(page.getByText('Full checkout flow: token verification, payment initiation')).toBeVisible();
    await expect(page.getByText('Stripe Billing')).toBeVisible();
    await expect(page.getByText('mTLS REST')).toBeVisible();
  });

  test('4. Studio canvas mounts FlowPlaybackToolbar with user journey context and step note', async ({ page }) => {
    await page.goto('/studio');

    // Verify canvas rendered
    await expect(page.locator('.react-flow')).toBeVisible();

    // Verify Flow Trace button exists in header
    const toggleBtn = page.locator('button[data-testid="toggle-flow-playback-btn"]');
    await expect(toggleBtn).toBeVisible();

    // Initially toolbar should not be mounted
    await expect(page.locator('[data-testid="flow-playback-toolbar"]')).not.toBeVisible();

    // Click toggle button to activate Flow Playback mode
    await toggleBtn.click();

    // Flow Playback Toolbar mounted
    const toolbar = page.locator('[data-testid="flow-playback-toolbar"]');
    await expect(toolbar).toBeVisible();

    // Step indicator shows 1 / 4
    const stepIndicator = page.locator('[data-testid="playback-step-indicator"]');
    await expect(stepIndicator).toHaveText('1 / 4');

    // User journey context banner
    const journeyContext = page.locator('[data-testid="playback-user-journey-context"]');
    await expect(journeyContext).toBeVisible();
    await expect(page.locator('[data-testid="playback-persona-badge"]')).toContainText('Security Architect');
    await expect(page.locator('[data-testid="playback-actor-action"]')).toContainText('Validates Auth Token');

    // Step note banner
    const stepNote = page.locator('[data-testid="playback-step-note"]');
    await expect(stepNote).toBeVisible();
    await expect(stepNote).toContainText('Step #1:');
    await expect(stepNote).toContainText('End User dispatches HTTPS authentication request');
  });

  test('5. Step forward, step previous, and boundary clamping update step descriptions', async ({ page }) => {
    await page.goto('/studio');
    await page.locator('button[data-testid="toggle-flow-playback-btn"]').click();

    const nextBtn = page.locator('[data-testid="playback-next-btn"]');
    const prevBtn = page.locator('[data-testid="playback-prev-btn"]');
    const stepIndicator = page.locator('[data-testid="playback-step-indicator"]');
    const stepNote = page.locator('[data-testid="playback-step-note"]');

    // Initially at 1 / 4; previous button disabled
    await expect(stepIndicator).toHaveText('1 / 4');
    await expect(prevBtn).toBeDisabled();

    // Step forward to 2 / 4
    await nextBtn.click();
    await expect(stepIndicator).toHaveText('2 / 4');
    await expect(stepNote).toContainText('Step #2:');
    await expect(stepNote).toContainText('Web App proxies request with CSRF token');
    await expect(prevBtn).toBeEnabled();

    // Step forward to 3 / 4
    await nextBtn.click();
    await expect(stepIndicator).toHaveText('3 / 4');
    await expect(stepNote).toContainText('Step #3:');
    await expect(stepNote).toContainText('API Gateway verifies TLS and invokes gRPC AuthenticateUser');

    // Step backward to 2 / 4
    await prevBtn.click();
    await expect(stepIndicator).toHaveText('2 / 4');
    await expect(stepNote).toContainText('Step #2:');

    // Step backward to 1 / 4
    await prevBtn.click();
    await expect(stepIndicator).toHaveText('1 / 4');
    await expect(prevBtn).toBeDisabled();
  });

  test('6. Play/pause auto-advance, speed multiplier, restart, and looping controls', async ({ page }) => {
    await page.goto('/studio');
    await page.locator('button[data-testid="toggle-flow-playback-btn"]').click();

    const playBtn = page.locator('[data-testid="playback-play-btn"]');
    const pauseBtn = page.locator('[data-testid="playback-pause-btn"]');
    const stepIndicator = page.locator('[data-testid="playback-step-indicator"]');
    const speedSelect = page.locator('[data-testid="playback-speed-select"]');
    const restartBtn = page.locator('[data-testid="playback-restart-btn"]');
    const loopBtn = page.locator('[data-testid="playback-loop-btn"]');

    // Test speed selector
    await expect(speedSelect).toHaveValue('1');
    await speedSelect.selectOption('2');
    await expect(speedSelect).toHaveValue('2');

    // Test play auto-advance
    await expect(playBtn).toBeVisible();
    await playBtn.click();

    // Play button replaced with Pause button
    await expect(pauseBtn).toBeVisible();

    // Wait for auto-advance timer at 2x speed (900ms per step)
    await page.waitForTimeout(1400);

    // Verify step advanced past step 1
    const textAfterPlay = await stepIndicator.textContent();
    expect(textAfterPlay).not.toBe('1 / 4');

    // Pause playback
    await pauseBtn.click();
    await expect(playBtn).toBeVisible();

    // Test restart button
    await restartBtn.click();
    await expect(stepIndicator).toHaveText('1 / 4');

    // Test loop toggle
    await expect(loopBtn).toHaveAttribute('title', 'Looping disabled');
    await loopBtn.click();
    await expect(loopBtn).toHaveAttribute('title', 'Looping enabled');
  });

  test('7. Workspace flows page links directly to interactive studio', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/workspace/default/flows');

    const studioLink = page.getByRole('link', { name: /Interactive Studio/i });
    await expect(studioLink).toBeVisible();

    await studioLink.click();
    await expect(page).toHaveURL(/\/studio/);
    await expect(page.locator('.react-flow')).toBeVisible();
  });
});
