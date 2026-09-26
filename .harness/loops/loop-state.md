# Loop State

Live state for the maker-checker loop. Overwrite the "Current" block each round; append finished features to History. A cold agent reads this to know which round it is on. The active feature also lives in `../CURRENT_TASK.md`; keep them consistent.

## Parameters (current feature)
- Feature: F009 — Infinite canvas
- REQUIRED_PASSES: 2
- MAX_ROUNDS: 6

## Current
- Round: 1
- consecutivePasses: 0
- Last Maker change: none (sprint contract established)
- Last Checker verdict: none
- Standing defects: none
- Next action: Decomposition & parallel worker dispatch for F009

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
F009 | 1 | PASS | 2026-09-26
F010 | 1 | PASS | 2026-09-26
F011 | 1 | PASS | 2026-09-26
```

## Escalations
```
(date | feature | reason | resolution)
--- none yet ---
```
