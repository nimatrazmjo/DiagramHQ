# Blockers

Anything preventing progress. Never silently forget a blocker: open it here, and close it here with a resolution. Referenced from PROJECT_STATE.md "Active Blockers".

## Active
None.

## Resolved
None yet.

---

## Template
```
## BLOCK-NNN
Feature: F0xx — <name>
Status: OPEN | RESOLVED
Problem: <what is blocked and why>
Impact: <what it blocks downstream>
Attempted: <what was tried>
Next Action: <the concrete next step, or who/what is needed>
Created: YYYY-MM-DD
Resolution: <filled when RESOLVED>
```

## Open decisions (not blockers, but need a call during their feature)
- Auth provider (Auth.js vs Clerk vs WorkOS) — decide during F002; record as a DEC.
- Realtime transport (Yjs vs Liveblocks) — decide during F048; record as a DEC.
- Tenant isolation mechanism: F006's `TenantContext` hand-rolls a per-model wrapper (assert access, then query) rather than one cross-cutting enforcement (Prisma Client Extension via `$extends`, or Postgres RLS). Nothing stops a future model from being queried directly with zero isolation because no wrapper exists for it yet — and the escape hatch is already live, not hypothetical: `PrismaService` (the raw `PrismaClient`) is `@Global()`-exported from `DatabaseModule`, so any injected consumer can bypass `TenantContext` entirely by calling `.someModel.findMany()` on it directly. Revisit when F003 (Organizations) or F004 (Workspaces) add new Prisma models — decide then whether to keep extending the wrapper, restrict `PrismaService`'s export, or move to a structural enforcement mechanism; record as a DEC either way.
- `TenantContext.architecture.create` + setting `defaultVersionId` is two separate, non-transactional writes (create the architecture, later `update` it once a version exists — see `seed.ts`). A crash between them leaves `defaultVersionId` permanently `null` with no reconciliation path. Schema allows this today (nullable, `ON DELETE SET NULL`) so nothing breaks yet, but revisit if a future feature assumes every architecture has a default version — wrap the sequence in `$transaction` or add a composite `architecture.createWithDefaultVersion` then.
