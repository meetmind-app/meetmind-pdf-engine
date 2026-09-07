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

    function primaryText(metric) {
        return [metric?.label, metric?.title, metric?.name]
            .map(clean).filter(Boolean).join(' ').toLowerCase();
    }

    function allText(metric) {
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

    const PATTERNS = Object.freeze({
        target: Object.freeze(['target', 'goal', 'objective', 'цель', 'целев', 'план', 'quota', 'квота']),
        time: Object.freeze(['t2v', 'time', 'duration', 'minute', 'hour', 'day', 'latency', 'sla', 'время', 'мин', 'час', 'день', 'срок', 'скорост']),
        people: Object.freeze(['user', 'customer', 'client', 'participant', 'mau', 'dau', 'wau', 'subscriber', 'пользоват', 'клиент', 'участник', 'подписчик', 'аудитори']),
        growth: Object.freeze(['revenue', 'arr', 'mrr', 'gmv', 'sales', 'income', 'turnover', 'выруч', 'доход', 'оборот', 'продаж']),
        rate: Object.freeze(['conversion', 'rate', 'share', 'percent', '%', 'конверс', 'доля', 'процент']),
        economics: Object.freeze(['cost', 'cogs', 'price', 'margin', 'budget', 'expense', 'стоим', 'затрат', 'марж', 'бюджет', 'цена']),
        system: Object.freeze(['api', 'integration', 'network', 'channel', 'pipeline', 'интеграц', 'канал', 'сеть', 'пайплайн']),
        risk: Object.freeze(['risk', 'error', 'failure', 'incident', 'churn', 'defect', 'риск', 'ошиб', 'сбой', 'инцидент', 'отток', 'дефект'])
    });

    function result(name, color, semantic) {
        return Object.freeze({ name, color, semantic });
    }

    function classifyStrongPrimary(primary) {
        if (includesAny(primary, PATTERNS.economics)) return result('boxes', 'orangeRisk', 'economics');
        if (includesAny(primary, PATTERNS.time)) return result('clock-3', 'purplePrimary', 'time');
        if (includesAny(primary, PATTERNS.people)) return result('users-round', 'purplePrimary', 'people');
        if (includesAny(primary, PATTERNS.growth)) return result('chart-column', 'greenSuccess', 'growth');
        if (includesAny(primary, PATTERNS.rate)) return result('target', 'greenSuccess', 'rate');
        if (includesAny(primary, PATTERNS.system)) return result('network', 'purplePrimary', 'system');
        if (includesAny(primary, PATTERNS.risk)) return result('triangle-alert', 'orangeRisk', 'risk');
        return null;
    }

    function resolveMetric(metric) {
        const primary = primaryText(metric);
        const text = allText(metric);
        const relation = clean(metric?.relation).toLowerCase();

        // The metric category is the primary visual meaning. A target ARR remains
        // a revenue/growth metric; a target COGS remains an economics metric.
        const strongPrimary = classifyStrongPrimary(primary);
        if (strongPrimary) return strongPrimary;

        // A target icon is used when the metric itself is explicitly goal-oriented
        // or the label is generic and the semantic relation is the strongest signal.
        if (
            includesAny(primary, PATTERNS.target) ||
            relation === 'target' || relation === 'current_to_target'
        ) return result('target', 'purplePrimary', 'target');

        // Context/value is a weaker fallback only when the label itself is generic.
        if (includesAny(text, PATTERNS.time)) return result('clock-3', 'purplePrimary', 'time');
        if (includesAny(text, PATTERNS.people)) return result('users-round', 'purplePrimary', 'people');
        if (includesAny(text, PATTERNS.economics)) return result('boxes', 'orangeRisk', 'economics');
        if (includesAny(text, PATTERNS.growth)) return result('chart-column', 'greenSuccess', 'growth');
        if (includesAny(text, PATTERNS.rate)) return result('target', 'greenSuccess', 'rate');
        if (includesAny(text, PATTERNS.system)) return result('network', 'purplePrimary', 'system');
        if (includesAny(text, PATTERNS.risk)) return result('triangle-alert', 'orangeRisk', 'risk');
        if (includesAny(text, PATTERNS.target)) return result('target', 'purplePrimary', 'target');

        return result('file-text', 'purplePrimary', 'generic');
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
        version: '2.0.2',
        resolveMetric,
        section,
        meetingType
    });

})(window);
