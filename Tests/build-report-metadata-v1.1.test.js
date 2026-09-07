'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const source = fs.readFileSync(
  path.resolve(__dirname, '..', 'Documentation', 'n8n-build-report-metadata-v1.1.js'),
  'utf8'
);

function run(input, language, seconds) {
  const nodes = {
    'Normalize Processing Context': { first: () => ({ json: { meeting_language: language } }) },
    'Transcribe a recording3': { first: () => ({ json: { usage: { seconds } } }) }
  };
  const sandbox = {
    $input: { first: () => ({ json: input }) },
    $: name => nodes[name]
  };
  vm.createContext(sandbox);
  return vm.runInContext(`(function(){${source}})()`, sandbox)[0].json;
}

const result = run({
  headline: 'Launch',
  meeting_title: 'SaaS pilot',
  meeting_subtitle: 'Payment validation',
  meeting_objective: 'Validate willingness to pay',
  meeting_type: 'strategy',
  meeting_type_label: 'Strategy meeting',
  meeting_importance: 'high',
  importance_reason: 'Launch decision',
  series_title: '',
  executive_brief: 'Run a pilot.',
  key_metrics: [{ label: 'ARR', value: '8.4M → 10M' }],
  key_takeaways: [], decisions: [],
  architecture: { sections: [] },
  risks: [], dependencies: [], tasks: [], owners: []
}, 'en', 2700.2);

assert.strictEqual(result.report_json.schema_version, '1.1');
assert.strictEqual(result.report_json.meeting_type_label, 'Strategy meeting');
assert.strictEqual(result.report_json.language, 'en');
assert.strictEqual(result.duration_seconds, 2701, 'Root duration must use transcription usage seconds.');
assert.strictEqual(result.report_json.stats.duration_seconds, 2701, 'Canonical report duration must equal root duration.');
assert.ok(Array.isArray(result.report_json.participants), 'Participants must use canonical array shape.');
assert.ok(Array.isArray(result.participants), 'Root participants must use canonical array shape.');
assert.strictEqual(result.report_json.key_metrics[0].value, '8.4M → 10M');

const noDuration = run({ meeting_title: 'No duration' }, 'ru-RU', 0);
assert.strictEqual(noDuration.duration_seconds, null);
assert.strictEqual(noDuration.report_json.stats.duration_seconds, null);
assert.strictEqual(noDuration.report_json.language, 'ru');

const ptBr = run({ meeting_title: 'Brasil' }, 'pt-BR', 60);
assert.strictEqual(ptBr.report_language, 'pt-BR', 'pt-BR must remain the canonical Portuguese report code.');
assert.strictEqual(ptBr.report_json.language, 'pt-BR');

const ptAlias = run({ meeting_title: 'Brasil alias' }, 'pt', 60);
assert.strictEqual(ptAlias.report_json.language, 'pt-BR', 'pt alias must normalize to canonical pt-BR.');

const indonesiaAlias = run({ meeting_title: 'Indonesia alias' }, 'in-ID', 60);
assert.strictEqual(indonesiaAlias.report_json.language, 'id', 'Legacy Indonesian locale alias must normalize to id.');

const unknown = run({ meeting_title: 'Unknown locale' }, 'xx-ZZ', 60);
assert.strictEqual(unknown.report_json.language, 'en', 'Unsupported locale must fall back to English.');

console.log('Build Report Metadata v1.1 regression passed.');
