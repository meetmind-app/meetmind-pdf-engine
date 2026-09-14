# CHANGELOG

## 1.2.0 — Design / Icon System v2

### Added

- One versioned icon drawing API for every PDF renderer.
- Complete Lucide node conversion, including ellipse geometry.
- Deterministic semantic resolvers for sections, statistics, metrics, meeting types and Architecture items.
- Metric-language coverage for all ten supported report locales.

### Changed

- Removed positional metric icon rotation and localized-title reverse lookup.
- Architecture now uses the canonical network heading icon and type-driven item icons.
- Baseline correction and stroke scaling are shared design tokens.

## 1.1.0 — PDF Hardening v2

### Fixed

- Architecture renders all sections across rows and no longer aborts the complete PDF at the former dense scale floor.
- Architecture item icons and titles use explicit non-overlapping geometry.
- Process connectors are vector paths, including correctly mirrored RTL flow.
- Incomplete five-metric rows consume the available width.
- Missing task Owner / Due Date values render as `—`.

## 0.4.0 — Renderer Integration

### Added

- Dependency-injected PDF pipeline.
- Renderer compatible with `block.geometry`.
- Page-scoped RenderContext factory.
- Block Registry and Block Renderer resolution.
- Existing `ExecutiveSlideEngine` namespace compatibility.
- End-to-end contract smoke test.
- Drawing Surface abstraction.

### Fixed

- Removed the old Renderer assumption that LayoutResult must expose
  geometry only as top-level `block.x/y/width/height`.
- Removed the old assumption that one global RenderContext is sufficient
  for all pages.

### Not included

- Final visual polish.
- A selected production PDF library adapter.
- Final repository cleanup.
- Release 1.0 bundle.
