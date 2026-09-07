/**
 * LOREVI Executive PDF — Meeting Type v1
 *
 * Adds a compact meeting-type badge to the first-page header without changing
 * canonical report content or header geometry. Prefers meeting_type_label and
 * falls back to a localized label from meeting_type.
 */
(function attachMeetingTypeV1(globalScope) {
    'use strict';

    const host = globalScope.ExecutiveSlideEngine || (globalScope.ExecutiveSlideEngine = {});
    const previous = host.blockRenderers || {};
    const baseHeader = previous.header;

    const LABELS = Object.freeze({
        en: Object.freeze({
            strategy:'Strategy', product:'Product', architecture:'Architecture', planning:'Planning', status:'Status', incident:'Incident', client:'Client', board:'Board', operations:'Operations', research:'Research', partnership:'Partnership', sales:'Sales', education:'Education', personal:'Personal', interview:'Interview', retrospective:'Retrospective', workshop:'Workshop', one_on_one:'1:1', review:'Review', other:'Meeting'
        }),
        ru: Object.freeze({
            strategy:'Стратегическая встреча', product:'Продуктовая встреча', architecture:'Архитектурная встреча', planning:'Планирование', status:'Статус-встреча', incident:'Разбор инцидента', client:'Клиентская встреча', board:'Совет / Board', operations:'Операционная встреча', research:'Исследование', partnership:'Партнёрская встреча', sales:'Продажи', education:'Обучение', personal:'Личная встреча', interview:'Интервью', retrospective:'Ретроспектива', workshop:'Воркшоп', one_on_one:'1:1', review:'Ревью', other:'Встреча'
        })
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
        return base;
    }

    function typeLabel(report, ctx) {
        const explicit = clean(
            report?.meeting_type_label ||
            report?.meetingTypeLabel ||
            report?.type_label ||
            report?.typeLabel
        );
        if (explicit) return explicit;

        const type = clean(report?.meeting_type || report?.meetingType || 'other').toLowerCase();
        const lang = language(ctx);
        const dictionary = LABELS[lang] || LABELS.en;
        return dictionary[type] || LABELS.en[type] || dictionary.other || LABELS.en.other;
    }

    function fitStyle(ctx, text, maxWidth) {
        let size = 5.6;
        const font = 'semibold';
        while (size > 4.4 && ctx.measureText(text, font, size) + 14 > maxWidth) {
            size -= 0.2;
        }
        const width = Math.min(maxWidth, ctx.measureText(text, font, size) + 14);
        return { font, size, width };
    }

    function renderHeader(block, ctx) {
        if (typeof baseHeader === 'function') baseHeader(block, ctx);

        if (Number(block?.pageNumber || 1) !== 1) return;
        const report = ctx.report || {};
        const label = typeLabel(report, ctx);
        if (!label) return;

        const g = block.geometry;
        if (!g || g.width < 320) return;

        // Keep clear of the mountain artwork on the far right and of the title on the left.
        const safeRight = g.x + g.width - 128;
        const safeLeft = g.x + Math.min(260, g.width * 0.42);
        const maxWidth = Math.max(80, safeRight - safeLeft);
        const style = fitStyle(ctx, label, maxWidth);
        const x = safeRight - style.width;
        const y = g.y + 21.5;
        const h = 11.5;

        ctx.rect({
            x, y, width: style.width, height: h,
            fill: 'purpleSoft', stroke: 'purpleSoft', borderWidth: 0, radius: 5.5
        });
        ctx.text(label, {
            x: x + 7,
            y: y + 2.4,
            size: style.size,
            font: style.font,
            color: 'purplePrimary'
        });
    }

    host.blockRenderers = Object.freeze({
        ...previous,
        header: renderHeader,
        version: `${previous.version || 'block-renderers'}+meeting-type-v1`
    });

})(window);
