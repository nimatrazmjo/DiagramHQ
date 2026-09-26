# Code Review — docs/pr-review-loop (harness tooling)

Branch: `docs/pr-review-loop` -> `main`. Not tied to a ROADMAP feature id (see the branch-naming exception this PR adds to `rules/conventions.md`).

## PR Review — round 1 (code-review skill, PR #2)
2 findings: `workflow-graph.md` claimed `prRound`/`prFindings`/`prVerdict` are already tracked in `loops/loop-state.md`/`loops/pr-review-loop.md`, but neither file has those fields; `rules/conventions.md`'s "one feature per branch" rule had no carve-out for harness-only work not tied to a ROADMAP feature id — exactly this PR's own branch.

Both fixed in `23b2e4f`: `workflow-graph.md`'s citation corrected to where these fields actually live today (prose in each round's section of `.harness/reviews/<FID>-review.md`); `conventions.md` now allows `docs/<slug>`/`chore/<slug>` for harness-only branches. Docs-only change; no build/test/lint impact. Pushed to PR #2 for round 2.

## PR Review — round 2 (code-review skill, PR #2)
4 findings: `pr-review-loop.md` still hardcoded `feat/<FID>` in its push/open-PR commands despite this same PR adding the `docs/<slug>` branch exception; `workflow-graph.md`/`graph.json` had no precedence between pr-review's "findings present" and "max PR rounds hit" edges, so hitting the round cap with findings still open was ambiguous; two findings (`scripts/agent-relay.sh`'s SIGTERM trap gap, `RUNTIME-CONTINUITY.md`'s new third-environment section) point at files that are a concurrent session's uncommitted working-tree edits, not part of this PR's diff at all.

2 of 4 addressed in `27de7af`: generalized `pr-review-loop.md` to `<branch>`/`<name>`; `escalate` now explicitly wins over `pr-fix` when `prRound >= MAX_PR_ROUNDS` even if findings are present. The other 2 are out of scope — `agent-relay.sh` and `RUNTIME-CONTINUITY.md` are not touched by any commit on this branch; the reviewer is seeing the live working tree, which still carries another session's uncommitted WIP. Pushed to PR #2 for round 3.
