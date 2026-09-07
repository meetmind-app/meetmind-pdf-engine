/**
 * MeetMind Executive PDF Engine
 * Browser Integration — Golden Implementation v1.0
 *
 * Public API:
 *   window.ExecutiveSlideEngine.generate(report, options?) -> Promise<Blob>
 *
 * This file is intentionally thin:
 * report_json -> Composition -> Layout -> Golden Renderer -> DrawingSurface -> PDF
 *
 * NO rendering logic, truncation, maxLines, or benchmark-specific geometry lives here.
 */
(function attachExecutiveSlideEngine(global) {
    'use strict';

    const ENGINE_NAME = 'ExecutiveSlideEngine';
    const ENGINE_VERSION = '1.4.5-meeting-type-v1';
    const ENGINE_BASE = 'https://meetmind-app.github.io/meetmind-pdf-engine/';
    const CACHE_VERSION = 'golden-1.4.5-meeting-type-v1';

    const PDF_LIB_CDN =
        'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

    const FONTKIT_CDN =
        'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js';

    const PATHS = Object.freeze({
        composition: 'Composition_Engine/composition-engine.js',
        layout: 'Layout_Engine/layout-engine.js',
        drawingSurface: 'drawing/drawing-surface.js',
        renderContext: 'core/render-context.js',
        designSystem: 'Renderer/design-system.js',
        icons: 'Renderer/icons.js',
        blockRenderers: 'Renderer/renderers/block-renderers.js',
        meetingTypeV1: 'Renderer/meeting-type-v1.js',
        architectureV2: 'Renderer/architecture-v2.js',
        renderer: 'Renderer/renderer.js'
    });

    const FONT_PATHS = Object.freeze({
        regular: 'fonts/Inter-Regular.ttf',
        medium: 'fonts/Inter-Medium.ttf',
        semibold: 'fonts/Inter-SemiBold.ttf',
        bold: 'fonts/Inter-Bold.ttf'
    });

    // Unicode font packs are selected per report language. Keep the existing
    // Inter contract for Latin/Cyrillic languages; only scripts that Inter
    // cannot render switch to dedicated families.
    const UNICODE_FONT_PATHS = Object.freeze({
        ar: {
            regular: 'fonts/NotoSansArabic-Variable.ttf',
            medium: 'fonts/NotoSansArabic-Variable.ttf',
            semibold: 'fonts/NotoSansArabic-Variable.ttf',
            bold: 'fonts/NotoSansArabic-Variable.ttf'
        },
        fa: {
            regular: 'fonts/NotoSansArabic-Variable.ttf',
            medium: 'fonts/NotoSansArabic-Variable.ttf',
            semibold: 'fonts/NotoSansArabic-Variable.ttf',
            bold: 'fonts/NotoSansArabic-Variable.ttf'
        },
        hi: {
            regular: 'fonts/NotoSansDevanagari-Variable.ttf',
            medium: 'fonts/NotoSansDevanagari-Variable.ttf',
            semibold: 'fonts/NotoSansDevanagari-Variable.ttf',
            bold: 'fonts/NotoSansDevanagari-Variable.ttf'
        }
    });

    function normalizeLanguage(value) {
        const raw = String(value || 'en').trim().toLowerCase().replace(/_/g, '-');
        const base = raw.split('-')[0];
        return base === 'in' ? 'id' : base;
    }

    function resolveFontPaths(options = {}) {
        const language = normalizeLanguage(
            options.language || options.report_language || options.reportLanguage
        );
        return UNICODE_FONT_PATHS[language] || FONT_PATHS;
    }

    const ASSET_PATHS = Object.freeze({
        headerMountain: 'Renderer/assets/header-mountain.png'
    });

    const CANONICAL_TO_RENDERER = Object.freeze({
        header: 'header',
        meetingStats: 'stats',
        executiveSummary: 'summary',
        keyMetrics: 'metrics',
        insights: 'insights',
        decisions: 'decisions',
        risks: 'risks',
        tasks: 'tasks',
        architecture: 'architecture',
        owners: 'owners',
        footer: 'footer'
    });

    let dependenciesPromise = null;
    const scriptPromises = new Map();

    function withVersion(url) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}v=${encodeURIComponent(CACHE_VERSION)}`;
    }

    function engineUrl(path) {
        return withVersion(ENGINE_BASE + path);
    }

    function isPlainObject(value) {
        return Boolean(value) &&
            typeof value === 'object' &&
            !Array.isArray(value);
    }

    function loadClassicScript(src) {
        if (scriptPromises.has(src)) {
            return scriptPromises.get(src);
        }

        const promise = new Promise((resolve, reject) => {
            const existing = Array.from(document.scripts)
                .find(script => script.src === src);

            if (existing) {
                if (existing.dataset.meetmindLoaded === 'true') {
                    resolve();
                    return;
                }

                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', () => {
                    reject(new Error(`Failed to load script: ${src}`));
                }, { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;

            script.addEventListener('load', () => {
                script.dataset.meetmindLoaded = 'true';
                resolve();
            }, { once: true });

            script.addEventListener('error', () => {
                reject(new Error(`Failed to load script: ${src}`));
            }, { once: true });

            document.head.appendChild(script);
        });

        scriptPromises.set(src, promise);
        return promise;
    }

    async function ensurePdfLib() {
        if (global.PDFLib?.PDFDocument) {
            return global.PDFLib;
        }

        await loadClassicScript(PDF_LIB_CDN);

        if (!global.PDFLib?.PDFDocument) {
            throw new Error(
                'PDFLib was not found after loading pdf-lib.'
            );
        }

        return global.PDFLib;
    }

    async function ensureFontkit() {
        if (global.fontkit) {
            return global.fontkit;
        }

        await loadClassicScript(FONTKIT_CDN);

        if (!global.fontkit) {
            throw new Error(
                'fontkit was not found after loading @pdf-lib/fontkit.'
            );
        }

        return global.fontkit;
    }

    async function fetchBytes(path) {
        const response = await fetch(engineUrl(path), {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(
                `Failed to load ${path}: ${response.status} ${response.statusText}`
            );
        }

        return response.arrayBuffer();
    }

    function normalizeVisibility(options = {}) {
        const source =
            options.visibility ||
            options.blocks ||
            options.selectedBlocks ||
            null;

        if (!isPlainObject(source)) {
            return {};
        }

        const aliases = Object.freeze({
            stats: 'meetingStats',
            meeting_stats: 'meetingStats',
            meetingstats: 'meetingStats',

            summary: 'executiveSummary',
            executive_summary: 'executiveSummary',
            executivesummary: 'executiveSummary',

            metrics: 'keyMetrics',
            key_metrics: 'keyMetrics',
            keymetrics: 'keyMetrics',

            insights: 'insights',
            decisions: 'decisions',
            risks: 'risks',
            tasks: 'tasks',
            architecture: 'architecture',
            owners: 'owners'
        });

        const visibility = {};

        for (const [rawKey, rawValue] of Object.entries(source)) {
            const normalized = String(rawKey || '')
                .trim()
                .replace(/([a-z])([A-Z])/g, '$1_$2')
                .toLowerCase()
                .replace(/[\s-]+/g, '_');

            const id = aliases[normalized] || rawKey;
            visibility[id] = Boolean(rawValue);
        }

        return visibility;
    }

    function buildCompositionOptions(options = {}) {
        const explicit = isPlainObject(options.composition)
            ? { ...options.composition }
            : {};

        return {
            ...explicit,
            visibility: {
                ...(isPlainObject(explicit.visibility)
                    ? explicit.visibility
                    : {}),
                ...normalizeVisibility(options)
            },

            // Layout Engine owns physical fit/pagination.
            // Prevent Composition mass heuristics from splitting the same
            // semantic blocks before actual geometry is measured.
            allowSecondPage: false
        };
    }

    function createRendererMap(blockRenderers) {
        const map = { ...blockRenderers };

        for (const [canonicalId, rendererId] of
            Object.entries(CANONICAL_TO_RENDERER)) {
            const renderer = blockRenderers[rendererId];
            if (typeof renderer === 'function') {
                map[canonicalId] = renderer;
            }
        }

        return Object.freeze(map);
    }


    function ensureServiceBlocks(compositionResult, report, options = {}) {
        const sourceBlocks = Array.isArray(compositionResult?.blocks)
            ? compositionResult.blocks
            : Array.isArray(compositionResult?.pages)
                ? compositionResult.pages.flatMap(page =>
                    Array.isArray(page.blocks) ? page.blocks : []
                )
                : [];

        const blocks = sourceBlocks.slice();
        const ids = new Set(blocks.map(block => block?.id || block?.type));

        if (!ids.has('header')) {
            blocks.unshift(Object.freeze({
                id: 'header',
                type: 'header',
                data: Object.freeze({})
            }));
        }

        const normalizedVisibility = normalizeVisibility(options);
        const statsExplicitlyDisabled = normalizedVisibility.meetingStats === false;

        if (!statsExplicitlyDisabled &&
            !ids.has('meetingStats') &&
            !ids.has('stats')) {
            const stats = Object.freeze({
                participants: Array.isArray(report?.participants)
                    ? report.participants.length
                    : Number(report?.participants_count || 0),
                tasks: Array.isArray(report?.tasks)
                    ? report.tasks.length
                    : Array.isArray(report?.action_items)
                        ? report.action_items.length
                        : Number(report?.tasks_count || 0),
                decisions: Array.isArray(report?.decisions)
                    ? report.decisions.length
                    : Number(report?.decisions_count || 0),
                risks: Array.isArray(report?.risks)
                    ? report.risks.length
                    : Number(report?.risks_count || 0)
            });

            const headerIndex = blocks.findIndex(block =>
                (block?.id || block?.type) === 'header'
            );

            blocks.splice(Math.max(0, headerIndex + 1), 0, Object.freeze({
                id: 'meetingStats',
                type: 'meetingStats',
                data: stats
            }));
        }

        return Object.freeze({
            ...compositionResult,
            blocks: Object.freeze(blocks)
        });
    }

    function stampResolvedDensity(layoutResult) {
        const density = layoutResult.density || 'regular';

        const totalPages = layoutResult.pages.length;
        const pages = layoutResult.pages.map((page, pageIndex) => {
            const pageDensity = page.density || page.resolvedDensity || density;
            return Object.freeze({
                ...page,
                density: pageDensity,
                resolvedDensity: pageDensity,
                totalPages,
                pageIndicator: totalPages > 1 ? `${pageIndex + 1}/${totalPages}` : null,
                blocks: Object.freeze(
                    page.blocks.map(block => Object.freeze({
                        ...block,
                        density: block?.layout?.density || block?.density || pageDensity,
                        totalPages,
                        pageIndicator: totalPages > 1
                            ? `${pageIndex + 1}/${totalPages}`
                            : null
                    }))
                )
            });
        });

        return Object.freeze({
            ...layoutResult,
            pages: Object.freeze(pages)
        });
    }

    async function loadDependencies() {
        if (dependenciesPromise) {
            return dependenciesPromise;
        }

        dependenciesPromise = (async () => {
            const [
                compositionModule,
                drawingModule,
                renderContextModule,
                pdfLib,
                fontkit
            ] = await Promise.all([
                import(engineUrl(PATHS.composition)),
                import(engineUrl(PATHS.drawingSurface)),
                import(engineUrl(PATHS.renderContext)),
                ensurePdfLib(),
                ensureFontkit()
            ]);

            // Load browser-global subsystems in strict dependency order.
            // Icon Registry MUST exist before Semantic Block Renderers are loaded.
            await loadClassicScript(engineUrl(PATHS.layout));
            await loadClassicScript(engineUrl(PATHS.designSystem));
            await loadClassicScript(engineUrl(PATHS.icons));

            if (
                !global[ENGINE_NAME]?.icons ||
                typeof global[ENGINE_NAME].icons.get !== 'function' ||
                typeof global[ENGINE_NAME].icons.has !== 'function'
            ) {
                throw new Error(
                    'Icon Registry did not expose ExecutiveSlideEngine.icons.get()/has().'
                );
            }

            await loadClassicScript(engineUrl(PATHS.blockRenderers));
            // Semantic wrappers load after the base renderer map and before
            // MeetMindRenderer captures the final blockRenderers object.
            await loadClassicScript(engineUrl(PATHS.meetingTypeV1));
            await loadClassicScript(engineUrl(PATHS.architectureV2));
            await loadClassicScript(engineUrl(PATHS.renderer));

            const compose =
                compositionModule.composeExecutiveReport ||
                compositionModule.default?.composeExecutiveReport;

            const DrawingSurface =
                drawingModule.DrawingSurface ||
                drawingModule.default?.DrawingSurface;

            const RenderContext =
                renderContextModule.RenderContext ||
                renderContextModule.default?.RenderContext;

            const layout = global.MeetMindLayoutEngine?.layout;
            const renderer = global.MeetMindRenderer;
            const host = global[ENGINE_NAME];

            if (typeof compose !== 'function') {
                throw new Error(
                    'Composition Engine did not export composeExecutiveReport().'
                );
            }

            if (typeof layout !== 'function') {
                throw new Error(
                    'Layout Engine did not expose MeetMindLayoutEngine.layout().'
                );
            }

            if (typeof DrawingSurface !== 'function') {
                throw new Error(
                    'Drawing Surface did not export DrawingSurface.'
                );
            }

            if (typeof RenderContext !== 'function') {
                throw new Error(
                    'Render Context did not export RenderContext.'
                );
            }

            if (!renderer || typeof renderer.render !== 'function') {
                throw new Error(
                    'Golden Renderer did not expose MeetMindRenderer.render().'
                );
            }

            if (!host?.design?.TOKENS) {
                throw new Error(
                    'Golden Design System was not attached to ExecutiveSlideEngine.design.'
                );
            }

            if (!host?.icons || typeof host.icons.get !== 'function') {
                throw new Error(
                    'Golden Icon Registry was not attached to ExecutiveSlideEngine.icons.'
                );
            }

            if (!host?.blockRenderers) {
                throw new Error(
                    'Golden Block Renderers were not attached to ExecutiveSlideEngine.blockRenderers.'
                );
            }

            return Object.freeze({
                compose,
                layout,
                renderer,
                DrawingSurface,
                RenderContext,
                pdfLib,
                fontkit,
                design: host.design,
                blockRenderers: host.blockRenderers,
                rendererMap: createRendererMap(host.blockRenderers)
            });
        })();

        return dependenciesPromise;
    }

    async function createSurface(dependencies, language) {
        const surface = await dependencies.DrawingSurface.create({
            PDFDocument: dependencies.pdfLib.PDFDocument,
            fontkit: dependencies.fontkit
        });

        const fontEntries = Object.entries(resolveFontPaths({ language }));

        const fontBuffers = await Promise.all(
            fontEntries.map(([, path]) => fetchBytes(path))
        );

        for (let index = 0; index < fontEntries.length; index += 1) {
            const [fontName] = fontEntries[index];
            await surface.registerFont(
                fontName,
                fontBuffers[index]
            );
        }

        // Pre-embed approved visual assets before synchronous block rendering.
        // DrawingSurface.drawImage() becomes synchronous-in-effect for cached images,
        // so block renderers can use ctx.image() without changing Renderer architecture.
        const mountainBytes = new Uint8Array(
            await fetchBytes(ASSET_PATHS.headerMountain)
        );
        if (!surface.pdf || !surface.images || typeof surface.pdf.embedPng !== 'function') {
            throw new Error(
                'Drawing Surface does not expose the image cache required for Golden header artwork.'
            );
        }
        const mountainImage = await surface.pdf.embedPng(mountainBytes);
        surface.images.set('header-mountain', mountainImage);

        return surface;
    }


    function addMeetMindFooterLinks(surface, layoutResult, pdfLib) {
        const PDFName = pdfLib.PDFName;
        const PDFString = pdfLib.PDFString;
        const PDFArray = pdfLib.PDFArray;
        const PDFNumber = pdfLib.PDFNumber;
        if (!PDFName || !PDFString || !PDFArray || !PDFNumber) return;

        const target = 'https://t.me/meetmind_app_bot';
        const pages = surface.pages || [];

        layoutResult.pages.forEach((layoutPage, index) => {
            const pdfPage = pages[index];
            if (!pdfPage?.node || !surface.pdf?.context) return;
            const footer = layoutPage.blocks.find(block => (block.id || block.type) === 'footer');
            const g = footer?.geometry;
            if (!g) return;

            // Clickable zone covers the visible meetmind.ai brand at the far right.
            // Layout coordinates are top-down; PDF annotation rectangles are bottom-up.
            const pageHeight = layoutResult.size?.height || 512;
            const x1 = g.x + g.width - 52;
            const x2 = g.x + g.width;
            const y1 = pageHeight - (g.y + g.height);
            const y2 = pageHeight - g.y;
            const context = surface.pdf.context;
            const rect = context.obj([x1, y1, x2, y2]);
            const action = context.obj({
                Type: 'Action',
                S: 'URI',
                URI: PDFString.of(target)
            });
            const annotation = context.obj({
                Type: 'Annot',
                Subtype: 'Link',
                Rect: rect,
                Border: [0, 0, 0],
                A: action
            });
            const annotationRef = context.register(annotation);
            pdfPage.node.addAnnot(annotationRef);
        });
    }

    async function generate(report, options = {}) {
        const language = options.interface_language || options.interfaceLanguage || options.language || options.locale || report?.interface_language || report?.interfaceLanguage || report?.language || report?.locale || report?.metadata?.interface_language || report?.metadata?.language || report?.user?.interface_language || 'en';
        report = Object.freeze({ ...report, _pdfLanguage: language });
        if (!isPlainObject(report)) {
            throw new TypeError(
                'ExecutiveSlideEngine.generate(report): report must be an object.'
            );
        }

        console.log(
            `✅ MeetMind Executive PDF Engine ${ENGINE_VERSION}`
        );

        const dependencies = await loadDependencies();

        // Register Inter BEFORE layout so physical fit is measured with
        // the same real glyph widths that Renderer will draw.
        const surface = await createSurface(dependencies, language);

        const rawCompositionResult = dependencies.compose(
            report,
            buildCompositionOptions(options)
        );

        const compositionResult = ensureServiceBlocks(
            rawCompositionResult,
            report,
            options
        );

        const rawLayoutResult = dependencies.layout(
            compositionResult,
            {
                ...(isPlainObject(options.layout) ? options.layout : {}),
                tokens: dependencies.design.TOKENS,
                measureText: (text, fontName, sizePt) =>
                    surface.measureText(text, fontName, sizePt),
                report
            }
        );

        const layoutResult = stampResolvedDensity(
            rawLayoutResult
        );

        if (layoutResult.valid === false) {
            console.warn(
                'MeetMind PDF layout contains validation diagnostics.',
                layoutResult.diagnostics
            );
        }

        const renderContext =
            new dependencies.RenderContext(
                surface,
                dependencies.design.TOKENS,
                {
                    report,
                    rgb: dependencies.pdfLib.rgb,
                    pageSize: [
                        dependencies.design.TOKENS.page.width,
                        dependencies.design.TOKENS.page.height
                    ]
                }
            );

        const renderResult = dependencies.renderer.render(
            layoutResult,
            renderContext,
            {
                blockRenderers: dependencies.rendererMap
            }
        );

        addMeetMindFooterLinks(surface, layoutResult, dependencies.pdfLib);

        const pdfBytes = await surface.save();

        const blob = new Blob([pdfBytes], {
            type: 'application/pdf'
        });

        console.log('✅ MeetMind Golden PDF generated', {
            pages: layoutResult.pageCount,
            density: layoutResult.density,
            bytes: pdfBytes.length,
            attempts: layoutResult.attempts,
            renderedPages: renderResult.pageCount
        });

        if (
            options.benchmark === 'enterpriseArchitectureCards' &&
            layoutResult.pageCount !== 1
        ) {
            console.warn(
                'BENCHMARK CONTRACT CONFLICT: Enterprise Architecture Cards did not fit on one page.',
                {
                    pageCount: layoutResult.pageCount,
                    density: layoutResult.density,
                    attempts: layoutResult.attempts
                }
            );
        }

        return blob;
    }

    // Keep one mutable namespace because Design System and Block Renderers attach
    // themselves to this public host during lazy loading.
    const host = global[ENGINE_NAME] || {};

    host.name = ENGINE_NAME;
    host.version = ENGINE_VERSION;
    host.generate = generate;

    global[ENGINE_NAME] = host;

})(window);
