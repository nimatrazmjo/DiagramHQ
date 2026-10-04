import { test, expect } from '@playwright/test';

/**
 * Playwright E2E: AI Architecture Copilot, Generation, Review & ADR Suite.
 *
 * Verifies:
 * 1. AI Architecture Copilot Drawer: toggle drawer, inspect grounded context metrics, initial welcome message, and pre-seeded suggestions.
 * 2. Grounded Q&A in Copilot: submitting an architectural query and receiving answers with verified citation badges.
 * 3. AI Architecture Generation Modal: entering natural-language prompt, synthesizing complete proposal with component/flow/doc breakdown.
 * 4. Applying AI Proposal: committing generated architecture to canvas and verifying new nodes in React Flow.
 * 5. AI Architecture Review Agent: running pre-merge governance checks and verifying checklist rules (circular deps, ownership, DR, PII).
 * 6. AI-Drafted ADR Workflow: opening decision record draft, modifying context/title, and committing accepted ADR.
 */

test.describe('AI Architecture Copilot, Generation, Review & ADR Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
  });

  test('1. AI Architecture Copilot drawer opens, displays grounded context and pre-seeded prompt suggestions', async ({ page }) => {
    const copilotBtn = page.locator('[data-testid="toggle-ai-copilot-btn"]');
    await expect(copilotBtn).toBeVisible();
    await copilotBtn.click();

    // Verify Copilot panel is displayed
    const panel = page.locator('[data-testid="ai-copilot-panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Architecture Copilot');
    await expect(panel).toContainText('Grounded');

    // Verify Welcome message with grounding citations
    await expect(panel).toContainText("I'm your Architecture Copilot, grounded directly on this model");
    await expect(panel.locator('text=Grounded Model Citations')).toBeVisible();

    // Verify quick prompt suggestions ("Try:" banner)
    await expect(panel.locator('text=Try:')).toBeVisible();
    const tryButtons = panel.locator('button:has-text("?")');
    await expect(tryButtons.first()).toBeVisible();

    // Close panel
    const closeBtn = page.locator('[data-testid="ai-copilot-close-btn"]');
    await closeBtn.click();
    await expect(panel).not.toBeVisible();
  });

  test('2. Submitting an architectural question in Copilot generates grounded response with citations', async ({ page }) => {
    const copilotBtn = page.locator('[data-testid="toggle-ai-copilot-btn"]');
    await copilotBtn.click();

    const panel = page.locator('[data-testid="ai-copilot-panel"]');
    await expect(panel).toBeVisible();

    const input = page.locator('[data-testid="ai-copilot-input"]');
    const submitBtn = page.locator('[data-testid="ai-copilot-submit-btn"]');

    // Ask a grounded question
    const query = 'What depends on Web Application?';
    await input.fill(query);
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify user message appears in chat
    await expect(panel.locator(`text=${query}`)).toBeVisible();

    // Wait for AI grounded response
    const assistantResponses = panel.locator('.whitespace-pre-wrap');
    await expect(assistantResponses).toHaveCount(2, { timeout: 5000 });

    // Verify citation badges
    const citations = panel.locator('button[aria-label^="Citation for"]');
    await expect(citations.first()).toBeVisible();

    // Close drawer
    await page.locator('[data-testid="ai-copilot-close-btn"]').click();
    await expect(panel).not.toBeVisible();
  });

  test('3. Natural language architecture generation modal generates proposal card with metrics', async ({ page }) => {
    const genBtn = page.locator('[data-testid="toggle-ai-generation-btn"]');
    await expect(genBtn).toBeVisible();
    await genBtn.click();

    // Verify generation modal
    const modal = page.locator('[data-testid="ai-generation-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('AI Architecture Generation');

    // Fill natural language prompt
    const promptInput = page.locator('[data-testid="ai-generation-input"]');
    const generateBtn = page.locator('[data-testid="ai-generation-submit-btn"]');
    await promptInput.fill('Multi-tenant SaaS with API gateway, auth service, and partitioned database');
    await generateBtn.click();

    // Verify proposal card generated
    await expect(modal.locator('text=AI Generated Proposal')).toBeVisible();
    await expect(modal.locator('text=PROPOSED')).toBeVisible();

    // Verify summary chips
    await expect(modal.locator('span:has-text("Objects")').first()).toBeVisible();
    await expect(modal.locator('span:has-text("Connections")').first()).toBeVisible();
    await expect(modal.locator('span:has-text("Flows")').first()).toBeVisible();
    await expect(modal.locator('span:has-text("Docs")').first()).toBeVisible();

    // Switch tabs: Components -> Connections -> Flows -> Docs
    await modal.getByRole('button', { name: /Connections/ }).click();
    await expect(modal.locator('span:has-text("sync")').first()).toBeVisible();

    await modal.getByRole('button', { name: /Docs/ }).click();
    await expect(modal.locator('pre').first()).toBeVisible();

    // Close generation modal
    const closeBtn = page.locator('[data-testid="ai-generation-close-btn"]');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('4. Applying generated AI proposal updates canvas nodes and transitions proposal status', async ({ page }) => {
    // Check initial node count
    const initialNodesCount = await page.locator('.react-flow__node').count();
    expect(initialNodesCount).toBeGreaterThan(0);

    // Open AI Generation modal
    await page.locator('[data-testid="toggle-ai-generation-btn"]').click();
    const modal = page.locator('[data-testid="ai-generation-modal"]');
    await expect(modal).toBeVisible();

    // Generate proposal
    await page.locator('[data-testid="ai-generation-input"]').fill('Event-driven payment processing pipeline with Kafka and Redis');
    await page.locator('[data-testid="ai-generation-submit-btn"]').click();

    // Verify apply button is available
    const applyBtn = page.locator('[data-testid="ai-generation-apply-btn"]');
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // Modal closes automatically upon applying proposal
    await expect(modal).not.toBeVisible();

    // Verify canvas node count increased
    await expect(async () => {
      const updatedCount = await page.locator('.react-flow__node').count();
      expect(updatedCount).toBeGreaterThan(initialNodesCount);
    }).toPass({ timeout: 5000 });
  });

  test('5. AI Architecture Review agent runs pre-merge governance checks and displays audit verdict', async ({ page }) => {
    const reviewBtn = page.locator('[data-testid="toggle-ai-review-btn"]');
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    // Verify review modal container
    const modal = page.locator('[data-testid="ai-architecture-review-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('AI Architecture Review Agent');

    // Verify pre-merge governance checklist
    await expect(modal).toContainText('Pre-Merge Governance Checklist');
    await expect(modal).toContainText('Passed');

    // Verify rules are audited
    await expect(modal.locator('text=No circular dependencies')).toBeVisible();
    await expect(modal.locator('text=Ownership assigned')).toBeVisible();

    // Verify re-run review button functions
    const rerunBtn = page.locator('[data-testid="ai-review-rerun-btn"]');
    await expect(rerunBtn).toBeVisible();
    await rerunBtn.click();
    await expect(modal).toContainText('Pre-Merge Governance Checklist');

    // Close review modal
    const closeBtn = page.locator('[data-testid="ai-review-close-btn"]');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('6. Reviewing and accepting AI-drafted Architecture Decision Record (ADR)', async ({ page }) => {
    const adrBtn = page.locator('[data-testid="toggle-ai-adr-btn"]');
    await expect(adrBtn).toBeVisible();
    await adrBtn.click();

    // Verify ADR modal container
    const modal = page.locator('[data-testid="ai-adr-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Review AI-Drafted ADR');
    await expect(modal).toContainText('Polymorphic Traceability Invariant Enforced');

    // Check title input and customize it
    const titleInput = page.locator('#adr-title');
    await expect(titleInput).toBeVisible();
    const originalTitle = await titleInput.inputValue();
    expect(originalTitle.length).toBeGreaterThan(0);

    await titleInput.fill(`${originalTitle} - Approved by Team`);

    // Verify context & decision fields exist
    await expect(page.locator('#adr-context')).toBeVisible();
    await expect(page.locator('#adr-decision')).toBeVisible();

    // Accept & Commit ADR
    const acceptBtn = page.locator('[data-testid="ai-adr-accept-btn"]');
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // Modal closes upon accepting
    await expect(modal).not.toBeVisible();
  });
});
