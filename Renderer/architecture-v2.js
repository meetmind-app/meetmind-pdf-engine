/**
 * LOREVI Executive PDF — Architecture & Process v2
 *
 * Semantic contract:
 * - process/flow arrows are rendered ONLY when explicitly supported by report_json;
 * - components are rendered as non-directional semantic blocks;
 * - mixed architecture sections are supported;
 * - no content truncation. If immutable geometry is insufficient, throw.
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

    function isRtl(ctx) {
        return ['ar', 'fa'].includes(language(ctx));
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

    function measureComponentGrid(ctx, items, width, titleStyle, descStyle, columns, gap) {
        if (!items.length) return 0;
        const cellW = (width - gap * (columns - 1)) / columns;
        const rows = Math.ceil(items.length / columns);
        let total = 0;
        for (let row = 0; row < rows; row += 1) {
            let rowHeight = 0;
            for (let col = 0; col < columns; col += 1) {
                const item = items[row * columns + col];
                if (!item) continue;
                const data = itemText(item);
                const textW = Math.max(25, cellW - 14);
                const h = Math.max(8, wrap(ctx, data.title, textW, titleStyle).length * titleStyle.lineHeight)
                    + (data.description ? wrap(ctx, data.description, textW, descStyle).length * descStyle.lineHeight + 1 : 0)
                    + 4;
                rowHeight = Math.max(rowHeight, h);
            }
            total += rowHeight + (row < rows - 1 ? gap : 0);
        }
        return total;
    }

    function measureProcess(ctx, items, width, titleStyle, descStyle, horizontal, gap) {
        if (!items.length) return 0;
        if (!horizontal) {
            return items.reduce((sum, item, index) => {
                const data = itemText(item);
                const textW = Math.max(25, width - 16);
                const h = Math.max(8, wrap(ctx, data.title, textW, titleStyle).length * titleStyle.lineHeight)
                    + (data.description ? wrap(ctx, data.description, textW, descStyle).length * descStyle.lineHeight + 1 : 0)
                    + 4;
                return sum + h + (index < items.length - 1 ? gap + 6 : 0);
            }, 0);
        }
        const arrowSpace = 12;
        const stepW = Math.max(34, (width - arrowSpace * (items.length - 1)) / items.length);
        let maxH = 0;
        items.forEach(item => {
            const data = itemText(item);
            const textW = Math.max(22, stepW - 12);
            const h = Math.max(8, wrap(ctx, data.title, textW, titleStyle).length * titleStyle.lineHeight)
                + (data.description ? wrap(ctx, data.description, textW, descStyle).length * descStyle.lineHeight + 1 : 0)
                + 6;
            maxH = Math.max(maxH, h);
        });
        return maxH;
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
        const sectionCount = Math.min(4, sections.length);
        const innerX = g.x + sp.padX;
        const innerW = g.width - sp.padX * 2;
        const sectionW = (innerW - sectionGap * (sectionCount - 1)) / sectionCount;
        const rtl = isRtl(ctx);

        const sectionNoBase = style(ctx, 'architectureSectionNo', { font: 'bold', size: 6.5, lineHeight: 7.5, color: 'textPrimary' });
        const sectionTitleBase = style(ctx, 'architectureSectionTitle', { font: 'bold', size: 6.3, lineHeight: 7.7, color: 'textPrimary' });
        const itemTitleBase = style(ctx, 'architectureItemTitle', { font: 'semibold', size: 5.1, lineHeight: 6.2, color: 'textPrimary' });
        const descBase = style(ctx, 'architectureDescription', { font: 'regular', size: 4.6, lineHeight: 5.6, color: 'textSecondary' });

        sections.slice(0, sectionCount).forEach((section, logicalIndex) => {
            const visualIndex = rtl ? sectionCount - 1 - logicalIndex : logicalIndex;
            const x = innerX + visualIndex * (sectionW + sectionGap);
            const accent = ACCENTS[logicalIndex % ACCENTS.length];
            ctx.rect({
                x, y: contentY, width: sectionW, height: availableHeight,
                fill: 'cardBg', stroke: 'borderDefault', borderWidth: .5, radius: 3
            });

            const items = Array.isArray(section?.items) ? section.items : [];
            const mode = explicitMode(section, data);
            const sectionTitle = clean(section?.title || section?.name || section?.label);
            const sectionInnerX = x + 6;
            const sectionInnerW = sectionW - 12;
            let scale = Math.max(.78, Math.min(1.35, Number(block?.layout?.contentScale) || 1));

            function requiredHeight(testScale) {
                const noStyle = scaled(sectionNoBase, testScale);
                const titleStyle = scaled(sectionTitleBase, testScale);
                const itemStyle = scaled(itemTitleBase, testScale);
                const descStyle = scaled(descBase, testScale);
                const titleW = Math.max(25, sectionInnerW - 18);
                const sectionHeaderH = Math.max(noStyle.lineHeight, wrap(ctx, sectionTitle, titleW, titleStyle).length * titleStyle.lineHeight) + 5;
                const itemAreaW = sectionInnerW;
                if (mode === 'process') {
                    const horizontal = items.length > 1 && items.length <= 4 && itemAreaW / items.length >= 62;
                    return sectionHeaderH + measureProcess(ctx, items, itemAreaW, itemStyle, descStyle, horizontal, 3);
                }
                const columns = itemAreaW >= 210 && items.length > 1 ? 2 : 1;
                return sectionHeaderH + measureComponentGrid(ctx, items, itemAreaW, itemStyle, descStyle, columns, 3);
            }

            while (scale > .78 && requiredHeight(scale) > availableHeight - 8) scale -= .04;
            if (requiredHeight(scale) > availableHeight - 7 + .5) {
                throw new Error(
                    `ARCHITECTURE_LAYOUT_UNDERSIZED: section ${logicalIndex + 1} requires more height than allocated.`
                );
            }

            const noStyle = scaled(sectionNoBase, scale);
            const sectionTitleStyle = scaled(sectionTitleBase, scale);
            const itemTitleStyle = scaled(itemTitleBase, scale);
            const descStyle = scaled(descBase, scale);
            const titleW = Math.max(25, sectionInnerW - 18);

            ctx.text(String(logicalIndex + 1), {
                x: sectionInnerX,
                y: contentY + 6,
                size: noStyle.size,
                font: noStyle.font,
                color: accent
            });
            const sectionTitleLines = wrap(ctx, sectionTitle, titleW, sectionTitleStyle);
            const titleX = sectionInnerX + 13;
            drawLines(ctx, sectionTitleLines, titleX, contentY + 6, sectionTitleStyle, titleW, rtl ? 'right' : 'left');
            let y = contentY + 6 + Math.max(noStyle.lineHeight, sectionTitleLines.length * sectionTitleStyle.lineHeight) + 5;

            if (mode === 'process') {
                const horizontal = items.length > 1 && items.length <= 4 && sectionInnerW / items.length >= 62;
                if (horizontal) {
                    const arrowSpace = 12;
                    const stepW = Math.max(34, (sectionInnerW - arrowSpace * (items.length - 1)) / Math.max(1, items.length));
                    items.forEach((item, itemIndex) => {
                        const visualItemIndex = rtl ? items.length - 1 - itemIndex : itemIndex;
                        const stepX = sectionInnerX + visualItemIndex * (stepW + arrowSpace);
                        const itemData = itemText(item);
                        const iconName = TYPE_ICONS[itemData.type] || TYPE_ICONS.process;
                        const textX = stepX + 10;
                        const textW = Math.max(20, stepW - 12);
                        ctx.rect({
                            x: stepX, y, width: stepW, height: Math.max(28, bottom - y - 4),
                            fill: 'cardBg', stroke: 'borderDefault', borderWidth: .35, radius: 2.5
                        });
                        drawIcon(ctx, iconName, stepX + 4, y + 6, 6.4 * scale, accent);
                        const titleLines = wrap(ctx, itemData.title, textW, itemTitleStyle);
                        let itemY = y + 5;
                        itemY += drawLines(ctx, titleLines, textX, itemY, itemTitleStyle, textW, rtl ? 'right' : 'left');
                        if (itemData.description) {
                            const descLines = wrap(ctx, itemData.description, textW, descStyle);
                            itemY += 1;
                            drawLines(ctx, descLines, textX, itemY, descStyle, textW, rtl ? 'right' : 'left');
                        }

                        if (itemIndex < items.length - 1) {
                            const arrow = rtl ? '←' : '→';
                            const arrowStyle = scaled({ font: 'bold', size: 7.2, lineHeight: 8, color: 'textMuted' }, scale);
                            const arrowVisualIndex = rtl ? items.length - 2 - itemIndex : itemIndex;
                            const arrowX = sectionInnerX + (arrowVisualIndex + 1) * stepW + arrowVisualIndex * arrowSpace + 2;
                            ctx.text(arrow, {
                                x: arrowX,
                                y: y + 9,
                                size: arrowStyle.size,
                                font: arrowStyle.font,
                                color: arrowStyle.color
                            });
                        }
                    });
                } else {
                    items.forEach((item, itemIndex) => {
                        const itemData = itemText(item);
                        const iconName = TYPE_ICONS[itemData.type] || TYPE_ICONS.process;
                        drawIcon(ctx, iconName, sectionInnerX, y + 4, 6.4 * scale, accent);
                        const textX = sectionInnerX + 10;
                        const textW = sectionInnerW - 10;
                        const titleLines = wrap(ctx, itemData.title, textW, itemTitleStyle);
                        y += drawLines(ctx, titleLines, textX, y, itemTitleStyle, textW, rtl ? 'right' : 'left');
                        if (itemData.description) {
                            const descLines = wrap(ctx, itemData.description, textW, descStyle);
                            y += drawLines(ctx, descLines, textX, y, descStyle, textW, rtl ? 'right' : 'left');
                        }
                        if (itemIndex < items.length - 1) {
                            y += 2;
                            ctx.text('↓', {
                                x: rtl ? sectionInnerX + sectionInnerW - 7 : sectionInnerX + 2,
                                y,
                                size: 6.8 * scale,
                                font: 'bold',
                                color: 'textMuted'
                            });
                            y += 7 * scale;
                        }
                    });
                }
            } else {
                const columns = sectionInnerW >= 210 && items.length > 1 ? 2 : 1;
                const gap = 3;
                const cellW = (sectionInnerW - gap * (columns - 1)) / columns;
                const rows = Math.ceil(items.length / columns);
                let rowY = y;
                for (let row = 0; row < rows; row += 1) {
                    const rowItems = [];
                    let rowHeight = 0;
                    for (let col = 0; col < columns; col += 1) {
                        const item = items[row * columns + col];
                        if (!item) continue;
                        const itemData = itemText(item);
                        const textW = Math.max(22, cellW - 14);
                        const titleLines = wrap(ctx, itemData.title, textW, itemTitleStyle);
                        const descLines = itemData.description ? wrap(ctx, itemData.description, textW, descStyle) : [];
                        const h = Math.max(8, titleLines.length * itemTitleStyle.lineHeight)
                            + descLines.length * descStyle.lineHeight + (descLines.length ? 1 : 0) + 4;
                        rowHeight = Math.max(rowHeight, h);
                        rowItems.push({ col, itemData, titleLines, descLines });
                    }
                    rowItems.forEach(({ col, itemData, titleLines, descLines }) => {
                        const visualCol = rtl ? columns - 1 - col : col;
                        const cellX = sectionInnerX + visualCol * (cellW + gap);
                        const iconName = TYPE_ICONS[itemData.type] || TYPE_ICONS.other;
                        drawIcon(ctx, iconName, cellX, rowY + 4, 6.4 * scale, accent);
                        const textX = cellX + 10;
                        const textW = cellW - 10;
                        let itemY = rowY;
                        itemY += drawLines(ctx, titleLines, textX, itemY, itemTitleStyle, textW, rtl ? 'right' : 'left');
                        if (descLines.length) {
                            itemY += 1;
                            drawLines(ctx, descLines, textX, itemY, descStyle, textW, rtl ? 'right' : 'left');
                        }
                    });
                    rowY += rowHeight + (row < rows - 1 ? gap : 0);
                }
            }
        });
    }

    host.blockRenderers = Object.freeze({
        ...previous,
        architecture: renderArchitectureV2,
        version: `${previous.version || 'block-renderers'}+architecture-v2`
    });

})(window);
