'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const repoRoot = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'RU_CONTRACT_V11_001.json'),
  'utf8'
));
const contract = fs.readFileSync(
  path.join(repoRoot, 'Documentation', 'report-contract-v1.1.md'),
  'utf8'
);

assert.strictEqual(fixture.schema_version, '1.1', 'v1.1 fixture must declare schema_version.');
assert.ok(fixture.meeting_type, 'Stable machine meeting_type is required.');
assert.ok(fixture.meeting_type_label, 'Contextual meeting_type_label is required in the v1.1 fixture.');

const allowedRelations = new Set([
  'current',
  'target',
  'current_to_target',
  'previous_to_current',
  'range',
  'change',
  'other'
]);

assert.ok(Array.isArray(fixture.key_metrics) && fixture.key_metrics.length > 0, 'v1.1 fixture must contain metrics.');
for (const metric of fixture.key_metrics) {
  assert.ok(metric.label, 'Every metric must keep a human-readable label.');
  assert.ok(metric.value, 'Every metric must keep the backward-compatible value field.');
  assert.ok(allowedRelations.has(metric.relation), `Unsupported metric relation: ${metric.relation}`);

  if (metric.relation === 'current_to_target') {
    assert.ok(metric.current_value, 'current_to_target metric requires current_value.');
    assert.ok(metric.target_value, 'current_to_target metric requires target_value.');
  }
  if (metric.relation === 'target') {
    assert.ok(metric.target_value, 'target metric requires target_value.');
  }
}

assert.ok(Array.isArray(fixture.risks) && fixture.risks.length > 0, 'v1.1 fixture must contain risks.');
for (const risk of fixture.risks) {
  assert.ok(risk.title, 'Risk title is required.');
  assert.ok(risk.description, 'Risk description must explain the risk instead of leaving a title in the air.');
  if (risk.impact !== undefined) assert.ok(String(risk.impact).trim(), 'Risk impact cannot be an empty semantic field.');
  if (risk.mitigation !== undefined) assert.ok(String(risk.mitigation).trim(), 'Risk mitigation cannot be an empty semantic field.');
}

assert.ok(Array.isArray(fixture.owners) && fixture.owners.length > 0, 'v1.1 fixture must exercise owners.');
assert.ok(fixture.owners[0].responsibility, 'Canonical owner must use responsibility.');

const architecture = fixture.architecture?.sections || [];
assert.ok(architecture.some(section => section.layout === 'components'), 'Fixture must preserve a non-sequential components architecture case.');
assert.ok(architecture.some(section => section.layout === 'process'), 'Fixture must preserve an evidenced process case.');

assert.ok(contract.includes('stats` are system-derived'), 'Contract must keep system-derived stats as an invariant.');
assert.ok(contract.includes('must not invent arrows'), 'Contract must forbid invented process arrows.');
assert.ok(contract.includes('responsibility` first'), 'Contract must define owner responsibility as canonical.');

console.log('Canonical report contract v1.1 regression checks passed.');