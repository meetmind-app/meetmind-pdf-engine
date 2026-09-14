/**
 * LOREVI Executive PDF — Architecture & Process v2
 *
 * Semantic contract:
 * - process/flow arrows are rendered ONLY when explicitly supported by report_json;
 * - components are rendered as non-directional semantic blocks;
 * - mixed architecture sections are supported;
 * - no content truncation: every supplied section and item is rendered;
 * - geometry is measured before drawing and can use multiple section rows.
 */
(function attachArchitectureV2(globalScope) {
    'use strict';

    const host = globalScope.ExecutiveSlideEngine || (globalScope.ExecutiveSlideEngine = {});
    const previous = host.blockRenderers || {};

    const TITLES = Object.freeze({
        en: 'Architecture & Process',
        ru: 'Архитектура и процесс',
        es: 'Arquitectura y proceso',
        pt: 'Arquitetura e processo',
        tr: 'Mimari ve Süreç',
        id: 'Arsitektur & Proses',
        hi: 'आर्किटेक्चर और प्रक्रिया',
        ar: 'البنية والعملية',
        uz: 'Arxitektura va jarayon',
        fa: 'معماری و فرایند'
    });

    const ACCENTS = Object.freeze(['purplePrimary', 'greenSuccess', 'orangeRisk', 'purplePrimary']);
    const TYPE_ICONS = Object.freeze({
        process: 'settings',
        workflow: 'settings',
        system: 'box',
        integration: 'network',
        data: 'database',
        other: 'file-text'
    });
    const ITEM_ICON_SIZE = 6.4;
    const ITEM_ICON_GAP = 3.2;
    const DESIGN_MIN_SCALE = 0.78;
    const EMERGENCY_MIN_SCALE = 0.24;

    function clean(value) {
        return value === null || value === undefined
            ? ''
            : String(value).replace(/\s+/g, ' ').trim();
    }

    function language(ctx) {
        const raw = String(
            ctx?.options?.language ||
            ctx?.options?.report_language ||
            ctx?.report?.report_language ||
            ctx?.report?.language ||
            'en'
        ).trim().toLowerCase().replace(/_/g, '-');
        const base = raw.split('-')[0] === 'in' ? 'id' : raw.split('-')[0];
        return TITLES[base] ? base : 'en';
    }

    function density(ctx) {
        return ctx?.density || 'regular';
    }

    function spacing(ctx) {
        const token = ctx?.tokens?.spacing?.[density(ctx)] || {};
        return {
            padX: Number(token.cardPaddingX ?? token.cardPadding ?? 6),
            padY: Number(token.cardPaddingY ?? token.cardPadding ?? 5),
            titleGap: Number(token.titleGap ?? 3),
            cardGap: Number(token.cardGap ?? 3)
        };
    }

    function style(ctx, name, fallback) {
        const token = ctx?.tokens?.typography?.tokens?.[name];
        if (!token) return fallback;
        const d = density(ctx);
        return {
            font: token.font || fallback.font,
            size: Number(token.size?.[d] ?? token.size?.regular ?? fallback.size),
            lineHeight: Number(token.lineHeight?.[d] ?? token.lineHeight?.regular ?? fallback.lineHeight),
            color: token.color || fallback.color
        };
    }

    function measure(ctx, text, textStyle) {
        return ctx.measureText(clean(text), textStyle.font, textStyle.size);
    }

    function wrap(ctx, text, width, textStyle) {
        const source = clean(text);
        if (!source) return [];
        const out = [];
        let line = '';
        for (const word of source.split(/\s+/)) {
            const candidate = line ? `${line} ${word}` : word;
            if (measure(ctx, candidate, textStyle) <= width) {
                line = candidate;
                continue;
            }
            if (line) out.push(line);
            line = '';
            let fragment = '';
            for (const char of Array.from(word)) {
                const next = fragment + char;
                if (fragment && measure(ctx, next, textStyle) > width) {
                    out.push(fragment);
                    fragment = char;
                } else {
                    fragment = next;
                }
            }
            line = fragment;
        }
        if (line) out.push(line);
        return out;
    }

    function drawLines(ctx, lines, x, y, textStyle, alignWidth = 0, align = 'left') {
        lines.forEach((line, index) => {
            let tx = x;
            if (alignWidth > 0 && align !== 'left') {
                const width = measure(ctx, line, textStyle);
                if (align === 'center') tx += Math.max(0, (alignWidth - width) / 2);
                if (align === 'right') tx += Math.max(0, alignWidth - width);
            }
            ctx.text(line, {
                x: tx,
                y: y + index * textStyle.lineHeight,
                size: textStyle.size,
                font: textStyle.font,
                color: textStyle.color
            });
        });
        return lines.length * textStyle.lineHeight;
    }

    function nodePath(tag, attrs) {
        const n = value => Number(value || 0);
        if (tag === 'path') return String(attrs.d || '');
        if (tag === 'line') return `M ${n(attrs.x1)} ${n(attrs.y1)} L ${n(attrs.x2)} ${n(attrs.y2)}`;
        if (tag === 'polyline') {
            const points = String(attrs.points || '').trim().split(/\s+/)
                .map(value => value.split(',').map(Number))
                .filter(point => point.length === 2 && point.every(Number.isFinite));
            if (!points.length) return '';
            return `M ${points[0][0]} ${points[0][1]} ` + points.slice(1).map(point => `L ${point[0]} ${point[1]}`).join(' ');
        }
        if (tag === 'rect') {
            const x = n(attrs.x), y = n(attrs.y), w = n(attrs.width), h = n(attrs.height);
            return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
        }
        if (tag === 'circle') {
            const cx = n(attrs.cx), cy = n(attrs.cy), r = n(attrs.r);
            const k = 0.5522847498307936, c = r * k;
            return `M ${cx + r} ${cy} C ${cx + r} ${cy + c} ${cx + c} ${cy + r} ${cx} ${cy + r} ` +
                `C ${cx - c} ${cy + r} ${cx - r} ${cy + c} ${cx - r} ${cy} ` +
                `C ${cx - r} ${cy - c} ${cx - c} ${cy - r} ${cx} ${cy - r} ` +
                `C ${cx + c} ${cy - r} ${cx + r} ${cy - c} ${cx + r} ${cy} Z`;
        }
        return '';
    }

    function drawIcon(ctx, name, x, y, size, color) {
        const registry = host.icons;
        const def = registry?.get?.(name);
        if (!def || typeof ctx.svgPath !== 'function') return;
        const drawY = y - size * 1.08;
        const stroke = Math.max(.46, Math.min(.7, size * .055));
        def.nodes.forEach(([tag, attrs]) => {
            const path = nodePath(tag, attrs || {});
            if (path) ctx.svgPath(path, { x, y: drawY, size, stroke: color, borderWidth: stroke });
        });
    }

    function drawHorizontalConnector(ctx, x, y, width, color) {
        const startX = x + 2;
        const tipX = x + width - 2;
        ctx.line({ x1: startX, y1: y, x2: tipX, y2: y, color, thickness: .55 });
        ctx.line({ x1: tipX, y1: y, x2: tipX - 2.4, y2: y - 2, color, thickness: .55 });
        ctx.line({ x1: tipX, y1: y, x2: tipX - 2.4, y2: y + 2, color, thickness: .55 });
    }

    function drawVerticalConnector(ctx, x, y, height, color) {
        const tipY = y + height;
        ctx.line({ x1: x, y1: y, x2: x, y2: tipY, color, thickness: .55 });
        ctx.line({ x1: x, y1: tipY, x2: x - 2, y2: tipY - 2.4, color, thickness: .55 });
        ctx.line({ x1: x, y1: tipY, x2: x + 2, y2: tipY - 2.4, color, thickness: .55 });
    }

    function architectureData(block, report) {
        const raw = block?.data ?? block?.content ?? block?.items ?? block?.value ?? report?.architecture;
        if (Array.isArray(raw)) return { mode: '', sections: raw };
        if (raw && typeof raw === 'object') {
            const sections = Array.isArray(raw.sections) ? raw.sections : [];
            return { ...raw, sections };
        }
        const reportArchitecture = report?.architecture;
        if (Array.isArray(reportArchitecture)) return { mode: '', sections: reportArchitecture };
        if (reportArchitecture && typeof reportArchitecture === 'object') {
            return {
                ...reportArchitecture,
                sections: Array.isArray(reportArchitecture.sections) ? reportArchitecture.sections : []
            };
        }
        return { mode: '', sections: [] };
    }

    function explicitMode(section, root) {
        const value = clean(
            section?.layout || section?.mode || section?.kind ||
            root?.layout || root?.mode || root?.kind
        ).toLowerCase();
        return ['process', 'flow', 'pipeline', 'sequence', 'workflow'].includes(value)
            ? 'process'
            : 'components';
    }

    function itemText(item) {
        return {
            title: clean(item?.title || item?.name || item?.label),
            description: clean(item?.description || item?.text),
            type: clean(item?.type).toLowerCase() || 'other'
        };
    }

    function scaled(base, scale) {
        return {
            ...base,
            size: base.size * scale,
            lineHeight: base.lineHeight * scale
        };
    }

    function itemGeometry(originX, width, scale, iconOffset = 0) {
        const iconSize = ITEM_ICON_SIZE * scale;
        const iconGap = Math.max(2.2, ITEM_ICON_GAP * scale);
        const iconX = originX + iconOffset;
        const textX = iconX + iconSize + iconGap;
        const textRight = originX + width - 2;
        return {
            iconX,
            iconSize,
            textX,
            textWidth: Math.max(4, textRight - textX)
        };
    }

    function measureComponentGrid(ctx, items, width, titleStyle, descStyle, columns, gap, scale) {
        if (!items.length) return { height: 0, rows: [] };
        const cellW = (width - gap * (columns - 1)) / columns;
        const rows = Math.ceil(items.length / columns);
        let total = 0;
        const measuredRows = [];
        for (let row = 0; row < rows; row += 1) {
            let rowHeight = 0;
            const measuredItems = [];
            for (let col = 0; col < columns; col += 1) {
                const item = items[row * columns + col];
                if (!item) continue;
                const data = itemText(item);
                const geometry = itemGeometry(0, cellW, scale);
                const titleLines = wrap(ctx, data.title, geometry.textWidth, titleStyle);
                const descLines = data.description ? wrap(ctx, data.description, geometry.textWidth, descStyle) : [];
                const h = Math.max(geometry.iconSize, titleLines.length * titleStyle.lineHeight)
                    + (descLines.length ? descLines.length * descStyle.lineHeight + 1 : 0)
                    + 4;
                rowHeight = Math.max(rowHeight, h);
                measuredItems.push({ col, data, titleLines, descLines });
            }
            measuredRows.push({ height: rowHeight, items: measuredItems });
            total += rowHeight + (row < rows - 1 ? gap : 0);
        }
        return { height: total, rows: measuredRows, columns, cellW, gap };
    }

    function measureProcess(ctx, items, width, titleStyle, descStyle, horizontal, gap, scale) {
        if (!items.length) return { height: 0, items: [], horizontal };
        if (!horizontal) {
            let height = 0;
            const measuredItems = items.map((item, index) => {
                const data = itemText(item);
                const geometry = itemGeometry(0, width, scale);
                const titleLines = wrap(ctx, data.title, geometry.textWidth, titleStyle);
                const descLines = data.description ? wrap(ctx, data.description, geometry.textWidth, descStyle) : [];
                const itemHeight = Math.max(
                    geometry.iconSize,
                    titleLines.length * titleStyle.lineHeight + descLines.length * descStyle.lineHeight
                );
                height += itemHeight + (index < items.length - 1 ? 2 + 7 * scale : 0);
                return { data, titleLines, descLines, itemHeight };
            });
            return { height, items: measuredItems, horizontal };
        }
        const arrowSpace = 12;
        const stepW = Math.max(34, (width - arrowSpace * (items.length - 1)) / items.length);
        let maxH = 0;
        const measuredItems = items.map(item => {
            const data = itemText(item);
            const geometry = itemGeometry(0, stepW, scale, 4);
            const titleLines = wrap(ctx, data.title, geometry.textWidth, titleStyle);
            const descLines = data.description ? wrap(ctx, data.description, geometry.textWidth, descStyle) : [];
            const h = Math.max(geometry.iconSize, titleLines.length * titleStyle.lineHeight)
                + (descLines.length ? descLines.length * descStyle.lineHeight + 1 : 0)
                + 6;
            maxH = Math.max(maxH, h);
            return { data, titleLines, descLines };
        });
        return {
            height: Math.max(28, maxH),
            items: measuredItems,
            horizontal,
            stepW,
            arrowSpace
        };
    }

    function splitSectionRows(sections) {
        const rows = [];
        for (let index = 0; index < sections.length; index += 4) {
            rows.push(sections.slice(index, index + 4));
        }
        return rows;
    }

    function measureArchitectureRows(ctx, sections, root, innerW, sectionGap, scale, bases) {
        const rows = splitSectionRows(sections);
        const measuredRows = rows.map((rowSections, rowIndex) => {
            const sectionW = (innerW - sectionGap * (rowSections.length - 1)) / rowSections.length;
            const measuredSections = rowSections.map((section, indexInRow) => {
                const logicalIndex = rowIndex * 4 + indexInRow;
                const items = Array.isArray(section?.items) ? section.items : [];
                const mode = explicitMode(section, root);
                const title = clean(section?.title || section?.name || section?.label);
                const sectionInnerW = Math.max(4, sectionW - 12);
                const noStyle = scaled(bases.sectionNo, scale);
                const titleStyle = scaled(bases.sectionTitle, scale);
                const itemStyle = scaled(bases.itemTitle, scale);
                const descStyle = scaled(bases.description, scale);
                const titleW = Math.max(4, sectionInnerW - 18);
                const titleLines = wrap(ctx, title, titleW, titleStyle);
                const headerHeight = Math.max(noStyle.lineHeight, titleLines.length * titleStyle.lineHeight);
                const horizontal = mode === 'process'
                    && items.length > 1
                    && items.length <= 4
                    && sectionInnerW / items.length >= 62;
                const body = mode === 'process'
                    ? measureProcess(ctx, items, sectionInnerW, itemStyle, descStyle, horizontal, 3, scale)
                    : measureComponentGrid(
                        ctx,
                        items,
                        sectionInnerW,
                        itemStyle,
                        descStyle,
                        sectionInnerW >= 210 && items.length > 1 ? 2 : 1,
                        3,
                        scale
                    );
                return {
                    section,
                    logicalIndex,
                    mode,
                    titleLines,
                    noStyle,
                    titleStyle,
                    itemStyle,
                    descStyle,
                    sectionInnerW,
                    titleW,
                    headerHeight,
                    body,
                    height: 6 + headerHeight + 5 + body.height + 4
                };
            });
            return {
                sections: measuredSections,
                sectionW,
                height: Math.max(24, ...measuredSections.map(section => section.height))
            };
        });
        return {
            rows: measuredRows,
            height: measuredRows.reduce((sum, row) => sum + row.height, 0)
                + Math.max(0, measuredRows.length - 1) * sectionGap
        };
    }

    function fitArchitecture(ctx, sections, root, innerW, sectionGap, preferredScale, availableHeight, bases) {
        let scale = Math.max(DESIGN_MIN_SCALE, Math.min(1.35, preferredScale || 1));
        let measured = measureArchitectureRows(ctx, sections, root, innerW, sectionGap, scale, bases);
        while (scale > DESIGN_MIN_SCALE + .001 && measured.height > availableHeight + .01) {
            scale = Math.max(DESIGN_MIN_SCALE, Number((scale - .02).toFixed(2)));
            measured = measureArchitectureRows(ctx, sections, root, innerW, sectionGap, scale, bases);
        }
        while (scale > EMERGENCY_MIN_SCALE + .001 && measured.height > availableHeight + .01) {
            scale = Math.max(EMERGENCY_MIN_SCALE, Number((scale - .02).toFixed(2)));
            measured = measureArchitectureRows(ctx, sections, root, innerW, sectionGap, scale, bases);
        }
        return { scale, measured };
    }

    function renderArchitectureV2(block, ctx) {
        const g = block.geometry;
        const sp = spacing(ctx);
        const data = architectureData(block, ctx.report || {});
        const sections = data.sections;

        ctx.rect({
            x: g.x, y: g.y, width: g.width, height: g.height,
            fill: 'cardBg', stroke: 'borderDefault', borderWidth: .5, radius: 4
        });

        const heading = style(ctx, 'blockTitle', { font: 'bold', size: 8.2, lineHeight: 9.8, color: 'textPrimary' });
        drawIcon(ctx, 'settings', g.x + sp.padX, g.y + sp.padY + 1.2, 9.2, 'purplePrimary');
        ctx.text(TITLES[language(ctx)], {
            x: g.x + sp.padX + 13.2,
            y: g.y + sp.padY,
            size: heading.size,
            font: heading.font,
            color: 'purplePrimary'
        });

        const contentY = g.y + sp.padY + heading.lineHeight + sp.titleGap;
        const bottom = g.y + g.height - sp.padY;
        const availableHeight = Math.max(0, bottom - contentY);
        if (!sections.length) return;

        const sectionGap = sp.cardGap;
        const innerX = g.x + sp.padX;
        const innerW = g.width - sp.padX * 2;
        // RenderContext mirrors all geometry and shaped text for fa/ar. Keep
        // coordinates in logical LTR space here to avoid reversing RTL twice.

        const sectionNoBase = style(ctx, 'architectureSectionNo', { font: 'bold', size: 6.5, lineHeight: 7.5, color: 'textPrimary' });
        const sectionTitleBase = style(ctx, 'architectureSectionTitle', { font: 'bold', size: 6.3, lineHeight: 7.7, color: 'textPrimary' });
        const itemTitleBase = style(ctx, 'architectureItemTitle', { font: 'semibold', size: 5.1, lineHeight: 6.2, color: 'textPrimary' });
        const descBase = style(ctx, 'architectureDescription', { font: 'regular', size: 4.6, lineHeight: 5.6, color: 'textSecondary' });

        const bases = {
            sectionNo: sectionNoBase,
            sectionTitle: sectionTitleBase,
            itemTitle: itemTitleBase,
            description: descBase
        };
        const preferredScale = Number(block?.layout?.contentScale) || 1;
        const fitted = fitArchitecture(
            ctx,
            sections,
            data,
            innerW,
            sectionGap,
            preferredScale,
            availableHeight,
            bases
        );
        const scale = fitted.scale;
        const measuredRows = fitted.measured.rows;
        if (scale < DESIGN_MIN_SCALE - .001) {
            console.warn('ARCHITECTURE_EMERGENCY_SCALE', {
                scale,
                requiredHeight: fitted.measured.height,
                availableHeight,
                sections: sections.length
            });
        }
        if (fitted.measured.height > availableHeight + .5) {
            console.warn('ARCHITECTURE_LAYOUT_OVERFLOW', {
                requiredHeight: fitted.measured.height,
                availableHeight,
                sections: sections.length
            });
        }

        const extraPerRow = measuredRows.length
            ? Math.max(0, availableHeight - fitted.measured.height) / measuredRows.length
            : 0;
        let rowY = contentY;

        measuredRows.forEach(row => {
            const rowHeight = row.height + extraPerRow;
            row.sections.forEach((sectionModel, indexInRow) => {
                const visualIndex = indexInRow;
                const x = innerX + visualIndex * (row.sectionW + sectionGap);
                const sectionInnerX = x + 6;
                const accent = ACCENTS[sectionModel.logicalIndex % ACCENTS.length];
                ctx.rect({
                    x, y: rowY, width: row.sectionW, height: rowHeight,
                    fill: 'cardBg', stroke: 'borderDefault', borderWidth: .5, radius: 3
                });

                ctx.text(String(sectionModel.logicalIndex + 1), {
                    x: sectionInnerX,
                    y: rowY + 6,
                    size: sectionModel.noStyle.size,
                    font: sectionModel.noStyle.font,
                    color: accent
                });
                drawLines(
                    ctx,
                    sectionModel.titleLines,
                    sectionInnerX + 13,
                    rowY + 6,
                    sectionModel.titleStyle,
                    sectionModel.titleW,
                    'left'
                );
                let y = rowY + 6 + sectionModel.headerHeight + 5;

                if (sectionModel.mode === 'process' && sectionModel.body.horizontal) {
                    const { stepW, arrowSpace } = sectionModel.body;
                    sectionModel.body.items.forEach((item, itemIndex) => {
                        const visualItemIndex = itemIndex;
                        const stepX = sectionInnerX + visualItemIndex * (stepW + arrowSpace);
                        const geometry = itemGeometry(stepX, stepW, scale, 4);
                        const iconName = TYPE_ICONS[item.data.type] || TYPE_ICONS.process;
                        ctx.rect({
                            x: stepX,
                            y,
                            width: stepW,
                            height: Math.max(sectionModel.body.height, rowY + rowHeight - y - 4),
                            fill: 'cardBg',
                            stroke: 'borderDefault',
                            borderWidth: .35,
                            radius: 2.5
                        });
                        drawIcon(ctx, iconName, geometry.iconX, y + 6, geometry.iconSize, accent);
                        let itemY = y + 5;
                        itemY += drawLines(
                            ctx,
                            item.titleLines,
                            geometry.textX,
                            itemY,
                            sectionModel.itemStyle,
                            geometry.textWidth,
                            'left'
                        );
                        if (item.descLines.length) {
                            itemY += 1;
                            drawLines(
                                ctx,
                                item.descLines,
                                geometry.textX,
                                itemY,
                                sectionModel.descStyle,
                                geometry.textWidth,
                                'left'
                            );
                        }

                        if (itemIndex < sectionModel.body.items.length - 1) {
                            const connectorX = sectionInnerX
                                + (itemIndex + 1) * stepW
                                + itemIndex * arrowSpace;
                            drawHorizontalConnector(ctx, connectorX, y + 10, arrowSpace, 'textMuted');
                        }
                    });
                } else if (sectionModel.mode === 'process') {
                    sectionModel.body.items.forEach((item, itemIndex) => {
                        const geometry = itemGeometry(sectionInnerX, sectionModel.sectionInnerW, scale);
                        const iconName = TYPE_ICONS[item.data.type] || TYPE_ICONS.process;
                        drawIcon(ctx, iconName, geometry.iconX, y + 4, geometry.iconSize, accent);
                        let itemY = y;
                        itemY += drawLines(
                            ctx,
                            item.titleLines,
                            geometry.textX,
                            itemY,
                            sectionModel.itemStyle,
                            geometry.textWidth,
                            'left'
                        );
                        if (item.descLines.length) {
                            drawLines(
                                ctx,
                                item.descLines,
                                geometry.textX,
                                itemY,
                                sectionModel.descStyle,
                                geometry.textWidth,
                                'left'
                            );
                        }
                        y += item.itemHeight;
                        if (itemIndex < sectionModel.body.items.length - 1) {
                            y += 2;
                            drawVerticalConnector(
                                ctx,
                                sectionInnerX + ITEM_ICON_SIZE * scale / 2,
                                y,
                                5 * scale,
                                'textMuted'
                            );
                            y += 7 * scale;
                        }
                    });
                } else {
                    const componentGrid = sectionModel.body;
                    let componentY = y;
                    componentGrid.rows.forEach((componentRow, rowIndex) => {
                        componentRow.items.forEach(item => {
                            const visualCol = item.col;
                            const cellX = sectionInnerX + visualCol * (componentGrid.cellW + componentGrid.gap);
                            const geometry = itemGeometry(cellX, componentGrid.cellW, scale);
                            const iconName = TYPE_ICONS[item.data.type] || TYPE_ICONS.other;
                            drawIcon(ctx, iconName, geometry.iconX, componentY + 4, geometry.iconSize, accent);
                            let itemY = componentY;
                            itemY += drawLines(
                                ctx,
                                item.titleLines,
                                geometry.textX,
                                itemY,
                                sectionModel.itemStyle,
                                geometry.textWidth,
                                'left'
                            );
                            if (item.descLines.length) {
                                itemY += 1;
                                drawLines(
                                    ctx,
                                    item.descLines,
                                    geometry.textX,
                                    itemY,
                                    sectionModel.descStyle,
                                    geometry.textWidth,
                                    'left'
                                );
                            }
                        });
                        componentY += componentRow.height
                            + (rowIndex < componentGrid.rows.length - 1 ? componentGrid.gap : 0);
                    });
                }
            });
            rowY += rowHeight + sectionGap;
        });
    }

    host.blockRenderers = Object.freeze({
        ...previous,
        architecture: renderArchitectureV2,
        version: `${previous.version || 'block-renderers'}+architecture-v2`
    });

})(window);
