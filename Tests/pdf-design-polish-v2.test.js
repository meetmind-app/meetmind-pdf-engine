'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const host = { console, ExecutiveSlideEngine: {} };
host.window = host;
host.globalThis = host;
host.module = { exports: {} };
vm.createContext(host);
for (const file of ['Renderer/renderers/block-renderers.js', 'Renderer/renderer.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), host, { filename: file });
}

const calls = [];
const report = {
  language: 'ru',
  key_metrics: [
    { label: 'Стоимость', value: '18 ₽/SKU → 8 ₽/SKU', context: 'Цель пилота' },
    { label: 'Конверсия', value: '72% → 95%' },
    { label: 'Объём', value: '10 000 SKU' },
    { label: 'Время', value: '11 мин → 3 мин' },
    { label: 'Качество', value: '<5% ошибок' }
  ],
  risks: [{
    title: 'Рост стоимости',
    description: 'Поставщики Google Calendar могут изменить тарифы.',
    impact: 'Маржа снизится.',
    mitigation: 'Сравнить альтернативы.'
  }]
};

function pageContext() {
  return {
    report,
    density: 'regular',
    tokens: {},
    beginPage() {},
    endPage() {},
    rect(options) { calls.push({ type: 'rect', ...options }); },
    circle(options) { calls.push({ type: 'circle', ...options }); },
    line(options) { calls.push({ type: 'line', ...options }); },
    text(value, options) { calls.push({ type: 'text', value: String(value), ...options }); },
    measureText(value, font, size) {
      return String(value).length * Number(size) * (font === 'bold' ? 0.56 : 0.5);
    }
  };
}

host.MeetMindRenderer.render({
  pageCount: 1,
  pages: [{
    number: 1,
    density: 'regular',
    blocks: [
      { id: 'keyMetrics', geometry: { x: 10, y: 10, width: 500, height: 150 } },
      { id: 'risks', geometry: { x: 10, y: 170, width: 500, height: 120 } }
    ]
  }]
}, { getPageContext: pageContext, finalize() {} });

const metricRects = calls.filter(call => call.type === 'rect' && call.radius === 3);
assert.strictEqual(metricRects.length, 5, 'All five metric cards must render.');
assert.strictEqual(metricRects[0].width, metricRects[1].width, 'Top metric cards must share width.');
assert.ok(metricRects[3].width > metricRects[0].width * 1.45, 'Two-card final row must fill the width of the three-card row.');
assert.ok(metricRects[0].height < 60, 'Natural metric content must not create tall empty cards.');

const numericRuns = calls.filter(call => call.type === 'text' && /\d/.test(call.value));
assert.ok(numericRuns.some(call => call.value === '18' && call.font === 'bold'), 'Numeric metric value is not bold.');
assert.ok(calls.some(call => call.type === 'text' && call.value.includes('₽/SKU') && call.font === 'regular'), 'Metric units must remain regular.');

const impact = calls.find(call => call.type === 'text' && call.value === 'Влияние:');
const impactBody = calls.find(call => call.type === 'text' && call.value.includes('Маржа'));
const mitigation = calls.find(call => call.type === 'text' && call.value === 'Меры:');
assert.strictEqual(impact?.font, 'semibold', 'Risk impact label must be emphasized structurally.');
assert.strictEqual(mitigation?.font, 'semibold', 'Risk mitigation label must be emphasized structurally.');
assert.strictEqual(impactBody?.font, 'regular', 'Risk body must remain regular.');
assert.strictEqual(impact?.y, impactBody?.y, 'Impact label must continue inline without a forced line break.');
assert.ok(calls.some(call => call.type === 'text' && call.value.includes('Google Calendar')), 'Mixed-style risk rendering must preserve searchable phrases.');
const descriptionRun = calls.find(call => call.type === 'text' && call.value.includes('изменить тарифы.'));
assert.ok(descriptionRun?.value.endsWith(' '), 'Risk description and structured labels must retain an inline separator.');

calls.length = 0;
report.language = 'fa';
host.MeetMindRenderer.render({
  pageCount: 1,
  pages: [{ number: 1, density: 'regular', blocks: [
    { id: 'risks', geometry: { x: 10, y: 10, width: 500, height: 120 } }
  ] }]
}, { getPageContext: pageContext, finalize() {} });
const rtlRiskLine = calls.find(call => call.type === 'text' && call.value.includes('Google Calendar'));
assert.strictEqual(rtlRiskLine?.font, 'regular', 'RTL risk sentences must remain a single bidi-safe regular run.');
assert.ok(rtlRiskLine?.value.includes('Маржа снизится.'), 'RTL fallback must retain inline structured values.');

console.log('PDF Design Polish v2 contract passed.');
