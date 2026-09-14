# CHANGELOG

## 1.9.0 — PDF Hardening v2

### Fixed

- Architecture measurement now mirrors the renderer's section headers, icon gutters, process/component modes, wrapping, and multi-row geometry.
- Exact full-width natural heights flow into adaptive placement and sparse-page packing.
- Deterministic text, line-count, and block measurements are cached during each layout pass.
- Missing task Owner / Due Date values participate in measurement as an em dash.
- Five-metric layouts measure the incomplete final row at its actual expanded width.

## 0.3.0 — Layout Engine / Iteration 2

### Added
- Balanced two-column template.
- Dominant Insights template.
- Dominant Decisions template.
- Dominant Risks template.
- Dominant column ratio.
- Column balancing.
- Tasks + Architecture side-by-side mode.
- Automatic density fallback.
- Column geometry in page regions.
- Unknown-template fallback diagnostics.

### Preserved
- No report normalization.
- No visibility decisions.
- No pagination decisions.
- No drawing operations.
- No mutation of CompositionResult.
