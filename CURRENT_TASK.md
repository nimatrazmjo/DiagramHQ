# Current Task: F120 — AI evidence + confidence

**Status**: NOT STARTED

## Description
Grounding and confidence scoring for every AI assertion, proposal, and architecture edit in DiagramHQ. Ensures all synthesized architecture elements, inferred dependencies, and proposed edits are explicitly anchored to source evidence (repo, file path, line numbers, commit SHA, or documentation references) with calibrated confidence metrics:
- Grounded Evidence Model:
  - `AIEvidence`: specifies `sourceType` ('code', 'repo', 'file', 'doc', 'ast_call', 'network_trace', 'manual'), `uri`, `repo`, `file`, `lineRange` (`{ start: number; end: number }`), `snippet`, `commitSha`, and `explanation`.
  - `ConfidenceRating`: numerical confidence score `0.00` to `1.00`, categorized into `ConfidenceTier` ('high' >= 0.85, 'medium' >= 0.60, 'low' < 0.60).
  - Low confidence threshold detection: any assertion/edit below 0.60 is flagged with `isLowConfidence: true` and actionable warning notices (`requiresHumanVerification: true`, `reasonsForLowConfidence`).
- Grounded Dependency / Assertion Generation:
  - Generates dependencies or architecture connections with explicit attached evidence and confidence scores.
  - Automatically computes confidence based on evidence quality (e.g. AST direct function call vs fuzzy textual match).
  - Flags low-confidence inferences to alert architects during review.
- Acceptance criteria:
  - Every AI assertion/edit carries evidence (repo/file/line where applicable) + a confidence score
  - Test: a generated dependency includes evidence; low confidence flagged.

- Feature ID: F120
- Phase: 08 — AI Copilot
- Dependencies: F063, F064, F066, F071

## Next Steps
1. In `packages/domain/src/`, implement AI evidence and confidence domain logic (`ai-confidence.ts`):
   - Define `AIEvidence`, `ConfidenceTier`, `GroundedAssertion`, `GroundedDependency`.
   - Function `createGroundedDependency`: creates an architecture dependency with concrete code evidence and calibrated confidence score.
   - Function `assessAssertionConfidence`: computes confidence scores and flags low-confidence assertions with clear diagnostic reasoning.
   - Unit tests in `packages/domain/src/ai-confidence.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<ConfidenceBadge />` and `<AIEvidenceInspector />` in `apps/web/components/canvas/ai-confidence-badge.tsx`.
   - Integration specs in `apps/web/ai-confidence.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
