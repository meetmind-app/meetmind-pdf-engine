'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const files = [
  'Renderer/design-system.js',
  'Renderer/icons.js',
  'Renderer/semantic-icons-v2.js'
];
const window = { console };
const sandbox = { window, globalThis: window, console };
vm.createContext(sandbox);
for (const file of files) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
}

const { design, icons, semanticIcons } = window.ExecutiveSlideEngine;
assert.strictEqual(design.version, '2.0.0');
assert.strictEqual(icons.version, '2.0.0');
assert.strictEqual(semanticIcons.version, '2.1.0');
assert.ok(Object.isFrozen(design.TOKENS), 'Design tokens must be immutable.');
assert.ok(icons.list().length >= 20, 'Canonical icon registry is unexpectedly incomplete.');
assert.strictEqual(icons.resolveName('check-circle-2'), 'circle-check');

const databasePaths = icons.toPathData('database');
assert.strictEqual(databasePaths.length, 3, 'Database icon must retain every Lucide node.');
assert.ok(databasePaths[0].includes(' C '), 'Ellipse geometry must use the shared cubic path adapter.');

const calls = [];
const context = {
  svgPath(data, options) {
    calls.push({ data, options });
  }
};
assert.strictEqual(
  icons.draw(context, 'database', { x: 11, y: 20, size: 8, color: 'greenSuccess' }),
  true
);
assert.strictEqual(calls.length, databasePaths.length);
assert.ok(calls.every(call => call.options.x === 11));
assert.ok(calls.every(call => Math.abs(call.options.y - 11.36) < 0.001));
assert.ok(calls.every(call => call.options.stroke === 'greenSuccess'));
assert.ok(calls.every(call => call.options.borderWidth === 0.48));

const sectionIds = ['summary', 'metrics', 'insights', 'decisions', 'risks', 'tasks', 'architecture', 'owners'];
const statIds = ['participants', 'tasks', 'decisions', 'risks', 'duration'];
const itemTypes = ['process', 'workflow', 'system', 'integration', 'data', 'other'];
const meetingTypes = [
  'strategy', 'product', 'architecture', 'planning', 'status', 'incident',
  'client', 'board', 'operations', 'research', 'partnership', 'sales',
  'education', 'personal', 'interview', 'retrospective', 'workshop',
  'one_on_one', 'review', 'other'
];
for (const name of [
  ...sectionIds.map(id => semanticIcons.section(id)),
  ...statIds.map(id => semanticIcons.stat(id)),
  ...itemTypes.map(type => semanticIcons.architectureItem(type)),
  ...meetingTypes.map(type => semanticIcons.meetingType(type))
]) {
  assert.ok(icons.has(name), `Semantic resolver returned unregistered icon: ${name}`);
}
assert.strictEqual(semanticIcons.section('architecture'), 'network');
assert.strictEqual(semanticIcons.architectureItem('workflow'), 'workflow');
assert.strictEqual(semanticIcons.architectureItem('data'), 'database');

const languageCases = [
  ['en', 'Annual revenue', 'chart-column'],
  ['ru', 'Стоимость инфраструктуры', 'boxes'],
  ['es', 'Duración de ciclo', 'clock-3'],
  ['pt', 'Usuários ativos', 'users-round'],
  ['tr', 'Dönüşüm oranı', 'target'],
  ['id', 'Pendapatan tahunan', 'chart-column'],
  ['hi', 'जोखिम दर', 'target'],
  ['ar', 'تكلفة التشغيل', 'boxes'],
  ['uz', 'Javob vaqti', 'clock-3'],
  ['fa', 'پایداری شبکه', 'network']
];
for (const [language, label, expected] of languageCases) {
  const first = semanticIcons.resolveMetric({ label });
  const second = semanticIcons.resolveMetric({ label });
  assert.strictEqual(first.name, expected, `${language} metric resolved to the wrong icon.`);
  assert.deepStrictEqual(first, second, `${language} metric icon resolution is not deterministic.`);
}
assert.strictEqual(
  semanticIcons.resolveMetric({ label: 'Active accounts', semantic: 'people' }).name,
  'users-round',
  'Explicit semantic category must take precedence over text heuristics.'
);

const baseRenderer = fs.readFileSync(path.join(root, 'Renderer/renderers/block-renderers.js'), 'utf8');
const architecture = fs.readFileSync(path.join(root, 'Renderer/architecture-v2.js'), 'utf8');
const orchestrator = fs.readFileSync(path.join(root, 'Renderer/renderer.js'), 'utf8');
assert.ok(!baseRenderer.includes('METRIC_ICONS'), 'Metric icons must never rotate by array position.');
assert.ok(!baseRenderer.includes('SECTION_ICONS'), 'Section icons must come from the semantic resolver.');
assert.ok(!architecture.includes('TYPE_ICONS'), 'Architecture item icons must come from the semantic resolver.');
assert.ok(!baseRenderer.includes('function nodePath') && !architecture.includes('function nodePath'));
assert.ok(!orchestrator.includes('function registryIconPath'));
assert.ok(baseRenderer.includes('registry?.draw?.'), 'Base renderers must use the shared icon drawing pipeline.');
assert.ok(architecture.includes("semanticIcons?.section?.('architecture')"));

console.log('Design / Icon System v2 contract passed.');
