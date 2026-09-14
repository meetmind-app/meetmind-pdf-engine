# PDF Visual System v2 — Design and semantic icons

Status: implemented candidate. Production release remains gated by content and visual regression.

## Product contract

- Icon choice is derived from semantic meaning, never array position.
- Summary, Metrics, Insights, Decisions, Risks, Tasks, Architecture and Owners use one canonical section map.
- Meeting statistics and Architecture item types use explicit semantic maps.
- Metric classification is deterministic for all supported report languages: `en`, `ru`, `es`, `pt`, `tr`, `id`, `hi`, `ar`, `uz`, `fa`.
- RTL mirrors geometry through `RenderContext`; icon definitions themselves stay direction-neutral.
- Unknown semantics use the registered `circle-question-mark` or `file-text` fallback and never remove content.

## Rendering pipeline

`Renderer/icons.js` is the single Lucide-to-PDF adapter. It owns:

- canonical immutable geometry;
- aliases and fallback behavior;
- conversion of `path`, `line`, `polyline`, `rect`, `circle` and `ellipse` nodes;
- the shared 24×24 baseline correction and stroke-width scale;
- drawing through `ExecutiveSlideEngine.icons.draw()`.

Block renderers must not implement their own SVG-node conversion. This keeps compound icons aligned in normal and continuation-page layouts and prevents nodes such as the database ellipse from disappearing in one renderer but not another.

## Versioned public contract

- `ExecutiveSlideEngine.design.version = "2.0.0"`
- `ExecutiveSlideEngine.icons.version = "2.0.0"`
- `ExecutiveSlideEngine.semanticIcons.version = "2.1.0"`
- `ExecutiveSlideEngine.version = "1.6.0-design-icon-system-v2"`

The engine cache version changes with this release, so browsers cannot combine old renderer modules with the new icon contract.

## Acceptance gate

1. Contract tests validate every semantic result against the icon registry and exercise all ten languages.
2. Content Integrity stays green.
3. Visual regression covers FA, AR, RU, EN, dense continuation pages and repeated generation.
4. FA, RU and EN rendered pages are manually inspected for icon baseline, glyph integrity, overlap and clipping.
5. Only after the gate may the branch merge and GitHub Pages deploy.
