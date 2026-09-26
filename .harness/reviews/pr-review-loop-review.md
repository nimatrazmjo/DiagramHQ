# Code Review — docs/pr-review-loop (harness tooling)

Branch: `docs/pr-review-loop` -> `main`. Not tied to a ROADMAP feature id (see the branch-naming exception this PR adds to `rules/conventions.md`).

## PR Review — round 1 (code-review skill, PR #2)
2 findings: `workflow-graph.md` claimed `prRound`/`prFindings`/`prVerdict` are already tracked in `loops/loop-state.md`/`loops/pr-review-loop.md`, but neither file has those fields; `rules/conventions.md`'s "one feature per branch" rule had no carve-out for harness-only work not tied to a ROADMAP feature id — exactly this PR's own branch.

Both fixed in `23b2e4f`: `workflow-graph.md`'s citation corrected to where these fields actually live today (prose in each round's section of `.harness/reviews/<FID>-review.md`); `conventions.md` now allows `docs/<slug>`/`chore/<slug>` for harness-only branches. Docs-only change; no build/test/lint impact. Pushed to PR #2 for round 2.

## PR Review — round 2 (code-review skill, PR #2)
4 findings: `pr-review-loop.md` still hardcoded `feat/<FID>` in its push/open-PR commands despite this same PR adding the `docs/<slug>` branch exception; `workflow-graph.md`/`graph.json` had no precedence between pr-review's "findings present" and "max PR rounds hit" edges, so hitting the round cap with findings still open was ambiguous; two findings (`scripts/agent-relay.sh`'s SIGTERM trap gap, `RUNTIME-CONTINUITY.md`'s new third-environment section) point at files that are a concurrent session's uncommitted working-tree edits, not part of this PR's diff at all.

2 of 4 addressed in `27de7af`: generalized `pr-review-loop.md` to `<branch>`/`<name>`; `escalate` now explicitly wins over `pr-fix` when `prRound >= MAX_PR_ROUNDS` even if findings are present. The other 2 are out of scope — `agent-relay.sh` and `RUNTIME-CONTINUITY.md` are not touched by any commit on this branch; the reviewer is seeing the live working tree, which still carries another session's uncommitted WIP. Pushed to PR #2 for round 3.

## PR Review — round 3 (code-review skill, PR #2)
3 findings: `clean-state-checklist.md` and `AGENTS.md` (x2) still said "committed on `feat/<feature-id>`" with no mention of the `docs/<slug>` exception this PR itself adds to `conventions.md` — stale the moment the diff landed; the other 2 are the same out-of-scope `agent-relay.sh`/`RUNTIME-CONTINUITY.md` findings from round 2 (still the concurrent session's uncommitted working-tree files, still not part of this branch's diff).

The in-scope finding fixed in `7795fff`, plus the same stale phrase in `CLAUDE.md` (not flagged, but the identical issue) for consistency. Verified the two out-of-scope findings are still genuinely absent from `git diff main...HEAD` on this branch. Pushed to PR #2 for round 4.

## PR Review — round 4 (code-review skill, PR #2) — last round per MAX_PR_ROUNDS=4
4 findings: round 2's escalate-vs-pr-fix precedence fix over-corrected — the escalate edge's condition (`max_pr_rounds`) had no "findings present" qualifier, so a review that finally comes back clean on the last round would still route to escalate instead of plan/handoff; `conventions.md`'s "Session hygiene" checklist never mentioned the PR-review loop even though the Git section two lines above (and AGENTS.md, already updated this PR) now requires it; the other 2 are the same out-of-scope `agent-relay.sh`/`RUNTIME-CONTINUITY.md` findings from rounds 2-3 (re-verified: still absent from `git diff main...HEAD`, still a concurrent session's uncommitted working-tree files).

Both in-scope findings fixed in `7752b65`: escalate now requires findings present, not just round count — a clean review never escalates; session-hygiene checklist gained the missing step. This was the last round allowed by `MAX_PR_ROUNDS=4` (`loops/pr-review-loop.md`); per that loop's own gate, escalating to the human rather than looping further.
