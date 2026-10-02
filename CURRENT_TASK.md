# Current Task: F122 — API catalog

**Status**: NOT STARTED

## Description
Centralized, discoverable API catalog and interface registry for DiagramHQ. Enables software architects and engineers to discover, query, browse, and govern all REST, GraphQL, and gRPC APIs across the enterprise architecture:
- Indexes endpoints by path, HTTP method, version, authentication scheme, and deprecation status.
- Deterministically links every API endpoint to its parent architecture service/component and source code repository coordinates.
- Provides multi-dimensional filtering by service, protocol, tags, domain ownership, and deprecation state.
- Supports browsing request parameters, query schemas, and response status codes.
- Strict Invariant Enforced: Every API catalog entry is deterministically anchored to an architecture model object (`ObjectId`) and source code location.

Acceptance Criteria:
- Endpoints linked to service + repo; browsable.
- Test: create/browse API entries linked to objects.

- Feature ID: F122
- Phase: 09 — Code Integrations
- Dependencies: F075, F076

## Next Steps
1. In `packages/domain/src/`, expand and refine the API catalog domain logic (`api-catalog.ts`):
   - Model `CatalogApiEntry`, `ApiCatalogFilter`, `ApiCatalogRegistry`, `ApiProtocol` ('rest' | 'graphql' | 'grpc').
   - Implement `createApiCatalogEntry`, `queryApiCatalog`, `linkApiEntryToModelObject`, `deprecateApiEntry`.
   - Unit tests in `packages/domain/src/api-catalog.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<ApiCatalogExplorerModal />` and `<ApiEndpointDetailDrawer />` in `apps/web/components/canvas/api-catalog-panel.tsx`.
   - Integration specs in `apps/web/api-catalog.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
