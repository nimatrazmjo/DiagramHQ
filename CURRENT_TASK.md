# Current Task: F076 — OpenAPI import

**Status**: NOT STARTED

## Description
OpenAPI specification importer and API catalog population engine for DiagramHQ. Enables importing OpenAPI 3.0/3.1 (and Swagger 2.0) JSON or YAML specifications to extract REST API endpoints, operations (GET, POST, PUT, DELETE, PATCH), route parameters, request/response schemas, and automatically bind them to target architecture services in the API catalog:
- Parses OpenAPI 3.x / Swagger 2.x JSON or YAML specs.
- Extracts endpoint paths, HTTP methods, operation IDs, summary/descriptions, tags, parameters, and response schemas.
- Automatically links imported endpoints to a target service/application `ModelObject` and repository.
- Populates the discoverable API catalog with parsed endpoints.
- Strict Invariant Enforced: Importing an OpenAPI spec strictly populates API catalog entries and maintains deterministic links to the hosting architecture service.

Acceptance Criteria:
- Import an OpenAPI spec; endpoints populate the API catalog + link to a service.
- Test: import a spec -> endpoints in the catalog.

- Feature ID: F076
- Phase: 09 — Code Integrations
- Dependencies: F075, F122

## Next Steps
1. In `packages/domain/src/`, implement OpenAPI parser and API catalog domain logic (`openapi-import.ts` & `api-catalog.ts`):
   - Model `ApiEndpoint`, `ApiCatalog`, `OpenApiImportResult`.
   - Parse OpenAPI JSON/YAML specs, validate schemas, link to `serviceId` / `ObjectId`.
   - Unit tests in `packages/domain/src/openapi-import.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<OpenApiImportModal />` and `<ApiCatalogDrawer />` in `apps/web/components/canvas/openapi-import-panel.tsx`.
   - Integration specs in `apps/web/openapi-import.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
