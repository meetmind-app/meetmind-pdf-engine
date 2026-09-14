/*
 * MeetMind AI — Executive PDF Engine
 * Golden Design System v2.0
 *
 * Canonical visual tokens for the approved Enterprise Architecture Cards
 * Golden Template. Behaviour remains owned by the Frozen MVP Specification.
 *
 * Public contract:
 *   ExecutiveSlideEngine.design.version
 *   ExecutiveSlideEngine.design.TOKENS
 *   ExecutiveSlideEngine.design.getDensityTokens(density)
 *   ExecutiveSlideEngine.design.getTextStyle(role, density)
 *   ExecutiveSlideEngine.design.getTypographyToken(name, density)
 *   ExecutiveSlideEngine.design.getColor(name)
 */

(function initializeDesignSystem(global) {
    'use strict';

    const engine = global.ExecutiveSlideEngine || {};
    const DESIGN_VERSION = '2.0.0';

    const TOKENS = deepFreeze({
        page: {
            width: 768,
            height: 512,
            aspectRatio: 1.5,
            background: 'pageBg',
            safeArea: { top: 8, right: 10, bottom: 3, left: 10 },
            preferredPrimaryEdgeSafety: 8
        },

        goldenReference: {
            sourcePx: { width: 1536, height: 1024 },
            pixelsPerPt: 2,
            regions: {
                header:          { x: 10,   y: 8,     w: 748,   h: 39 },
                statistics:      { x: 10,   y: 49,    w: 340,   h: 17 },
                summary:         { x: 10,   y: 70,    w: 324.5, h: 150 },
                metrics:         { x: 338,  y: 70,    w: 420,   h: 150 },
                insights:        { x: 10,   y: 223.5, w: 239.5, h: 102.5 },
                decisions:       { x: 252.5,y: 223.5, w: 265,   h: 102.5 },
                risks:           { x: 521,  y: 223.5, w: 237,   h: 102.5 },
                tasks:           { x: 10,   y: 330,   w: 292,   h: 142.5 },
                architecture:    { x: 306,  y: 330,   w: 452,   h: 142.5 },
                ownersFooter:    { x: 10,   y: 476,   w: 748,   h: 32.5 }
            },
            ratios: {
                summaryMetrics: [0.435, 0.565],
                insightsDecisionsRisks: [0.32, 0.36, 0.32],
                tasksArchitecture: [0.39, 0.61]
            },
            tolerance: {
                majorPosition: 1.5,
                majorWidth: 1.5,
                majorHeight: 2,
                internalPosition: 1,
                internalSize: 1.5,
                typography: 0.25,
                lineHeight: 0.4
            }
        },

        colors: {
            pageBg: '#FFFFFF',
            cardBg: '#FFFFFF',
            mutedSurface: '#F7F8FB',
            textPrimary: '#0B102D',
            textSecondary: '#626A80',
            textMuted: '#8B91A5',
            borderDefault: '#E4E6ED',
            dividerDefault: '#D9DCE6',
            purplePrimary: '#5B2DD5',
            purpleDark: '#4820B8',
            purpleSoft: '#F1EDFF',
            greenSuccess: '#2E8B4E',
            greenSoft: '#EEF8F1',
            orangeRisk: '#F05A22',
            orangeSoft: '#FFF3EC',
            architectureNeutral: '#141832',
            white: '#FFFFFF',

            /* Backward-compatible semantic aliases used by existing renderers. */
            pageBackground: '#FFFFFF',
            cardBackground: '#FFFFFF',
            serviceBackground: '#FFFFFF',
            cardBorder: '#E4E6ED',
            title: '#0B102D',
            body: '#0B102D',
            secondary: '#626A80',
            accent: '#5B2DD5'
        },

        typography: {
            families: {
                regular: 'regular',
                medium: 'medium',
                semibold: 'semibold',
                bold: 'bold'
            },
            tokens: {
                reportTitle:              token(700, 18, 17, 16, 15, 21, 20, 18.5, 'textPrimary'),
                meetingMeta:              token(500, 8.5, 8, 7.5, 7.2, 11, 10, 9, 'textSecondary'),
                statLabel:                token(600, 7, 6.7, 6.4, 6.2, 9, 8.3, 7.6, 'textPrimary'),
                statValue:                token(700, 7.4, 7, 6.6, 6.3, 9, 8.4, 7.8, 'textPrimary'),
                blockTitle:               token(700, 9, 8.6, 8.2, 8, 11.2, 10.5, 9.8, 'textPrimary'),
                body:                     token(400, 6.9, 6.6, 6.3, 6.1, 9.5, 8.6, 7.8, 'textPrimary'),
                bodyStrong:               token(600, 6.9, 6.6, 6.3, 6.1, 9.5, 8.6, 7.8, 'textPrimary'),
                listBody:                 token(400, 6.6, 6.3, 6.1, 5.9, 9, 8.1, 7.4, 'textPrimary'),
                listStrong:               token(600, 6.6, 6.3, 6.1, 5.9, 9, 8.1, 7.4, 'textPrimary'),
                badgeNumber:              token(700, 5.4, 5.2, 5, 4.8, 6, 5.7, 5.4, 'white'),
                metricLabel:              token(600, 5.8, 5.5, 5.2, 5, 7.2, 6.7, 6.2, 'textSecondary'),
                metricValue:              token(700, 9.5, 9, 8.5, 8, 11, 10.2, 9.5, 'textPrimary'),
                metricSideLabel:          token(600, 5.6, 5.3, 5.1, 4.9, 6.8, 6.4, 6, 'textSecondary'),
                metricSideValue:          token(700, 7.1, 6.8, 6.4, 6.1, 8, 7.5, 7, 'textPrimary'),
                taskHeader:               token(600, 5.2, 5, 4.8, 4.7, 6.5, 6, 5.6, 'textSecondary'),
                taskCell:                 token(400, 5.2, 5, 4.8, 4.7, 6.6, 6.2, 5.8, 'textPrimary'),
                taskCellStrong:           token(500, 5.2, 5, 4.8, 4.7, 6.6, 6.2, 5.8, 'textPrimary'),
                architectureSectionNo:    token(700, 7.5, 7.1, 6.8, 6.5, 9, 8.5, 8, 'textPrimary'),
                architectureSectionTitle: token(700, 7.2, 6.9, 6.6, 6.3, 8.8, 8.2, 7.7, 'textPrimary'),
                architectureItemTitle:    token(600, 5.8, 5.6, 5.3, 5.1, 7.0, 6.6, 6.2, 'textPrimary'),
                architectureDescription:  token(400, 5.1, 4.9, 4.7, 4.6, 6.5, 6, 5.6, 'textSecondary'),
                ownerInitials:            token(700, 5.7, 5.4, 5.2, 5, 7, 6.5, 6, 'purplePrimary'),
                ownerName:                token(500, 5.8, 5.5, 5.3, 5.1, 7, 6.6, 6.2, 'textPrimary'),
                ownerRole:                token(400, 5.3, 5.1, 4.9, 4.8, 6.5, 6.1, 5.7, 'textSecondary'),
                footer:                   token(400, 6.3, 6, 5.8, 5.6, 8, 7.4, 6.8, 'textSecondary'),
                brandLink:                token(600, 6.4, 6.1, 5.9, 5.7, 8, 7.4, 6.8, 'purplePrimary')
            },

            /* Compatibility roles for renderer v1.0. */
            hierarchy: {
                primary: supportingHierarchy('blockTitle', 'body', 'meetingMeta'),
                core: supportingHierarchy('blockTitle', 'listBody', 'meetingMeta'),
                supporting: supportingHierarchy('blockTitle', 'listBody', 'meetingMeta'),
                service: supportingHierarchy('blockTitle', 'taskCell', 'meetingMeta'),
                document: supportingHierarchy('blockTitle', 'body', 'meetingMeta')
            }
        },

        spacing: {
            regular: spacingMode(10, 8, 4, 4, 8, 7, 6, 5, 4, 2.5, 7, 5, 12, 10, 11, 7),
            compact: spacingMode(10, 7, 3.5, 3.5, 7, 6, 5, 4, 3.3, 2, 6, 4, 10, 9.5, 10.5, 6.5),
            dense: spacingMode(10, 6, 3, 3, 6, 5, 4, 3, 2.7, 1.5, 5, 3.2, 8, 9, 10, 6),
            minimum: spacingMode(8, 6, 3, 2.5, 5.5, 4.5, 3.5, 2.5, 2.3, 1.3, 4.5, 2.8, 7, 8.5, 9, 5.8)
        },

        borders: {
            card: { width: 0.5, radius: 4, color: 'borderDefault' },
            nestedCard: { width: 0.5, radius: 3.5, color: 'borderDefault' },
            divider: { width: 0.35, color: 'dividerDefault' },
            tableDivider: { width: 0.35, color: 'borderDefault' }
        },

        shapes: {
            sectionRadius: { regular: 4, compact: 4, dense: 3.5, min: 3 },
            metricRadius: { regular: 3.5, compact: 3.5, dense: 3, min: 3 },
            pillRadius: 3,
            shadow: null
        },

        icons: {
            viewBoxSize: 24,
            baselineCorrection: 1.08,
            strokeWidth: { ratio: 0.055, min: 0.48, max: 0.72 },
            standard: { regular: 10, compact: 9.5, dense: 9, min: 8.5 },
            section: { regular: 11, compact: 10.5, dense: 10, min: 9 },
            metricPrimary: 13,
            metricSecondary: 9.5,
            architectureItem: 8,
            stroke: 1,
            architectureStroke: 0.8,
            gap: 4
        },

        badges: {
            diameter: { regular: 7, compact: 6.5, dense: 6, min: 5.8 },
            insights: 'purplePrimary',
            decisions: 'greenSuccess',
            risks: 'orangeRisk'
        },

        tables: {
            tasks: {
                usableWidth: 282,
                columns: [
                    { id: 'rowNumber', width: 14 },
                    { id: 'task', width: 183 },
                    { id: 'owner', width: 55 },
                    { id: 'dueDate', width: 30 }
                ],
                headerHeight: 10,
                rowMinDense: 9,
                duePill: { bg: 'purpleSoft', text: 'purplePrimary', radius: 3, padX: 3, padY: 1 }
            },
            /* Compatibility alias. */
            threeColumnTable: {
                columnGap: 4,
                secondColumnMinWidth: 55,
                thirdColumnMinWidth: 30,
                cellHorizontalPadding: 3,
                headerHeight: 10
            }
        },

        metrics: {
            primaryColumns: 4,
            primaryRows: 2,
            sideRows: 4,
            primaryCard: { width: 76, height: 61, gapX: 3, gapY: 3.5 },
            sideCard: { width: 91, height: 20.5, gapY: 3.5 },
            primaryAreaWidth: 313,
            sideWidth: 92,
            sideGap: 4
        },

        architecture: {
            goldenSectionCount: 4,
            sectionWidth: 106,
            sectionGap: 4,
            connectorSize: 6,
            connectorColor: '#B8BCCE',
            accentSequence: ['purplePrimary', 'greenSuccess', 'orangeRisk', 'purplePrimary']
        },

        owners: {
            avatarDiameter: 15,
            avatarBg: 'purpleSoft',
            avatarText: 'purplePrimary',
            separatorHeight: 16,
            separatorWidth: 0.5
        },

        cards: {
            default: { background: 'cardBg', border: 'card' },
            service: { background: 'cardBg', border: 'card' },
            compactGridItem: { background: 'cardBg', border: 'nestedCard', paddingX: 4, paddingTop: 3, columnGap: 4, rowGap: 3.5 }
        },

        density: {
            regular: { typographyScale: 1, lineHeightScale: 1, spacingScale: 1, iconScale: 1 },
            compact: { typographyScale: 1, lineHeightScale: 1, spacingScale: 1, iconScale: 1 },
            dense: { typographyScale: 1, lineHeightScale: 1, spacingScale: 1, iconScale: 1 }
        },

        benchmark: {
            enterpriseArchitectureCards: {
                mustFitOnePage: true,
                allowContentLoss: false,
                allowTextClipping: false,
                allowSemanticEllipsis: false,
                allowTextTruncation: false,
                expectedResolvedDensity: 'dense',
                pageCount: 1
            }
        }
    });

    function token(weight, regular, compact, dense, min, regularLH, compactLH, denseLH, color) {
        return { weight, font: weightToFont(weight), size: { regular, compact, dense, min }, lineHeight: { regular: regularLH, compact: compactLH, dense: denseLH }, color };
    }

    function weightToFont(weight) {
        if (weight >= 700) return 'bold';
        if (weight >= 600) return 'semibold';
        if (weight >= 500) return 'medium';
        return 'regular';
    }

    function supportingHierarchy(titleToken, bodyToken, secondaryToken) {
        return { titleToken, bodyToken, secondaryToken };
    }

    function spacingMode(pageMarginX, pageMarginTop, sectionGap, cardGap, cardPadX, cardPadY, titleContentGap, paragraphGap, listItemGap, tableRowPadY, architecturePad, architectureItemGap, ownerItemGap, iconStandard, sectionIcon, badgeDiameter) {
        return { pageMarginX, pageMarginTop, sectionGap, cardGap, cardPadX, cardPadY, titleContentGap, paragraphGap, listItemGap, tableRowPadY, architecturePad, architectureItemGap, ownerItemGap, iconStandard, sectionIcon, badgeDiameter };
    }

    function getDensityTokens(density) {
        const d = normalizeDensity(density);
        return deepFreeze({ ...TOKENS.spacing[d], ...TOKENS.density[d] });
    }

    function getTypographyToken(name, density = 'regular') {
        const d = normalizeDensity(density);
        const t = TOKENS.typography.tokens[name];
        if (!t) {
            warn('Unknown typography token. Falling back to body.', name);
            return getTypographyToken('body', d);
        }
        return deepFreeze({ font: t.font, weight: t.weight, size: t.size[d], minSize: t.size.min, lineHeight: t.lineHeight[d], color: t.color });
    }

    function getTextStyle(role, density = 'regular') {
        const hierarchy = TOKENS.typography.hierarchy[role] || TOKENS.typography.hierarchy.core;
        return deepFreeze({
            role: TOKENS.typography.hierarchy[role] ? role : 'core',
            density: normalizeDensity(density),
            title: getTypographyToken(hierarchy.titleToken, density),
            body: getTypographyToken(hierarchy.bodyToken, density),
            secondary: getTypographyToken(hierarchy.secondaryToken, density)
        });
    }

    function getColor(name) {
        const value = TOKENS.colors[name];
        if (!value) {
            warn('Unknown color token. Falling back to textPrimary.', name);
            return TOKENS.colors.textPrimary;
        }
        return value;
    }

    function normalizeDensity(density) {
        return density === 'compact' || density === 'dense' ? density : 'regular';
    }

    function warn(message, value) {
        if (engine.debug === true && global.console && typeof global.console.warn === 'function') {
            global.console.warn(`Executive Slide Engine: ${message}`, value);
        }
    }

    function deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.getOwnPropertyNames(value).forEach(key => deepFreeze(value[key]));
        return Object.freeze(value);
    }

    engine.design = Object.freeze({
        version: DESIGN_VERSION,
        TOKENS,
        getDensityTokens,
        getTextStyle,
        getTypographyToken,
        getColor
    });
    global.ExecutiveSlideEngine = engine;

})(typeof globalThis !== 'undefined' ? globalThis : window);
