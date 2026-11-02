import { test, expect, type Page } from '@playwright/test';

/**
 * IcePanel Walkthrough — "How to create a C4 diagram" (recorded).
 *
 * This single, deliberately-paced test builds a full architecture model the way
 * IcePanel does — Context (L1) → Container/App (L2) → Component (L3) — reproducing
 * the user's "Allegheny County / DHS" recording. Playwright records a watchable
 * video.webm for every test (see playwright.config.ts `video: 'on'`), so running
 * this spec produces the walkthrough video:
 *
 *   npx playwright test e2e/icepanel-walkthrough.spec.ts --project=chromium
 *   # → apps/web/test-results/.../video.webm
 *
 * It uses only interactions proven by the other IcePanel specs, so it is a real
 * E2E test as well as a demo.
 */

const BEAT = 700; // pause between steps so the recording is followable

async function beat(page: Page, ms = BEAT): Promise<void> {
  await page.waitForTimeout(ms);
}

async function openStudio(page: Page): Promise<void> {
  await page.goto('/studio');
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
  await beat(page, 900);
}

async function addObject(
  page: Page,
  opts: {
    name: string;
    kind: 'system' | 'application' | 'database' | 'queue' | 'actor' | 'component';
    tech?: string;
    desc?: string;
  },
): Promise<void> {
  const sidebar = page.locator('[data-testid="icepanel-sidebar"]');
  if (!(await sidebar.isVisible())) {
    const expandBtn = page.getByRole('button', { name: /Expand model navigator/i });
    if (await expandBtn.isVisible()) await expandBtn.click();
  }

  const modelTab = page.locator('[data-testid="sidebar-model-tab"]');
  if (await modelTab.isVisible()) await modelTab.click();

  const addBtn = page.locator('[data-testid="sidebar-create-object-btn"]');
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await addBtn.click();
  await beat(page, 350);

  const nameInput = page.locator('input[placeholder*="Object Name"]');
  await expect(nameInput).toBeVisible();
  await nameInput.fill(opts.name);

  await page.locator('form:has(input[placeholder*="Object Name"]) select').selectOption(opts.kind);

  if (opts.tech) {
    const techInput = page.locator('input[placeholder*="Tech"]');
    if (await techInput.isVisible()) await techInput.fill(opts.tech);
  }
  if (opts.desc) {
    const descInput = page.locator('textarea[placeholder*="Brief description"]');
    if (await descInput.isVisible()) await descInput.fill(opts.desc);
  }

  await page.getByRole('button', { name: /Create & Add/i }).click();
  await beat(page);
}

async function fitView(page: Page): Promise<void> {
  const fitBtn = page.getByRole('button', { name: /Fit/ }).first();
  if (await fitBtn.isVisible().catch(() => false)) {
    await fitBtn.click();
    await beat(page, 400);
  }
}

async function connect(page: Page, sourceName: string, targetName: string, protocol: string, desc: string): Promise<void> {
  await fitView(page);
  const node = page.locator(`.react-flow__node:has-text("${sourceName}")`).first();
  await node.scrollIntoViewIfNeeded().catch(() => {});
  await node.click({ force: true });
  await beat(page, 400);

  const inspector = page.locator('[data-testid="inspector-panel"]');
  await expect(inspector).toBeVisible();
  await inspector.getByRole('button', { name: 'Connections' }).click();
  await beat(page, 350);

  const targetSelect = inspector.locator('form select');
  await expect(targetSelect).toBeVisible();
  const opt = targetSelect.locator(`option:has-text("${targetName}")`);
  const val = await opt.getAttribute('value');
  if (val) await targetSelect.selectOption(val);

  const protoInput = inspector.locator('input[placeholder*="Protocol"]');
  if (await protoInput.isVisible()) await protoInput.fill(protocol);
  const descInput = inspector.locator('input[placeholder*="Description"]');
  if (await descInput.isVisible()) await descInput.fill(desc);

  await inspector.getByRole('button', { name: /Connect Objects/i }).click();
  await beat(page);
}

test.describe('IcePanel Walkthrough — create a C4 diagram (recorded)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('Build Allegheny County: Context → Containers → Components', async ({ page }) => {
    // ───────────────────────── Level 1 · System Context ─────────────────────────
    await openStudio(page);
    await expect(page.locator('[data-testid="c4-level-1-btn"]')).toBeVisible();

    // The external actor and the systems that make up the landscape.
    await addObject(page, { name: 'County Resident', kind: 'actor', desc: 'Member of the public using county services' });
    await addObject(page, { name: 'Allegheny County', kind: 'system', tech: 'Microsoft Azure', desc: 'Core county services platform' });
    await addObject(page, { name: 'Dataware House', kind: 'system', desc: 'Analytics & reporting data warehouse' });

    await expect(page.locator('.react-flow__node:has-text("County Resident")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Allegheny County")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Dataware House")')).toBeVisible();
    await beat(page);

    // Draw the context relationships.
    await connect(page, 'County Resident', 'Allegheny County', 'HTTPS', 'Uses');
    await connect(page, 'Allegheny County', 'Dataware House', 'HTTPS', 'Sends data to');
    await expect(page.locator('.react-flow__edge').first()).toBeVisible();
    await beat(page, 900);

    // ───────────────────────── Level 2 · Containers / Apps ──────────────────────
    await page.locator('.react-flow__node:has-text("Allegheny County")').first().click();
    await page.locator('[data-testid="c4-level-2-btn"]').click();
    await expect(page.locator('[data-testid="studio-breadcrumb-level"]')).toHaveText('Containers');
    await beat(page, 900);

    await addObject(page, { name: 'Colab', kind: 'application', tech: 'React', desc: 'Resident collaboration web app' });
    await addObject(page, { name: 'Allegheny GO', kind: 'application', tech: 'React', desc: 'Citizen mobile app' });
    await addObject(page, { name: 'Traffic Control', kind: 'application', tech: 'Node.js', desc: 'Traffic orchestration service' });
    await addObject(page, { name: 'AitTaxi', kind: 'application', tech: 'Django', desc: 'Dispatch & ride service' });
    await addObject(page, { name: 'Postgres SQL', kind: 'database', tech: 'PostgreSQL', desc: 'Primary operational store' });

    await expect(page.locator('.react-flow__node:has-text("Colab")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Postgres SQL")')).toBeVisible();
    await beat(page);

    await connect(page, 'Colab', 'Traffic Control', 'HTTPS', 'Sends data to');
    await connect(page, 'Allegheny GO', 'Traffic Control', 'HTTPS', 'Sends data to');
    await connect(page, 'Traffic Control', 'Postgres SQL', 'SQL', 'Reads/writes');
    await connect(page, 'AitTaxi', 'Traffic Control', 'HTTPS', 'Sends data to');
    await beat(page, 900);

    // ───────────────────────── Level 3 · Components ─────────────────────────────
    await page.locator('.react-flow__node:has-text("Traffic Control")').first().click();
    await page.locator('[data-testid="c4-level-3-btn"]').click();
    await expect(page.locator('[data-testid="studio-breadcrumb-level"]')).toHaveText('Components');
    await beat(page, 900);

    await addObject(page, { name: 'Scheduler', kind: 'component', tech: 'AWS Lambda', desc: 'Schedules traffic signal plans' });
    await addObject(page, { name: 'Main application', kind: 'component', tech: 'Django', desc: 'Core request handling' });

    await expect(page.locator('.react-flow__node:has-text("Scheduler")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Main application")')).toBeVisible();
    await beat(page);

    await connect(page, 'Main application', 'Scheduler', 'gRPC', 'Invokes');
    await beat(page, 1200);

    // Back up the hierarchy to confirm the single model is preserved across views.
    await page.locator('[data-testid="c4-level-1-btn"]').click();
    await expect(page.locator('[data-testid="studio-breadcrumb-level"]')).toHaveText('Context');
    await expect(page.locator('.react-flow__node:has-text("Allegheny County")')).toBeVisible();
    await beat(page, 1200);
  });
});
