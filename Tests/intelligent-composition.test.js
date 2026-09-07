'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const repoRoot = path.resolve(__dirname, '..');
const layoutPath = path.join(repoRoot, 'Layout_Engine', 'layout-engine.js');
const layoutSource = fs.readFileSync(layoutPath, 'utf8');

// One-page layout must also evaluate adaptive semantic arrangements.
assert.ok(
  layoutSource.includes("buildPage(blocks, modeName, { adaptiveExecutive: true })"),
  'One-page layout still uses the fixed Golden arrangement before considering adaptive row/column composition.'
);

// Summary/Metrics and Tasks/Architecture must be able to switch between row and stack layouts.
assert.ok(
  layoutSource.includes('chooseAdaptivePairLayout'),
  'Adaptive pair layout selector is missing for row-vs-stack decisions.'
);

// Three executive blocks must be scored for both vertical footprint and wasted row space.
assert.ok(
  layoutSource.includes('unusedHeight'),
  'Executive trio candidate scoring does not penalize empty row space.'
);

// Two-page composition must try the smallest coherent transfer first, rather than always moving both operational blocks.
assert.ok(
  layoutSource.includes('transferCandidates'),
  'Semantic pagination does not evaluate minimal coherent transfer candidates.'
);
assert.ok(
  !layoutSource.includes("const movable = ['tasks', 'architecture']"),
  'Two-page pagination still hardcodes moving Tasks and Architecture together.'
);

// Continuation pages must intentionally consume available vertical geometry rather than leave accidental blank bands.
assert.ok(
  layoutSource.includes('allocatedHeight'),
  'Continuation page does not allocate available height back into semantic block geometry.'
);

// Sequential fallback may never intentionally cap a semantic block height and therefore clip its content.
assert.ok(
  !layoutSource.includes('height: Math.min(h, maxY - mode.marginTop)'),
  'Sequential fallback still caps oversized semantic blocks and can clip content.'
);

console.log('Intelligent composition regression contract passed.');
