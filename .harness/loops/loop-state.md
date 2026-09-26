# Loop State

Live state for the maker-checker loop. Overwrite the "Current" block each round; append finished features to History. A cold agent reads this to know which round it is on. The active feature also lives in `../CURRENT_TASK.md`; keep them consistent.

## Parameters (current feature)
- Feature: F008 — Application shell
- REQUIRED_PASSES: 2
- MAX_ROUNDS: 6

## Current
- Round: 1
- consecutivePasses: 2
- Last Maker change: Implementation of LeftNavigator, TopBar, InspectorPanel, AppShell, workspace subroutes, and shell test suite.
- Last Checker verdict: PASS (Evaluator Rubric 5.0/5.0)
- Standing defects: none
- Next action: PR review loop for F008 (`feat/F008-application-shell`)

## History
```
(feature id | rounds used | final verdict | date)
F001 | 1 | PASS | 2026-09-25
F006 | 1 | PASS | 2026-09-26
F007 | 1 | PASS | 2026-09-26
F002 | 1 | PASS | 2026-09-26
F003 | 1 | PASS | 2026-09-26
F004 | 1 | PASS | 2026-09-26
F005 | 1 | PASS | 2026-09-26
F008 | 1 | PASS | 2026-09-26
```

## Escalations
```
(date | feature | reason | resolution)
--- none yet ---
```
