'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(repoRoot, 'Renderer', 'semantic-icons-v2.js'), 'utf8');
const window = { ExecutiveSlideEngine: {} };
const sandbox = { window };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'semantic-icons-v2.js' });

const icons = window.ExecutiveSlideEngine.semanticIcons;
assert.ok(icons && typeof icons.resolveMetric === 'function', 'Semantic Icons v2 did not initialize.');

assert.strictEqual(
  icons.resolveMetric({ label: 'ARR', value: '8,4M → 10M', relation: 'current_to_target' }).name,
  'chart-column',
  'Target ARR must remain a revenue/growth metric rather than becoming a generic target.'
);
assert.strictEqual(
  icons.resolveMetric({ label: 'Выдача кредита', value: '2 дня → 5 мин' }).name,
  'clock-3',
  'Time metric must map to the clock icon.'
);
assert.strictEqual(
  icons.resolveMetric({ label: 'MAU', value: '120 000' }).name,
  'users-round',
  'Audience metric must map to users.'
);
assert.strictEqual(
  icons.resolveMetric({ label: 'COGS', value: '< 20% выручки', relation: 'target' }).name,
  'boxes',
  'Target COGS must remain an economics metric and ignore the revenue keyword in its value.'
);
assert.strictEqual(
  icons.resolveMetric({ label: 'Целевая конверсия', relation: 'target', target_value: '24%' }).name,
  'target',
  'Conversion target should keep the rate/target visual semantics.'
);
assert.strictEqual(
  icons.resolveMetric({ label: 'Цель MVP', relation: 'target', target_value: '20 клиентов' }).name,
  'target',
  'Generic goal metric must map to target.'
);
assert.strictEqual(icons.meetingType('interview'), 'users-round');
assert.strictEqual(icons.section('architecture'), 'network');

console.log('Semantic Icons v2 regression passed.');
