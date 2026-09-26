# Acceptance Evidence — What Counts

Evidence is the antidote to hallucinated completion. This defines what the Evaluator accepts. If it is not reproducible, it is not evidence.

## Accepted forms
- **Command + output**: the exact command and its real output (test run, curl against the API, migration apply). Preferred for data/API/build features.
- **Test id**: a named test that asserts the behavior, shown passing. Assertions must be meaningful — a test that asserts `true` is not evidence.
- **Screenshot / recording**: for canvas/UI behavior, an image or gif saved under `.harness/evidence/<feature-id>/`, named for what it shows (e.g. `F019-c4-context-double-click.png`). Reference the path in `CHANGELOG.md`.
- **Artifact**: a generated file (export, migration SQL) checked in or path-referenced.

## Not accepted
- "It works" / "looks right" / "should be fine."
- A screenshot that does not actually show the acceptance behavior.
- Test output where the test asserts nothing, is skipped, or was edited to pass.
- Evidence the Evaluator cannot reproduce from the recorded command.
- A green build that does not exercise the feature.

## Where evidence lives
- The reproducible command + result: inline in the `CHANGELOG.md` entry.
- Binary artifacts (screenshots, gifs, exports): `.harness/evidence/<feature-id>/`, referenced by path.

## Minimum bar per feature type
- Data/model: migration applies clean + a test round-tripping the entity.
- API: an integration test hitting the endpoint (happy + one failure path).
- Canvas/UI: a screenshot or gif of the behavior + any unit test on the command/state logic.
- Cross-cutting (undo, palette): a test of the command/state layer + a UI capture.

Evidence is part of "done," not paperwork after it. No evidence, no `passed`.
