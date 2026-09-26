# ADR-0003: PostgreSQL adjacency now, graph DB only if forced

- **Status:** accepted
- **Date:** 2026-09-25
- **Deciders:** DiagramHQ core

## Context
Architecture is a graph, so a graph database (Neo4j) is tempting. But it adds a second datastore, operational burden, and a new query language before we have proof the query patterns need it. Our graph queries (dependencies, impact, paths, drift diff) are bounded and cacheable.

## Decision
Represent the graph in **PostgreSQL**: objects in `model_objects` (with `parent_id` for nesting), edges in `model_connections` as an adjacency list. Traversals (dependency, impact, path) are recursive CTEs, results cached in Redis. One datastore for the whole model.

## Consequences
- Positive: one database, transactional consistency with the rest of the model, no new query language, easy backup/versioning.
- Positive: diffing and versioning are ordinary table operations.
- Negative: very deep/wide traversals are less ergonomic than Cypher and need care + caching.
- Revisit-when: recursive CTE latency on real customer graphs becomes a measured bottleneck, or a feature needs traversals Postgres cannot serve within budget. Then add a graph engine as a read-model projection, keeping Postgres authoritative.

## Alternatives considered
- Neo4j / graph DB from the start: premature; operational cost without evidence of need. Deferred.
- In-memory graph only: does not persist or version; rejected.
