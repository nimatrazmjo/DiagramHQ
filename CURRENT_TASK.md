# Current Task: F124 — Database catalog

**Status**: NOT STARTED

## Description
Database catalog and data schema registry for DiagramHQ. Enables architectural discovery, documentation, and structural navigation of relational and NoSQL datastores across the enterprise:
- Full hierarchical structure: Database -> Schema -> Table / Collection -> Column / Field.
- Captures primary keys, foreign key relations, column data types, nullable flags, unique indices, and descriptions.
- Deterministically links every database to its hosting architecture datastore object (`ObjectId`) and source migrations/models repo location.
- Multi-engine support: PostgreSQL, MySQL, SQLite, MongoDB, Redis, DynamoDB.
- Multi-dimensional search and schema inspection.
- Strict Invariant Enforced: Every database catalog entry is anchored to an architecture model datastore (`ObjectId`) and defines its schema/table/column hierarchy.

Acceptance Criteria:
- Database -> schema -> table -> column
- Test: create/browse database entries.

- Feature ID: F124
- Phase: 09 — Code Integrations
- Dependencies: F072, F075

## Next Steps
1. In `packages/domain/src/`, implement the Database Catalog domain module (`database-catalog.ts`):
   - Model `DatabaseCatalogEntry`, `DatabaseSchema`, `DatabaseTable`, `DatabaseColumn`, `DatabaseEngine`, `ForeignKeyRelation`.
   - Implement `createDatabaseCatalogEntry`, `addTableToDatabase`, `browseDatabaseCatalog`, `findTablesByColumn`.
   - Unit tests in `packages/domain/src/database-catalog.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<DatabaseCatalogExplorerModal />` and `<TableSchemaDrawer />` in `apps/web/components/canvas/database-catalog-panel.tsx`.
   - Integration specs in `apps/web/database-catalog.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
