'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const repoRoot = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(repoRoot, 'Renderer', 'renderer.js'), 'utf8');
const layout = fs.readFileSync(path.join(repoRoot, 'Layout_Engine', 'layout-engine.js'), 'utf8');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'RU_CONTRACT_V11_001.json'), 'utf8'));

assert.ok(fixture.key_metrics.some(metric => metric.relation === 'current_to_target'), 'Fixture must exercise semantic metric relation rendering.');
assert.ok(fixture.key_metrics.some(metric => metric.context), 'Fixture must exercise metric context rendering.');
assert.ok(fixture.risks.some(risk => risk.impact && risk.mitigation), 'Fixture must exercise enriched risk rendering.');

assert.ok(renderer.includes('metricDisplayValue'), 'Renderer does not derive the primary metric display from v1.1 semantic fields.');
assert.ok(renderer.includes('metricContextText'), 'Renderer does not render v1.1 metric context/target period.');
assert.ok(layout.includes('metricContextText'), 'Layout does not reserve height for v1.1 metric context.');
assert.ok(renderer.includes('renderRisksV11'), 'Renderer does not have an enriched v1.1 Risks renderer.');
assert.ok(layout.includes('riskSupplementalText'), 'Layout does not reserve height for v1.1 risk impact/mitigation.');

console.log('Report renderer v1.1 regression contract passed.');
