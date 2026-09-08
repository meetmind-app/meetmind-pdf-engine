'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(repoRoot, 'Renderer', 'meeting-type-v1.js'), 'utf8');

const headerCalls = [];
const statsCalls = [];
const host = {
  blockRenderers: Object.freeze({
    version: 'base',
    header(block, ctx) { headerCalls.push({ block, ctx }); },
    stats(block, ctx) { statsCalls.push({ block, ctx }); }
  })
};
const window = { ExecutiveSlideEngine: host };
const sandbox = { window };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'meeting-type-v1.js' });

const renderer = window.ExecutiveSlideEngine.blockRenderers.header;
const statsRenderer = window.ExecutiveSlideEngine.blockRenderers.stats;
assert.strictEqual(typeof renderer, 'function', 'Meeting Type v1 did not install the header renderer.');
assert.strictEqual(typeof statsRenderer, 'function', 'Service Stats v1.1 did not install the stats renderer.');

function makeContext(report, language = 'ru') {
  const textCalls = [];
  const rectCalls = [];
  return {
    report,
    options: { language },
    textCalls,
    rectCalls,
    measureText(text, font, size) { return String(text || '').length * Number(size || 5) * 0.48; },
    rect(args) { rectCalls.push(args); },
    text(text, args) { textCalls.push({ text: String(text), args }); }
  };
}

const block = { pageNumber: 1, geometry: { x: 10, y: 9, width: 748, height: 39 } };

const explicit = makeContext({language: 'ru', meeting_type: 'interview', meeting_type_label: 'Интервью с кандидатом на Head of Product'});
renderer(block, explicit);
assert.strictEqual(headerCalls.length, 1, 'Base header renderer must remain active.');
assert.ok(explicit.textCalls.some(call => call.text === 'Интервью с кандидатом на Head of Product'), 'Explicit meeting_type_label was not rendered.');
assert.ok(explicit.rectCalls.length >= 1, 'Meeting type badge background was not rendered.');

const fallback = makeContext({ language: 'ru', meeting_type: 'strategy' });
renderer(block, fallback);
assert.ok(fallback.textCalls.some(call => call.text === 'Стратегическая встреча'), 'Localized fallback from meeting_type was not rendered.');

const continuation = makeContext({ language: 'ru', meeting_type: 'strategy' });
renderer({ ...block, pageNumber: 2 }, continuation);
assert.ok(!continuation.textCalls.some(call => call.text === 'Стратегическая встреча'), 'Meeting type badge must not repeat on continuation pages.');

const spanishReport = {
  language: 'es', report_language: 'es', duration_seconds: 11,
  stats: { duration_seconds: 11 },
  tasks: [{ task: 'Verificar' }], decisions: [{ title: 'Probar' }], risks: [{ title: 'Presupuesto' }]
};
const spanish = makeContext(spanishReport, 'es');
renderer(block, spanish);
const adaptedHeader = headerCalls.at(-1).ctx.report;
assert.strictEqual(adaptedHeader.duration_seconds, 60, '11 seconds must be adapted to one display minute in the PDF header.');

statsRenderer({ geometry: { x: 10, y: 50, width: 748, height: 20 } }, spanish);
const adaptedStats = statsCalls.at(-1).ctx.report.stats;
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(adaptedStats)),
  { 'Duración': '1 min', tasks: 1, decisions: 1, risks: 1 },
  'Spanish service stats must contain localized duration and business counters only.'
);
assert.ok(!Object.prototype.hasOwnProperty.call(adaptedStats, 'duration_seconds'), 'Machine key duration_seconds must never reach the visible stats renderer.');

const sixtyOne = makeContext({ language: 'es', duration_seconds: 61, tasks: [], decisions: [], risks: [] }, 'es');
statsRenderer({ geometry: { x: 10, y: 50, width: 748, height: 20 } }, sixtyOne);
assert.strictEqual(statsCalls.at(-1).ctx.report.stats['Duración'], '2 min', '61 seconds must round up to two display minutes.');

console.log('Meeting Type + Service Stats v1.1 regression passed.');
