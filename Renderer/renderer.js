/**
 * MeetMind Executive PDF Engine
 * Renderer Orchestrator — Golden Release 1.0
 *
 * Responsibilities only:
 * - validate LayoutResult;
 * - create one page-scoped RenderContext per page;
 * - resolve the semantic block renderer;
 * - invoke renderer with immutable Layout geometry.
 *
 * No content truncation or business decisions live here.
 *
 * Browser-loader note:
 * The lightweight page-packing extension below wraps MeetMindLayoutEngine.layout()
 * before executive-slide-engine.js captures the layout function. It only resolves
 * residual whitespace already left by Layout Engine; it never changes content or
 * page count. The composition decision remains geometry-driven.
 */
(function attachMeetMindRenderer(globalScope) {
    'use strict';

    const NAME = 'MeetMindRenderer';
    const VERSION = '1.0.4-page-packing';

    class RendererError extends Error {
        constructor(code, message, details) {
            super(message);
            this.name = 'RendererError';
            this.code = code;
            this.details = details || null;
        }
    }

    function isObject(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    function cleanText(value) {
        return value === null || value === undefined ? '' : String(value).replace(/\s+/g, ' ').trim();
    }

    function summaryLanguage(ctx) {
        const titles = {
            en: 'Executive Summary', ru: 'Резюме встречи', es: 'Resumen ejecutivo',
            pt: 'Resumo executivo', tr: 'Yönetici Özeti', id: 'Ringkasan Eksekutif',
            hi: 'एग्जीक्यूटिव सारांश', ar: 'الملخص التنفيذي', uz: 'Ijrochi xulosa',
            fa: 'خلاصه مدیریتی'
        };
        const metricsTitles = {
            en: 'Key Metrics', ru: 'Ключевые метрики', es: 'Métricas clave',
            pt: 'Métricas-chave', tr: 'Temel Metrikler', id: 'Metrik Utama',
            hi: 'मुख्य मेट्रिक्स', ar: 'المؤشرات الرئيسية', uz: 'Asosiy ko‘rsatkichlar',
            fa: 'شاخص‌های کلیدی'
        };
        const raw = String(ctx?.options?.language || ctx?.options?.report_language ||
            ctx?.report?.report_language || ctx?.report?.language || 'en')
            .trim().toLowerCase().replace(/_/g, '-');
        const baseRaw = raw.split('-')[0];
        const base = baseRaw === 'in' ? 'id' : baseRaw;
        return { code: titles[base] ? base : 'en', titles, metricsTitles };
    }

    function summaryStyle(ctx, name, fallback) {
        const token = ctx?.tokens?.typography?.tokens?.[name];
        if (!token) return fallback;
        const density = ctx?.density || 'regular';
        return {
            font: token.font || fallback.font,
            size: Number(token.size?.[density] ?? token.size?.regular ?? fallback.size),
            lineHeight: Number(token.lineHeight?.[density] ?? token.lineHeight?.regular ?? fallback.lineHeight),
            color: token.color || fallback.color
        };
    }

    function summarySpacing(ctx) {
        const density = ctx?.density || 'regular';
        const token = ctx?.tokens?.spacing?.[density] || {};
        return {
            padX: Number(token.cardPaddingX ?? token.cardPadding ?? 6),
            padY: Number(token.cardPaddingY ?? token.cardPadding ?? 5),
            titleGap: Number(token.titleGap ?? 3),
            paragraphGap: Number(token.paragraphGap ?? 3.2)
        };
    }

    function summaryMeasure(ctx, text, style) {
        return ctx.measureText(cleanText(text), style.font, style.size);
    }

    function summaryWrap(ctx, text, width, style) {
        const raw = String(text ?? '').replace(/\r\n?/g, '\n');
        if (!raw.trim()) return [];
        const out = [];
        raw.split('\n').forEach(paragraph => {
            if (!paragraph.trim()) { out.push(''); return; }
            let line = '';
            for (const word of paragraph.trim().split(/\s+/)) {
                const candidate = line ? `${line} ${word}` : word;
                if (summaryMeasure(ctx, candidate, style) <= width) {
                    line = candidate;
                    continue;
                }
                if (line) { out.push(line); line = ''; }
                let fragment = '';
                for (const char of Array.from(word)) {
                    const next = fragment + char;
                    if (fragment && summaryMeasure(ctx, next, style) > width) {
                        out.push(fragment);
                        fragment = char;
                    } else fragment = next;
                }
                line = fragment;
            }
            if (line) out.push(line);
        });
        return out;
    }

    function summaryParagraphs(block, report) {
        const raw = block?.data ?? block?.content ?? block?.items ?? block?.value ??
            report?.summary ?? report?.executive_summary ?? report?.executiveSummary ??
            report?.meeting_summary ?? '';
        if (Array.isArray(raw)) return raw.map(item => cleanText(item?.text ?? item?.summary ?? item)).filter(Boolean);
        if (raw && typeof raw === 'object') {
            const list = raw.paragraphs || raw.items;
            if (Array.isArray(list)) return list.map(item => cleanText(item?.text ?? item?.summary ?? item)).filter(Boolean);
            const value = raw.text || raw.summary || raw.description || '';
            return typeof value === 'string' ? value.split(/\n\s*\n|\n/).map(cleanText).filter(Boolean) : [];
        }
        return typeof raw === 'string' ? raw.split(/\n\s*\n|\n/).map(cleanText).filter(Boolean) : [];
    }

    function summaryIconPath(tag, attrs) {
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

    function drawSummaryIcon(ctx, x, y, size) {
        const def = globalScope.ExecutiveSlideEngine?.icons?.get?.('sparkles');
        if (!def || typeof ctx.svgPath !== 'function') return;
        const drawY = y - size * 1.08;
        const stroke = Math.max(.48, Math.min(.72, size * .055));
        def.nodes.forEach(([tag, attrs]) => {
            const path = summaryIconPath(tag, attrs || {});
            if (path) ctx.svgPath(path, { x, y: drawY, size, stroke: 'purplePrimary', borderWidth: stroke });
        });
    }

    function renderSummaryIntegrity(block, ctx) {
        const g = block.geometry;
        const sp = summarySpacing(ctx);
        ctx.rect({ x: g.x, y: g.y, width: g.width, height: g.height,
            fill: 'cardBg', stroke: 'borderDefault', borderWidth: .5, radius: 4 });

        const heading = summaryStyle(ctx, 'blockTitle',
            { font: 'bold', size: 8.2, lineHeight: 9.8, color: 'textPrimary' });
        const language = summaryLanguage(ctx);
        drawSummaryIcon(ctx, g.x + sp.padX, g.y + sp.padY + 1.2, 9.2);
        ctx.text(language.titles[language.code], {
            x: g.x + sp.padX + 13.2, y: g.y + sp.padY,
            size: heading.size, font: heading.font, color: 'purplePrimary'
        });

        let y = g.y + sp.padY + heading.lineHeight + sp.titleGap;
        const body = summaryStyle(ctx, 'body',
            { font: 'regular', size: 6.3, lineHeight: 7.8, color: 'textPrimary' });
        const innerWidth = g.width - sp.padX * 2;
        const bottom = g.y + g.height - sp.padY;
        const paragraphs = summaryParagraphs(block, ctx.report || {});
        const source = paragraphs.length ? paragraphs : ['—'];
        const prepared = source.map(paragraph => summaryWrap(ctx, paragraph, innerWidth, body));
        const requiredHeight = prepared.reduce((sum, lines) => sum + lines.length * body.lineHeight, 0)
            + Math.max(0, prepared.length - 1) * sp.paragraphGap;
        const availableHeight = Math.max(0, bottom - y);

        if (requiredHeight > availableHeight + 0.5) {
            throw new RendererError(
                'SUMMARY_LAYOUT_UNDERSIZED',
                `Executive Summary requires ${requiredHeight.toFixed(2)}pt but Layout allocated ${availableHeight.toFixed(2)}pt.`,
                { requiredHeight, availableHeight, geometry: g }
            );
        }

        prepared.forEach((lines, paragraphIndex) => {
            lines.forEach(line => {
                ctx.text(line, { x: g.x + sp.padX, y, size: body.size, font: body.font, color: body.color });
                y += body.lineHeight;
            });
            if (paragraphIndex < prepared.length - 1) y += sp.paragraphGap;
        });
    }

    function metricItems(block, report) {
        const raw = block?.data ?? block?.content ?? block?.items ?? block?.value;
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object') {
            for (const key of ['items','metrics','values']) if (Array.isArray(raw[key])) return raw[key];
        }
        for (const key of ['metrics','key_metrics','keyMetrics']) if (Array.isArray(report?.[key])) return report[key];
        return [];
    }

    function renderMetricsIntegrity(block, ctx) {
        const g = block.geometry, sp = summarySpacing(ctx), metrics = metricItems(block, ctx.report || {});
        ctx.rect({x:g.x,y:g.y,width:g.width,height:g.height,fill:'cardBg',stroke:'borderDefault',borderWidth:.5,radius:4});
        const h = summaryStyle(ctx,'blockTitle',{font:'bold',size:8.2,lineHeight:9.8,color:'textPrimary'});
        const language = summaryLanguage(ctx);
        ctx.text(language.metricsTitles[language.code],{x:g.x+sp.padX,y:g.y+sp.padY,size:h.size,font:h.font,color:'purplePrimary'});
        const y0=g.y+sp.padY+h.lineHeight+sp.titleGap, gap=3, innerW=g.width-sp.padX*2;
        const cols=metrics.length===5?3:Math.min(4,Math.max(1,metrics.length));
        const rows=Math.max(1,Math.ceil(metrics.length/cols));
        const cellW=(innerW-gap*(cols-1))/cols, cellH=(g.y+g.height-sp.padY-y0-gap*(rows-1))/rows;
        const ls=summaryStyle(ctx,'metricLabel',{font:'semibold',size:5.2,lineHeight:6.2,color:'textSecondary'});
        const base=summaryStyle(ctx,'metricValue',{font:'bold',size:8.5,lineHeight:9.5,color:'textPrimary'});
        metrics.forEach((m,i)=>{
            const row=Math.floor(i/cols), rowCount=Math.min(cols,metrics.length-row*cols);
            const offset=(cols-rowCount)*(cellW+gap)/2, col=i-row*cols;
            const x=g.x+sp.padX+offset+col*(cellW+gap), y=y0+row*(cellH+gap);
            ctx.rect({x,y,width:cellW,height:cellH,fill:'cardBg',stroke:'borderDefault',borderWidth:.5,radius:3});
            const label=cleanText(m?.label||m?.title||m?.name||''), value=cleanText(m?.value||m?.metric||m?.amount||'—');
            const labelLines=summaryWrap(ctx,label,cellW-10,ls), labelH=labelLines.length*ls.lineHeight;
            labelLines.forEach((line,j)=>ctx.text(line,{x:x+5,y:y+4+j*ls.lineHeight,size:ls.size,font:ls.font,color:ls.color}));
            let vs={...base}, lines=summaryWrap(ctx,value,cellW-10,vs), top=y+6+labelH, avail=y+cellH-3-top;
            while(vs.size>6.6 && lines.length*vs.lineHeight>avail){vs={...vs,size:vs.size-.4,lineHeight:vs.lineHeight-.4};lines=summaryWrap(ctx,value,cellW-10,vs);}
            if(lines.length*vs.lineHeight>avail+.5) throw new RendererError('METRIC_LAYOUT_UNDERSIZED','Metric value does not fit allocated geometry.',{index:i,geometry:g});
            lines.forEach((line,j)=>ctx.text(line,{x:x+5,y:top+j*vs.lineHeight,size:vs.size,font:vs.font,color:vs.color}));
        });
    }

    function canonicalId(block) {
        const raw = String(block?.id || block?.type || '');
        return raw === 'summary' ? 'executiveSummary'
            : raw === 'metrics' ? 'keyMetrics'
                : raw === 'stats' ? 'meetingStats'
                    : raw;
    }

    function cloneBlockGeometry(block, geometry, layoutPatch = {}) {
        return Object.freeze({
            ...block,
            geometry: Object.freeze({
                x: Number(geometry.x),
                y: Number(geometry.y),
                width: Number(geometry.width),
                height: Number(geometry.height)
            }),
            layout: Object.freeze({
                ...(isObject(block?.layout) ? block.layout : {}),
                ...layoutPatch
            })
        });
    }

    function packSparsePage(page) {
        if (!page || !Array.isArray(page.blocks) || page.blocks.length === 0) return page;

        const blocks = page.blocks;
        const bottomBand = blocks.filter(block => block?.layout?.sharedBottomBand === true);
        if (!bottomBand.length) return page;

        const bottomBandY = Math.min(...bottomBand.map(block => Number(block?.geometry?.y)).filter(Number.isFinite));
        if (!Number.isFinite(bottomBandY)) return page;

        const semantic = blocks.filter(block => !['header','meetingStats','owners','footer'].includes(canonicalId(block)));
        if (!semantic.length) return page;

        const lastY = Math.max(...semantic.map(block => Number(block?.geometry?.y)).filter(Number.isFinite));
        const lastRow = semantic.filter(block => Math.abs(Number(block?.geometry?.y) - lastY) <= 0.75);
        if (!lastRow.length) return page;

        const currentBottom = Math.max(...lastRow.map(block => Number(block.geometry.y) + Number(block.geometry.height)));
        const slack = bottomBandY - currentBottom;
        if (!(slack > 5)) return page;

        const density = page.density || page.resolvedDensity || lastRow[0]?.density || lastRow[0]?.layout?.density || 'regular';
        const sectionGap = density === 'dense' ? 3 : density === 'compact' ? 4.5 : 6;
        const ids = new Set(lastRow.map(canonicalId));
        const tasks = lastRow.find(block => canonicalId(block) === 'tasks');
        const architecture = lastRow.find(block => canonicalId(block) === 'architecture');
        const replacements = new Map();

        // First choice for a large dead band: turn the final Tasks | Architecture row
        // into a vertical stack when the same content safely fits at full page width.
        // Existing narrow-column natural heights are conservative upper bounds once
        // the blocks become wider, so this transformation cannot create clipping.
        if (tasks && architecture && ids.size === 2 && slack >= 16) {
            const ordered = [tasks, architecture];
            const startY = Math.min(...ordered.map(block => Number(block.geometry.y)));
            const x = Math.min(...ordered.map(block => Number(block.geometry.x)));
            const right = Math.max(...ordered.map(block => Number(block.geometry.x) + Number(block.geometry.width)));
            const width = right - x;
            const natural = ordered.map(block => {
                const measured = Number(block?.layout?.naturalHeight);
                return Number.isFinite(measured) && measured > 0 ? measured : Number(block.geometry.height);
            });
            const available = bottomBandY - startY;
            const minimumNeeded = natural[0] + sectionGap + natural[1];

            if (minimumNeeded <= available + 0.01 && minimumNeeded > Math.max(...ordered.map(block => Number(block.geometry.height))) + 6) {
                const distributable = Math.max(0, available - minimumNeeded);
                const naturalSum = Math.max(1, natural[0] + natural[1]);
                const firstHeight = natural[0] + distributable * (natural[0] / naturalSum);
                const secondHeight = available - sectionGap - firstHeight;

                replacements.set(tasks, cloneBlockGeometry(tasks, {
                    x, y: startY, width, height: firstHeight
                }, {
                    adaptiveComposition: true,
                    compositionAxis: 'stack',
                    pagePacking: 'stack-final-pair',
                    allocatedHeight: firstHeight,
                    packingSlackConsumed: slack
                }));
                replacements.set(architecture, cloneBlockGeometry(architecture, {
                    x, y: startY + firstHeight + sectionGap, width, height: secondHeight
                }, {
                    adaptiveComposition: true,
                    compositionAxis: 'stack',
                    pagePacking: 'stack-final-pair',
                    allocatedHeight: secondHeight,
                    packingSlackConsumed: slack
                }));
            }
        }

        // If stacking is not feasible, keep the efficient row but extend the final
        // semantic band to the bottom chrome. This removes a naked page-level hole
        // without shrinking typography, deleting content, or changing pagination.
        if (replacements.size === 0) {
            lastRow.forEach(block => {
                const g = block.geometry;
                const allocatedHeight = bottomBandY - Number(g.y);
                replacements.set(block, cloneBlockGeometry(block, {
                    x: g.x,
                    y: g.y,
                    width: g.width,
                    height: allocatedHeight
                }, {
                    pagePacking: 'extend-final-row',
                    allocatedHeight,
                    packingSlackConsumed: slack
                }));
            });
        }

        const packedBlocks = blocks.map(block => replacements.get(block) || block);
        return Object.freeze({
            ...page,
            blocks: Object.freeze(packedBlocks),
            pagePacking: Object.freeze({
                applied: true,
                slackConsumed: slack,
                strategy: replacements.has(tasks) && replacements.has(architecture)
                    ? 'stack-final-pair'
                    : 'extend-final-row'
            })
        });
    }

    function installPagePackingExtension() {
        const engine = globalScope.MeetMindLayoutEngine;
        const originalLayout = engine?.layout;
        if (typeof originalLayout !== 'function' || originalLayout.__loreviPagePacking === true) return;

        const wrappedLayout = function packedLayout(composition, options = {}) {
            const raw = originalLayout(composition, options);
            if (!raw || !Array.isArray(raw.pages) || raw.pages.length === 0) return raw;
            const pages = raw.pages.map(packSparsePage);
            return Object.freeze({
                ...raw,
                pages: Object.freeze(pages),
                pagePackingApplied: pages.some(page => page?.pagePacking?.applied === true)
            });
        };
        Object.defineProperty(wrappedLayout, '__loreviPagePacking', { value: true });

        globalScope.MeetMindLayoutEngine = Object.freeze({
            ...engine,
            version: `${engine.version || 'layout'}+page-pack-1.0`,
            layout: wrappedLayout
        });
    }

    function cloneGeometry(block) {
        const source = isObject(block.geometry)
            ? block.geometry
            : isObject(block.layout?.geometry)
                ? block.layout.geometry
                : block;

        const geometry = {
            x: Number(source.x),
            y: Number(source.y),
            width: Number(source.width),
            height: Number(source.height)
        };

        for (const [key, value] of Object.entries(geometry)) {
            if (!Number.isFinite(value)) {
                throw new RendererError('INVALID_GEOMETRY', `Block "${block.id}" has invalid geometry.${key}.`, { blockId: block.id, geometry });
            }
        }
        if (geometry.width <= 0 || geometry.height <= 0) {
            throw new RendererError('INVALID_DIMENSION', `Block "${block.id}" must have positive dimensions.`, { blockId: block.id, geometry });
        }
        return Object.freeze(geometry);
    }

    function normalizeBlock(block, page) {
        if (!isObject(block)) throw new RendererError('INVALID_BLOCK', 'Every LayoutResult block must be an object.');
        const id = String(block.id || block.type || '').trim();
        if (!id) throw new RendererError('MISSING_BLOCK_ID', 'Every LayoutResult block must have id or type.');
        return Object.freeze({
            ...block,
            id,
            type: String(block.type || id),
            geometry: cloneGeometry(block),
            pageNumber: page.number,
            density: block.density || page.density || page.resolvedDensity || 'regular'
        });
    }

    function validateLayoutResult(layoutResult) {
        if (!isObject(layoutResult)) throw new RendererError('INVALID_LAYOUT_RESULT', 'layoutResult must be an object.');
        if (!Array.isArray(layoutResult.pages)) throw new RendererError('MISSING_PAGES', 'layoutResult.pages must be an array.');
        if (Number.isInteger(layoutResult.pageCount) && layoutResult.pageCount !== layoutResult.pages.length) {
            throw new RendererError('PAGE_COUNT_MISMATCH', 'layoutResult.pageCount must equal pages.length.');
        }
        layoutResult.pages.forEach((page, index) => {
            if (!isObject(page) || !Array.isArray(page.blocks)) {
                throw new RendererError('INVALID_PAGE', `Page at index ${index} must contain blocks[].`);
            }
        });
    }

    function resolveBlockRenderer(block, options) {
        const config = isObject(options) ? options : {};
        const registry = config.blockRegistry || globalScope.ExecutiveSlideEngine?.blockRegistry;
        const renderers = config.blockRenderers || globalScope.ExecutiveSlideEngine?.blockRenderers;

        let definition = null;
        if (registry && typeof registry.get === 'function') definition = registry.get(block.id);
        else if (isObject(registry)) definition = registry[block.id] || null;

        if (block.id === 'executiveSummary' || block.id === 'summary') return renderSummaryIntegrity;
        if (block.id === 'keyMetrics' || block.id === 'metrics') return renderMetricsIntegrity;

        const rendererName = definition?.renderer || block.renderer || block.type || block.id;
        const candidate = renderers?.[rendererName] || renderers?.[block.id];
        if ((block.id === 'meetingStats' || block.id === 'stats') && typeof candidate === 'function') {
            return (b, ctx) => {
                const explicit = b?.data ?? b?.content;
                if (!explicit || typeof explicit !== 'object' || Array.isArray(explicit)) return candidate(b, ctx);
                const report = ctx.report || {};
                const fallbackStats = {
                    participants: Array.isArray(report.participants)
                        ? report.participants.length
                        : Number(report.participants_count || 0),
                    tasks: Array.isArray(report.tasks)
                        ? report.tasks.length
                        : Array.isArray(report.action_items)
                            ? report.action_items.length
                            : Number(report.tasks_count || 0),
                    decisions: Array.isArray(report.decisions)
                        ? report.decisions.length
                        : Number(report.decisions_count || 0),
                    risks: Array.isArray(report.risks)
                        ? report.risks.length
                        : Number(report.risks_count || 0)
                };
                const proxy = Object.create(ctx);
                proxy.report = {...report, stats: {...fallbackStats, ...explicit}};
                return candidate(b, proxy);
            };
        }

        if (typeof candidate === 'function') return candidate;
        if (candidate && typeof candidate.render === 'function') return candidate.render.bind(candidate);
        if (typeof config.fallbackRenderer === 'function') return config.fallbackRenderer;

        throw new RendererError('RENDERER_NOT_FOUND', `No Block Renderer found for "${block.id}".`, { blockId: block.id, rendererName });
    }

    function render(layoutResult, renderContext, options = {}) {
        validateLayoutResult(layoutResult);
        if (!renderContext || typeof renderContext.getPageContext !== 'function') {
            throw new RendererError('INVALID_RENDER_CONTEXT', 'renderContext.getPageContext(page) is required.');
        }

        const renderedPages = [];
        for (const page of layoutResult.pages) {
            const pageContext = renderContext.getPageContext(page);
            pageContext.beginPage(page);
            const renderedBlocks = [];

            for (const rawBlock of page.blocks) {
                const block = normalizeBlock(rawBlock, page);
                const blockRenderer = resolveBlockRenderer(block, options);
                blockRenderer(block, pageContext);
                renderedBlocks.push(block.id);
            }

            pageContext.endPage(page);
            renderedPages.push(Object.freeze({ pageNumber: page.number, blockIds: Object.freeze(renderedBlocks) }));
        }

        if (typeof renderContext.finalize === 'function') renderContext.finalize(layoutResult);
        return Object.freeze({ engine: Object.freeze({ name: NAME, version: VERSION }), pageCount: renderedPages.length, pages: Object.freeze(renderedPages) });
    }

    installPagePackingExtension();

    const api = Object.freeze({ name: NAME, version: VERSION, render, RendererError });
    globalScope[NAME] = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);