'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const fixturesDir = path.join(__dirname, 'fixtures');
const v11 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'RU_CONTRACT_V11_001.json'), 'utf8'));
const legacy = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'RU_REAL_001.json'), 'utf8'));

const layoutSource = fs.readFileSync(path.join(root, 'Layout_Engine', 'layout-engine.js'), 'utf8');
const layoutSandbox = { window: {} };
vm.createContext(layoutSandbox);
vm.runInContext(layoutSource, layoutSandbox, { filename: 'layout-engine.js' });
const layoutEngine = layoutSandbox.window.MeetMindLayoutEngine;
assert.ok(layoutEngine && typeof layoutEngine.layout === 'function', 'Layout engine unavailable.');

const telegramSource = fs.readFileSync(path.join(root, 'Documentation', 'n8n-telegram-report-v1.1.js'), 'utf8');
function telegram(input) {
  const sandbox = { $input: { first: () => ({ json: input }) } };
  vm.createContext(sandbox);
  return vm.runInContext(`(function(){${telegramSource}})()`, sandbox)[0].json;
}

function blocksFromReport(report) {
  const stats = report.stats || {};
  return [
    { id: 'header', data: report },
    { id: 'stats', data: {
      duration_seconds: stats.duration_seconds,
      participants: Array.isArray(report.participants) ? report.participants.length : 0,
      tasks: Array.isArray(report.tasks) ? report.tasks.length : 0,
      decisions: Array.isArray(report.decisions) ? report.decisions.length : 0,
      risks: Array.isArray(report.risks) ? report.risks.length : 0
    } },
    { id: 'summary', data: report.executive_brief || report.summary || '' },
    { id: 'metrics', data: report.key_metrics || report.metrics || [] },
    { id: 'insights', data: report.key_takeaways || report.insights || [] },
    { id: 'decisions', data: report.decisions || [] },
    { id: 'risks', data: report.risks || [] },
    { id: 'tasks', data: report.tasks || [] },
    { id: 'architecture', data: report.architecture || { sections: [] } },
    { id: 'owners', data: report.owners || [] },
    { id: 'footer', data: {} }
  ].filter(block => {
    if (['header','stats','footer'].includes(block.id)) return true;
    if (typeof block.data === 'string') return block.data.trim();
    if (Array.isArray(block.data)) return block.data.length;
    if (block.id === 'architecture') return Array.isArray(block.data?.sections) && block.data.sections.length;
    return !!block.data;
  });
}

function assertLayout(report, label) {
  const result = layoutEngine.layout({ pages: [{ number: 1, blocks: blocksFromReport(report) }] });
  assert.ok(result.valid, `${label}: PDF layout invalid.`);
  assert.ok(result.pageCount >= 1 && result.pageCount <= 2, `${label}: PDF violates 1/2-page contract.`);
  return result;
}

const v11Layout = assertLayout(v11, 'v1.1');
const legacyLayout = assertLayout(legacy, 'legacy v1');
assert.ok(v11Layout.pages.length >= 1 && legacyLayout.pages.length >= 1);

const tgV11 = telegram({ ...v11, report_language: 'ru', meeting_title: v11.title });
assert.ok(tgV11.report.includes(v11.executive_brief), 'v1.1 Telegram lost executive brief.');
assert.ok(tgV11.report.includes(v11.key_metrics[0].value), 'v1.1 Telegram lost metric value.');
assert.ok(tgV11.report.includes(v11.risks[0].impact), 'v1.1 Telegram lost risk impact.');
assert.ok(tgV11.report.includes(v11.risks[0].mitigation), 'v1.1 Telegram lost risk mitigation.');
assert.ok(tgV11.report.includes('Normalize → Generate'), 'v1.1 Telegram lost explicit process flow.');
assert.ok(tgV11.report.includes(v11.owners[0].responsibility), 'v1.1 Telegram lost owner responsibility.');

const tgLegacy = telegram({ ...legacy, report_language: 'ru', meeting_title: legacy.title });
assert.ok(tgLegacy.report.includes('По кандидатуре обещан ответ в течение пары недель.'), 'Legacy Telegram lost summary tail.');
assert.ok(tgLegacy.report.includes('в течение пары недель'), 'Legacy Telegram lost task due date.');
assert.ok(tgLegacy.report.includes('150 млн ₽ GMV / 8 мес'), 'Legacy Telegram lost metric value.');

assert.strictEqual(v11.schema_version, '1.1');
assert.ok(!legacy.schema_version, 'Legacy fixture must remain a pre-v1.1 compatibility case.');

console.log('Shared E2E contract corpus passed for PDF layout + Telegram on v1.1 and legacy v1.');
