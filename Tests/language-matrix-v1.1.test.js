'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const metadataSource = fs.readFileSync(path.join(repoRoot, 'Documentation', 'n8n-build-report-metadata-v1.1.js'), 'utf8');
const telegramSource = fs.readFileSync(path.join(repoRoot, 'Documentation', 'n8n-telegram-report-v1.1.js'), 'utf8');

const languages = [
  { input: 'en-US', canonical: 'en', telegram: 'en', heading: 'Executive Brief', rtl: false },
  { input: 'ru-RU', canonical: 'ru', telegram: 'ru', heading: 'Краткое резюме', rtl: false },
  { input: 'es-ES', canonical: 'es', telegram: 'es', heading: 'Resumen ejecutivo', rtl: false },
  { input: 'pt-BR', canonical: 'pt-BR', telegram: 'pt', heading: 'Resumo executivo', rtl: false },
  { input: 'tr-TR', canonical: 'tr', telegram: 'tr', heading: 'Yönetici özeti', rtl: false },
  { input: 'id-ID', canonical: 'id', telegram: 'id', heading: 'Ringkasan eksekutif', rtl: false },
  { input: 'hi-IN', canonical: 'hi', telegram: 'hi', heading: 'कार्यकारी सारांश', rtl: false },
  { input: 'ar-SA', canonical: 'ar', telegram: 'ar', heading: 'الملخص التنفيذي', rtl: true },
  { input: 'uz-UZ', canonical: 'uz', telegram: 'uz', heading: 'Ijrochi xulosa', rtl: false },
  { input: 'fa-IR', canonical: 'fa', telegram: 'fa', heading: 'خلاصه اجرایی', rtl: true }
];

function runMetadata(language) {
  const input = {
    meeting_title: 'Contract matrix',
    meeting_type: 'strategy',
    meeting_type_label: 'Strategy',
    executive_brief: 'Brief.',
    key_metrics: [],
    key_takeaways: [],
    decisions: [],
    architecture: {
      sections: [
        { title: 'Process', layout: 'process', items: [{ title: 'A' }, { title: 'B' }] },
        { title: 'Components', layout: 'components', items: [{ title: 'X' }, { title: 'Y' }] }
      ]
    },
    risks: [],
    dependencies: [],
    tasks: [],
    owners: []
  };
  const nodes = {
    'Normalize Processing Context': { first: () => ({ json: { meeting_language: language } }) },
    'Transcribe a recording3': { first: () => ({ json: { usage: { seconds: 65.1 } } }) }
  };
  const sandbox = {
    $input: { first: () => ({ json: input }) },
    $: name => nodes[name]
  };
  vm.createContext(sandbox);
  return vm.runInContext(`(function(){${metadataSource}})()`, sandbox)[0].json;
}

function runTelegram(input) {
  const sandbox = { $input: { first: () => ({ json: input }) } };
  vm.createContext(sandbox);
  return vm.runInContext(`(function(){${telegramSource}})()`, sandbox)[0].json;
}

for (const spec of languages) {
  const metadata = runMetadata(spec.input);
  assert.strictEqual(metadata.report_language, spec.canonical, `${spec.input}: canonical root language mismatch.`);
  assert.strictEqual(metadata.report_json.language, spec.canonical, `${spec.input}: canonical report_json language mismatch.`);
  assert.strictEqual(metadata.duration_seconds, 66, `${spec.input}: duration normalization mismatch.`);
  assert.strictEqual(metadata.report_json.stats.duration_seconds, 66, `${spec.input}: stats duration mismatch.`);

  const telegram = runTelegram({
    ...metadata,
    ...metadata.report_json,
    report_language: metadata.report_language,
    architecture: metadata.report_json.architecture
  });
  assert.strictEqual(telegram.language, spec.telegram, `${spec.input}: Telegram locale mismatch.`);
  assert.strictEqual(telegram.direction, spec.rtl ? 'rtl' : 'ltr', `${spec.input}: direction mismatch.`);
  assert.ok(telegram.report.includes(spec.heading), `${spec.input}: localized Executive Brief heading missing.`);
  assert.ok(telegram.report.includes(spec.rtl ? 'A ← B' : 'A → B'), `${spec.input}: process connector direction mismatch.`);
  assert.ok(!telegram.report.includes(spec.rtl ? 'X ← Y' : 'X → Y'), `${spec.input}: components received an invented connector.`);
  assert.ok(telegram.report.length <= 3900, `${spec.input}: Telegram report exceeds safe length.`);
}

const legacyIndonesian = runMetadata('in-ID');
assert.strictEqual(legacyIndonesian.report_json.language, 'id');

const portugueseAlias = runMetadata('pt');
assert.strictEqual(portugueseAlias.report_json.language, 'pt-BR');

console.log('Ten-language v1.1 contract matrix passed.');
