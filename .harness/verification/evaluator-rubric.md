# Evaluator Rubric

Score every feature before it can be marked `passed`. Independent (Evaluator role, `roles.md`), evidence-based, re-run rather than trusted. Threshold: **PASS requires >= 4.0/5.0 AND zero criteria scored 1.** Anything below is REVISE with a defect list.

Score each criterion 1–5, then average.

## Criteria

**1. Acceptance completeness** — Are ALL acceptance items in `ROADMAP.md` met, each with evidence?
- 5: every item met, evidence reproduced by the Evaluator.
- 3: all met but some evidence is thin or unverified.
- 1: an item is unmet or evidence is missing/assumed.

**2. Correctness** — Does it actually work, including edge cases and error paths?
- 5: happy path + edge cases + error handling verified.
- 3: happy path works, edges untested.
- 1: fails on a plausible input, or "works on my machine" only.

**3. Boundary & scope compliance** — Layer boundaries (`rules/layer-boundaries.md`) and scope guard (`rules/scope-guard.md`) respected?
- 5: check-architecture passes; nothing out of scope built.
- 3: minor smell, no hard violation.
- 1: a boundary violation, or out-of-scope work shipped.

**4. Modularity** — Was this a registration, not a core edit, where MODULES.md says it should be?
- 5: extension points used correctly; core untouched where it should be.
- 3: works but a missed chance to use a registry.
- 1: hard-coded into core what should have been modular.

**5. Evidence & handoff quality** — Can a cold agent reproduce the result and continue?
- 5: exact commands/artifacts recorded; state + handoff updated.
- 3: evidence present but handoff vague.
- 1: no reproducible evidence, or state not updated.

## Output format (the Evaluator writes this)
```
Feature: <id>
Scores: acceptance=_, correctness=_, boundaries=_, modularity=_, evidence=_  => avg _._
Verdict: PASS | REVISE
Defects (if REVISE):
  - [criterion] <specific defect> — <failing evidence> — <acceptance item it breaks>
```

## Notes
- Grade what you can reproduce, not what the Generator claims. Re-run the commands.
- A single criterion at 1 blocks PASS even if the average clears 4.0 — a missing acceptance item or a boundary violation is disqualifying.
- Record the scored block in `CHANGELOG.md` as part of the evidence.
