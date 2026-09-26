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
