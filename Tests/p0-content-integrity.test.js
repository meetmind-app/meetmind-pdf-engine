'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const repoRoot = path.resolve(__dirname, '..');
const blockRendererPath = path.join(repoRoot, 'Renderer', 'renderers', 'block-renderers.js');
const rendererOrchestratorPath = path.join(repoRoot, 'Renderer', 'renderer.js');
const layoutPath = path.join(repoRoot, 'Layout_Engine', 'layout-engine.js');
const fixturePath = path.join(__dirname, 'fixtures', 'RU_REAL_001.json');

const blockRendererSource = fs.readFileSync(blockRendererPath, 'utf8');
const rendererOrchestratorSource = fs.readFileSync(rendererOrchestratorPath, 'utf8');
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

// Hard content-integrity rule: Tasks renderer must never intentionally keep only the first due-date line.
assert.ok(
  !blockRendererSource.includes('dueLines.slice(0,1)') &&
  !blockRendererSource.includes('dueLines.slice(0, 1)'),
  'Renderer still truncates wrapped due dates to one line.'
);

// P0 Summary is resolved at the renderer orchestrator boundary so the legacy summary implementation cannot silently truncate.
assert.ok(
  rendererOrchestratorSource.includes("block.id === 'executiveSummary' || block.id === 'summary'"),
  'Renderer orchestrator does not route Summary through the content-integrity renderer.'
);

assert.ok(
  rendererOrchestratorSource.includes('SUMMARY_LAYOUT_UNDERSIZED'),
  'Summary renderer must surface undersized Layout geometry instead of silently dropping content.'
);

assert.ok(
  rendererOrchestratorSource.includes("raw.split(/\\n\\s*\\n|\\n/).map(cleanText).filter(Boolean)"),
  'Summary renderer must preserve explicit paragraph boundaries without sentence-level re-splitting.'
);

// Hard content-integrity rule: production renderer contract explicitly forbids silent truncation.
assert.ok(
  blockRendererSource.includes('No maxLines, slice(), ellipsis or hidden-count'),
  'Renderer content-integrity contract is missing.'
);

assert.ok(
  layoutSource.includes('no clipping/truncation/content deletion'),
  'Layout content-integrity contract is missing.'
);

console.log('P0 content-integrity regression checks passed.');
