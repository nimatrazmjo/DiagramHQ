# Sprint Contract — F008 (Application Shell)

Written by the Planner before any code. It fixes "done" so the Generator cannot drift and the Evaluator has something objective to grade against.

## Feature
- Id: F008
- Title: Application shell
- Phase / slice: Phase 01 — Foundation

## Goal (one sentence)
A responsive Next.js application shell providing a left navigator (Overview, Systems, Apps, Data, Flows, Views, Decisions), a top bar (search, AI trigger, user session), a right inspector slot, and active subrouting that adapts seamlessly to narrow phone viewports.

## Acceptance -> checks
Map each acceptance item from `PHASE-01-FOUNDATION.md` to how it will be verified.
| Acceptance item | How verified (command / test / screenshot) |
|---|---|
| Left navigator (Overview, Systems, Apps, Data, Flows, Views, Decisions) | Automated component/unit tests verifying all 7 navigation items render with correct routes and active state |
| Top bar (search, AI, user) | Automated tests verifying search input, AI trigger button, and user session badge / sign out control |
| Right inspector slot | Automated tests verifying right inspector panel renders slotted content, collapsible toggles |
| Routing + responsive to phone width | Automated tests verifying responsive layout styles, mobile drawer/toggle holding at phone width (<768px), and subroute navigation |
| Test: e2e: shell renders; navigation routes; layout holds at narrow width | Unit & integration tests in `apps/web/shell.spec.ts` |

## Plan (steps)
1. In `apps/web`:
   - Create `components/shell/`:
     - `left-navigator.tsx`: Navigation items (Overview, Systems, Apps, Data, Flows, Views, Decisions) with active path highlighting and collapse/expand.
     - `top-bar.tsx`: Search input with keyboard shortcut cue, AI assistant trigger button, and user session info with sign-out.
     - `inspector-panel.tsx`: Right inspector slot with collapsible toggle and tabbed inspector placeholder (properties, details).
     - `app-shell.tsx`: Main layout grid combining TopBar, LeftNavigator, main canvas/content area, and RightInspector, with responsive CSS styles/drawers for phone viewports.
   - Add workspace studio route in `apps/web/app/workspace/[workspaceId]/`:
     - `layout.tsx`: Wraps children in `<AppShell>`.
     - `page.tsx`: Workspace default view (Overview).
     - Subroutes for `systems`, `apps`, `data`, `flows`, `views`, `decisions`.
   - Update `middleware.ts` to protect `/workspace` routes.
   - Update `apps/web/app/dashboard/workspace-list.tsx` to link each workspace directly to its studio route `/workspace/${ws.id}`.
2. Automated tests:
   - Comprehensive test suite in `apps/web/shell.spec.ts` testing:
     - Rendering of LeftNavigator with all 7 required navigation links.
     - TopBar with search, AI button, and user display.
     - Inspector slot visibility and collapse behavior.
     - Responsive behavior / mobile drawer toggle for narrow screens.
3. Verification:
   - Run `pnpm verify` (`typecheck`, `lint`, `test`, `check-architecture`) and `pnpm build`.

## In scope
- Next.js application shell components and layout in `apps/web`.
- 7 navigation items: Overview, Systems, Apps, Data, Flows, Views, Decisions.
- Top bar with search input, AI action trigger, and user account.
- Right inspector panel slot.
- Subroute navigation under `/workspace/[workspaceId]`.
- Responsive behavior for mobile / narrow viewports.

## Explicitly out of scope (parked)
- Interactive canvas rendering (React Flow nodes/edges) -> Phase 02 Canvas (F009).
- Pan/zoom gesture engine -> F010.
- Live AI streaming endpoint backend -> Phase 08 (AI Copilot).

## New dependencies
None. Pure React / Next.js and CSS modules / inline styles without breaking existing builds.

## Boundaries touched
- `apps/web`: `components/shell/*`, `app/workspace/*`, `middleware.ts`, `app/dashboard/workspace-list.tsx`, `shell.spec.ts`.

## Definition of done
- All acceptance checks green + evidence recorded.
- `check-architecture` passes.
- Evaluator score >= 4.0, no criterion at 1.
- State + handoff updated, committed on `feat/F008-application-shell`.

---
Signed off (Planner) before build: [x]
