'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const repoRoot = path.resolve(__dirname, '..');
const rendererPath = path.join(repoRoot, 'Renderer', 'renderers', 'block-renderers.js');
const layoutPath = path.join(repoRoot, 'Layout_Engine', 'layout-engine.js');
const fixturePath = path.join(__dirname, 'fixtures', 'RU_REAL_001.json');

const rendererSource = fs.readFileSync(rendererPath, 'utf8');
const layoutSource = fs.readFileSync(layoutPath, 'utf8');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

// Real regression fixture must preserve the strings that previously disappeared.
assert.ok(
  fixture.executive_brief.includes('По кандидатуре обещан ответ в течение пары недель.'),
  'RU_REAL_001 must contain the final Executive Brief sentence.'
);

assert.strictEqual(
  fixture.tasks[0].due_date,
  'в течение пары недель',
  'RU_REAL_001 must preserve the full task due date.'
);

assert.strictEqual(fixture.key_metrics.length, 5, 'RU_REAL_001 must keep the 5-metric layout case.');
assert.strictEqual(fixture.risks.length, 5, 'RU_REAL_001 must keep the 5-risk layout case.');
assert.ok(fixture.stats.duration_seconds > 0, 'RU_REAL_001 must carry meeting duration for stats regression.');

// Hard content-integrity rule: renderer must never intentionally keep only the first due-date line.
assert.ok(
  !rendererSource.includes('dueLines.slice(0,1)') &&
  !rendererSource.includes('dueLines.slice(0, 1)'),
  'Renderer still truncates wrapped due dates to one line.'
);

// Summary measurement and rendering must use the same explicit paragraph boundaries.
// Sentence-level splitting in the renderer adds spacing that Layout never measured and can silently drop the last sentence.
assert.ok(
  !rendererSource.includes('sentences.length>=3?sentences'),
  'Renderer still converts a single Executive Brief paragraph into sentence paragraphs after Layout measurement.'
);

// Renderer must not silently stop drawing Summary lines at the card boundary.
assert.ok(
  !rendererSource.includes('if(y+s.lineHeight>bottom)return;'),
  'Renderer still silently drops Executive Brief lines when geometry is too small.'
);

// Hard content-integrity rule: production renderer contract explicitly forbids silent truncation.
assert.ok(
  rendererSource.includes('No maxLines, slice(), ellipsis or hidden-count'),
  'Renderer content-integrity contract is missing.'
);

assert.ok(
  layoutSource.includes('no clipping/truncation/content deletion'),
  'Layout content-integrity contract is missing.'
);

console.log('P0 content-integrity regression checks passed.');
