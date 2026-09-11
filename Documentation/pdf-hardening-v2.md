# LOREVI PDF Hardening v2

## Acceptance criteria

1. Dense Architecture & Process content must never abort the entire export with `ARCHITECTURE_LAYOUT_UNDERSIZED`.
2. Semantic blocks are never silently truncated. If a block does not fit, layout must allocate more height or move the semantic block to a continuation page.
3. PDF generation must expose stage timings for dependency load, asset/font preparation, composition, layout, render and save.
4. Repeated export in the same report session must reuse immutable font/image bytes instead of re-fetching them with `cache: no-store`.
5. Key Metrics incomplete final rows must use the available row width rather than leave an avoidable empty slot.
6. Missing task Owner / Due Date renders as an em dash (`—`) while preserving wrapping for long values.
7. Architecture icons must have explicit spacing from item titles and never visually merge with text.
8. Existing RU/EN/RTL content-integrity and visual-regression suites remain green.

## Confirmed root causes

### Dense architecture fatal error
`Renderer/architecture-v2.js` currently scales a section only down to 0.78 and then throws `ARCHITECTURE_LAYOUT_UNDERSIZED` when measured content still exceeds allocated height. A layout-density mismatch can therefore abort the whole PDF instead of repaginating.

### Repeat-export latency
`executive-slide-engine.js#createSurface()` fetches four font files plus the header artwork on every generation. `fetchBytes()` explicitly uses `cache: 'no-store'`. Script dependencies are memoized, but these immutable binary assets are not. Hardening v2 will cache the fetched bytes in-memory per engine session and record stage timings.

## Release gate
Do not merge to `main` until content-integrity and visual-regression workflows pass and the dense RU + dense EN fixtures both export without a fatal layout exception.
