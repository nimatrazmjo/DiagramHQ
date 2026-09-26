# Goal Loop

The first step from manual driving to automation: hand the agent a goal with a hard finish line and let it iterate until done or a stop condition trips. Use this to complete a single feature (or slice) without babysitting.

## Contract
```
GOAL:        <one feature or slice, e.g. "F001 passes">
DONE WHEN:   every acceptance item in ROADMAP.md for this feature is met
             AND evidence recorded AND Evaluator PASS (>=4.0, no 1s)
VERIFY WITH: pnpm typecheck && pnpm lint && pnpm test && check-architecture
             + the feature's specific checks in its sprint contract
STOP AFTER:  15 turns  OR  90 minutes  OR  3 consecutive Evaluator REVISEs on the same defect
CONSTRAINTS: obey scope-guard.md; one feature only; no new deps without contract justification;
             never mark passed without evidence; never edit .harness rules to make a check pass
ON STOP:     update ROADMAP.md + CHANGELOG.md + PROJECT_STATE.md, commit, report why it stopped
```

## How it runs each turn
1. Read state (handoff, feature_list, sprint contract).
2. Advance the feature by the smallest demonstrable step.
3. Run VERIFY. Capture output as evidence.
4. Switch to Evaluator, score against the rubric.
5. PASS -> record evidence, mark passed, exit loop. REVISE -> log defect, continue.
6. Check stop conditions. If tripped, do ON STOP and halt for human review.

## Example goal
```
GOAL: F009 passes
DONE WHEN: objects+connections render on an infinite canvas via CanvasRenderer,
           minimap works, canvas holds no domain data in Zustand
VERIFY WITH: pnpm test (canvas + command layer) + screenshot of a rendered model
STOP AFTER: 12 turns or 60 min
```

## Notes
- The goal must be *verifiable*, not aspirational. "Make the canvas nice" is not a goal; "F009 acceptance met" is.
- The loop does not get to redefine DONE. That is fixed by the feature's acceptance + sprint contract.
- If it stops on turns/time rather than success, that is useful data, not failure — it means the feature was mis-sized or blocked. Note which in the handoff.
