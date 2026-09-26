// Importing this module registers all built-in layout engines (MODULES.md
// #6). A third-party package can add more engines the same way — call
// `registerLayoutEngine` — without touching this file or the registry.
export { gridLayout } from './layout-engine-grid';
export { computeLayers, topToBottomLayout, leftToRightLayout } from './layout-engine-layered';
export { radialLayout } from './layout-engine-radial';
export { forceDirectedLayout } from './layout-engine-force-directed';
