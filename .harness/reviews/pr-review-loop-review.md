# Code Review — docs/pr-review-loop (harness tooling)

Branch: `docs/pr-review-loop` -> `main`. Not tied to a ROADMAP feature id (see the branch-naming exception this PR adds to `rules/conventions.md`).

## PR Review — round 1 (code-review skill, PR #2)
2 findings: `workflow-graph.md` claimed `prRound`/`prFindings`/`prVerdict` are already tracked in `loops/loop-state.md`/`loops/pr-review-loop.md`, but neither file has those fields; `rules/conventions.md`'s "one feature per branch" rule had no carve-out for harness-only work not tied to a ROADMAP feature id — exactly this PR's own branch.

Both fixed in `23b2e4f`: `workflow-graph.md`'s citation corrected to where these fields actually live today (prose in each round's section of `.harness/reviews/<FID>-review.md`); `conventions.md` now allows `docs/<slug>`/`chore/<slug>` for harness-only branches. Docs-only change; no build/test/lint impact. Pushed to PR #2 for round 2.
