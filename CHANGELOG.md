# Changelog

## v1.5.0-pdf-hardening-v2

- Measure Architecture & Process with the same wrapping, icon gutters, process connectors, and row geometry used for rendering.
- Preserve every architecture section and item; overflow sections continue on additional rows instead of being sliced away.
- Replace font-dependent process arrows with vector connectors and keep RTL geometry logical for the page-level mirror.
- Cache immutable versioned font/header bytes across exports and expose per-stage generation timings.
- Fill incomplete metric rows and render missing task Owner / Due Date values as `—`.
- Add dense RU/EN fixtures, warm-cache assertions, text-layer sentinels, and visual-regression gates.

## v1.4.7-rtl-opentype

- Render Persian and Arabic through Fontkit OpenType GSUB/GPOS glyph layout.
- Preserve mixed-direction Latin tokens and logical Unicode text extraction.
- Add Persian/Arabic visual and content-integrity regression gates without changing LTR rendering.

## v1.0

Initial repository created after Architecture Freeze.
