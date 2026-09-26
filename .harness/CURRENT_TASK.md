# CURRENT TASK: F015 — Auto-layout

## Status: COMPLETE

## Feature
**F015 — Auto-layout**

Layout-engine registry (MODULES.md §6): pluggable, whole-graph auto-layout strategies applied on demand via a toolbar menu. Manual positions are untouched until explicitly re-applied.

## Scope

### Domain layer (`packages/domain/src/`)
- `layout-registry.ts`: the registry core — `LayoutNode`, `LayoutEdge`, `LayoutOptions`, `LayoutEngineName`, `LayoutEngine`, `registerLayoutEngine`, `getLayoutEngine`, `listLayoutEngines`, `applyLayout`. No built-in engine is hardcoded here — core iterates the registry.
- `layout-engine-grid.ts`, `layout-engine-layered.ts` (hierarchical/tree/layered/TB/LR share one longest-path layering, orientation-parameterized), `layout-engine-radial.ts`, `layout-engine-force-directed.ts`: built-in engines, each self-registers on import.
- `layout-builtins.ts`: side-effect barrel importing all 4 built-in engine modules.
- `layout-registry.test.ts`, `layout-builtins.test.ts`: registry mechanics + the acceptance test (every registered engine lays out a sample graph with zero bbox overlap), plus per-engine correctness checks.

### Web layer (`apps/web/`)
- `lib/commands/apply-layout-command.ts`: `ApplyLayoutCommand` implementing `Command<...>` — same shape as `AlignNodesCommand` (batch persist, undo restores prior positions).
- `lib/commands/index.ts`: re-export.
- `components/canvas/layout-menu.tsx`: dropdown listing every registered engine.
- `components/canvas/infinite-canvas.tsx`: `handleApplyLayout` (in-flight guard + optimistic update + rollback-on-failure, mirroring F014's `dispatchAlignOperation`), menu mounted bottom-left when `nodes.length > 1`.
- `auto-layout.spec.ts`: command + component tests.

## Verification
- TypeScript: PASS · Lint: PASS · Tests: PASS (366: 70 domain, 151 web, 145 api) · Build: PASS · check-architecture: PASS
- Evidence: `.harness/CHANGELOG.md` — "2026-09-26 — F015 — Auto-layout"

## Owner
Control plane (this agent)

## Started
2026-09-26

## Completed
2026-09-26 — implementation + local verification done, PR opened.

## Next Task
F016 — Undo/redo. Per `loops/pr-review-loop.md`, do not start it until this feature's PR is merged.
