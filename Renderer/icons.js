/*
 * MeetMind AI
 * Executive Slide Engine
 *
 * Visual Icon System v2
 *
 * Canonical SVG geometry and the shared Lucide-to-PDF path adapter.
 *
 * Lucide is used only as the source of canonical icon geometry.
 * This module has no runtime dependency on Lucide or any other library.
 *
 * This module contains no:
 * - user-facing strings;
 * - localization dictionaries;
 * - business block mappings;
 * - report-data mutation;
 * - runtime Lucide dependency.
 *
 * Public contract:
 *
 * ExecutiveSlideEngine.icons.get(name)
 * ExecutiveSlideEngine.icons.has(name)
 * ExecutiveSlideEngine.icons.draw(context, name, options)
 * ExecutiveSlideEngine.icons.toPathData(name)
 * ExecutiveSlideEngine.icons.list()
 *
 * Returned icon objects are immutable.
 * Callers must treat them as read-only and must not modify them.
 *
 * Compatibility notes:
 *
 * - check-circle-2 is a deprecated Lucide alias of circle-check.
 * - layers-3 is a deprecated Lucide alias of layers.
 * - circle-help is a deprecated Lucide alias of circle-question-mark.
 *
 * Deprecated names are resolved internally for backward compatibility.
 * All new modules must use canonical Lucide identifiers only.
 */

(function initializeIcons(global) {
    'use strict';

    const engine = global.ExecutiveSlideEngine || {};
    const ICON_SYSTEM_VERSION = '2.0.0';
    const FALLBACK_ICON_NAME = 'circle-question-mark';
    const VIEW_BOX = '0 0 24 24';

    const registry = deepFreeze({
        users: {
            name: 'users',
            viewBox: VIEW_BOX,
            nodes: [
                ['path', {
                    d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'
                }],
                ['circle', {
                    cx: '9',
                    cy: '7',
                    r: '4'
                }],
                ['path', {
                    d: 'M22 21v-2a4 4 0 0 0-3-3.87'
                }],
                ['path', {
                    d: 'M16 3.13a4 4 0 0 1 0 7.75'
                }]
            ]
        },

        'file-text': {
            name: 'file-text',
            viewBox: VIEW_BOX,
            nodes: [
                ['path', {
                    d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'
                }],
                ['polyline', {
                    points: '14 2 14 8 20 8'
                }],
                ['line', {
                    x1: '16',
                    x2: '8',
                    y1: '13',
                    y2: '13'
                }],
                ['line', {
                    x1: '16',
                    x2: '8',
                    y1: '17',
                    y2: '17'
                }],
                ['line', {
                    x1: '10',
                    x2: '8',
                    y1: '9',
                    y2: '9'
                }]
            ]
        },

        'circle-check': {
            name: 'circle-check',
            viewBox: VIEW_BOX,
            nodes: [
                ['circle', {
                    cx: '12',
                    cy: '12',
                    r: '10'
                }],
                ['path', {
                    d: 'm9 12 2 2 4-4'
                }]
            ]
        },

        'clipboard-list': {
            name: 'clipboard-list',
            viewBox: VIEW_BOX,
            nodes: [
                ['rect', {
                    width: '8',
                    height: '4',
                    x: '8',
                    y: '2',
                    rx: '1',
                    ry: '1'
                }],
                ['path', {
                    d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'
                }],
                ['path', {
                    d: 'M12 11h4'
                }],
                ['path', {
                    d: 'M12 16h4'
                }],
                ['path', {
                    d: 'M8 11h.01'
                }],
                ['path', {
                    d: 'M8 16h.01'
                }]
            ]
        },

        'user-round': {
            name: 'user-round',
            viewBox: VIEW_BOX,
            nodes: [
                ['circle', {
                    cx: '12',
                    cy: '8',
                    r: '5'
                }],
                ['path', {
                    d: 'M20 21a8 8 0 0 0-16 0'
                }]
            ]
        },

        'triangle-alert': {
            name: 'triangle-alert',
            viewBox: VIEW_BOX,
            nodes: [
                ['path', {
                    d: 'm21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'
                }],
                ['path', {
                    d: 'M12 9v4'
                }],
                ['path', {
                    d: 'M12 17h.01'
                }]
            ]
        },

        lightbulb: {
            name: 'lightbulb',
            viewBox: VIEW_BOX,
            nodes: [
                ['path', {
                    d: 'M9 18h6'
                }],
                ['path', {
                    d: 'M10 22h4'
                }],
                ['path', {
                    d: 'M15.09 14c.18-.68.66-1.18 1.22-1.74A6 6 0 1 0 7.69 12.26C8.25 12.82 8.73 13.32 8.91 14'
                }]
            ]
        },

        calendar: {
            name: 'calendar',
            viewBox: VIEW_BOX,
            nodes: [
                ['path', {
                    d: 'M8 2v4'
                }],
                ['path', {
                    d: 'M16 2v4'
                }],
                ['rect', {
                    width: '18',
                    height: '18',
                    x: '3',
                    y: '4',
                    rx: '2'
                }],
                ['path', {
                    d: 'M3 10h18'
                }]
            ]
        },

        'clock-3': {
            name: 'clock-3',
            viewBox: VIEW_BOX,
            nodes: [
                ['circle', {
                    cx: '12',
                    cy: '12',
                    r: '10'
                }],
                ['polyline', {
                    points: '12 6 12 12 16.5 9.5'
                }]
            ]
        },

        network: {
            name: 'network',
            viewBox: VIEW_BOX,
            nodes: [
                ['rect', {
                    x: '16',
                    y: '16',
                    width: '6',
                    height: '6',
                    rx: '1'
                }],
                ['rect', {
                    x: '2',
                    y: '16',
                    width: '6',
                    height: '6',
                    rx: '1'
                }],
                ['rect', {
                    x: '9',
                    y: '2',
                    width: '6',
                    height: '6',
                    rx: '1'
                }],
                ['path', {
                    d: 'M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3'
                }],
                ['path', {
                    d: 'M12 12V8'
                }]
            ]
        },

        boxes: {
            name: 'boxes',
            viewBox: VIEW_BOX,
            nodes: [
                ['path', {
                    d: 'M2.97 12.92a2 2 0 0 0 0 2.16l2 3.5a2 2 0 0 0 1.79 1H10a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2.03 1.34Z'
                }],
                ['path', {
                    d: 'm7 16 2-3'
                }],
                ['path', {
                    d: 'm7 16 2 3'
                }],
                ['path', {
                    d: 'M13.03 12.92a2 2 0 0 0 0 2.16l2 3.5a2 2 0 0 0 1.79 1H20a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5a2 2 0 0 0-1.97 1.34Z'
                }],
                ['path', {
                    d: 'm17 16 2-3'
                }],
                ['path', {
                    d: 'm17 16 2 3'
                }],
                ['path', {
                    d: 'M7.97 3.42a2 2 0 0 0 0 2.16l2 3.5a2 2 0 0 0 1.79 1H15a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5a2 2 0 0 0-2.03 1.34Z'
                }],
                ['path', {
                    d: 'm12 6.5 2-3'
                }],
                ['path', {
                    d: 'm12 6.5 2 3'
                }]
            ]
        },

        layers: {
            name: 'layers',
            viewBox: VIEW_BOX,
            nodes: [
                ['path', {
                    d: 'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z'
                }],
                ['path', {
                    d: 'm22 12.5-9.17 4.17a2 2 0 0 1-1.66 0L2 12.5'
                }],
                ['path', {
                    d: 'm22 17.5-9.17 4.17a2 2 0 0 1-1.66 0L2 17.5'
                }]
            ]
        },

        'chart-column': {
            name: 'chart-column',
            viewBox: VIEW_BOX,
            nodes: [
                ['path', {
                    d: 'M3 3v18h18'
                }],
                ['path', {
                    d: 'M18 17V9'
                }],
                ['path', {
                    d: 'M13 17V5'
                }],
                ['path', {
                    d: 'M8 17v-3'
                }]
            ]
        },

        target: {
            name: 'target',
            viewBox: VIEW_BOX,
            nodes: [
                ['circle', {
                    cx: '12',
                    cy: '12',
                    r: '10'
                }],
                ['circle', {
                    cx: '12',
                    cy: '12',
                    r: '6'
                }],
                ['circle', {
                    cx: '12',
                    cy: '12',
                    r: '2'
                }]
            ]
        },

        flask: {
            name: 'flask', viewBox: VIEW_BOX, nodes: [
                ['path', { d: 'M9 3h6' }],
                ['path', { d: 'M10 9V3h4v6l5 8.5A2 2 0 0 1 17.3 21H6.7A2 2 0 0 1 5 17.5Z' }],
                ['path', { d: 'M7.5 15h9' }]
            ]
        },

        'clipboard-check': {
            name: 'clipboard-check', viewBox: VIEW_BOX, nodes: [
                ['rect', { width: '8', height: '4', x: '8', y: '2', rx: '1', ry: '1' }],
                ['path', { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' }],
                ['path', { d: 'm9 14 2 2 4-4' }]
            ]
        },

        sparkles: {
            name: 'sparkles', viewBox: VIEW_BOX, nodes: [
                ['path', { d: 'm12 3-1.6 4.4L6 9l4.4 1.6L12 15l1.6-4.4L18 9l-4.4-1.6Z' }],
                ['path', { d: 'm19 15-.8 2.2L16 18l2.2.8L19 21l.8-2.2L22 18l-2.2-.8Z' }],
                ['path', { d: 'm5 3-.8 2.2L2 6l2.2.8L5 9l.8-2.2L8 6l-2.2-.8Z' }]
            ]
        },

        settings: {
            name: 'settings', viewBox: VIEW_BOX, nodes: [
                ['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z' }],
                ['circle', { cx: '12', cy: '12', r: '3' }]
            ]
        },

        'users-round': {
            name: 'users-round', viewBox: VIEW_BOX, nodes: [
                ['path', { d: 'M18 21a8 8 0 0 0-16 0' }],
                ['circle', { cx: '10', cy: '8', r: '5' }],
                ['path', { d: 'M22 20c0-3-1.5-5.5-4-7' }],
                ['path', { d: 'M17 3a5 5 0 0 1 0 9' }]
            ]
        },

        box: {
            name: 'box', viewBox: VIEW_BOX, nodes: [
                ['path', { d: 'm21 8-9 5-9-5 9-5 9 5Z' }],
                ['path', { d: 'm3 8 9 5 9-5' }],
                ['path', { d: 'M3 8v8l9 5 9-5V8' }],
                ['path', { d: 'M12 13v8' }]
            ]
        },

        'calendar-days': {
            name: 'calendar-days', viewBox: VIEW_BOX, nodes: [
                ['path', { d: 'M8 2v4' }], ['path', { d: 'M16 2v4' }],
                ['rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }],
                ['path', { d: 'M3 10h18' }],
                ['path', { d: 'M8 14h.01' }], ['path', { d: 'M12 14h.01' }], ['path', { d: 'M16 14h.01' }],
                ['path', { d: 'M8 18h.01' }], ['path', { d: 'M12 18h.01' }]
            ]
        },

        'brain-circuit': {
            name: 'brain-circuit', viewBox: VIEW_BOX, nodes: [
                ['path', { d: 'M9 5a3 3 0 1 0-6 0c0 .7.2 1.3.6 1.8A4 4 0 0 0 5 14.5V17a3 3 0 0 0 6 0V5' }],
                ['path', { d: 'M15 5a3 3 0 1 1 6 0c0 .7-.2 1.3-.6 1.8A4 4 0 0 1 19 14.5V17a3 3 0 0 1-6 0V5' }],
                ['path', { d: 'M8 9h8' }], ['circle', { cx: '12', cy: '9', r: '1' }]
            ]
        },

        database: {
            name: 'database', viewBox: VIEW_BOX, nodes: [
                ['ellipse', { cx: '12', cy: '5', rx: '9', ry: '3' }],
                ['path', { d: 'M3 5v7c0 1.7 4 3 9 3s9-1.3 9-3V5' }],
                ['path', { d: 'M3 12v7c0 1.7 4 3 9 3s9-1.3 9-3v-7' }]
            ]
        },

        workflow: {
            name: 'workflow', viewBox: VIEW_BOX, nodes: [
                ['rect', { x: '3', y: '3', width: '6', height: '6', rx: '1' }],
                ['rect', { x: '15', y: '15', width: '6', height: '6', rx: '1' }],
                ['path', { d: 'M9 6h3a3 3 0 0 1 3 3v6' }],
                ['path', { d: 'm12 12 3 3 3-3' }]
            ]
        },

        puzzle: {
            name: 'puzzle', viewBox: VIEW_BOX, nodes: [
                ['path', { d: 'M19.4 13.5A4 4 0 0 0 22 10h-4V6a2 2 0 0 0-2-2h-4a4 4 0 1 0-8 0H2v6h4a4 4 0 1 1 0 8H2v4h6v-4a4 4 0 1 1 8 0v4h6v-6h-4a4 4 0 0 0 1.4-2.5Z' }]
            ]
        },

        'circle-question-mark': {
            name: 'circle-question-mark',
            viewBox: VIEW_BOX,
            nodes: [
                ['circle', {
                    cx: '12',
                    cy: '12',
                    r: '10'
                }],
                ['path', {
                    d: 'M9.09 9a3 3 0 1 1 5.83 1c0 2-3 3-3 3'
                }],
                ['path', {
                    d: 'M12 17h.01'
                }]
            ]
        }
    });

    const aliases = deepFreeze({
        'check-circle-2': 'circle-check',
        'layers-3': 'layers',
        'circle-help': 'circle-question-mark'
    });

    function get(name) {
        const canonicalName = resolveName(name);

        if (
            canonicalName &&
            Object.prototype.hasOwnProperty.call(
                registry,
                canonicalName
            )
        ) {
            return registry[canonicalName];
        }

        warn(
            'Unknown icon. Falling back to circle-question-mark.',
            name
        );

        return registry[FALLBACK_ICON_NAME];
    }

    function has(name) {
        const canonicalName = resolveName(name);

        return Boolean(
            canonicalName &&
            Object.prototype.hasOwnProperty.call(
                registry,
                canonicalName
            )
        );
    }

    function resolveName(name) {
        if (typeof name !== 'string') {
            return null;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                aliases,
                name
            )
        ) {
            return aliases[name];
        }

        return name;
    }

    function nodeToPath(tag, attrs = {}) {
        const number = value => Number(value || 0);

        if (tag === 'path') return String(attrs.d || '');
        if (tag === 'line') {
            return `M ${number(attrs.x1)} ${number(attrs.y1)} L ${number(attrs.x2)} ${number(attrs.y2)}`;
        }
        if (tag === 'polyline') {
            const points = String(attrs.points || '').trim().split(/\s+/)
                .map(value => value.split(',').map(Number))
                .filter(point => point.length === 2 && point.every(Number.isFinite));
            if (!points.length) return '';
            return `M ${points[0][0]} ${points[0][1]} ` +
                points.slice(1).map(point => `L ${point[0]} ${point[1]}`).join(' ');
        }
        if (tag === 'rect') {
            const x = number(attrs.x);
            const y = number(attrs.y);
            const width = number(attrs.width);
            const height = number(attrs.height);
            return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
        }
        if (tag === 'circle') {
            return ellipsePath(
                number(attrs.cx),
                number(attrs.cy),
                number(attrs.r),
                number(attrs.r)
            );
        }
        if (tag === 'ellipse') {
            return ellipsePath(
                number(attrs.cx),
                number(attrs.cy),
                number(attrs.rx),
                number(attrs.ry)
            );
        }
        return '';
    }

    function ellipsePath(cx, cy, rx, ry) {
        const kappa = 0.5522847498307936;
        const xControl = rx * kappa;
        const yControl = ry * kappa;
        return `M ${cx + rx} ${cy} ` +
            `C ${cx + rx} ${cy + yControl} ${cx + xControl} ${cy + ry} ${cx} ${cy + ry} ` +
            `C ${cx - xControl} ${cy + ry} ${cx - rx} ${cy + yControl} ${cx - rx} ${cy} ` +
            `C ${cx - rx} ${cy - yControl} ${cx - xControl} ${cy - ry} ${cx} ${cy - ry} ` +
            `C ${cx + xControl} ${cy - ry} ${cx + rx} ${cy - yControl} ${cx + rx} ${cy} Z`;
    }

    function toPathData(name) {
        const definition = get(name);
        return Object.freeze(
            definition.nodes
                .map(([tag, attrs]) => nodeToPath(tag, attrs))
                .filter(Boolean)
        );
    }

    function draw(context, name, options = {}) {
        if (!context || typeof context.svgPath !== 'function') return false;

        const size = Number(options.size);
        const x = Number(options.x);
        const y = Number(options.y);
        if (![size, x, y].every(Number.isFinite) || size <= 0) return false;

        const iconTokens = engine.design?.TOKENS?.icons || {};
        const strokeTokens = iconTokens.strokeWidth || {};
        const baselineCorrection = Number(
            options.baselineCorrection ?? iconTokens.baselineCorrection ?? 1.08
        );
        const strokeWidth = Number(
            options.strokeWidth ?? Math.max(
                Number(strokeTokens.min ?? 0.48),
                Math.min(
                    Number(strokeTokens.max ?? 0.72),
                    size * Number(strokeTokens.ratio ?? 0.055)
                )
            )
        );
        const color = options.color || 'purplePrimary';
        const drawY = y - size * baselineCorrection;

        for (const path of toPathData(name)) {
            context.svgPath(path, {
                x,
                y: drawY,
                size,
                stroke: color,
                borderWidth: strokeWidth
            });
        }
        return true;
    }

    function list() {
        return Object.freeze(Object.keys(registry));
    }

    function warn(message, value) {
        if (typeof engine.diagnostics === 'function') {
            engine.diagnostics({
                source: 'icons',
                level: 'warn',
                message,
                value
            });

            return;
        }

        if (
            engine.debug === true &&
            global.console &&
            typeof global.console.warn === 'function'
        ) {
            global.console.warn(
                `Executive Slide Engine: ${message}`,
                value
            );
        }
    }

    function deepFreeze(value) {
        if (
            !value ||
            typeof value !== 'object' ||
            Object.isFrozen(value)
        ) {
            return value;
        }

        Object.getOwnPropertyNames(value)
            .forEach(propertyName => {
                deepFreeze(
                    value[propertyName]
                );
            });

        return Object.freeze(value);
    }

    engine.icons = Object.freeze({
        version: ICON_SYSTEM_VERSION,
        fallback: FALLBACK_ICON_NAME,
        get,
        has,
        resolveName,
        toPathData,
        draw,
        list
    });

    global.ExecutiveSlideEngine = engine;

})(
    typeof globalThis !== 'undefined'
        ? globalThis
        : window
);
