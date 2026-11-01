import { test, expect, type Page } from '@playwright/test';

/**
 * Playwright E2E Test Suite:
 * IcePanel C4 Model Masterclass (YouTube Playlist: PLSB-KXFy83UuxwNMcUMloPeZUjxaKVZIK)
 * Reference System: "Seal Track" Arctic Seal Population Tracking System
 *
 * Videos Covered:
 * 1. "What is the C4 Model?" (LGD9L8RA-To) - Context, Containers, Components, Code
 * 2. "The four C4 model abstractions" (iIcO8CVNuJo) - People/Actors, Software Systems, Containers, Components
 * 3. "C4 model diagrams" (wDncmhUkkQM) - System Context (L1), Container (L2), Component (L3), Deployment & Flow
 * 4. "IcePanel best practices and stakeholder communication" (TOj_YMzlODY) - Clear responsibilities, tags & filters
 * 5. "Advanced Topics + IcePanel Power Moves" (rvy7o-p5Qbk) - Deployment groups, tags as X-ray glasses, flows & docs linking
 * 6. "Building software architecture diagrams in IcePanel 🧊" (QcIR1afezxA) - Step-by-step Seal Track modeling
 * 7. "IcePanel and C4 model recap" (irwpoxCrIpQ) - Single source of truth, cross-view consistency, diagram metadata
 */

async function openStudio(page: Page) {
  await page.goto('/studio');
  const canvas = page.locator('.react-flow');
  await expect(canvas).toBeVisible({ timeout: 15000 });
}

async function addModelObjectFromSidebar(
  page: Page,
  {
    name,
    kind,
    tech,
    desc,
  }: {
    name: string;
    kind: 'system' | 'application' | 'database' | 'queue' | 'actor' | 'component';
    tech?: string;
    desc?: string;
  },
) {
  // Ensure sidebar is open
  const sidebar = page.locator('[data-testid="icepanel-sidebar"]');
  if (!(await sidebar.isVisible())) {
    const expandBtn = page.getByRole('button', { name: /Expand model navigator/i });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }
  }

  // Click Model Objects tab
  const modelTab = page.locator('[data-testid="sidebar-model-tab"]');
  if (await modelTab.isVisible()) {
    await modelTab.click();
  }

  // Click Add button
  const addBtn = page.locator('[data-testid="sidebar-create-object-btn"]');
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await addBtn.click();

  // Fill form
  const nameInput = page.locator('input[placeholder*="Object Name"]');
  await expect(nameInput).toBeVisible();
  await nameInput.fill(name);

  // Kind select
  const kindSelect = page.locator('form select');
  await kindSelect.selectOption(kind);

  if (tech) {
    const techInput = page.locator('input[placeholder*="Tech"]');
    if (await techInput.isVisible()) {
      await techInput.fill(tech);
    }
  }

  if (desc) {
    const descInput = page.locator('textarea[placeholder*="Brief description"]');
    if (await descInput.isVisible()) {
      await descInput.fill(desc);
    }
  }

  // Submit form
  const createBtn = page.getByRole('button', { name: /Create & Add/i });
  await createBtn.click();

  // Wait for node to be on canvas
  await page.waitForTimeout(300);
}

test.describe('IcePanel C4 Model YouTube Playlist - Seal Track Architecture Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure fresh canvas
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('1. Video 1, 2 & 6: Builds Seal Track System Context Diagram (L1) with Actors, Systems & Connections', async ({
    page,
  }) => {
    await openStudio(page);

    // Verify initial C4 Level is Context (L1)
    const l1Btn = page.locator('[data-testid="c4-level-1-btn"]');
    await expect(l1Btn).toBeVisible();

    // 1. Add Actor: Researchers (marine biologists tracking arctic seals)
    await addModelObjectFromSidebar(page, {
      name: 'Researchers',
      kind: 'actor',
      desc: 'Marine biologists tracking arctic seal populations',
    });

    // 2. Add Actor / Physical Device: GPS Collar
    await addModelObjectFromSidebar(page, {
      name: 'GPS Collar',
      kind: 'actor',
      desc: 'Physical tracking collars worn by seals',
    });

    // 3. Add Software System: Seal Track
    await addModelObjectFromSidebar(page, {
      name: 'Seal Track',
      kind: 'system',
      desc: 'Seal tracking and monitoring core platform',
    });

    // 4. Add External Service: Twilio
    await addModelObjectFromSidebar(page, {
      name: 'Twilio',
      kind: 'system',
      desc: 'External SMS notification gateway',
    });

    // 5. Add External Service: Slack
    await addModelObjectFromSidebar(page, {
      name: 'Slack',
      kind: 'system',
      desc: 'Team collaboration and alert webhooks',
    });

    // Verify all 5 nodes are rendered on canvas
    await expect(page.locator('.react-flow__node:has-text("Researchers")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("GPS Collar")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Seal Track")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Twilio")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Slack")')).toBeVisible();

    // Select GPS Collar on Canvas
    const gpsNode = page.locator('.react-flow__node:has-text("GPS Collar")');
    await gpsNode.click();

    const inspector = page.locator('[data-testid="inspector-panel"]');
    await expect(inspector).toBeVisible();

    // Switch to Connections tab in Inspector
    const connectionsTab = inspector.getByRole('button', { name: 'Connections' });
    await connectionsTab.click();

    // Select target "Seal Track"
    const targetSelect = inspector.locator('form select');
    await expect(targetSelect).toBeVisible();
    const sealTrackOption = targetSelect.locator('option:has-text("Seal Track")');
    const optionVal = await sealTrackOption.getAttribute('value');
    if (optionVal) {
      await targetSelect.selectOption(optionVal);
    }

    // Enter protocol and description
    const protocolInput = inspector.locator('input[placeholder*="Protocol"]');
    await protocolInput.fill('Satellite Telemetry');

    const descInput = inspector.locator('input[placeholder*="Description"]');
    await descInput.fill('Sends GPS coordinates');

    // Click Connect Objects
    const connectSubmit = inspector.getByRole('button', { name: /Connect Objects/i });
    await connectSubmit.click();

    // Verify connection edge is drawn on canvas
    const edge = page.locator('.react-flow__edge');
    await expect(edge.first()).toBeVisible();
  });

  test('2. Video 2, 3 & 6: C4 Hierarchy Drill-Down (L1 -> L2) & Seal Track Containers (Web App, Mobile, API, DB)', async ({
    page,
  }) => {
    await openStudio(page);

    // Add Seal Track System at L1
    await addModelObjectFromSidebar(page, {
      name: 'Seal Track',
      kind: 'system',
      desc: 'Seal tracking and monitoring core platform',
    });

    const sealTrackNode = page.locator('.react-flow__node:has-text("Seal Track")');
    await expect(sealTrackNode).toBeVisible();
    await sealTrackNode.click();

    // Drill down into Seal Track containers using L2 switcher or drill-down affordance
    const l2Btn = page.locator('[data-testid="c4-level-2-btn"]');
    await l2Btn.click();

    // Verify breadcrumb shows Containers level
    const breadcrumbLevel = page.locator('[data-testid="studio-breadcrumb-level"]');
    await expect(breadcrumbLevel).toHaveText('Containers');

    // Inside Seal Track, add the 4 deployable containers shown in Video 6:
    // 1. Web App Dashboard (JavaScript, Tailwind, D3)
    await addModelObjectFromSidebar(page, {
      name: 'Web App Dashboard',
      kind: 'application',
      tech: 'JavaScript, Tailwind CSS, D3.js',
      desc: 'Interactive data visualization dashboard for researchers',
    });

    // 2. Mobile Field App (iOS & Android)
    await addModelObjectFromSidebar(page, {
      name: 'Mobile Field App',
      kind: 'application',
      tech: 'iOS, Android',
      desc: 'Fieldwork mobile app for arctic researchers',
    });

    // 3. Core Backend API (Node.js)
    await addModelObjectFromSidebar(page, {
      name: 'Core Backend API',
      kind: 'application',
      tech: 'Node.js',
      desc: 'Telemetry ingestion and business logic API',
    });

    // 4. PostgreSQL Database (PostgreSQL, AWS RDS)
    await addModelObjectFromSidebar(page, {
      name: 'PostgreSQL Database',
      kind: 'database',
      tech: 'PostgreSQL, AWS RDS',
      desc: 'Stores GPS telemetry, seal profiles, and alert logs',
    });

    // Verify all 4 containers exist on the L2 canvas
    await expect(page.locator('.react-flow__node:has-text("Web App Dashboard")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Mobile Field App")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Core Backend API")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("PostgreSQL Database")')).toBeVisible();

    // Navigate back to Level 1 (System Context) using breadcrumbs or L1 button
    const l1Btn = page.locator('[data-testid="c4-level-1-btn"]');
    await l1Btn.click();

    await expect(breadcrumbLevel).toHaveText('Context');
    // Verify Seal Track system node is still in Level 1
    await expect(page.locator('.react-flow__node:has-text("Seal Track")')).toBeVisible();
  });

  test('3. Video 2, 3 & 6: Component Level Drill-Down (L2 -> L3) & Internal API Modules (Ingest, Alerting, Mapping)', async ({
    page,
  }) => {
    await openStudio(page);

    // Switch to L2 Containers
    const l2Btn = page.locator('[data-testid="c4-level-2-btn"]');
    await l2Btn.click();

    // Add Core Backend API container
    await addModelObjectFromSidebar(page, {
      name: 'Core Backend API',
      kind: 'application',
      tech: 'Node.js',
      desc: 'Telemetry ingestion and business logic API',
    });

    const apiNode = page.locator('.react-flow__node:has-text("Core Backend API")');
    await expect(apiNode).toBeVisible();
    await apiNode.click();

    // Drill down into Level 3 (Components)
    const l3Btn = page.locator('[data-testid="c4-level-3-btn"]');
    await l3Btn.click();

    const breadcrumbLevel = page.locator('[data-testid="studio-breadcrumb-level"]');
    await expect(breadcrumbLevel).toHaveText('Components');

    // Add internal modules inside Core Backend API:
    // 1. Location Ingest Module
    await addModelObjectFromSidebar(page, {
      name: 'Location Ingest Module',
      kind: 'component',
      desc: 'Ingests and parses incoming GPS coordinates',
    });

    // 2. Alerting Module
    await addModelObjectFromSidebar(page, {
      name: 'Alerting Module',
      kind: 'component',
      desc: 'Evaluates boundary conditions and triggers alerts',
    });

    // 3. Mapping Module
    await addModelObjectFromSidebar(page, {
      name: 'Mapping Module',
      kind: 'component',
      desc: 'Geospatial projection and map tile engine',
    });

    // Verify all 3 components are displayed on the L3 canvas
    await expect(page.locator('.react-flow__node:has-text("Location Ingest Module")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Alerting Module")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Mapping Module")')).toBeVisible();

    // Verify ascending back up to Containers returns to L2
    const returnBtn = page.locator('[data-testid="drill-ascend-btn"]');
    if (await returnBtn.isVisible()) {
      await returnBtn.click();
    } else {
      await l2Btn.click();
    }

    await expect(breadcrumbLevel).toHaveText('Containers');
    await expect(page.locator('.react-flow__node:has-text("Core Backend API")')).toBeVisible();
  });

  test('4. Video 4 & 5: Tags, Real-time Filters & "X-Ray Glasses" for Data Sensitivity and Risk', async ({
    page,
  }) => {
    await openStudio(page);

    // Add PostgreSQL Database at L2
    const l2Btn = page.locator('[data-testid="c4-level-2-btn"]');
    await l2Btn.click();

    await addModelObjectFromSidebar(page, {
      name: 'PostgreSQL Database',
      kind: 'database',
      tech: 'PostgreSQL',
      desc: 'Stores GPS telemetry and research data',
    });

    const dbNode = page.locator('.react-flow__node:has-text("PostgreSQL Database")');
    await expect(dbNode).toBeVisible();
    await dbNode.click();

    const inspector = page.locator('[data-testid="inspector-panel"]');
    await expect(inspector).toBeVisible();

    // Add Technology Tags via Inspector
    const addTechInput = inspector.locator('input[placeholder*="Add technology"]');
    await expect(addTechInput).toBeVisible();

    await addTechInput.fill('AWS RDS');
    await addTechInput.press('Enter');

    // Verify badge appears
    await expect(inspector.getByText('AWS RDS')).toBeVisible();

    // Open Governance tab
    const governanceTab = inspector.getByRole('button', { name: 'Governance' });
    await governanceTab.click();

    // Set Criticality & Data Classification
    const criticalityInput = inspector.locator('[data-testid="inspector-field-criticality"]');
    await expect(criticalityInput).toBeVisible();
    await criticalityInput.fill('Tier 1 - Critical');

    const dataClassInput = inspector.locator('[data-testid="inspector-field-dataClassification"]');
    await expect(dataClassInput).toBeVisible();
    await dataClassInput.fill('Confidential GPS Data');

    // Test Perspective / Filter switcher (Security vs Data vs All)
    const securityFilterBtn = page.getByRole('button', { name: 'security' });
    if (await securityFilterBtn.isVisible()) {
      await securityFilterBtn.click();
      await page.waitForTimeout(300);
    }

    // Switch back to All
    const allFilterBtn = page.getByRole('button', { name: 'all' });
    if (await allFilterBtn.isVisible()) {
      await allFilterBtn.click();
    }

    // Node should remain visible and intact
    await expect(dbNode).toBeVisible();
  });

  test('5. Video 5 & 6: Interactive Trace Flows & User Journey Sequence Playback', async ({ page }) => {
    await openStudio(page);

    // Activate Flow Trace Playback Toolbar
    const traceFlowBtn = page.locator('[data-testid="toggle-flow-playback-btn"]');
    await expect(traceFlowBtn).toBeVisible();
    await traceFlowBtn.click();

    // Verify playback toolbar is rendered
    const toolbar = page.locator('[data-testid="flow-playback-toolbar"]');
    await expect(toolbar).toBeVisible();

    // Verify Step Counter is visible (e.g. "1 / 4")
    const stepCounter = toolbar.locator('[data-testid="playback-step-indicator"]');
    await expect(stepCounter).toBeVisible();
    await expect(stepCounter).toContainText('1 /');

    // Verify Play / Pause button exists
    const playBtn = toolbar.locator('[data-testid="playback-play-btn"]');
    await expect(playBtn).toBeVisible();

    // Step forward using Next button
    const nextBtn = toolbar.locator('[data-testid="playback-next-btn"]');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Step counter should update to Step 2
    await expect(stepCounter).toContainText('2 /');

    // Step backwards using Prev button
    const prevBtn = toolbar.locator('[data-testid="playback-prev-btn"]');
    await expect(prevBtn).toBeVisible();
    await prevBtn.click();

    // Step counter should return to Step 1
    await expect(stepCounter).toContainText('1 /');
  });

  test('6. Video 5 & 7: Object Linking to Docs & Code, Architecture Evolution & Diagram Metadata', async ({
    page,
  }) => {
    await openStudio(page);

    // Add Core Backend API
    await addModelObjectFromSidebar(page, {
      name: 'Core Backend API',
      kind: 'application',
      tech: 'Node.js',
      desc: 'Telemetry ingestion API',
    });

    const apiNode = page.locator('.react-flow__node:has-text("Core Backend API")');
    await expect(apiNode).toBeVisible();
    await apiNode.click();

    const inspector = page.locator('[data-testid="inspector-panel"]');
    await expect(inspector).toBeVisible();

    // Switch to Docs tab
    const docsTab = inspector.getByRole('button', { name: 'Docs' });
    await docsTab.click();

    // Enter Architecture Notes
    const notesTextarea = inspector.locator('textarea[placeholder*="Write markdown documentation"]');
    await expect(notesTextarea).toBeVisible();
    await notesTextarea.fill('# Seal Track Core API\nTelemetry ingestion service handling satellite pings.');

    // Enter Repository URL
    const repoInput = inspector.locator('[data-testid="inspector-field-repository"]');
    await expect(repoInput).toBeVisible();
    await repoInput.fill('https://github.com/arctic-dev/seal-track-api');

    // Deselect and re-select to verify retention
    const canvas = page.locator('.react-flow__pane');
    await canvas.click({ position: { x: 400, y: 400 } });

    await apiNode.click();
    await docsTab.click();

    await expect(notesTextarea).toHaveValue('# Seal Track Core API\nTelemetry ingestion service handling satellite pings.');
    await expect(repoInput).toHaveValue('https://github.com/arctic-dev/seal-track-api');

    // Verify Diagram Studio Header & Breadcrumbs show active context
    const breadcrumbRoot = page.locator('[data-testid="breadcrumb-root"]');
    await expect(breadcrumbRoot).toBeVisible();
  });
});
