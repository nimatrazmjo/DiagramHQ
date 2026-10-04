# Playwright E2E Testing Matrix & Implementation Roadmap

This document maintains an up-to-date tracker of all end-to-end (E2E) browser tests in **DiagramHQ**, highlighting what has been implemented, verified, and merged into `main`, as well as the prioritized backlog of what remains.

---

## 1. Architecture & Execution Setup

- **Test Runner**: `@playwright/test` (Chromium headless & headed).
- **Execution Script**:
  - `pnpm test:e2e` (spins up local Next.js dev server at `http://localhost:3000` via `playwright.config.ts`).
  - `pnpm --filter @diagramhq/web test:e2e:headed` (headed mode for debugging).
- **Video & Snapshot Artifacts**:
  - `video: 'on'` — WebM video recording captured for every test run in `apps/web/test-results/**/video.webm`.
  - `screenshot: 'on'` — Full-page and element screenshots saved on test completion.
- **Test Suite Isolation**:
  - Playwright specs reside exclusively in `apps/web/e2e/`.
  - Unit/Component tests in `apps/web/vitest.config.ts` explicitly exclude `**/e2e/**` to avoid runner conflicts.

---

## 2. Implemented & Verified Test Suites (27 Tests — 100% Passing)

### Suite 1: Authentication & Session Security (`apps/web/e2e/auth.spec.ts`)
| # | Test Case Description | Verified Behavior | Status |
|---|---|---|:---:|
| 1 | Unauthenticated `/dashboard` redirect | Redirects unauthenticated visits to `/login?callbackUrl=%2Fdashboard` | ✅ Passed |
| 2 | Unauthenticated `/workspace/*` redirect | Redirects unauthenticated visits to `/login?callbackUrl=%2Fworkspace%2Fdefault%2Fstudio` | ✅ Passed |
| 3 | Invalid credentials rejection | Submitting invalid email/password shows error alert and preserves `/login` | ✅ Passed |
| 4 | 1-Click Superuser admin authentication | Clicking "Admin (Superuser)" authenticates as `admin@diagramhq.com` and loads `/dashboard` | ✅ Passed |
| 5 | Manual credentials sign-in | Filling valid credentials (`admin@diagramhq.com` / `adminpassword`) signs in | ✅ Passed |
| 6 | Authenticated `/login` bypass | Logged-in session visiting `/login` is automatically redirected to `/dashboard` | ✅ Passed |
| 7 | Logout and session destruction | Clicking "Sign out" terminates session and redirects back to `/login` | ✅ Passed |
| 8 | Enterprise SSO routing | Navigating to Enterprise SSO tab displays corporate IdP sign-in controls | ✅ Passed |

### Suite 2: React Flow Diagram Navigation & C4 Hierarchy (`apps/web/e2e/canvas-navigation.spec.ts`)
| # | Test Case Description | Verified Behavior | Status |
|---|---|---|:---:|
| 1 | Initial SaaS starter graph | Loads React Flow canvas with predefined nodes (`api-gateway`, `auth-service`, `main-db`) and edges | ✅ Passed |
| 2 | Canvas pan & zoom controls | Zoom In, Zoom Out, and Fit View controls adjust canvas transform matrix | ✅ Passed |
| 3 | C4 hierarchy level switching | Switching Context → Containers → Components updates active level and breadcrumb hierarchy | ✅ Passed |
| 4 | Perspective view filtering | Switching between All, Security, Data, and Ownership views updates canvas filters | ✅ Passed |
| 5 | Persona mode selection | Changing persona dropdown switches persona modes (Architect, Developer, Security, etc.) | ✅ Passed |
| 6 | Node selection & Inspector | Clicking a node highlights it and opens the Inspector drawer with object details | ✅ Passed |
| 7 | Header inspector toggle | Clicking Inspector toggle button shows/hides the right inspector sidebar | ✅ Passed |
| 8 | Brand Icon catalog modal | Opens Brand Icon catalog modal, verifies icon grid, and closes via escape/backdrop | ✅ Passed |

### Suite 3: Canvas Drag-and-Drop, Node Creation & Connection (`apps/web/e2e/canvas-drag-drop.spec.ts`)
| # | Test Case Description | Verified Behavior | Status |
|---|---|---|:---:|
| 1 | Native mouse drag repositioning | Dragging a node across canvas coordinates verifies updated bounding box coordinates | ✅ Passed |
| 2 | Model Navigator: Add Application | Clicking "+ Application" adds a new application node onto the canvas | ✅ Passed |
| 3 | Model Navigator: Add Database | Clicking "+ Database" adds a new data store node onto the canvas | ✅ Passed |
| 4 | Inspector Quick Connect | Selecting node and submitting Quick Connect form creates a typed edge to target node | ✅ Passed |
| 5 | Inspector node deletion | Clicking "Delete Node" removes node and attached edges from the canvas | ✅ Passed |
| 6 | Diagram reset & reload | Resetting diagram clears canvas to empty state; clicking reference reload restores nodes | ✅ Passed |

### Suite 4: Visual Regression & Layout Assertions (`apps/web/e2e/visual-regression.spec.ts`)
| # | Test Case Description | Verified Behavior | Status |
|---|---|---|:---:|
| 1 | Studio dark slate-950 theme | Verifies dark slate canvas background, header height (56px), and control positioning | ✅ Passed |
| 2 | Login page card layout | Verifies centered login card geometry, branding logo, and input field styling | ✅ Passed |
| 3 | Inspector drawer geometry | Verifies fixed 384px (`w-96`) right-hand drawer width and sticky placement | ✅ Passed |
| 4 | Brand Icon catalog layout | Verifies modal header, search input, and responsive multi-column icon grid | ✅ Passed |
| 5 | Mobile responsive viewport | Verifies viewport resizing to 375x667 preserves header and renders mobile layout | ✅ Passed |

### Suite 5: Interactive Flows, Sequence Tracing & Playback Controls (`apps/web/e2e/flows-playback.spec.ts`)
| # | Test Case Description | Verified Behavior | Status |
|---|---|---|:---:|
| 1 | Workspace trace flows explorer | Lists trace flows with passing/draft status badges, tags, duration, and metrics counters | ✅ Passed |
| 2 | Instant search filtering | Filters flows by query ("Payment", "PCI-DSS", "Draft") and renders empty state fallback | ✅ Passed |
| 3 | Sequence diagram accordion | Expands step timeline, protocol badges (HTTPS, gRPC, TCP), and collapses on click | ✅ Passed |
| 4 | Studio FlowPlaybackToolbar mount | Clicking "Trace Flow" mounts toolbar with persona context and step description note | ✅ Passed |
| 5 | Step forward & step backward | Advances and decrements step indicator (1/4 -> 2/4 -> 3/4) and updates step note | ✅ Passed |
| 6 | Play/pause, speed & loop controls | Auto-advances steps, toggles speed multiplier (2.0x), restarts to step 1, and enables loop | ✅ Passed |
| 7 | Workspace to studio cross-link | Clicking "Interactive Studio" on flows explorer navigates to `/studio` canvas | ✅ Passed |

---

## 3. What is Left — Playwright E2E Implementation Backlog

The following suites represent upcoming areas to achieve 100% end-to-end browser coverage across DiagramHQ's 13 enterprise phases:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PLAYWRIGHT E2E ROADMAP                          │
├────────────────────────────────┬───────────────────┬───────────────────┤
│ SUITE                          │ ESTIMATED TESTS   │ STATUS            │
├────────────────────────────────┼───────────────────┼───────────────────┤
│ 1. Auth & Session Security     │ 8 tests           │ ✅ COMPLETED      │
│ 2. Canvas & C4 Navigation      │ 8 tests           │ ✅ COMPLETED      │
│ 3. Drag-Drop & Quick Connect   │ 6 tests           │ ✅ COMPLETED      │
│ 4. Visual Regression           │ 5 tests           │ ✅ COMPLETED      │
│ 5. Flows & Sequence Playback   │ 7 tests           │ ✅ COMPLETED      │
├────────────────────────────────┼───────────────────┼───────────────────┤
│ 6. Advanced Canvas & Layouts   │ ~6 tests          │ ⏳ BACKLOG (P1)   │
│ 7. Collaboration & Comments    │ ~6 tests          │ ⏳ BACKLOG (P2)   │
│ 8. Versioning & Visual Diff    │ ~5 tests          │ ⏳ BACKLOG (P2)   │
│ 9. Exports & Diagram Sharing   │ ~6 tests          │ ⏳ BACKLOG (P2)   │
│ 10. AI Architecture Copilot    │ ~5 tests          │ ⏳ BACKLOG (P3)   │
│ 11. Mobile Web Companion       │ ~5 tests          │ ⏳ BACKLOG (P3)   │
│ 12. CI & Cross-Browser Matrix  │ Matrix Config     │ ⏳ BACKLOG (P3)   │
└────────────────────────────────┴───────────────────┴───────────────────┘
```

### Area 6: Advanced Canvas & Layouts (`e2e/canvas-advanced.spec.ts`)
- [ ] Keyboard shortcut undo/redo (`Meta+Z`, `Meta+Shift+Z`) with node position history.
- [ ] Marquee box multi-selection (Shift + mouse drag box select).
- [ ] Alignment toolbar actions (Align Left, Align Center, Distribute Horizontal/Vertical).
- [ ] Auto-layout algorithms (Dagre Hierarchical, Grid, Radial, Force-directed) repositioning verification.

### Area 7: Collaboration, Comments & Presence (`e2e/collaboration.spec.ts`)
- [ ] Threaded comments: pinning comment pin to a canvas node.
- [ ] Comment replies, resolving comments, and comment count badges.
- [ ] Simulated multi-user cursor / presence avatars in studio header.
- [ ] Architecture change review approvals deck (Approve / Reject actions).

### Area 8: Versioning, Branching & Visual Diff (`e2e/versioning-diff.spec.ts`)
- [ ] Architecture version snapshot creation modal.
- [ ] Branch switcher (switching between `main` and feature branches).
- [ ] Visual diff view highlighting added nodes (green), removed nodes (red), and modified edges.

### Area 9: Exports & Diagram Sharing (`e2e/export-import.spec.ts`)
- [ ] Export to PNG and SVG download trigger and file delivery.
- [ ] Export to Mermaid and PlantUML modal content generation and copy-to-clipboard.
- [ ] Model-as-code JSON export and import validation.
- [ ] Share links generation (public view-only URLs).

### Area 10: AI Architecture Copilot (`e2e/ai-copilot.spec.ts`)
- [ ] AI Copilot side-drawer toggle and chat prompt input.
- [ ] Prompt-driven architecture generation (e.g., "Add a Redis cache before database").
- [ ] Architectural rule checks / linting recommendations via Copilot.

### Area 11: Mobile Web Companion (`e2e/mobile-companion.spec.ts`)
- [ ] Mobile viewport (375x667 / 390x844) dedicated companion navigation.
- [ ] Mobile bottom navigation bar tabs: Views, Search, Approvals, Comments, Copilot.
- [ ] Desktop-first advisory notice verification on mobile screen.

### Area 12: CI & Cross-Browser Matrix Integration
- [ ] GitHub Actions workflow `.github/workflows/e2e.yml` running Playwright on PRs.
- [ ] Cross-browser matrix configuration (Chromium, Firefox, WebKit / Mobile Safari).
- [ ] Automatic video, trace, and screenshot artifact uploading on test failure in CI.
