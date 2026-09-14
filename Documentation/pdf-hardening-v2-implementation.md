# PDF Hardening v2 — implementation contract

## Confirmed root causes

1. `Renderer/architecture-v2.js` can throw `ARCHITECTURE_LAYOUT_UNDERSIZED` after shrinking to 0.78. A dense architecture section therefore aborts the complete export instead of asking layout/pagination for more space.
2. `Layout_Engine/layout-engine.js::measureArchitecture()` uses a simplified geometry model that does not match Architecture v2's section headers, icon gutters, process arrow spacing, horizontal/vertical process decision, and component grid calculation. This can under-allocate height before render.
3. `executive-slide-engine.js::createSurface()` fetches four font assets and the header image for every generation. `fetchBytes()` uses `cache: 'no-store'`, so immutable versioned assets are unnecessarily downloaded repeatedly.

## Required implementation

### Architecture density
- Layout measurement must conservatively match Architecture v2 geometry.
- If the semantic block does not fit page 1, existing semantic two-page pagination should move it as a unit where possible.
- Renderer must not terminate the whole export solely because architecture needs more vertical space.
- No content truncation/clipping is allowed as the fallback.

### Latency
- Cache immutable asset byte promises in memory by versioned URL.
- Use browser caching for versioned immutable assets instead of `no-store`.
- Add phase timings for dependencies, surface/assets, composition, layout, render and save.

### Presentation regressions
- Missing task owner/due renders as `—`, never an empty badge/cell.
- Five metrics: lower two cards consume the available second-row width rather than staying narrow/centered.
- Preserve the current visual language; no redesign in this hardening change.

## Acceptance
- Dense RU and EN QA fixtures export without `ARCHITECTURE_LAYOUT_UNDERSIZED`.
- No clipping or silent loss of architecture items.
- One page when it fits; clean two-page output when it does not.
- Repeated PDF generation avoids refetching immutable fonts/header image within the page session.
