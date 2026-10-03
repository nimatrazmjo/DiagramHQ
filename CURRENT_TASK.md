# Current Task: F096 — Export

**Status**: COMPLETE

## Description
Multi-format Diagram and Architecture View Export Engine (Phase 12 — Documentation):
- Export diagram views and models to high-resolution formats:
  - SVG: Scalable vector format with embedded styles, markers, text elements, and metadata tags.
  - PNG: Raster image rendering with scale factor selection (1x, 2x, 4x retina), background selection (transparent, dark, light), and content padding.
  - PDF: Formatted vector document representation with title, timestamp, metadata banner, and aspect-ratio preservation.
  - JSON / Model snapshot: Clean structured export of view objects, geometry, and connections.
- Configuration options:
  - Resolution / Scale (1x, 2x, 3x, 4x).
  - Background: transparent, dark (`#090d16`), light (`#ffffff`).
  - Viewport bounds: "Crop to diagram content" vs "Current camera viewport".
  - Metadata inclusion: Title, timestamp, version tag, legend.
- Interactive Export Modal / Drawer in Canvas:
  - Live preview of selected view.
  - Format selector tab (PNG, SVG, PDF, JSON).
  - Scale and background controls.
  - One-click Download and "Copy to Clipboard" (where supported).
- Acceptance criteria:
  - Export a diagram/view to PNG and SVG (baseline in Phase 01; PDF here)
  - Test: export a view -> non-empty file; visual check.

- Feature ID: F096
- Phase: 12 — Documentation
- Dependencies: Phase 03, Phase 04

## Next Feature
- **F097 — Mermaid**
