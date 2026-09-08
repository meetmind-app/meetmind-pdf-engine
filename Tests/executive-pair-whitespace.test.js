'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const layoutSource = fs.readFileSync(path.join(repoRoot, 'Layout_Engine', 'layout-engine.js'), 'utf8');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(layoutSource, sandbox, { filename: 'layout-engine.js' });
const engine = sandbox.window.MeetMindLayoutEngine;
assert.ok(engine && typeof engine.layout === 'function', 'Layout engine did not initialize.');

const metrics = [
  { label: 'Annual recurring revenue', value: '$8.4M current → $10M target by Q4' },
  { label: 'Enterprise conversion', value: '18.4% current → 27% target' },
  { label: 'Implementation lead time', value: '18 business days → 7 business days' },
  { label: 'Gross margin improvement', value: '61% current → 72% target' },
  { label: 'Expansion pipeline', value: '$3.2M qualified opportunities' }
];

const composition = {
  pages: [{
    number: 1,
    blocks: [
      { id: 'header', data: {} },
      { id: 'stats', data: { participants: 4, tasks: 0, decisions: 1, risks: 1 } },
      { id: 'summary', data: 'Pilot approved. Commercial validation starts next.' },
      { id: 'metrics', data: metrics },
      { id: 'insights', data: [{ title: 'Commercial signal', description: 'The pilot has a clear decision gate.' }] },
      { id: 'decisions', data: [{ title: 'Proceed with pilot', description: 'Run the paid validation before expanding scope.' }] },
      { id: 'risks', data: [{ title: 'Conversion uncertainty', description: 'Target conversion remains unvalidated.' }] },
      { id: 'footer', data: {} }
    ]
  }]
};

const result = engine.layout(composition);
assert.ok(result.valid, 'Asymmetric executive report must remain geometrically valid.');
assert.strictEqual(result.pageCount, 1, 'Whitespace optimization must not create a second page for this scenario.');

const page = result.pages[0];
const summary = page.blocks.find(block => ['summary', 'executiveSummary'].includes(block.id));
const keyMetrics = page.blocks.find(block => ['metrics', 'keyMetrics'].includes(block.id));
assert.ok(summary && keyMetrics, 'Executive Summary and Key Metrics must both be present.');

const sameRow = Math.abs(summary.geometry.y - keyMetrics.geometry.y) < 0.75;
if (sameRow) {
  const blocks = [summary, keyMetrics];
  const maxUnusedRatio = Math.max(...blocks.map(block => {
    const allocated = Number(block.geometry.height);
    const natural = Number(block.layout?.naturalHeight ?? allocated);
    return allocated > 0 ? Math.max(0, allocated - natural) / allocated : 0;
  }));
  assert.ok(
    maxUnusedRatio <= 0.38,
    `Asymmetric executive row wastes ${(maxUnusedRatio * 100).toFixed(1)}% of a card height; rebalance widths or stack the pair.`
  );
} else {
  assert.ok(
    keyMetrics.geometry.y > summary.geometry.y + summary.geometry.height - 0.01,
    'When the asymmetric pair stacks, Metrics must follow Summary in reading order.'
  );
}

console.log('Executive pair whitespace regression passed.');
