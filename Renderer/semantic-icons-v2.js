/**
 * LOREVI Executive PDF — Semantic Icons v2
 *
 * Presentation-only semantic resolver. It never changes report facts.
 * Icons are selected from canonical Lucide geometry by meaning rather than
 * array position, so the same semantic item receives the same icon in every
 * report and every supported language.
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
        target: Object.freeze([
            'target', 'goal', 'objective', 'quota',
            'цель', 'целев', 'план', 'квота',
            'objetivo', 'meta', 'cuota', 'quota',
            'hedef', 'amaç', 'kota',
            'tujuan', 'sasaran', 'लक्ष्य', 'उद्देश्य', 'कोटा',
            'هدف', 'مستهدف', 'خطة', 'maqsad', 'reja', 'kvota',
            'هدف‌گذاری', 'برنامه', 'سهمیه'
        ]),
        time: Object.freeze([
            't2v', 'time', 'duration', 'minute', 'hour', 'day', 'latency', 'sla',
            'время', 'мин', 'час', 'день', 'срок', 'скорост',
            'tiempo', 'duración', 'minuto', 'hora', 'plazo', 'latencia',
            'tempo', 'duração', 'prazo', 'latência',
            'süre', 'dakika', 'saat', 'gün', 'gecik',
            'waktu', 'durasi', 'menit', 'hari', 'latensi',
            'समय', 'अवधि', 'मिनट', 'घंटा', 'दिन', 'विलंब',
            'وقت', 'مدة', 'دقيقة', 'ساعة', 'يوم', 'مهلة',
            'vaqt', 'davomiy', 'daqiqa', 'soat', 'kun', 'kechik',
            'زمان', 'مدت', 'دقیقه', 'ساعت', 'روز', 'تأخیر', 'مهلت'
        ]),
        people: Object.freeze([
            'user', 'customer', 'client', 'participant', 'mau', 'dau', 'wau', 'subscriber', 'audience',
            'пользоват', 'клиент', 'участник', 'подписчик', 'аудитори',
            'usuario', 'cliente', 'participante', 'suscriptor', 'audiencia',
            'usuário', 'assinante', 'público',
            'kullanıcı', 'müşteri', 'katılımcı', 'abone', 'kitle',
            'pengguna', 'pelanggan', 'peserta', 'audiens',
            'उपयोगकर्ता', 'ग्राहक', 'प्रतिभागी', 'सदस्य', 'दर्शक',
            'مستخدم', 'عميل', 'مشارك', 'مشترك', 'جمهور',
            'foydalanuvchi', 'mijoz', 'ishtirokchi', 'obunachi', 'auditoriya',
            'کاربر', 'مشتری', 'شرکت‌کننده', 'مشترک', 'مخاطب'
        ]),
        growth: Object.freeze([
            'revenue', 'arr', 'mrr', 'gmv', 'sales', 'income', 'turnover', 'growth',
            'выруч', 'доход', 'оборот', 'продаж', 'рост',
            'ingresos', 'ventas', 'facturación', 'crecimiento',
            'receita', 'faturamento', 'crescimento',
            'gelir', 'satış', 'ciro', 'büyüme',
            'pendapatan', 'penjualan', 'omzet', 'pertumbuhan',
            'राजस्व', 'बिक्री', 'आय', 'वृद्धि',
            'إيرادات', 'مبيعات', 'دخل', 'نمو',
            'daromad', 'sotuv', 'tushum', 'o‘sish', 'o\'sish',
            'درآمد', 'فروش', 'گردش مالی', 'رشد'
        ]),
        rate: Object.freeze([
            'conversion', 'rate', 'share', 'percent', '%',
            'конверс', 'доля', 'процент',
            'conversión', 'tasa', 'porcentaje', 'proporción',
            'conversão', 'taxa', 'percentual', 'participação',
            'dönüşüm', 'oran', 'yüzde',
            'konversi', 'tingkat', 'persen', 'pangsa',
            'रूपांतरण', 'दर', 'प्रतिशत', 'हिस्सा',
            'تحويل', 'معدل', 'نسبة',
            'konversiya', 'stavka', 'foiz', 'ulush',
            'تبدیل', 'نرخ', 'درصد', 'سهم'
        ]),
        economics: Object.freeze([
            'cost', 'cogs', 'price', 'margin', 'budget', 'expense',
            'стоим', 'затрат', 'марж', 'бюджет', 'цена',
            'coste', 'costo', 'precio', 'margen', 'presupuesto', 'gasto',
            'custo', 'preço', 'margem', 'orçamento', 'despesa',
            'maliyet', 'fiyat', 'marj', 'bütçe', 'gider',
            'biaya', 'harga', 'anggaran', 'pengeluaran',
            'लागत', 'मूल्य', 'मार्जिन', 'बजट', 'खर्च',
            'تكلفة', 'سعر', 'هامش', 'ميزانية', 'مصروف',
            'xarajat', 'narx', 'marja', 'byudjet',
            'هزینه', 'قیمت', 'حاشیه', 'بودجه', 'مخارج'
        ]),
        system: Object.freeze([
            'api', 'integration', 'network', 'channel', 'pipeline',
            'интеграц', 'канал', 'сеть', 'пайплайн',
            'integración', 'canal', 'integração', 'rede',
            'entegrasyon', 'ağ', 'kanal',
            'integrasi', 'jaringan', 'saluran',
            'एपीआई', 'एकीकरण', 'नेटवर्क', 'चैनल', 'पाइपलाइन',
            'واجهة برمجة التطبيقات', 'تكامل', 'شبكة', 'قناة', 'خط أنابيب',
            'integratsiya', 'tarmoq',
            'یکپارچه‌سازی', 'شبکه', 'کانال', 'خط لوله'
        ]),
        risk: Object.freeze([
            'risk', 'error', 'failure', 'incident', 'churn', 'defect',
            'риск', 'ошиб', 'сбой', 'инцидент', 'отток', 'дефект',
            'riesgo', 'error', 'fallo', 'incidente', 'abandono', 'defecto',
            'risco', 'erro', 'falha', 'incidente', 'defeito',
            'risk', 'hata', 'arıza', 'olay', 'kayıp', 'kusur',
            'risiko', 'kesalahan', 'kegagalan', 'insiden', 'cacat',
            'जोखिम', 'त्रुटि', 'विफलता', 'घटना', 'दोष',
            'مخاطر', 'خطأ', 'فشل', 'حادث', 'عيب',
            'xavf', 'xato', 'nosozlik', 'hodisa', 'nuqson',
            'ریسک', 'خطا', 'شکست', 'حادثه', 'نقص'
        ])
    });

    const SEMANTIC_RESULTS = Object.freeze({
        target: result('target', 'purplePrimary', 'target'),
        time: result('clock-3', 'purplePrimary', 'time'),
        people: result('users-round', 'purplePrimary', 'people'),
        growth: result('chart-column', 'greenSuccess', 'growth'),
        rate: result('target', 'greenSuccess', 'rate'),
        economics: result('boxes', 'orangeRisk', 'economics'),
        system: result('network', 'purplePrimary', 'system'),
        risk: result('triangle-alert', 'orangeRisk', 'risk'),
        generic: result('file-text', 'purplePrimary', 'generic')
    });

    function result(name, color, semantic) {
        return Object.freeze({ name, color, semantic });
    }

    function classifyStrongPrimary(primary) {
        if (includesAny(primary, PATTERNS.economics)) return SEMANTIC_RESULTS.economics;
        if (includesAny(primary, PATTERNS.time)) return SEMANTIC_RESULTS.time;
        if (includesAny(primary, PATTERNS.people)) return SEMANTIC_RESULTS.people;
        if (includesAny(primary, PATTERNS.growth)) return SEMANTIC_RESULTS.growth;
        if (includesAny(primary, PATTERNS.rate)) return SEMANTIC_RESULTS.rate;
        if (includesAny(primary, PATTERNS.system)) return SEMANTIC_RESULTS.system;
        if (includesAny(primary, PATTERNS.risk)) return SEMANTIC_RESULTS.risk;
        return null;
    }

    function explicitSemantic(metric) {
        const value = clean(metric?.semantic ?? metric?.category ?? metric?.kind)
            .toLowerCase().replace(/[\s-]+/g, '_');
        const aliases = {
            audience: 'people', users: 'people', customers: 'people',
            revenue: 'growth', sales: 'growth',
            conversion: 'rate', percentage: 'rate',
            cost: 'economics', finance: 'economics',
            integration: 'system', platform: 'system',
            incident: 'risk', reliability: 'risk',
            duration: 'time', latency: 'time',
            goal: 'target', objective: 'target'
        };
        const semantic = aliases[value] || value;
        return SEMANTIC_RESULTS[semantic] || null;
    }

    function resolveMetric(metric) {
        const primary = primaryText(metric);
        const text = allText(metric);
        const relation = clean(metric?.relation).toLowerCase();

        const explicit = explicitSemantic(metric);
        if (explicit) return explicit;

        // The metric category is the primary visual meaning. A target ARR remains
        // a revenue/growth metric; a target COGS remains an economics metric.
        const strongPrimary = classifyStrongPrimary(primary);
        if (strongPrimary) return strongPrimary;

        // A target icon is used when the metric itself is explicitly goal-oriented
        // or the label is generic and the semantic relation is the strongest signal.
        if (
            includesAny(primary, PATTERNS.target) ||
            relation === 'target' || relation === 'current_to_target'
        ) return SEMANTIC_RESULTS.target;

        // Context/value is a weaker fallback only when the label itself is generic.
        if (includesAny(text, PATTERNS.time)) return SEMANTIC_RESULTS.time;
        if (includesAny(text, PATTERNS.people)) return SEMANTIC_RESULTS.people;
        if (includesAny(text, PATTERNS.economics)) return SEMANTIC_RESULTS.economics;
        if (includesAny(text, PATTERNS.growth)) return SEMANTIC_RESULTS.growth;
        if (includesAny(text, PATTERNS.rate)) return SEMANTIC_RESULTS.rate;
        if (includesAny(text, PATTERNS.system)) return SEMANTIC_RESULTS.system;
        if (includesAny(text, PATTERNS.risk)) return SEMANTIC_RESULTS.risk;
        if (includesAny(text, PATTERNS.target)) return SEMANTIC_RESULTS.target;

        return SEMANTIC_RESULTS.generic;
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

    const STAT = Object.freeze({
        participants: 'users',
        tasks: 'clipboard-list',
        decisions: 'circle-check',
        risks: 'triangle-alert',
        duration: 'clock-3'
    });

    const ARCHITECTURE_ITEM = Object.freeze({
        process: 'settings',
        workflow: 'workflow',
        system: 'box',
        integration: 'network',
        data: 'database',
        other: 'file-text'
    });

    function section(id) {
        return SECTION[clean(id).toLowerCase()] || 'file-text';
    }

    function meetingType(type) {
        return MEETING_TYPE[clean(type).toLowerCase()] || MEETING_TYPE.other;
    }

    function stat(id) {
        return STAT[clean(id).toLowerCase()] || 'circle-question-mark';
    }

    function architectureItem(item) {
        const type = clean(item?.type ?? item).toLowerCase();
        return ARCHITECTURE_ITEM[type] || ARCHITECTURE_ITEM.other;
    }

    host.semanticIcons = Object.freeze({
        version: '2.1.0',
        resolveMetric,
        section,
        meetingType,
        stat,
        architectureItem
    });

})(window);
