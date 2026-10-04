import { test, expect } from '@playwright/test';

/**
 * Playwright E2E: Mobile Web Companion & Responsive Governance Suite.
 *
 * Verifies:
 * 1. Mobile Companion Header & Desktop-First Advisory: renders under mobile viewport (375x667), displays F134 badge and advisory ribbon.
 * 2. Architecture Views Tab: renders C4 Context, Container, and Component view cards, allowing tap-to-inspect toggle.
 * 3. Mobile Catalog Search: instant filter across components, C4 views, and architectural decisions (ADRs).
 * 4. Architectural Change Approvals: inspects pending pull requests, executes 1-tap approval, and verifies status update and toast.
 * 5. Architecture Review Commenting: composes and posts new review comment targeted to specific components.
 * 6. Mobile AI Copilot: submits architectural inquiry and verifies answer card with confidence metrics and suggested actions.
 * 7. Studio Navigation Link: verifies desktop Studio header contains mobile companion link that navigates to /mobile.
 */

test.describe('Mobile Web Companion & Responsive Governance Suite', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE standard mobile viewport
  });

  test('1. Mobile companion displays branding header, F134 badge, and desktop-first canvas advisory', async ({ page }) => {
    await page.goto('/mobile');

    // Verify main container
    const container = page.locator('[data-testid="mobile-companion-container"]');
    await expect(container).toBeVisible();

    // Verify branding and phase badge
    await expect(container).toContainText('DiagramHQ Mobile');
    await expect(container).toContainText('F134');
    await expect(container).toContainText('Mobile Companion View');

    // Verify desktop-first canvas invariant advisory ribbon
    const advisory = page.locator('[data-testid="mobile-desktop-first-advisory"]');
    await expect(advisory).toBeVisible();
    await expect(advisory).toContainText('Desktop-First Canvas:');
    await expect(advisory).toContainText('Canvas layout and node editing is desktop-first');
    await expect(advisory).toContainText('Mobile companion is active for viewing');
  });

  test('2. Architecture Views tab renders C4 level summaries and supports tap-to-inspect', async ({ page }) => {
    await page.goto('/mobile');

    // Views tab is active by default
    await expect(page.locator('h2:has-text("Architecture Views")')).toBeVisible();
    await expect(page.locator('text=3 Diagrams')).toBeVisible();

    // Verify view cards exist
    const viewCards = page.locator('[data-testid="mobile-view-card"]');
    await expect(viewCards).toHaveCount(3);

    // Verify C4 Level badges
    await expect(viewCards.nth(0)).toContainText('context');
    await expect(viewCards.nth(0)).toContainText('System Context & External Actors');

    await expect(viewCards.nth(1)).toContainText('container');
    await expect(viewCards.nth(1)).toContainText('Cardholder Data Environment (CDE)');

    await expect(viewCards.nth(2)).toContainText('component');
    await expect(viewCards.nth(2)).toContainText('OAuth2 / Passkey IAM Gateway');

    // Tap second card to activate inspection
    await viewCards.nth(1).click();
    await expect(viewCards.nth(1)).toContainText('Viewing Active');

    // Tap again to toggle off
    await viewCards.nth(1).click();
    await expect(viewCards.nth(1)).toContainText('Tap to Inspect →');
  });

  test('3. Mobile catalog search filters components, views, and architectural decisions', async ({ page }) => {
    await page.goto('/mobile');

    // Switch to Search tab
    const searchTabBtn = page.locator('[data-testid="mobile-tab-search"]');
    await searchTabBtn.click();

    const searchInput = page.locator('[data-testid="mobile-search-input"]');
    await expect(searchInput).toBeVisible();

    // 1. Search for Vault
    await searchInput.fill('Vault');
    const results = page.locator('[data-testid="mobile-search-result"]');
    await expect(results.first()).toBeVisible();
    await expect(page.locator('text=PAN Tokenization Vault')).toBeVisible();
    await expect(page.locator('text=object').first()).toBeVisible();

    // 2. Search for ADR
    await searchInput.fill('ADR');
    await expect(page.locator('text=ADR-008: Zero-Trust Perimeter')).toBeVisible();
    await expect(page.locator('text=decision').first()).toBeVisible();

    // 3. Search non-existent entity
    await searchInput.fill('NonExistentClusterXYZ');
    await expect(page.locator('text=No matching entities found.')).toBeVisible();
  });

  test('4. Architectural change approvals tab executes 1-tap approval workflow', async ({ page }) => {
    await page.goto('/mobile');

    // Switch to Approvals tab
    const approvalsTabBtn = page.locator('[data-testid="mobile-tab-approvals"]');
    await approvalsTabBtn.click();

    // Verify pending approvals header
    await expect(page.locator('h2:has-text("Pending Approvals")')).toBeVisible();
    await expect(page.locator('text=2 Pending')).toBeVisible();

    const approvalCards = page.locator('[data-testid="mobile-approval-card"]');
    await expect(approvalCards).toHaveCount(2);

    // Verify first card details
    const firstCard = approvalCards.first();
    await expect(firstCard).toContainText('Isolate Cardholder Vault with Egress Firewall');
    await expect(firstCard).toContainText('pending');

    // Execute 1-tap mobile approval
    const approveBtn = firstCard.locator('[data-testid="mobile-approve-btn"]');
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Verify feedback toast appears
    const toast = page.locator('[data-testid="mobile-feedback-toast"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Approved change: 'Isolate Cardholder Vault with Egress Firewall'!");

    // Verify card status transitions to approved
    await expect(firstCard).toContainText('approved');
    await expect(firstCard).toContainText('Reviewed by: Mobile Lead Architect');
  });

  test('5. Architecture review commenting posts targeted comments into real-time stream', async ({ page }) => {
    await page.goto('/mobile');

    // Switch to Comments tab
    const commentsTabBtn = page.locator('[data-testid="mobile-tab-comments"]');
    await commentsTabBtn.click();

    await expect(page.locator('h2:has-text("Architecture Review Comments")')).toBeVisible();

    // Initial comment should be present
    const commentCards = page.locator('[data-testid="mobile-comment-card"]');
    await expect(commentCards.first()).toBeVisible();
    await expect(commentCards.first()).toContainText('Sarah Connor');
    await expect(commentCards.first()).toContainText('PAN Tokenization Vault');

    // Fill new comment form
    const targetInput = page.locator('[data-testid="mobile-comment-target-input"]');
    const textInput = page.locator('[data-testid="mobile-comment-text-input"]');
    const submitBtn = page.locator('[data-testid="mobile-comment-submit-btn"]');

    await targetInput.fill('Payment Gateway');
    await textInput.fill('Require TLS 1.3 with mutual certificate pinning for external payment processor.');
    await submitBtn.click();

    // Feedback toast confirms posting
    const toast = page.locator('[data-testid="mobile-feedback-toast"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Comment posted successfully.');

    // Verify comment appears in list
    await expect(page.locator('text=On: Payment Gateway')).toBeVisible();
    await expect(page.locator('text=Require TLS 1.3 with mutual certificate pinning for external payment processor.')).toBeVisible();
    await expect(page.locator('text=Mobile Architect')).toBeVisible();
  });

  test('6. Mobile AI Copilot processes architectural inquiry and renders confidence answer', async ({ page }) => {
    await page.goto('/mobile');

    // Switch to AI tab
    const aiTabBtn = page.locator('[data-testid="mobile-tab-ai"]');
    await aiTabBtn.click();

    await expect(page.locator('h2:has-text("Mobile AI Copilot")')).toBeVisible();

    const aiInput = page.locator('[data-testid="mobile-ai-input"]');
    const askBtn = page.locator('[data-testid="mobile-ai-submit-btn"]');

    // Ask architectural query
    await aiInput.fill('What is the single point of failure?');
    await askBtn.click();

    // Verify toast
    const toast = page.locator('[data-testid="mobile-feedback-toast"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('AI response generated.');

    // Verify AI Answer card
    const answerCard = page.locator('[data-testid="mobile-ai-answer-card"]');
    await expect(answerCard).toBeVisible();
    await expect(answerCard).toContainText('AI Copilot Answer');
    await expect(answerCard).toContainText('Confidence: 94%');
    await expect(answerCard).toContainText('Suggested Actions:');
  });

  test('7. Studio header contains link navigating directly to mobile companion view', async ({ page }) => {
    // Navigate to studio (desktop context)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible();

    // Verify mobile companion link in header
    const mobileLink = page.locator('[data-testid="link-mobile-companion"]');
    await expect(mobileLink).toBeVisible();
    await mobileLink.click();

    // Verify navigation to /mobile
    await page.waitForURL('/mobile');
    await expect(page.locator('[data-testid="mobile-companion-container"]')).toBeVisible();
  });
});
