/**
 * MeetMind Executive PDF Engine
 * Layout Engine — Intelligent Composition v1.8.2
 *
 * Public contract preserved:
 *   MeetMindLayoutEngine.layout(compositionResult, options?)
 *
 * Responsibilities:
 * - content-driven geometry
 * - Regular -> Compact -> Dense fit evaluation
 * - adaptive row/column composition for semantic block groups
 * - minimal coherent transfer to continuation page
 * - deterministic page geometry on the canonical 768 x 512 pt canvas
 * - no clipping/truncation/content deletion
 *
 * Golden reference geometry remains a visual target, never a fixture-specific rule.
 */
(function (global) {
    'use strict';

    const PAGE = Object.freeze({ width: 768, height: 512 });

    const MODES = Object.freeze({
        regular: Object.freeze({
            marginX: 10, marginTop: 9, marginBottom: 8,
            sectionGap: 6, cardGap: 5, columnGap: 5,
            padX: 8, padY: 7, lineGap: 3,
            body: 8.0, bodyLine: 10.0, small: 6.8, smallLine: 8.4,
            blockTitle: 8.5, blockTitleLine: 10.5,
            taskHeader: 6.6, taskBody: 6.8, taskLine: 8.2
        }),
        compact: Object.freeze({
            marginX: 10, marginTop: 8, marginBottom: 7,
            sectionGap: 4.5, cardGap: 4, columnGap: 4,
            padX: 7, padY: 5.5, lineGap: 2.2,
            body: 7.4, bodyLine: 9.0, small: 6.4, smallLine: 7.8,
            blockTitle: 8.0, blockTitleLine: 9.6,
            taskHeader: 6.2, taskBody: 6.4, taskLine: 7.6
        }),
        dense: Object.freeze({
            marginX: 10, marginTop: 7, marginBottom: 6,
            sectionGap: 3, cardGap: 3, columnGap: 3,
            padX: 6, padY: 4.5, lineGap: 1.5,
            body: 6.8, bodyLine: 8.0, small: 6.0, smallLine: 7.0,
            blockTitle: 7.4, blockTitleLine: 8.8,
            taskHeader: 5.9, taskBody: 6.0, taskLine: 7.0
        })
    });

    const ORDER = [
        'header', 'meetingStats', 'executiveSummary', 'keyMetrics',
        'insights', 'decisions', 'risks', 'tasks', 'architecture',
        'owners', 'footer'
    ];

    const aliases = Object.freeze({
        summary: 'executiveSummary',
        metrics: 'keyMetrics',
        stats: 'meetingStats'
    });

    function idOf(block) {
        return aliases[block?.id] || block?.id || block?.type || '';
    }

    function cleanText(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return String(value).replace(/\s+/g, ' ').trim();
        }
        return '';
    }

    function textOf(value) {
        if (value === null || value === undefined) return '';
        if (typeof value !== 'object') return cleanText(value);
        for (const key of ['text','summary','description','title','label','value','task','name','role','owner','dueDate','due_date']) {
            const v = cleanText(value[key]);
            if (v) return v;
        }
        return '';
    }

    function arrayOf(block) {
        const c = block?.content ?? block?.data ?? block?.items ?? block?.value;
        if (Array.isArray(c)) return c;
        if (c && typeof c === 'object') {
            for (const key of ['items','metrics','tasks','sections','owners','participants','values']) {
                if (Array.isArray(c[key])) return c[key];
            }
        }
        return [];
    }

    function metricDisplayValue(item) {
        const relation = cleanText(item?.relation).toLowerCase();
        const current = cleanText(item?.current_value ?? item?.currentValue);
        const previous = cleanText(item?.previous_value ?? item?.previousValue);
        const target = cleanText(item?.target_value ?? item?.targetValue);
        const fallback = cleanText(item?.value ?? item?.primaryValue ?? item?.metric ?? item?.amount);

        if (relation === 'current_to_target' && current && target) return `${current} → ${target}`;
        if (relation === 'previous_to_current' && previous && current) return `${previous} → ${current}`;
        if (relation === 'target' && target) return target;
        if (relation === 'current' && current) return current;
        return fallback;
    }

    function metricContextText(item) {
        const context = cleanText(item?.context);
        const period = cleanText(item?.target_period ?? item?.targetPeriod);
        if (!period) return context;
        if (!context) return period;
        return context.toLowerCase().includes(period.toLowerCase()) ? context : `${context} · ${period}`;
    }

    function riskSupplementalText(item) {
        const impact = cleanText(item?.impact);
        const mitigation = cleanText(item?.mitigation);
        const parts = [];
        if (impact) parts.push(`Impact: ${impact}`);
        if (mitigation) parts.push(`Mitigation: ${mitigation}`);
        return parts.join(' ');
    }

    // Deterministic font-independent estimate. Renderer performs the final glyph drawing.
    // Layout intentionally errs slightly high so content is never clipped.
    function charsPerLine(width, fontSize) {
        return Math.max(8, Math.floor(width / Math.max(2.8, fontSize * 0.53)));
    }

    let ACTIVE_MEASURE_TEXT = null;
    let ACTIVE_TOKENS = null;
    let ACTIVE_TEXT_WIDTH_CACHE = new Map();
    let ACTIVE_LINE_COUNT_CACHE = new Map();
    let ACTIVE_BLOCK_MEASURE_CACHE = new WeakMap();

    function measuredTextWidth(text, fontName, fontSize) {
        const key = `${fontName}\u0000${Number(fontSize).toFixed(3)}\u0000${text}`;
        if (ACTIVE_TEXT_WIDTH_CACHE.has(key)) return ACTIVE_TEXT_WIDTH_CACHE.get(key);
        const width = ACTIVE_MEASURE_TEXT(text, fontName, fontSize);
        ACTIVE_TEXT_WIDTH_CACHE.set(key, width);
        return width;
    }

    function lineCount(text, width, fontSize, fontName = 'regular') {
        const s = cleanText(text);
        if (!s) return 0;
        const cacheKey = `${fontName}\u0000${Number(fontSize).toFixed(3)}\u0000${Number(width).toFixed(3)}\u0000${s}`;
        if (ACTIVE_LINE_COUNT_CACHE.has(cacheKey)) return ACTIVE_LINE_COUNT_CACHE.get(cacheKey);
        if (typeof ACTIVE_MEASURE_TEXT === 'function') {
            const words = s.split(/\s+/);
            const wrapped = [];
            let line = '';
            for (const word of words) {
                const candidate = line ? `${line} ${word}` : word;
                if (measuredTextWidth(candidate, fontName, fontSize) <= width) {
                    line = candidate;
                    continue;
                }
                if (line) wrapped.push(line);
                line = '';
                let fragment = '';
                for (const ch of word) {
                    const next = fragment + ch;
                    if (fragment && measuredTextWidth(next, fontName, fontSize) > width) {
                        wrapped.push(fragment);
                        fragment = ch;
                    } else {
                        fragment = next;
                    }
                }
                line = fragment;
            }
            if (line) wrapped.push(line);
            const lines = wrapped.length;
            ACTIVE_LINE_COUNT_CACHE.set(cacheKey, lines);
            return lines;
        }

        const cap = charsPerLine(width, fontSize);
        const words = s.split(' ');
        let lines = 1, used = 0;
        for (const word of words) {
            const n = word.length + (used ? 1 : 0);
            if (used && used + n > cap) {
                lines += Math.max(1, Math.ceil(word.length / cap));
                used = Math.min(word.length, cap);
            } else if (!used && word.length > cap) {
                lines += Math.ceil(word.length / cap) - 1;
                used = word.length % cap;
            } else used += n;
        }
        ACTIVE_LINE_COUNT_CACHE.set(cacheKey, lines);
        return lines;
    }

    function blockChrome(mode) {
        return mode.padY * 2 + mode.blockTitleLine + mode.lineGap;
    }

    function measureList(block, width, mode) {
        const items = arrayOf(block);
        const inner = Math.max(40, width - mode.padX * 2 - 13);
        const strongSize = mode === MODES.regular ? 6.6 : mode === MODES.compact ? 6.3 : 6.1;
        const bodySize = strongSize;
        const lineHeight = mode === MODES.regular ? 9.0 : mode === MODES.compact ? 8.1 : 7.4;
        const bulletGap = mode === MODES.regular ? 4 : mode === MODES.compact ? 3.3 : 2.7;
        const titleContentGap = mode === MODES.regular ? 6 : mode === MODES.compact ? 5 : 4;
        let h = mode.padY + mode.blockTitleLine + titleContentGap;
        const isRiskBlock = idOf(block) === 'risks';

        for (const item of items) {
            const title = cleanText(item?.title || item?.label || '');
            const body = cleanText(item?.description || item?.details || item?.text || item?.value || (title ? '' : textOf(item)));
            const supplemental = isRiskBlock ? riskSupplementalText(item) : '';
            const combinedBody = [body, supplemental].filter(Boolean).join(' ');
            const titleLines = title ? lineCount(title, inner, strongSize, 'semibold') : 0;
            const bodyLines = combinedBody && combinedBody !== title
                ? lineCount(combinedBody, inner, bodySize, 'regular')
                : 0;
            h += Math.max(
                lineHeight,
                titleLines * lineHeight
                    + bodyLines * lineHeight
            );
            h += bulletGap;
        }

        h += mode.padY;
        return Math.max(32, h);
    }

    function measureSummary(block, width, mode) {
        const c = block?.content ?? block?.data ?? block?.value ?? '';
        let paragraphs = [];
        if (Array.isArray(c)) paragraphs = c.map(textOf).filter(Boolean);
        else if (c && typeof c === 'object') {
            const raw = c.paragraphs || c.items;
            if (Array.isArray(raw)) paragraphs = raw.map(textOf).filter(Boolean);
            else {
                const text = c.text || c.summary || c.description || '';
                paragraphs = typeof text === 'string'
                    ? text.split(/\n\s*\n|\n/).map(cleanText).filter(Boolean)
                    : [textOf(c)].filter(Boolean);
            }
        } else if (typeof c === 'string') {
            paragraphs = c.split(/\n\s*\n|\n/).map(cleanText).filter(Boolean);
        }

        const inner = Math.max(50, width - mode.padX * 2);
        let lines = 0;
        for (const p of paragraphs) lines += lineCount(p, inner, mode.body);
        const paragraphGap = Number(mode.paragraphGap ?? mode.lineGap * 1.4);
        return Math.max(42, blockChrome(mode) + lines * mode.bodyLine + Math.max(0, paragraphs.length - 1) * paragraphGap);
    }

    function measureMetrics(block, width, mode) {
        const items = arrayOf(block);
        if (!items.length) return 0;
        const columns = items.length === 5
            ? 3
            : Math.min(4, Math.max(1, items.length));
        const rows = Math.ceil(items.length / columns);
        const contextSize = Math.max(5.0, mode.small * 0.88);
        const contextLine = Math.max(6.0, mode.smallLine * 0.88);
        let total = 0;
        for (let r = 0; r < rows; r++) {
            const rowCount = Math.min(columns, items.length - r * columns);
            const cellW = (width - (rowCount - 1) * mode.cardGap) / rowCount;
            let rowH = 0;
            for (let c = 0; c < rowCount; c++) {
                const item = items[r * columns + c];
                if (!item) continue;
                const label = cleanText(item.label || item.title || item.name);
                const value = metricDisplayValue(item);
                const context = metricContextText(item);
                const innerWidth = cellW - mode.padX * 2;
                const valueHeight = Math.max(
                    mode.bodyLine * 1.6,
                    lineCount(value, innerWidth, mode.body * 1.45, 'bold') * mode.bodyLine
                );
                const contextHeight = context
                    ? lineCount(context, innerWidth, contextSize, 'regular') * contextLine + 1.5
                    : 0;
                const h = mode.padY * 2
                    + valueHeight
                    + lineCount(label, innerWidth, mode.small, 'semibold') * mode.smallLine
                    + contextHeight;
                rowH = Math.max(rowH, h);
            }
            total += rowH + (r ? mode.cardGap : 0);
        }
        return Math.max(36, blockChrome(mode) + total);
    }

    function measureTasks(block, width, mode) {
        const items = arrayOf(block);
        const taskW = Math.max(80, width * 0.58);
        let h = blockChrome(mode) + 14;
        for (const item of items) {
            const task = cleanText(item.task || item.title || item.description || item.text);
            const owner = cleanText(item.owner?.name || item.owner || '') || '—';
            const due = cleanText(item.dueDate || item.due_date || item.deadline || '') || '—';
            const lines = Math.max(
                1,
                lineCount(task, taskW, mode.taskBody),
                lineCount(owner, width * 0.22, mode.taskBody),
                lineCount(due, width * 0.16, mode.taskBody)
            );
            h += Math.max(13, lines * mode.taskLine + mode.padY);
        }
        return Math.max(42, h);
    }

    function densityName(mode) {
        if (mode === MODES.dense) return 'dense';
        if (mode === MODES.compact) return 'compact';
        return 'regular';
    }

    function architectureStyle(name, mode, fallback) {
        const token = ACTIVE_TOKENS?.typography?.tokens?.[name];
        if (!token) return fallback;
        const density = densityName(mode);
        return {
            size: Number(token.size?.[density] ?? token.size?.regular ?? fallback.size),
            lineHeight: Number(token.lineHeight?.[density] ?? token.lineHeight?.regular ?? fallback.lineHeight),
            font: token.font || fallback.font
        };
    }

    function architectureRoot(block) {
        const raw = block?.data ?? block?.content ?? block?.items ?? block?.value;
        if (Array.isArray(raw)) return { sections: raw };
        if (raw && typeof raw === 'object') {
            return { ...raw, sections: Array.isArray(raw.sections) ? raw.sections : [] };
        }
        return { sections: [] };
    }

    function architectureMode(section, root) {
        const raw = cleanText(
            section?.layout || section?.mode || section?.kind ||
            root?.layout || root?.mode || root?.kind
        ).toLowerCase();
        return ['process','flow','pipeline','sequence','workflow'].includes(raw)
            ? 'process'
            : 'components';
    }

    function architectureItemText(item) {
        return {
            title: cleanText(item?.title || item?.name || item?.label),
            description: cleanText(item?.description || item?.text || '')
        };
    }

    function measureArchitectureProcess(items, width, titleStyle, descStyle, horizontal) {
        const iconSize = 6.4;
        const iconGap = 3.2;
        if (!items.length) return 0;
        if (!horizontal) {
            return items.reduce((sum, item, index) => {
                const data = architectureItemText(item);
                const textWidth = Math.max(4, width - iconSize - iconGap - 2);
                const titleHeight = lineCount(data.title, textWidth, titleStyle.size, titleStyle.font)
                    * titleStyle.lineHeight;
                const descriptionHeight = data.description
                    ? lineCount(data.description, textWidth, descStyle.size, descStyle.font) * descStyle.lineHeight
                    : 0;
                const itemHeight = Math.max(iconSize, titleHeight + descriptionHeight);
                return sum + itemHeight + (index < items.length - 1 ? 9 : 0);
            }, 0);
        }

        const arrowSpace = 12;
        const stepWidth = Math.max(34, (width - arrowSpace * (items.length - 1)) / items.length);
        const textWidth = Math.max(4, stepWidth - 4 - iconSize - iconGap - 2);
        const maximum = items.reduce((max, item) => {
            const data = architectureItemText(item);
            const titleHeight = lineCount(data.title, textWidth, titleStyle.size, titleStyle.font)
                * titleStyle.lineHeight;
            const descriptionHeight = data.description
                ? lineCount(data.description, textWidth, descStyle.size, descStyle.font) * descStyle.lineHeight + 1
                : 0;
            return Math.max(max, Math.max(iconSize, titleHeight) + descriptionHeight + 6);
        }, 0);
        return Math.max(28, maximum);
    }

    function measureArchitectureComponents(items, width, titleStyle, descStyle) {
        if (!items.length) return 0;
        const columns = width >= 210 && items.length > 1 ? 2 : 1;
        const gap = 3;
        const cellWidth = (width - gap * (columns - 1)) / columns;
        const textWidth = Math.max(4, cellWidth - 6.4 - 3.2 - 2);
        const rows = Math.ceil(items.length / columns);
        let total = 0;
        for (let row = 0; row < rows; row += 1) {
            let rowHeight = 0;
            for (let col = 0; col < columns; col += 1) {
                const item = items[row * columns + col];
                if (!item) continue;
                const data = architectureItemText(item);
                const titleHeight = lineCount(data.title, textWidth, titleStyle.size, titleStyle.font)
                    * titleStyle.lineHeight;
                const descriptionHeight = data.description
                    ? lineCount(data.description, textWidth, descStyle.size, descStyle.font) * descStyle.lineHeight + 1
                    : 0;
                rowHeight = Math.max(rowHeight, Math.max(6.4, titleHeight) + descriptionHeight + 4);
            }
            total += rowHeight + (row < rows - 1 ? gap : 0);
        }
        return total;
    }

    function measureArchitecture(block, width, mode) {
        const root = architectureRoot(block);
        const sections = root.sections;
        if (!sections.length) return 0;

        // These values intentionally mirror Renderer/architecture-v2.js. The
        // current renderer falls back to 6/5/3 for card padding/title gap and
        // reads cardGap from the density token.
        const rendererPadX = 6;
        const rendererPadY = 5;
        const rendererTitleGap = 3;
        const tokenSpacing = ACTIVE_TOKENS?.spacing?.[densityName(mode)] || {};
        const sectionGap = Number(tokenSpacing.cardGap ?? mode.cardGap ?? 3);
        const heading = architectureStyle('blockTitle', mode, { font: 'bold', size: 8.2, lineHeight: 9.8 });
        const sectionNo = architectureStyle('architectureSectionNo', mode, { font: 'bold', size: 6.5, lineHeight: 7.5 });
        const sectionTitle = architectureStyle('architectureSectionTitle', mode, { font: 'bold', size: 6.3, lineHeight: 7.7 });
        const itemTitle = architectureStyle('architectureItemTitle', mode, { font: 'semibold', size: 5.1, lineHeight: 6.2 });
        const description = architectureStyle('architectureDescription', mode, { font: 'regular', size: 4.6, lineHeight: 5.6 });
        const innerWidth = Math.max(30, width - rendererPadX * 2);
        let rowsHeight = 0;
        let rowCount = 0;

        for (let start = 0; start < sections.length; start += 4) {
            const row = sections.slice(start, start + 4);
            const sectionWidth = (innerWidth - sectionGap * (row.length - 1)) / row.length;
            let rowHeight = 24;
            for (const section of row) {
                const sectionInnerWidth = Math.max(4, sectionWidth - 12);
                const titleWidth = Math.max(4, sectionInnerWidth - 18);
                const headerHeight = Math.max(
                    sectionNo.lineHeight,
                    lineCount(
                        section?.title || section?.name || section?.label,
                        titleWidth,
                        sectionTitle.size,
                        sectionTitle.font
                    ) * sectionTitle.lineHeight
                );
                const items = Array.isArray(section?.items) ? section.items : [];
                const modeName = architectureMode(section, root);
                const horizontal = modeName === 'process'
                    && items.length > 1
                    && items.length <= 4
                    && sectionInnerWidth / items.length >= 62;
                const bodyHeight = modeName === 'process'
                    ? measureArchitectureProcess(items, sectionInnerWidth, itemTitle, description, horizontal)
                    : measureArchitectureComponents(items, sectionInnerWidth, itemTitle, description);
                rowHeight = Math.max(rowHeight, 6 + headerHeight + 5 + bodyHeight + 4);
            }
            rowsHeight += rowHeight;
            rowCount += 1;
        }

        return Math.max(
            42,
            rendererPadY * 2
                + heading.lineHeight
                + rendererTitleGap
                + rowsHeight
                + Math.max(0, rowCount - 1) * sectionGap
                + 0.75
        );
    }

    function measureOwners(block, width, mode) {
        const items = arrayOf(block);
        if (!items.length) return 0;
        const perRow = Math.max(1, Math.floor(width / 110));
        const rows = Math.ceil(items.length / perRow);
        return blockChrome(mode) + rows * (mode === MODES.dense ? 22 : 26) + Math.max(0, rows - 1) * mode.cardGap;
    }

    function measure(block, width, mode) {
        const cacheKey = `${densityName(mode)}:${Number(width).toFixed(3)}`;
        if (block && typeof block === 'object') {
            const cached = ACTIVE_BLOCK_MEASURE_CACHE.get(block);
            if (cached?.has(cacheKey)) return cached.get(cacheKey);
        }
        const id = idOf(block);
        let result;
        switch (id) {
            case 'header': result = 39; break;
            case 'meetingStats': result = 17; break;
            case 'executiveSummary': result = measureSummary(block, width, mode); break;
            case 'keyMetrics': result = measureMetrics(block, width, mode); break;
            case 'insights':
            case 'decisions':
            case 'risks': result = measureList(block, width, mode); break;
            case 'tasks': result = measureTasks(block, width, mode); break;
            case 'architecture': result = measureArchitecture(block, width, mode); break;
            case 'owners': result = measureOwners(block, width, mode); break;
            case 'footer': result = 28; break;
            default: result = measureList(block, width, mode); break;
        }
        if (block && typeof block === 'object') {
            let cached = ACTIVE_BLOCK_MEASURE_CACHE.get(block);
            if (!cached) {
                cached = new Map();
                ACTIVE_BLOCK_MEASURE_CACHE.set(block, cached);
            }
            cached.set(cacheKey, result);
        }
        return result;
    }

    function getBlocks(composition) {
        if (Array.isArray(composition?.blocks)) return composition.blocks;
        if (Array.isArray(composition?.pages)) {
            return composition.pages.flatMap(p => Array.isArray(p.blocks) ? p.blocks : []);
        }
        return [];
    }

    function byId(blocks) {
        const map = new Map();
        for (const block of blocks) {
            const id = idOf(block);
            if (id && !map.has(id)) map.set(id, block);
        }
        return map;
    }

    function cloneWithGeometry(block, geometry, meta = {}) {
        return Object.assign({}, block, {
            geometry: Object.freeze({
                x: geometry.x, y: geometry.y,
                width: geometry.width, height: geometry.height
            }),
            layout: Object.freeze(meta)
        });
    }

    function densityRank(modeName) {
        return modeName === 'regular' ? 0 : modeName === 'compact' ? 1 : 2;
    }

    function chooseAdaptivePairLayout(
        firstId,
        secondId,
        map,
        contentW,
        mode,
        preferredRatio = 0.5,
        unusedWeight = 0.28,
        maxUnusedRatio = 0.55
    ) {
        const first = map.get(firstId);
        const second = map.get(secondId);
        if (!first || !second) return null;

        const gap = mode.columnGap;
        const firstFullHeight = measure(first, contentW, mode);
        const secondFullHeight = measure(second, contentW, mode);
        const candidates = [];
        const ratios = [];
        for (let r = 0.32; r <= 0.6801; r += 0.04) ratios.push(Number(r.toFixed(2)));
        ratios.push(preferredRatio);

        [...new Set(ratios)].forEach(ratio => {
            const leftW = (contentW - gap) * ratio;
            const rightW = contentW - gap - leftW;
            if (leftW < 150 || rightW < 150) return;
            const h1 = measure(first, leftW, mode);
            const h2 = measure(second, rightW, mode);
            const rowH = Math.max(h1, h2);
            const unusedHeight = Math.max(0, rowH - h1) + Math.max(0, rowH - h2);
            const unusedRatio = rowH > 0 ? unusedHeight / rowH : 0;
            const severeUnusedPenalty = unusedRatio > maxUnusedRatio
                ? rowH * (0.45 + Math.min(0.35, unusedRatio - maxUnusedRatio) * 1.5)
                : 0;
            candidates.push({
                kind: 'row',
                totalHeight: rowH,
                unusedHeight,
                unusedRatio,
                score: rowH
                    + unusedHeight * unusedWeight
                    + severeUnusedPenalty
                    + Math.abs(ratio - preferredRatio) * 3,
                placements: [
                    { id: firstId, xOffset: 0, width: leftW, height: rowH, naturalHeight: h1, fullWidthNaturalHeight: firstFullHeight },
                    { id: secondId, xOffset: leftW + gap, width: rightW, height: rowH, naturalHeight: h2, fullWidthNaturalHeight: secondFullHeight }
                ]
            });
        });

        const firstH = firstFullHeight;
        const secondH = secondFullHeight;
        candidates.push({
            kind: 'stack',
            totalHeight: firstH + mode.sectionGap + secondH,
            unusedHeight: 0,
            unusedRatio: 0,
            score: firstH + mode.sectionGap + secondH,
            placements: [
                { id: firstId, xOffset: 0, width: contentW, height: firstH, naturalHeight: firstH, fullWidthNaturalHeight: firstH },
                { id: secondId, xOffset: 0, width: contentW, height: secondH, naturalHeight: secondH, fullWidthNaturalHeight: secondH, newRow: true }
            ]
        });

        return candidates.reduce((best, candidate) => {
            if (!best) return candidate;
            if (candidate.score < best.score - 0.01) return candidate;
            if (Math.abs(candidate.score - best.score) <= 0.01 && candidate.totalHeight < best.totalHeight) return candidate;
            return best;
        }, null);
    }

    function placeAdaptivePair(pageBlocks, candidate, map, x, startY, modeName, mode) {
        let cursorY = startY;
        if (!candidate) return cursorY;

        if (candidate.kind === 'row') {
            candidate.placements.forEach(placement => {
                const unusedHeight = Math.max(0, candidate.totalHeight - placement.naturalHeight);
                const unusedHeightRatio = candidate.totalHeight > 0
                    ? unusedHeight / candidate.totalHeight
                    : 0;
                pageBlocks.push(cloneWithGeometry(
                    map.get(placement.id),
                    { x: x + placement.xOffset, y: cursorY, width: placement.width, height: placement.height },
                    {
                        density: modeName,
                        naturalHeight: placement.naturalHeight,
                        adaptiveComposition: true,
                        compositionAxis: 'row',
                        fullWidthNaturalHeight: placement.fullWidthNaturalHeight,
                        unusedHeight,
                        unusedHeightRatio
                    }
                ));
            });
            return cursorY + candidate.totalHeight + mode.sectionGap;
        }

        candidate.placements.forEach((placement, index) => {
            pageBlocks.push(cloneWithGeometry(
                map.get(placement.id),
                { x, y: cursorY, width: placement.width, height: placement.height },
                {
                    density: modeName,
                    naturalHeight: placement.naturalHeight,
                    adaptiveComposition: true,
                    compositionAxis: 'stack',
                    fullWidthNaturalHeight: placement.fullWidthNaturalHeight,
                    unusedHeight: 0,
                    unusedHeightRatio: 0
                }
            ));
            cursorY += placement.height + (index < candidate.placements.length - 1 ? mode.sectionGap : 0);
        });
        return cursorY + mode.sectionGap;
    }

    function buildPage(blocks, modeName, options = {}) {
        const mode = MODES[modeName];
        const map = byId(blocks);
        const x = mode.marginX;
        const contentW = PAGE.width - mode.marginX * 2;
        const pageBlocks = [];
        let y = mode.marginTop;

        const placeFull = (id, forcedH = null) => {
            const b = map.get(id);
            if (!b) return 0;
            const h = forcedH ?? measure(b, contentW, mode);
            pageBlocks.push(cloneWithGeometry(b, { x, y, width: contentW, height: h }, { density: modeName }));
            y += h + mode.sectionGap;
            return h;
        };

        placeFull('header', 39);
        placeFull('meetingStats', 17);

        const summary = map.get('executiveSummary');
        const metrics = map.get('keyMetrics');
        if (summary && metrics) {
            if (options.adaptiveExecutive === true) {
                const candidate = chooseAdaptivePairLayout(
                    'executiveSummary',
                    'keyMetrics',
                    map,
                    contentW,
                    mode,
                    0.435,
                    0.72,
                    0.38
                );
                y = placeAdaptivePair(pageBlocks, candidate, map, x, y, modeName, mode);
            } else {
                const gap = mode.columnGap;
                const leftW = (contentW - gap) * 0.435;
                const rightW = contentW - gap - leftW;
                const h1 = measure(summary, leftW, mode);
                const h2 = measure(metrics, rightW, mode);
                const rowH = Math.max(h1, h2);
                pageBlocks.push(cloneWithGeometry(summary, { x, y, width: leftW, height: rowH }, { density: modeName, naturalHeight: h1 }));
                pageBlocks.push(cloneWithGeometry(metrics, { x: x + leftW + gap, y, width: rightW, height: rowH }, { density: modeName, naturalHeight: h2 }));
                y += rowH + mode.sectionGap;
            }
        } else {
            if (summary) placeFull('executiveSummary');
            if (metrics) placeFull('keyMetrics');
        }

        const trio = ['insights','decisions','risks'].filter(id => map.has(id));
        if (trio.length) {
            const gap = mode.columnGap;

            const rowCandidate = (rows) => {
                let totalH = 0;
                let unusedHeight = 0;
                const placements = [];
                rows.forEach((rowIds, rowIndex) => {
                    const colW = (contentW - gap * (rowIds.length - 1)) / rowIds.length;
                    const hs = rowIds.map(id => measure(map.get(id), colW, mode));
                    const rowH = Math.max(...hs);
                    unusedHeight += hs.reduce((sum, h) => sum + Math.max(0, rowH - h), 0);
                    totalH += rowH + (rowIndex < rows.length - 1 ? mode.sectionGap : 0);
                    placements.push({ rowIds, colW, hs, rowH });
                });
                return { totalH, unusedHeight, score: totalH + unusedHeight * 0.24, placements };
            };

            let chosen;
            if (options.adaptiveExecutive === true && trio.length > 1) {
                const candidates = [];
                candidates.push(rowCandidate([trio]));
                if (trio.length === 3) {
                    trio.forEach(fullId => {
                        const pair = trio.filter(id => id !== fullId);
                        candidates.push(rowCandidate([pair, [fullId]]));
                        candidates.push(rowCandidate([[fullId], pair]));
                    });
                }
                candidates.push(rowCandidate(trio.map(id => [id])));
                chosen = candidates.reduce((best, c) => {
                    if (!best || c.score < best.score - 0.01) return c;
                    if (Math.abs(c.score - best.score) <= 0.01 && c.totalH < best.totalH) return c;
                    return best;
                }, null);
            } else {
                chosen = rowCandidate([trio]);
            }

            chosen.placements.forEach(row => {
                row.rowIds.forEach((id, i) => {
                    pageBlocks.push(cloneWithGeometry(
                        map.get(id),
                        { x: x + i * (row.colW + gap), y, width: row.colW, height: row.rowH },
                        {
                            density: modeName,
                            naturalHeight: row.hs[i],
                            adaptiveComposition: options.adaptiveExecutive === true,
                            unusedHeight: Math.max(0, row.rowH - row.hs[i])
                        }
                    ));
                });
                y += row.rowH + mode.sectionGap;
            });
        }

        const tasks = map.get('tasks');
        const architecture = map.get('architecture');
        if (tasks && architecture) {
            if (options.adaptiveExecutive === true) {
                const candidate = chooseAdaptivePairLayout('tasks', 'architecture', map, contentW, mode, 0.39);
                y = placeAdaptivePair(pageBlocks, candidate, map, x, y, modeName, mode);
            } else {
                const gap = mode.columnGap;
                const leftW = (contentW - gap) * 0.39;
                const rightW = contentW - gap - leftW;
                const h1 = measure(tasks, leftW, mode);
                const h2 = measure(architecture, rightW, mode);
                const rowH = Math.max(h1, h2);
                pageBlocks.push(cloneWithGeometry(tasks, { x, y, width: leftW, height: rowH }, { density: modeName, naturalHeight: h1 }));
                pageBlocks.push(cloneWithGeometry(architecture, { x: x + leftW + gap, y, width: rightW, height: rowH }, { density: modeName, naturalHeight: h2 }));
                y += rowH + mode.sectionGap;
            }
        } else {
            if (tasks) placeFull('tasks');
            if (architecture) placeFull('architecture');
        }

        const owners = map.get('owners');
        const footer = map.get('footer');
        const bottomBandH = 28;
        const bottomBandY = PAGE.height - mode.marginBottom - bottomBandH;

        if (owners || footer) {
            const bandY = Math.max(y, bottomBandY);

            if (owners) {
                pageBlocks.push(cloneWithGeometry(
                    owners,
                    { x, y: bandY, width: contentW, height: bottomBandH },
                    { density: modeName, sharedBottomBand: true }
                ));
            }

            if (footer) {
                pageBlocks.push(cloneWithGeometry(
                    footer,
                    { x, y: bandY, width: contentW, height: bottomBandH },
                    { density: modeName, sharedBottomBand: true }
                ));
            }

            y = bandY + bottomBandH;
        }

        const usedHeight = y + mode.marginBottom;
        return {
            mode: modeName,
            blocks: pageBlocks,
            usedHeight,
            fits: usedHeight <= PAGE.height + 0.01
        };
    }

    function buildContinuationPage(blocks, modeName) {
        const mode = MODES[modeName];
        const map = byId(blocks);
        const x = mode.marginX;
        const contentW = PAGE.width - mode.marginX * 2;
        const pageBlocks = [];
        let y = mode.marginTop;

        const header = map.get('header');
        if (header) {
            pageBlocks.push(cloneWithGeometry(header, { x, y, width: contentW, height: 39 }, { density: modeName, continuation: true }));
            y += 39 + mode.sectionGap;
        }

        const contentIds = ['tasks','architecture'].filter(id => map.has(id));
        const natural = contentIds.map(id => ({ id, block: map.get(id), h: measure(map.get(id), contentW, mode) }));
        const owners = map.get('owners');
        const footer = map.get('footer');
        const bottomBandH = (owners || footer) ? 28 : 0;
        const bottomBandY = PAGE.height - mode.marginBottom - bottomBandH;
        const interBlockGap = Math.max(0, natural.length - 1) * mode.sectionGap;
        const availableContentH = Math.max(0, bottomBandY - y - (bottomBandH ? mode.sectionGap : 0));
        const naturalBlocksH = natural.reduce((sum, item) => sum + item.h, 0);
        const naturalContentH = naturalBlocksH + interBlockGap;

        if (naturalContentH > availableContentH + 0.01) {
            return { mode: modeName, blocks: pageBlocks, usedHeight: PAGE.height + 1, fits: false };
        }

        const distributable = Math.max(0, availableContentH - naturalContentH);
        natural.forEach((item, index) => {
            const share = naturalBlocksH > 0 ? item.h / naturalBlocksH : 1 / Math.max(1, natural.length);
            const allocatedHeight = item.h + distributable * share;
            const contentScale = item.h > 0
                ? Math.max(1, Math.min(1.35, allocatedHeight / item.h))
                : 1;

            pageBlocks.push(cloneWithGeometry(item.block, { x, y, width: contentW, height: allocatedHeight }, {
                density: modeName,
                continuation: true,
                naturalHeight: item.h,
                allocatedHeight,
                contentScale,
                fillAvailableHeight: true
            }));
            y += allocatedHeight + (index < natural.length - 1 ? mode.sectionGap : 0);
        });

        if (owners || footer) {
            const bandY = bottomBandY;
            if (owners) {
                pageBlocks.push(cloneWithGeometry(owners, { x, y: bandY, width: contentW, height: bottomBandH }, {
                    density: modeName, continuation: true, sharedBottomBand: true
                }));
            }
            if (footer) {
                pageBlocks.push(cloneWithGeometry(footer, { x, y: bandY, width: contentW, height: bottomBandH }, {
                    density: modeName, continuation: true, sharedBottomBand: true
                }));
            }
            y = bandY + bottomBandH;
        }

        const usedHeight = y + mode.marginBottom;
        return { mode: modeName, blocks: pageBlocks, usedHeight, fits: usedHeight <= PAGE.height + 0.01 };
    }

    function trySemanticTwoPage(blocks) {
        const map = byId(blocks);
        const operational = ['tasks', 'architecture'].filter(id => map.has(id));
        if (!operational.length) return null;

        const hasOwners = map.has('owners');
        const transferCandidates = [];
        operational.forEach(id => {
            transferCandidates.push([id]);
            if (hasOwners) transferCandidates.push([id, 'owners']);
        });
        if (operational.length === 2) {
            transferCandidates.push(['tasks', 'architecture']);
            if (hasOwners) transferCandidates.push(['tasks', 'architecture', 'owners']);
        }

        const uniqueCandidates = [];
        const seen = new Set();
        transferCandidates.forEach(ids => {
            const ordered = ORDER.filter(id => ids.includes(id));
            const key = ordered.join('|');
            if (!seen.has(key)) {
                seen.add(key);
                uniqueCandidates.push(ordered);
            }
        });

        let best = null;
        for (const transfer of uniqueCandidates) {
            const pageOneIds = ORDER.filter(id => map.has(id) && !transfer.includes(id));
            const pageTwoIds = ['header', ...ORDER.filter(id => transfer.includes(id) && !['header','footer'].includes(id)), 'footer'];
            const pageOneBlocks = pageOneIds.map(id => map.get(id)).filter(Boolean);
            const pageTwoBlocks = pageTwoIds.map(id => map.get(id)).filter(Boolean);

            let first = null;
            for (const modeName of ['regular','compact','dense']) {
                const attempt = buildPage(pageOneBlocks, modeName, { adaptiveExecutive: true });
                if (attempt.fits) { first = attempt; break; }
            }
            if (!first) continue;

            let second = null;
            for (const modeName of ['regular','compact','dense']) {
                const attempt = buildContinuationPage(pageTwoBlocks, modeName);
                if (attempt.fits) { second = attempt; break; }
            }
            if (!second) continue;

            const contentW = PAGE.width - MODES.regular.marginX * 2;
            const movedMass = transfer.reduce((sum, id) => {
                const block = map.get(id);
                if (!block) return sum;
                return sum + (id === 'owners' ? 8 : measure(block, contentW, MODES.regular));
            }, 0);
            const score = transfer.length * 1000
                + movedMass
                + densityRank(first.mode) * 120
                + densityRank(second.mode) * 40;

            if (!best || score < best.score) {
                best = { score, transfer, first, second };
            }
        }

        if (!best) return null;

        return [
            { id:'page-1', number:1, index:0, kind:'executive', size:PAGE, density:best.first.mode, blocks:best.first.blocks, transferred:best.transfer },
            { id:'page-2', number:2, index:1, kind:'continuation', size:PAGE, density:best.second.mode, blocks:best.second.blocks, transferred:best.transfer }
        ];
    }

    function paginateSequential(blocks, modeName) {
        const mode = MODES[modeName];
        const contentW = PAGE.width - mode.marginX * 2;
        const maxY = PAGE.height - mode.marginBottom;
        const pages = [];
        let current = [], y = mode.marginTop;

        const pushPage = () => {
            if (!current.length) return;
            pages.push({
                id: `page-${pages.length + 1}`,
                number: pages.length + 1,
                index: pages.length,
                size: PAGE,
                blocks: current
            });
            current = [];
            y = mode.marginTop;
        };

        for (const block of blocks) {
            const h = measure(block, contentW, mode);
            if (current.length && y + h > maxY) pushPage();
            current.push(cloneWithGeometry(block, {
                x: mode.marginX, y,
                width: contentW,
                height: h
            }, { density: modeName, paginated: true, naturalHeight: h, unsplitFallback: true }));
            y += h + mode.sectionGap;
        }
        pushPage();
        return pages;
    }

    function validate(pages) {
        const diagnostics = [];
        for (const page of pages) {
            for (const block of page.blocks) {
                const g = block.geometry;
                if (!g || g.width <= 0 || g.height <= 0) {
                    diagnostics.push({ level: 'error', code: 'INVALID_GEOMETRY', blockId: idOf(block) });
                }
                if (g && (g.x < 0 || g.y < 0 || g.x + g.width > PAGE.width + .1 || g.y + g.height > PAGE.height + .1)) {
                    diagnostics.push({ level: 'error', code: 'OUTSIDE_PAGE', blockId: idOf(block), geometry: g });
                }
            }
        }
        if (pages.length > 2) {
            diagnostics.push({ level: 'warning', code: 'MORE_THAN_TWO_PAGES', pageCount: pages.length });
        }
        return diagnostics;
    }

    function layout(composition, options = {}) {
        ACTIVE_MEASURE_TEXT = typeof options.measureText === 'function' ? options.measureText : null;
        ACTIVE_TOKENS = options.tokens && typeof options.tokens === 'object' ? options.tokens : null;
        ACTIVE_TEXT_WIDTH_CACHE = new Map();
        ACTIVE_LINE_COUNT_CACHE = new Map();
        ACTIVE_BLOCK_MEASURE_CACHE = new WeakMap();
        const blocks = getBlocks(composition)
            .filter(Boolean)
            .sort((a, b) => {
                const ai = ORDER.indexOf(idOf(a)), bi = ORDER.indexOf(idOf(b));
                return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
            });

        if (!blocks.length) {
            return Object.freeze({
                pageCount: 0, valid: true, density: 'regular',
                pages: Object.freeze([]), diagnostics: Object.freeze([])
            });
        }

        let selected = null;
        const attempts = [];
        for (const modeName of ['regular','compact','dense']) {
            const attempt = buildPage(blocks, modeName, { adaptiveExecutive: true });
            attempts.push({ density: modeName, usedHeight: attempt.usedHeight, fits: attempt.fits, adaptive: true });
            if (attempt.fits) {
                selected = attempt;
                break;
            }
        }

        let pages;
        let density;
        if (selected) {
            density = selected.mode;
            pages = [{
                id: 'page-1', number: 1, index: 0,
                kind: 'executive',
                size: PAGE,
                blocks: selected.blocks
            }];
        } else {
            const semanticPages = trySemanticTwoPage(blocks);
            if (semanticPages) {
                pages = semanticPages;
                density = semanticPages.some(p => p.density === 'dense')
                    ? 'dense'
                    : semanticPages.some(p => p.density === 'compact') ? 'compact' : 'regular';
            } else {
                density = 'dense';
                pages = paginateSequential(blocks, density);
            }
        }

        const diagnostics = validate(pages);
        return Object.freeze({
            pageCount: pages.length,
            valid: !diagnostics.some(d => d.level === 'error'),
            density,
            size: PAGE,
            pages: Object.freeze(pages.map(p => Object.freeze(p))),
            diagnostics: Object.freeze(diagnostics),
            attempts: Object.freeze(attempts)
        });
    }

    global.MeetMindLayoutEngine = Object.freeze({
        version: 'golden-1.9.0-pdf-hardening-v2',
        PAGE,
        MODES,
        layout
    });

})(window);
