# Project State

> **MASTER FILE. Every Harness session reads this FIRST, before doing anything.**
> Then: CURRENT_TASK.md → ROADMAP.md → the active phase file → DECISIONS.md + BLOCKERS.md → then inspect the actual code (the codebase is the source of truth for what EXISTS; these files are the source of truth for intended state + history). If they disagree, inspect, correct these files, and note the discrepancy in CHANGELOG.md.

## Product
Name: DiagramHQ
Description: Model-first architecture intelligence platform (a "better than IcePanel" Architecture OS). The model — objects + connections — is the product; diagrams are projections of it. Full spec: `product/PRODUCT.md`. CLI: `dhq`.

## Current Phase
Phase: 08
Phase Name: AI Copilot
Status: IN PROGRESS

## Current Feature
Feature ID: F063
Feature Name: Architecture generation
Status: NOT STARTED

## Overall Progress
Total Features: 135
Completed: 68
In Progress: 0
Blocked: 0
Not Started: 67
Progress: 50.4%
(Recompute from ROADMAP.md on every status change; counter contract in `scripts/SCRIPTS.md`.)

## Last Completed Work
F062 — AI chat. Pure AI Architecture Copilot grounded Q&A engine and persistent UI panel for DiagramHQ (starting Phase 08 — AI Copilot!). The Copilot operates with full grounding over the live architecture model graph (objects, connections, flows, ADRs). Provides dedicated dependency rationale resolution (`resolveDependencyRationale`) to explain direct and transitive multi-hop dependencies ("why does X depend on Y?"), discovering graph paths via breadth-first search and always citing concrete `ObjectId` and `ConnectionId` identifiers. Added accessible canvas UI components `<CitationBadge />` and `<AICopilotPanel />`, 4 domain unit tests, and 3 web integration tests.

Prior: F119 — Roadmap items. Pure Architecture Roadmap Items engine and quarterly timeline UI for DiagramHQ (completing Phase 07 — Versioning!). Enables architecture and engineering teams to organize architectural evolutions into chronological quarters (e.g., `2026-Q1`, `2026-Q2`), track lifecycle statuses (`planned`, `in_progress`, `completed`, `deferred`), assign priorities and team ownership, and directly link roadmap milestones to concrete architecture change sets and pull requests. Provides quarterly grouping, progress tracking calculations, and accessible canvas UI components `<RoadmapItemCard />` and `<RoadmapTimelinePanel />`, 4 domain unit tests, and 3 web integration tests. Completes Phase 07 — Versioning (10/10 features)!

Prior: F118 — Scenarios. Pure what-if architectural scenarios exploration engine and canvas comparison modal for DiagramHQ. Enables architects and engineering teams to hypothesize and simulate major structural variations (e.g., cloud provider migrations, microservice splits, database sharding, or edge caching) without mutating, polluting, or committing to the real architecture model or main branch. Supports simulated operational metrics (cost delta percentage, latency delta in milliseconds, risk scoring), detailed delta categorization (added, modified, removed objects and connections), and seamless promotion of proven scenarios into full architecture branches ready for review and pull request. Added UI components `<ScenarioBadge />` and `<ScenarioComparisonModal />`, 3 domain unit tests, and 3 web integration tests.

Prior: F117 — ADR system. Pure Architecture Decision Record (ADR) system for DiagramHQ. Supports structured architectural decision tracking with title, lifecycle status (`draft`, `proposed`, `accepted`, `rejected`, `superseded`, `deprecated`), context, decision, consequences, and alternatives considered. Provides polymorphic entity attachment to architecture objects, connections, changes, and version milestones. Implemented query helpers `getADRHistoryForObject`, `getADRsForVersion`, and `getADRsForConnection`. Added accessible, reactive UI components `<ADRBadge />` and `<ADRHistoryDrawer />`, 4 domain unit tests, and 3 web integration tests.

Prior: F061 — Merge. Pure 3-way architecture branch merge engine and conflict detection system. Compares base ancestor, source feature branch, and target branch (main). Accurately detects merge conflicts on identical object IDs (concurrent modifications on the same object ID, concurrent additions with differing attributes, or modify/delete collisions). Provides automated and manual resolution strategies ('theirs', 'ours', per-entity manual selection). Upon clean merge or conflict resolution, updates main's architecture state while transitioning the source branch status to `'merged'`. Added UI components `<ConflictResolutionBanner />` and `<MergeBranchModal />`, 2 domain unit tests, and 3 web integration tests.

Prior: F060 — Pull requests. Pure architecture pull request review engine and canvas UI. Supports titled pull requests linking source to target branch, embedded visual diff (added, modified, removed, moved objects & connections with semantic colors), downstream affected systems impact analysis, automatic risk scoring (low, medium, high, critical) with human-readable rationale, and full review workflows (commenting, reviewing, approving, and rejecting). Added UI components `<PullRequestBadge />` and `<PullRequestModal />`, 3 domain unit tests, and 3 web integration tests.

Prior: F059 — Architecture changes. Pure architecture change sets and impact analysis engine. Computes direct change lists (added, modified, removed objects and connections) alongside full downstream impact analysis: affected architecture objects (direct changes, connection endpoints, and connected dependencies), affected flows (flows traversing affected connections or objects), and affected stakeholder teams (teams owning affected objects via ownership records or metadata). Added UI components `<ImpactAnalysisBadge />` and `<ChangeSetSummary />`, 2 domain unit tests, and 3 web integration tests.

Prior: F058 — Architecture diff. Pure visual architecture diff engine comparing two architecture versions or branches. Categorizes all entity variations into semantic buckets: added (new entities in target), modified (attributes or connections changed), removed (deleted in target), moved (position changed without attribute modifications), and unchanged. Maps each category to standardized semantic colors (emerald for added, amber for modified, rose for removed, purple for moved). Added UI components `<DiffLegend />` and `<VisualDiffViewer />`, 3 domain unit tests, and 3 web integration tests.

Prior: F057 — Branches. Pure architecture branching engine supporting branch creation off main or parent branches. Carries all 6 architecture dimensions plus ADRs and threaded comments (`objects`, `connections`, `views`, `flows`, `metadata`, `adrs`, `comments`). Deep cloning guarantees complete memory and state isolation such that additions, removals, or edits on child branches never pollute or mutate main. Added UI components `<BranchBadge />` and `<BranchSelector />`, 4 domain unit tests, and 3 web integration tests.

Prior: F056 — Architecture snapshots. Full-state architecture snapshot capture across all 6 model dimensions: objects, connections, views, flows (with steps), metadata, and documentation (markdown pages) with complete restoration back to active architecture state (`captureFullArchitectureSnapshot`, `restoreFullArchitectureSnapshot`, and `diffArchitectureStates`). Added `<SnapshotDetailsModal />` and `<SnapshotDiffModal />` UI components, 4 domain unit tests, and 3 web integration tests.

Prior: F055 — Version history. Pure architecture version history and snapshot immutability engine. Supports live editable architecture versions (`LiveArchitectureVersion`) and strictly immutable numbered snapshots (`NumberedSnapshot`, `SnapshotId`). Guarantees that snapshots stay completely immutable and frozen while live edits proceed, with strict error throwing (`SnapshotImmutableError`) on mutation attempts. Added UI components `<SnapshotBadge />` and `<VersionTimeline />`, 6 domain unit tests, and 4 web integration tests.

Prior: F116 — Notifications. Multi-channel notification pipeline (in-app, email, Slack, Microsoft Teams) for model changes, comments, mentions, and version review requests. Added pure notifications domain engine (`createNotification`, `dispatchNotification`, `markNotificationRead`, `markAllNotificationsRead`, `filterNotifications`, `countUnreadNotifications`, `StubNotificationTransport`), `<NotificationBadge />`, `<NotificationItem />`, and `<NotificationCenter />` web UI components, 5 domain unit tests, and 5 web integration tests. Completes Phase 06 — Collaboration!

Prior: F054 — Team management. Pure team management and object ownership domain logic. Supports team lifecycle (creation, slug derivation, member management, team leads), object ownership attachment (primary owner team, backup owner team, contact leads), and filtering architecture models/objects by owner team ("show everything owned by X"). Added UI components `<TeamBadge />` and `<OwnershipFilterSelector />`, 6 domain unit tests, and 4 web integration tests.

Prior: F053 — Permissions. Full role catalog (Owner, Admin, Editor, Viewer, Guest) with permission evaluator, strict assertions, per-workspace overrides, and per-diagram overrides. Added pure domain permissions engine (`canPerform`, `assertPermission`, `getAllowedActions`, `PermissionDeniedError`), `<RoleBadge />` and `<PermissionGuard />` web components, 7 domain unit tests, and 5 web integration tests.

Prior: F052 — Share links. Read-only share links preserving viewer position, zoom, and active selection without requiring an account. Added pure share-links token engine (`createShareLink`, `encodeShareLinkToken`, `decodeShareLinkToken`, `verifyShareLink`, `resolveAnonymousViewState`, `generateShareLinkUrl`), `'shl'` prefix to `ids.ts`, `<ShareLinkModal />` and `<ReadOnlyBanner />` to web UI, 6 domain unit tests, and 4 web integration tests.

Prior: F051 — Mentions. @mentions in comments and descriptions with notifications, and converting comments into tracked architecture tasks. Added pure mention parser and task conversion engine (`extractMentionHandles`, `generateMentionNotifications`, `convertCommentToTask`, `updateTaskStatus`, `reassignTask`), `'tsk'` and `'ntf'` prefixes to `ids.ts`, `<MentionText />` and `<TaskCard />` to web UI, 5 domain unit tests, and 4 web integration tests.

Prior: F050 — Comments. Threaded comments across architectural entities (objects, connections, diagrams, flows, docs, changes) with reply, resolve, and re-open workflows. Added pure comments domain engine (`createComment`, `replyToComment`, `resolveComment`, `reopenComment`, `updateCommentContent`, `filterComments`, `buildCommentThreads`, `countUnresolvedCommentsByTarget`), `'cmt'` prefix to `ids.ts`, `<CommentsPanel />` and `<CommentPinBadge />` to web UI, 7 domain unit tests, and 5 web integration tests.

Prior: F049 — Presence. Cursors, selection, current-object focus, and presence indicators. Added pure presence state machine (`UserPresence`, `PresenceRoomState`, `createPresenceRoom`, `upsertPeerPresence`, `updatePeerCursor`, `updatePeerSelection`, `pruneInactivePeers`, `getRemoteCursorsForView`, `getRemoteSelections`, `getRemoteActiveObjects`) to domain, `<PresenceCursors />` and `<PresenceIndicators />` to web canvas, 8 domain unit tests, and 6 web integration tests.

Prior: F048 — Real-time collaboration. Multi-user concurrent editing with pure deterministic conflict resolution (CRDT / LWW Lamport clocks). Added `CollabSession`, `CollabOperation`, `compareLamport`, `applyLocalOperation`, `applyRemoteOperation`, and `syncSessions` to domain with cascade deletion handling, `<CollaborationBanner />` live pulse and peer avatars to web UI, 9 domain unit tests, and 5 web integration tests.

Prior: F047 — API flows. Flow type for API requests and exporter to Mermaid and PlantUML sequence diagrams (completing Phase 05 — Flows!). Added `createApiFlow` factory, `annotateApiFlowStep` annotator, `exportFlowToMermaidSequence` exporter, `exportFlowToPlantUMLSequence` exporter, `getApiFlowPlaybackStepInfo` runtime helper, `<ApiFlowOverlay />` component, 9 domain unit tests, and 6 web integration tests.

Prior: F046 — Data flows. Data-flow flow type with schema/payload attribution feeding data lineage (F091). Added `createDataFlow` factory, `annotateDataFlowStep` step annotator, `extractDataLineage` lineage tracer with external egress exit identification, `getDataFlowPlaybackStepInfo` runtime helper, `<DataFlowOverlay />` component, 5 domain unit tests, and 5 web integration tests.

Prior: F045 — User journeys. User journey flow type with actor/persona step context and sequence playback. Added `createUserJourneyFlow` factory with model actor object validation, `annotateUserJourneyStep` step annotation, `FlowPlaybackState` support, `getUserJourneyPlaybackStepInfo`, user journey canvas overlay `<UserJourneyOverlay />`, toolbar context chips, 5 domain unit tests, and 4 web integration tests.

Prior: F044 — Flow playback. Animated step-by-step playback through sequence flows. Pure domain state machine in `flow-playback.ts` (8 unit tests), canvas playback toolbar `<FlowPlaybackToolbar />` with play/pause/step/restart/speed/loop controls, and web integration suite in `flow-playback.spec.ts` (4 tests).

Prior: F043 — Flow visualization. Highlight flow path over existing architecture. Added `projectFlowToCanvas()` domain projection (4 unit tests), `<FlowBadges />` UI component, node dimming/highlighting integration across all node types, animated edge glow and step pill badges in `icepanel-edge.tsx`, and web integration suite in `flow-visualization.spec.ts` (4 tests).

Prior: F042 — Flow steps. Ordered, annotated steps. Added `addFlowStep()`, `removeFlowStep()`, `annotateFlowStep()`, `reorderFlowStepsByIndex()`, and `reorderFlowStepList()` to domain (5 tests), added step endpoints and unit tests to API (5 tests), and added web integration spec in `flow-steps.spec.ts` (4 tests).

Prior: F041 — Flow model. Ordered sequence of connections. Added `FlowStep` and `FlowWithSteps` domain interfaces, pure domain validation & creation functions in `flow.ts` (8 unit tests), NestJS `FlowsModule` with endpoints and unit tests (8 tests), and web integration spec in `flow-model.spec.ts` (4 tests).

Prior: F135 — Architecture templates. Starter templates (SaaS, e-commerce, fintech, healthcare, microservices, monolith, serverless, event-driven, data-platform, Kubernetes, AWS, Azure, GCP). Pure domain instantiation, UI template picker card grid, 19 integration tests.

Prior: F115 — Persona modes. Added `projectPersonaViewToCanvas` domain projection, `<PersonaBadges />` UI component, and `persona-modes.spec.ts` integration spec covering all 8 persona modes.

Prior: F114 — Technology catalog. Added Technology model properties, technology view projection, UI badges, and view filter lifecycle evaluation.

Prior: F040 — Ownership views. Added `projectOwnershipViewToCanvas` projection and `<OwnershipBadges />` component to color objects by team/owner.

Prior: F039 — Data views. Added `projectDataViewToCanvas` projection and `<DataBadges />` component to highlight data classification and animate data movement flows.

Prior: F038 — Security views. Added projection wrappers and custom badge components for trust boundaries, endpoints, auth, compliance, secrets, and encryption.

Prior: F037 — Saved views. Added `isStarred` property to views, with `PATCH /views/:viewId` endpoint. Validated by 2 new e2e tests in `saved-views.e2e.spec.ts`.

## Current Work
F048 — Real-time collaboration. Multi-user concurrent editing with deterministic conflict resolution (CRDT / state sync).

## Next Task
F048 — Real-time collaboration. Multi-user concurrent editing with deterministic conflict resolution (CRDT / state sync).

## Last Verified
F047 @ feat/F047-api-flows — typecheck / lint / tests (204 domain + 337 web + 270 api = 811 total) / check-architecture / pnpm build all green.

## Current Git Commit
Working tree: on branch `feat/F047-api-flows`.



## Important Notes
- Model-first is non-negotiable (DEC-001 / ADR-0001). Diagrams never store objects.
- Build one feature at a time; phases are gated (finish + test a phase before the next). See ROADMAP.md phase order.
- No feature is COMPLETE without recorded evidence (CHANGELOG.md) and an Evaluator pass (`verification/`).
- Statuses are exactly: NOT STARTED, IN PROGRESS, BLOCKED, IN REVIEW, COMPLETE, DEPRECATED.

## Active Blockers
None. See BLOCKERS.md.

## Architecture Status
NOT STARTED. Target layers + boundaries defined in `architecture/ARCHITECTURE.md` and `rules/layer-boundaries.md`.

## Database Status
Foundation COMPLETE (F006, pending PR #1 merge). Postgres + Prisma schema matching `architecture/DATA_MODEL.md`, tenant-isolated via `TenantContext` (`apps/api/src/database/tenant.context.ts`), model_objects + model_connections adjacency (ADR-0003).

## API Status
Edge foundation COMPLETE (F007, pending its own PR merge): global validation, typed error envelope, `/health` wired to Postgres via `PrismaService`. Domain CRUD endpoints land in F003/F004/F018; auth guards in F002.

## Frontend Status
Scaffolded (Next.js 14 standalone shell). React Flow canvas in Phase 02. Tailwind/shadcn deferred to the UI phase.

## Backend Status
NOT STARTED. NestJS + Prisma + Redis. Foundation in Phase 01.

## Testing Status
Vitest wired; 31 tests passing (15 domain, 16 api — including a real HTTP-level NestJS integration suite via `@nestjs/testing` + `supertest`, `apps/api/src/app.e2e.spec.ts`). GitHub Actions CI runs lint/build/typecheck/test/check-architecture (see `.github/workflows/ci.yml`).

## Integration Status
NOT STARTED. Code integrations Phase 09; infrastructure Phase 10. None connected.
