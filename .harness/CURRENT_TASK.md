# Current Task

Feature ID: F006
Feature: Database foundation (Postgres + Prisma + migrations; the model schema, tenant-isolated)
Status: NOT STARTED
Phase: Phase 01 — Foundation

## Objective
Stand up PostgreSQL + Prisma with migrations for the core model schema, with tenant isolation from day one. This unblocks organizations/workspaces (F003/F004) and auth (F002).

## Prerequisite
F001 is COMPLETE on branch `feat/F001-project-architecture` (2 commits) but not yet merged. Merge it to `main` first (or branch F006 from it). F007 (API foundation) is also unblocked if you prefer that next.

## Steps
- [ ] Add Prisma to apps/api; datasource + client generation
- [ ] Schema: organizations, workspaces, architectures, versions (live + numbered), model_objects, model_connections, tags, technologies, views, view_objects (see .harness/architecture/DATA_MODEL.md)
- [ ] Migration applies cleanly to a fresh Postgres (docker compose has postgres)
- [ ] Mirror invariants in packages/domain as pure functions; api consumes domain (resolve the ESM/CJS interop noted for F018)
- [ ] Seed script: one org/workspace/architecture for local dev
- [ ] Tenant-isolation test: a cross-tenant read is denied

## Verification
- [ ] TypeScript: NOT RUN  · Lint: NOT RUN · Unit/Integration: NOT RUN · Build: NOT RUN

## Do Not
- Skip tenant isolation. · Build auth or model UI (later features). · Introduce a graph DB (ADR-0003: Postgres adjacency).

## Last Updated
2026-09-26
