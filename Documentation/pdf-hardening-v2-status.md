# PDF Hardening v2 status

Branch: `fix/pdf-hardening-v2`

## Completed
- Root cause isolated: fatal Architecture v2 undersized throw.
- Measurement mismatch between Layout Engine and Architecture v2 documented.
- Repeated immutable font/header asset downloads isolated as a latency source.
- Hardening acceptance contract committed.
- Static P0 regression guard added.
- Intelligence Engine v1.2 ready-to-paste prompt committed with a contract regression test.
- Architecture layout measurement now matches renderer typography, wrapping, icon gutters, process/component rules, connectors, and section rows.
- All architecture sections and items render; no `slice(0, 4)` content loss and no fatal `ARCHITECTURE_LAYOUT_UNDERSIZED` path remain.
- Exact full-width natural height is propagated through adaptive composition and page packing.
- Font/header bytes are cached by versioned URL and warm export issues no new immutable asset request.
- Generation diagnostics expose dependencies, asset preparation, composition, layout, render, save, and total timings on both the returned Blob and engine API.
- Five-metric final rows fill the available width; missing task Owner / Due Date values render as `—`.
- RTL Architecture uses the page-level geometry mirror exactly once and vector process connectors, avoiding missing arrow glyphs.

## Local acceptance evidence

- All repository `Tests/*.test.js` contracts pass.
- Visual browser suite passes for FA, AR, existing RU Dense, existing EN, RU real/contract, and new dense RU/EN Architecture fixtures.
- Dense RU/EN Architecture fixtures produce exactly two valid 768 × 512 pt pages.
- Poppler text extraction contains `RUOMEGA`, `ENOMEGA`, and missing-value em dashes.
- FA and AR visual inspection confirms shaped text, correct RTL section order, and left-flowing vector connectors.
- Repeat export reports five cache hits, zero misses, and no additional font/header network request.

## Implementation gate
Implementation and local acceptance are complete. Keep production unchanged until PR CI is green and its generated visual artifact is inspected. Merge only after that final gate.
