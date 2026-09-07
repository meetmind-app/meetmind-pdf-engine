/**
 * LOREVI Executive PDF — Semantic Icons v2
 *
 * Presentation-only semantic resolver. It never changes report facts.
 * Metric icons are selected from canonical Lucide geometry by meaning rather
 * than array position, so the same metric receives the same icon in every report.
 */
(function attachSemanticIconsV2(globalScope) {
    'use strict';

    const host = globalScope.ExecutiveSlideEngine || (globalScope.ExecutiveSlideEngine = {});

    function clean(value) {
        return value === null || value === undefined
            ? ''
            : String(value).replace(/\s+/g, ' ').trim();
    }

    function haystack(metric) {
        return [
            metric?.label,
            metric?.title,
            metric?.name,
            metric?.value,
            metric?.context,
            metric?.relation
        ].map(clean).filter(Boolean).join(' ').toLowerCase();
    }

    function includesAny(text, patterns) {
        return patterns.some(pattern => text.includes(pattern));
    }

    function resolveMetric(metric) {
        const text = haystack(metric);
        const relation = clean(metric?.relation).toLowerCase();

        if (
            relation === 'target' || relation === 'current_to_target' ||
            includesAny(text, ['target', 'goal', 'objective', 'цель', 'целев', 'план', 'quota', 'квота'])
        ) return Object.freeze({ name: 'target', color: 'purplePrimary', semantic: 'target' });

        if (includesAny(text, [
            't2v', 'time', 'duration', 'minute', 'hour', 'day', 'latency', 'sla',
            'время', 'мин', 'час', 'день', 'срок', 'скорост'
        ])) return Object.freeze({ name: 'clock-3', color: 'purplePrimary', semantic: 'time' });

        if (includesAny(text, [
            'user', 'customer', 'client', 'participant', 'mau', 'dau', 'wau', 'subscriber',
            'пользоват', 'клиент', 'участник', 'подписчик', 'аудитори'
        ])) return Object.freeze({ name: 'users-round', color: 'purplePrimary', semantic: 'people' });

        if (includesAny(text, [
            'revenue', 'arr', 'mrr', 'gmv', 'sales', 'income', 'turnover',
            'выруч', 'доход', 'оборот', 'продаж'
        ])) return Object.freeze({ name: 'chart-column', color: 'greenSuccess', semantic: 'growth' });

        if (includesAny(text, [
            'conversion', 'rate', 'share', 'percent', '%', 'конверс', 'доля', 'процент'
        ])) return Object.freeze({ name: 'target', color: 'greenSuccess', semantic: 'rate' });

        if (includesAny(text, [
            'cost', 'cogs', 'price', 'margin', 'budget', 'expense',
            'стоим', 'затрат', 'марж', 'бюджет', 'цена'
        ])) return Object.freeze({ name: 'boxes', color: 'orangeRisk', semantic: 'economics' });

        if (includesAny(text, [
            'api', 'integration', 'network', 'channel', 'pipeline',
            'интеграц', 'канал', 'сеть', 'пайплайн'
        ])) return Object.freeze({ name: 'network', color: 'purplePrimary', semantic: 'system' });

        if (includesAny(text, [
            'risk', 'error', 'failure', 'incident', 'churn', 'defect',
            'риск', 'ошиб', 'сбой', 'инцидент', 'отток', 'дефект'
        ])) return Object.freeze({ name: 'triangle-alert', color: 'orangeRisk', semantic: 'risk' });

        return Object.freeze({ name: 'file-text', color: 'purplePrimary', semantic: 'generic' });
    }

    const SECTION = Object.freeze({
        summary: 'sparkles',
        metrics: 'chart-column',
        insights: 'lightbulb',
        decisions: 'circle-check',
        risks: 'triangle-alert',
        tasks: 'clipboard-list',
        architecture: 'network',
        owners: 'users'
    });

    const MEETING_TYPE = Object.freeze({
        strategy: 'target',
        product: 'layers',
        architecture: 'network',
        planning: 'calendar-days',
        status: 'clock-3',
        incident: 'triangle-alert',
        client: 'users-round',
        board: 'users',
        operations: 'settings',
        research: 'flask',
        partnership: 'network',
        sales: 'chart-column',
        education: 'file-text',
        personal: 'user-round',
        interview: 'users-round',
        retrospective: 'clock-3',
        workshop: 'users',
        one_on_one: 'user-round',
        review: 'clipboard-check',
        other: 'file-text'
    });

    function section(id) {
        return SECTION[clean(id)] || 'file-text';
    }

    function meetingType(type) {
        return MEETING_TYPE[clean(type).toLowerCase()] || MEETING_TYPE.other;
    }

    host.semanticIcons = Object.freeze({
        version: '2.0.0',
        resolveMetric,
        section,
        meetingType
    });

})(window);
