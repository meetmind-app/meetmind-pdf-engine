# Intelligent Composition v2

## Objective

Maximize useful information density on page 1 without content loss, microscopic typography, awkward whitespace, or arbitrary page breaks.

## Hard rules

1. Page 1 is preferred whenever all semantic content can fit legibly.
2. The engine may switch a semantic group between horizontal and vertical composition based on measured content, not fixed report-specific rules.
3. Empty gaps between semantic rows should be minimized. Available space should be absorbed by meaningful card geometry and internal spacing rather than left as accidental whitespace.
4. Moving content to page 2 is a last resort after Regular -> Compact -> Dense and alternative row/column compositions have been evaluated.
5. If page 2 is required, transfer the smallest coherent semantic set that makes page 1 fit.
6. Continuation pages must use the available canvas intentionally: blocks expand into available geometry and remain visually balanced.
7. Never split a semantic card merely to save space unless a future block-specific splitter explicitly guarantees semantic continuity.
8. No silent truncation, clipping, ellipsis, hidden items, or content deletion.

## Candidate layout behavior

- Summary + Metrics: evaluate side-by-side ratios and full-width vertical stack.
- Insights + Decisions + Risks: evaluate 3-column row, 2+1 layouts, and vertical stack; choose the smallest measured vertical footprint that remains legible.
- Tasks + Architecture: evaluate side-by-side ratios and vertical stack.
- Owners + Footer remain a controlled bottom band.

## Pagination behavior

When one page cannot fit:
- evaluate moving Architecture only;
- Tasks only;
- Architecture + Owners;
- Tasks + Owners;
- Tasks + Architecture;
- choose the valid candidate with the least semantic content moved and the best page balance.

A second page must not look like overflow debris. Its blocks should occupy the available canvas deliberately, using content-aware height allocation and renderer-level internal spacing.