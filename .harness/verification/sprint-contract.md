# Sprint Contract — <feature id>

Written by the Planner before any code. It fixes "done" so the Generator cannot drift and the Evaluator has something objective to grade against. Copy this template per feature (or keep the active one here and archive past ones in `CHANGELOG.md`).

## Feature
- Id: <from ROADMAP.md>
- Title: <>
- Phase / slice: <>

## Goal (one sentence)
<what a user can do after this that they could not before>

## Acceptance -> checks
Map each acceptance item from `ROADMAP.md` to how it will be verified.
| Acceptance item | How verified (command / test / screenshot) |
|---|---|
| <item> | <check> |

## Plan (steps)
1. <>
2. <>

## In scope
- <>

## Explicitly out of scope (parked)
- <> (why: <phase / scope-guard>)

## New dependencies
- <package> — <one-line justification> (none if empty)

## Boundaries touched
- Layers: <which layers this changes>
- Registries: <which MODULES.md registries, if any>
- Risk of boundary violation: <where to watch>

## Risks / unknowns
- <>

## Definition of done
- All acceptance checks green + evidence recorded.
- check-architecture passes.
- Evaluator score >= 4.0, no criterion at 1.
- state + handoff updated, committed on `feat/<id>`.

---
Signed off (Planner) before build: [ ]
