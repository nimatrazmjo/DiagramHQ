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

## 2. Implemented & Verified Test Suites (72 Tests — 100% Passing)

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

### Suite 6: Advanced Canvas Interactions, Multi-Select & Auto-Layout (`apps/web/e2e/canvas-advanced.spec.ts`)
| # | Test Case Description | Verified Behavior | Status |
|---|---|---|:---:|
| 1 | Auto-layout engines catalog | Opens layout menu and renders registered engines (Grid, Radial, Force-Directed, Hierarchical) | ✅ Passed |
| 2 | Auto-layout coordinate recomputation | Applying Grid layout updates node coordinates across the graph and enables Undo | ✅ Passed |
| 3 | Undo & Redo buttons | Reverts graph coordinates on Undo and re-applies layout on Redo | ✅ Passed |
| 4 | Undo / Redo keyboard shortcuts | Executes command undo (`Meta+Z`) and redo (`Meta+Shift+Z`) via key combinations | ✅ Passed |
| 5 | Box-select marquee toggle | Toggles marquee box select mode between default and active (`✦ BOX SELECT`) | ✅ Passed |
| 6 | Shift+Click multi-selection & alignment | Selects multiple nodes, mounts Alignment Toolbar (Align Left, Snap-to-Grid), and clears | ✅ Passed |
| 7 | Focus mode & Minimap tools | Toggles element isolation via Focus Mode and minimap visibility in DOM | ✅ Passed |

### Suite 7: Collaboration, Threaded Comments & Architecture Reviews (`apps/web/e2e/collaboration.spec.ts`)
| # | Test Case Description | Verified Behavior | Status |
|---|---|---|:---:|
| 1 | Live presence & peer avatars | Displays active pulse dot, peer counter (3 peers), and collaborator avatar badges with tooltips | ✅ Passed |
| 2 | Comments drawer & Open/All filters | Toggles comments drawer, checks unresolved badge, and filters between Open and All threads | ✅ Passed |
| 3 | New architectural comment thread | Composes and posts a new root comment thread with author stamp and auto-cleared input | ✅ Passed |
| 4 | Threaded comment replies | Posts an inline reply to an existing comment thread, updating thread hierarchy | ✅ Passed |
| 5 | Resolving & reopening comment threads | Resolves an open comment thread, hides it from Open filter, and re-opens from All filter | ✅ Passed |
| 6 | Architecture Review PR modal | Opens PR #14 modal, reviews visual diff and risk assessment, and submits approval | ✅ Passed |

### Suite 8: Architecture Versioning, Branching, Snapshots & Visual Diff (`apps/web/e2e/versioning-diff.spec.ts`)
| # | Test Case Description | Verified Behavior | Status |
|---|---|---|:---:|
| 1 | Active branch badge & modal trigger | Renders active branch `main (default)`; clicking opens `BranchSelector` modal | ✅ Passed |
| 2 | Active branch switching | Selecting `feat/auth-v2` updates active badge to `feat/auth-v2 (feature)` and closes modal | ✅ Passed |
| 3 | Branch creation & duplicate validation | Validates duplicate branch name (`main`); creates new branch `feat/payment-gateway` | ✅ Passed |
| 4 | Version timeline drawer | Toggles `version-history-drawer`, renders live editable version and immutable releases | ✅ Passed |
| 5 | Full architecture snapshot modal | Opens `SnapshotDetailsModal` displaying 6-dimension metrics (objects, connections, views, flows, docs, metadata) | ✅ Passed |
| 6 | Visual architecture diff viewer | Toggles `VisualDiffViewer`, tests change filters (`All`, `Added`, `Modified`), verifies added billing entity | ✅ Passed |

### Suite 9: Diagram Exports, Code Generation & Public Sharing (`apps/web/e2e/export-import.spec.ts`)
| # | Test Case Description | Verified Behavior | Status |
|---|---|---|:---:|
| 1 | Multi-format export modal | Seamlessly switches formats (`PNG`, `SVG`, `PDF`, `JSON`), updating preview panes and extensions | ✅ Passed |
| 2 | Export customization settings | Configures resolution scale (`4x`), canvas theme (`transparent`), custom title override, and metadata toggles | ✅ Passed |
| 3 | Mermaid diagram-as-code | Generates live flowchart & sequence syntax, tests script copying, and navigates import tab | ✅ Passed |
| 4 | PlantUML diagram-as-code | Generates C4 syntax (`@startuml ... @enduml`), verifies syntax, and copies to clipboard | ✅ Passed |
| 5 | Public read-only share link | Generates tokenized view URL (`/share?token=...`), sets camera/selection flags, and custom expiration (`7d`) | ✅ Passed |
| 6 | Canvas reset & restore baseline | Clears canvas via `🧹 Reset` confirmation dialog, displays empty state, and restores baseline | ✅ Passed |

### Suite 10: AI Architecture Copilot, Generation, Review & ADRs (`apps/web/e2e/ai-copilot.spec.ts`)
| # | Test Case Description | Verified Behavior | Status |
|---|---|---|:---:|
| 1 | AI Copilot drawer & grounded context | Toggles Copilot drawer, verifies welcome message, grounded context statistics, and pre-seeded suggestions | ✅ Passed |
| 2 | Grounded Q&A with citations | Submits natural query ("What depends on Web Application?"), receives answer with verified entity citation badges | ✅ Passed |
| 3 | AI architecture generation modal | Submits prompt ("Multi-tenant SaaS..."), inspects proposed proposal card, metrics chips, and breakdown tabs | ✅ Passed |
| 4 | Applying AI proposal to canvas | Generates event-driven pipeline proposal and applies to canvas; verifies canvas node count increases in React Flow | ✅ Passed |
| 5 | AI Architecture Review agent | Runs pre-merge governance checks; verifies checklist rules (circular deps, ownership, DR, PII) and re-run trigger | ✅ Passed |
| 6 | AI-drafted ADR review & commit | Opens drafted Architecture Decision Record, customizes title/context/decision, and commits accepted ADR | ✅ Passed |

### Suite 11: Mobile Web Companion & Responsive Governance (`apps/web/e2e/mobile-companion.spec.ts`)
| # | Test Case Description | Verified Behavior | Status |
|---|---|---|:---:|
| 1 | Mobile branding & advisory ribbon | Renders DiagramHQ Mobile header (F134) and Desktop-First Canvas invariant advisory on 375x667 viewport | ✅ Passed |
| 2 | Architecture Views exploration | Inspects C4 level cards (Context, Container, Component) and toggles active inspection projection | ✅ Passed |
| 3 | Mobile catalog instant search | Filters components (Vault), C4 views, and ADR decisions with instant tag badges and empty state handling | ✅ Passed |
| 4 | Change review & 1-tap approval | Reviews pending pull request (#104), executes 1-tap mobile approval, and verifies approved state and toast | ✅ Passed |
| 5 | Review commenting stream | Posts new review comment targeted to specific components; verifies real-time stream addition and author avatar | ✅ Passed |
| 6 | Mobile AI Copilot Q&A | Submits architectural query, receives 94% confidence answer card with actionable suggestion badges | ✅ Passed |
| 7 | Studio to Mobile Companion link | Navigates from desktop Studio header via dedicated mobile link to `/mobile` companion view | ✅ Passed |

---

## 3. Playwright E2E Implementation Roadmap (100% Complete)

All 12 planned core testing suites and CI integrations have been implemented, verified, and merged into `main`:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PLAYWRIGHT E2E ROADMAP                          │
├────────────────────────────────┬───────────────────┬───────────────────┤
│ SUITE                          │ TESTS COMPLETED   │ STATUS            │
├────────────────────────────────┼───────────────────┼───────────────────┤
│ 1. Auth & Session Security     │ 8 tests           │ ✅ COMPLETED      │
│ 2. Canvas & C4 Navigation      │ 8 tests           │ ✅ COMPLETED      │
│ 3. Drag-Drop & Quick Connect   │ 6 tests           │ ✅ COMPLETED      │
│ 4. Visual Regression           │ 5 tests           │ ✅ COMPLETED      │
│ 5. Flows & Sequence Playback   │ 7 tests           │ ✅ COMPLETED      │
│ 6. Advanced Canvas & Layouts   │ 7 tests           │ ✅ COMPLETED      │
│ 7. Collaboration & Reviews     │ 6 tests           │ ✅ COMPLETED      │
│ 8. Versioning & Visual Diff    │ 6 tests           │ ✅ COMPLETED      │
│ 9. Exports & Diagram Sharing   │ 6 tests           │ ✅ COMPLETED      │
│ 10. AI Architecture Copilot    │ 6 tests           │ ✅ COMPLETED      │
│ 11. Mobile Web Companion       │ 7 tests           │ ✅ COMPLETED      │
│ 12. CI & Cross-Browser Matrix  │ 5 Projects Matrix │ ✅ COMPLETED      │
├────────────────────────────────┼───────────────────┼───────────────────┤
│ TOTAL E2E TEST COVERAGE        │ 72 Tests (100%)   │ 🚀 PRODUCTION-READY│
└────────────────────────────────┴───────────────────┴───────────────────┘
```

### Area 11: Mobile Web Companion (`e2e/mobile-companion.spec.ts`)
- [x] Mobile viewport (375x667 / 390x844) dedicated companion navigation.
- [x] Mobile bottom navigation bar tabs: Views, Search, Approvals, Comments, Copilot.
- [x] Desktop-first advisory notice verification on mobile screen.
- [x] 1-tap mobile change review and approval workflow with feedback toasts.
- [x] Mobile architecture review commenting and AI Copilot inquiries.

### Area 12: CI & Cross-Browser Matrix Integration (`.github/workflows/e2e.yml`)
- [x] GitHub Actions workflow `.github/workflows/e2e.yml` running Playwright on pushes and PRs to `main`.
- [x] Cross-browser matrix configuration (`chromium`, `firefox`, `webkit`, `Mobile Chrome`, `Mobile Safari`).
- [x] Production web server build and startup (`pnpm build` + `pnpm start`) in CI environments.
- [x] Automatic artifact uploading for test reports, traces, and video recordings on completion (`actions/upload-artifact@v4`).
