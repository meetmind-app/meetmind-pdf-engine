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
  icons.resolveMetric({ label: 'ARR', value: '8,4M → 10M' }).name,
  'chart-column',
  'Revenue metric must map to the growth icon.'
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
  icons.resolveMetric({ label: 'COGS', value: '< 20% выручки' }).name,
  'chart-column',
  'Revenue keyword in a COGS value must not override the stronger label semantics.'
);
assert.strictEqual(
  icons.resolveMetric({ label: 'Целевая конверсия', relation: 'target', target_value: '24%' }).name,
  'target',
  'Explicit target relation must map to target.'
);
assert.strictEqual(icons.meetingType('interview'), 'users-round');
assert.strictEqual(icons.section('architecture'), 'network');

console.log('Semantic Icons v2 regression passed.');
