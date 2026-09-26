# Loop State

Live state for the maker-checker loop. Overwrite the "Current" block each round; append finished features to History. A cold agent reads this to know which round it is on. The active feature also lives in `../CURRENT_TASK.md`; keep them consistent.

## Parameters (current feature)
- Feature: F001 — Project architecture
- REQUIRED_PASSES: 2
- MAX_ROUNDS: 6

## Current
- Round: 0 (not started — no build session has run)
- consecutivePasses: 0
- Last Maker change: none
- Last Checker verdict: none
- Standing defects: none
- Next action: Maker begins round 1 on F001 (see ../CURRENT_TASK.md)

## History
```
(feature id | rounds used | final verdict | date)
--- none yet ---
```

## Escalations
```
(date | feature | reason | resolution)
--- none yet ---
```
