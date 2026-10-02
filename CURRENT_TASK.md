# Current Task: F123 — Event catalog

**Status**: NOT STARTED

## Description
Event catalog and asynchronous messaging registry for DiagramHQ. Enables architectural discovery, documentation, and governance of all domain events, messages, and topics across the distributed system:
- Indexes asynchronous messages, event streams, and message topics (Kafka, RabbitMQ, SQS, SNS, EventBridge, NATS, Redis Streams).
- Captures producer services, consumer services, message schemas (JSON Schema, Avro, Protobuf), topic/channel names, delivery semantics, and emission frequency.
- Deterministically links producers and consumers to C4 model objects (`ObjectId`) and async connections (`ConnectionId`).
- Supports schema versioning and schema evolution/compatibility rules (backward, forward, full).
- Strict Invariant Enforced: Every event catalog entry is anchored to at least one producer/publisher architecture service and topic name.

Acceptance Criteria:
- Producer, consumers, schema, topic, frequency
- Test: create/browse event entries.

- Feature ID: F123
- Phase: 09 — Code Integrations
- Dependencies: F072, F075

## Next Steps
1. In `packages/domain/src/`, implement the Event Catalog domain module (`event-catalog.ts`):
   - Model `EventCatalogEntry`, `EventBrokerType`, `SchemaFormat`, `EventCatalogRegistry`, `EventCatalogQuery`.
   - Implement `createEventCatalogEntry`, `addEventCatalogEntry`, `linkEventProducerAndConsumer`, `browseEventCatalog`.
   - Unit tests in `packages/domain/src/event-catalog.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<EventCatalogExplorerModal />` and `<EventDetailDrawer />` in `apps/web/components/canvas/event-catalog-panel.tsx`.
   - Integration specs in `apps/web/event-catalog.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
