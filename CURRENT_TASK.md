# Current Task: F127 — SDK

**Status**: NOT STARTED

## Description
Typed TypeScript client SDK for DiagramHQ's REST and Model intelligence APIs:
- Provides strongly-typed client abstractions over DiagramHQ endpoints:
  - Workspaces, Organizations, and Members
  - Architectures and Versions (branching, commits, merges)
  - Model Objects and Connections (CRUD with metadata, positioning, tags, and technologies)
  - Views and Projections (C4 levels 1-4, filter criteria, layout configs)
  - Flows, Execution Steps, and Simulation Playback
  - Catalogs: API catalog, Event catalog, Database catalog
  - Model-as-Code serialization and sync
  - Webhooks and subscriptions
- Client features: typed error hierarchies (`DiagramHQApiError`, `AuthenticationError`, `NotFoundError`, `InvariantError`), retry configuration with exponential backoff, request timeout guards, and configurable authentication headers (`Bearer <token>`).
- Acceptance test: SDK CRUD round-trip against a test server.

Acceptance Criteria:
- Typed TS SDK over the REST API (Python/Go/Java/C# later)
- Test: SDK CRUD round-trip against a test server.

- Feature ID: F127
- Phase: 09 — Code Integrations
- Dependencies: F007, F075, F125, F126

## Next Steps
1. In `packages/domain/src/`, implement the TypeScript Client SDK module (`sdk.ts`):
   - Model `DiagramHQClient`, `DiagramHQClientConfig`, `ApiClientTransport`, `SdkHttpResponse`.
   - Implement typed resource clients: `objects`, `connections`, `architectures`, `views`, `flows`, `catalogs`, `webhooks`.
   - Unit tests in `packages/domain/src/sdk.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<SdkCodeSnippetModal />` in `apps/web/components/canvas/sdk-panel.tsx`.
   - Integration specs in `apps/web/sdk.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
