/**
 * LOREVI Executive PDF — Meeting Type + Service Stats v1.1
 *
 * Adds the compact meeting-type badge and adapts the v1.1 service fields for
 * the legacy Golden renderer without leaking machine keys into the PDF.
 */
(function attachMeetingTypeV1(globalScope) {
    'use strict';

    const host = globalScope.ExecutiveSlideEngine || (globalScope.ExecutiveSlideEngine = {});
    const previous = host.blockRenderers || {};
    const baseHeader = previous.header;
    const baseStats = previous.stats;

    const LABELS = Object.freeze({
        en: Object.freeze({strategy:'Strategy',product:'Product',architecture:'Architecture',planning:'Planning',status:'Status',incident:'Incident',client:'Client',board:'Board',operations:'Operations',research:'Research',partnership:'Partnership',sales:'Sales',education:'Education',personal:'Personal',interview:'Interview',retrospective:'Retrospective',workshop:'Workshop',one_on_one:'1:1',review:'Review',other:'Meeting'}),
        ru: Object.freeze({strategy:'Стратегическая встреча',product:'Продуктовая встреча',architecture:'Архитектурная встреча',planning:'Планирование',status:'Статус-встреча',incident:'Разбор инцидента',client:'Клиентская встреча',board:'Совет / Board',operations:'Операционная встреча',research:'Исследование',partnership:'Партнёрская встреча',sales:'Продажи',education:'Обучение',personal:'Личная встреча',interview:'Интервью',retrospective:'Ретроспектива',workshop:'Воркшоп',one_on_one:'1:1',review:'Ревью',other:'Встреча'})
    });

    const STAT_I18N = Object.freeze({
        en:{duration:'Duration',minute:'min'}, ru:{duration:'Длительность',minute:'мин'},
        es:{duration:'Duración',minute:'min'}, pt:{duration:'Duração',minute:'min'},
        tr:{duration:'Süre',minute:'dk'}, id:{duration:'Durasi',minute:'mnt'},
        hi:{duration:'अवधि',minute:'मिनट'}, ar:{duration:'المدة',minute:'دقيقة'},
        uz:{duration:'Davomiyligi',minute:'daq'}, fa:{duration:'مدت',minute:'دقیقه'}
    });

    function clean(value) {
        return value === null || value === undefined ? '' : String(value).replace(/\s+/g, ' ').trim();
    }

    function language(ctx) {
        const raw = String(ctx?.options?.language || ctx?.options?.report_language || ctx?.report?.report_language || ctx?.report?.language || 'en')
            .trim().toLowerCase().replace(/_/g, '-');
        const base = raw.split('-')[0] === 'in' ? 'id' : raw.split('-')[0];
        return base;
    }

    function typeLabel(report, ctx) {
        const explicit = clean(report?.meeting_type_label || report?.meetingTypeLabel || report?.type_label || report?.typeLabel);
        if (explicit) return explicit;
        const type = clean(report?.meeting_type || report?.meetingType || 'other').toLowerCase();
        const lang = language(ctx);
        const dictionary = LABELS[lang] || LABELS.en;
        return dictionary[type] || LABELS.en[type] || dictionary.other || LABELS.en.other;
    }

    function durationSeconds(report) {
        const candidates = [report?.duration_seconds, report?.durationSeconds, report?.stats?.duration_seconds, report?.metadata?.duration_seconds, report?.meeting?.duration_seconds];
        for (const value of candidates) {
            const n = Number(value);
            if (Number.isFinite(n) && n > 0) return n;
        }
        return 0;
    }

    function roundedDurationSeconds(report) {
        const seconds = durationSeconds(report);
        return seconds > 0 ? Math.ceil(seconds / 60) * 60 : 0;
    }

    function count(report, key, aliases = []) {
        for (const name of [key, ...aliases]) {
            if (Array.isArray(report?.[name])) return report[name].length;
            const n = Number(report?.[`${name}_count`]);
            if (Number.isFinite(n) && n >= 0) return n;
        }
        return 0;
    }

    function adaptedReport(report, ctx) {
        const seconds = roundedDurationSeconds(report);
        const minutes = seconds > 0 ? Math.ceil(seconds / 60) : 0;
        const dictionary = STAT_I18N[language(ctx)] || STAT_I18N.en;
        const stats = {};
        if (minutes > 0) stats[dictionary.duration] = `${minutes} ${dictionary.minute}`;
        stats.tasks = count(report, 'tasks', ['action_items']);
        stats.decisions = count(report, 'decisions');
        stats.risks = count(report, 'risks');
        return { ...report, duration_seconds: seconds || report?.duration_seconds, stats };
    }

    function adaptedContext(ctx) {
        const derived = Object.create(ctx || null);
        Object.defineProperty(derived, 'report', { value: adaptedReport(ctx?.report || {}, ctx), enumerable: true, configurable: true });
        return derived;
    }

    function fitStyle(ctx, text, maxWidth) {
        let size = 5.6;
        const font = 'semibold';
        while (size > 4.4 && ctx.measureText(text, font, size) + 14 > maxWidth) size -= 0.2;
        return { font, size, width: Math.min(maxWidth, ctx.measureText(text, font, size) + 14) };
    }

    function renderHeader(block, ctx) {
        const serviceCtx = adaptedContext(ctx);
        if (typeof baseHeader === 'function') baseHeader(block, serviceCtx);
        if (Number(block?.pageNumber || 1) !== 1) return;
        const report = ctx.report || {};
        const label = typeLabel(report, ctx);
        if (!label) return;
        const g = block.geometry;
        if (!g || g.width < 320) return;
        const safeRight = g.x + g.width - 128;
        const safeLeft = g.x + Math.min(260, g.width * 0.42);
        const maxWidth = Math.max(80, safeRight - safeLeft);
        const style = fitStyle(ctx, label, maxWidth);
        const x = safeRight - style.width;
        const y = g.y + 21.5;
        const h = 11.5;
        ctx.rect({x, y, width: style.width, height: h, fill: 'purpleSoft', stroke: 'purpleSoft', borderWidth: 0, radius: 5.5});
        ctx.text(label, {x: x + 7, y: y + 2.4, size: style.size, font: style.font, color: 'purplePrimary'});
    }

    function renderStats(block, ctx) {
        if (typeof baseStats === 'function') baseStats(block, adaptedContext(ctx));
    }

    host.blockRenderers = Object.freeze({
        ...previous,
        header: renderHeader,
        stats: renderStats,
        version: `${previous.version || 'block-renderers'}+meeting-type-v1.1`
    });

})(window);
