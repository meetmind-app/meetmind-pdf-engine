'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const source = fs.readFileSync(
  path.resolve(__dirname, '..', 'Documentation', 'n8n-telegram-report-v1.1.js'),
  'utf8'
);

function run(input) {
  const sandbox = {
    $input: { first: () => ({ json: input }) }
  };
  vm.createContext(sandbox);
  return vm.runInContext(`(function(){${source}})()`, sandbox)[0].json;
}

const ru = run({
  report_language: 'ru',
  meeting_title: 'Пилот SaaS',
  meeting_type_label: 'Стратегическая встреча',
  executive_brief: 'Проверяем готовность платить.',
  key_metrics: [{ label: 'ARR', value: '8.4M → 10M', context: 'Цель', target_period: 'Q4' }],
  key_takeaways: [{ title: 'Есть спрос', details: 'Клиенты готовы тестировать.' }],
  decisions: [{ title: 'Запустить пилот', details: 'До первых платящих клиентов.' }],
  tasks: [{ task: 'Проверить платежи', owner: 'Николай', due_date: 'На этой неделе' }],
  risks: [{
    title: 'Платежи',
    description: 'Нужен посредник.',
    impact: 'Рост комиссии',
    mitigation: 'Проверить альтернативы'
  }],
  architecture: {
    sections: [{
      title: 'Процесс',
      layout: 'process',
      items: [{ title: 'Upload' }, { title: 'Analyze' }, { title: 'Report' }]
    }, {
      title: 'Каналы',
      layout: 'components',
      items: [{ title: 'Telegram' }, { title: 'Web' }]
    }]
  },
  owners: [{ name: 'Николай', responsibility: 'Принять решение' }]
});

assert.ok(ru.report.includes('🏷 Стратегическая встреча'));
assert.ok(ru.report.includes('• ARR: 8.4M → 10M'));
assert.ok(ru.report.includes('↳ Цель · Q4'));
assert.ok(ru.report.includes('Клиенты готовы тестировать.'));
assert.ok(ru.report.includes('До первых платящих клиентов.'));
assert.ok(ru.report.includes('Влияние: Рост комиссии'));
assert.ok(ru.report.includes('Меры: Проверить альтернативы'));
assert.ok(ru.report.includes('Upload → Analyze → Report'));
assert.ok(!ru.report.includes('Telegram → Web'), 'Components must not invent directional flow.');
assert.ok(ru.report.includes('Николай — Принять решение'));
assert.strictEqual(ru.telegram_report_compacted, false);
assert.ok(ru.report.length <= 3900);

const ptBr = run({
  report_language: 'pt-BR',
  meeting_title: 'Piloto Brasil',
  executive_brief: 'Validar disposição a pagar.',
  risks: [{ title: 'Pagamento', impact: 'Margem', mitigation: 'Comparar provedores' }]
});
assert.strictEqual(ptBr.language, 'pt', 'Telegram presentation locale should normalize pt-BR to pt.');
assert.ok(ptBr.report.includes('Resumo executivo'), 'pt-BR must use Portuguese Telegram labels, not English fallback.');
assert.ok(ptBr.report.includes('Impacto: Margem'));
assert.ok(ptBr.report.includes('Mitigação: Comparar provedores'));

const ar = run({
  report_language: 'ar-SA',
  architecture: {
    sections: [{
      title: 'المعالجة',
      layout: 'process',
      items: [{ title: 'A' }, { title: 'B' }]
    }]
  }
});
assert.strictEqual(ar.direction, 'rtl');
assert.strictEqual(ar.language, 'ar');
assert.ok(ar.report.includes('A ← B'));

const fa = run({
  report_language: 'fa-IR',
  architecture: {
    sections: [{
      title: 'پردازش',
      layout: 'process',
      items: [{ title: 'A' }, { title: 'B' }]
    }]
  }
});
assert.strictEqual(fa.direction, 'rtl');
assert.ok(fa.report.includes('A ← B'));

const indonesiaAlias = run({ report_language: 'in-ID', executive_brief: 'Uji.' });
assert.strictEqual(indonesiaAlias.language, 'id');
assert.ok(indonesiaAlias.report.includes('Ringkasan eksekutif'));

const long = run({
  report_language: 'en',
  meeting_title: 'Dense meeting',
  executive_brief: 'X'.repeat(5000)
});
assert.strictEqual(long.telegram_report_compacted, true);
assert.ok(long.report.length <= 3900);
assert.ok(long.report.includes('Full version is available in Web Report'));

console.log('Telegram Report v1.1 regression passed.');
