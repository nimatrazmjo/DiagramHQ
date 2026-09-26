# DiagramHQ

Model-first architecture intelligence platform — an "Architecture OS" where the model (objects + connections) is the product and diagrams are projections of it, not the source of truth.

**Status: early scaffolding.** The engineering harness, product + architecture specs, and the phased roadmap (135 features across 13 phases) live in [`.harness/`](.harness/). A new contributor (human or agent) should start at [`.harness/PROJECT_STATE.md`](.harness/PROJECT_STATE.md).

## Stack
TypeScript monorepo (pnpm workspaces). Web: Next.js. API: NestJS. Data: PostgreSQL + Redis via Prisma. Containerized with Docker.

## Getting started
Commands are listed in [`.harness/CLAUDE.md`](.harness/CLAUDE.md) and are filled in as the app is scaffolded (feature F001).
