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

assert.ok(fixture.executive_brief.includes('По кандидатуре обещан ответ в течение пары недель.'), 'RU_REAL_001 must contain the final Executive Brief sentence.');
assert.strictEqual(fixture.tasks[0].due_date, 'в течение пары недель', 'RU_REAL_001 must preserve the full task due date.');
assert.strictEqual(fixture.key_metrics.length, 5, 'RU_REAL_001 must keep the 5-metric layout case.');
assert.strictEqual(fixture.risks.length, 5, 'RU_REAL_001 must keep the 5-risk layout case.');
assert.ok(fixture.stats.duration_seconds > 0, 'RU_REAL_001 must carry meeting duration for stats regression.');

assert.ok(!blockRendererSource.includes('dueLines.slice(0,1)') && !blockRendererSource.includes('dueLines.slice(0, 1)'), 'Renderer still truncates wrapped due dates to one line.');

assert.ok(rendererOrchestratorSource.includes("block.id === 'executiveSummary' || block.id === 'summary'"), 'Renderer orchestrator does not route Summary through the content-integrity renderer.');
assert.ok(rendererOrchestratorSource.includes('SUMMARY_LAYOUT_UNDERSIZED'), 'Summary must fail visibly instead of silently dropping content.');
assert.ok(rendererOrchestratorSource.includes("raw.split(/\\n\\s*\\n|\\n/).map(cleanText).filter(Boolean)"), 'Summary must preserve explicit paragraph boundaries without sentence-level re-splitting.');

assert.ok(rendererOrchestratorSource.includes("block.id === 'meetingStats' || block.id === 'stats'"), 'Renderer orchestrator does not route Meeting Stats through the integrity path.');
assert.ok(rendererOrchestratorSource.includes('const explicit = b?.data ?? b?.content'), 'Meeting Stats must read the stats payload attached to the semantic block.');
assert.ok(rendererOrchestratorSource.includes('const fallbackStats = {'), 'Meeting Stats must merge system counts when explicit stats contain only duration or partial fields.');
assert.ok(rendererOrchestratorSource.includes('stats: {...fallbackStats, ...explicit}'), 'Meeting Stats must keep canonical counts ahead of non-display technical fields.');

assert.ok(rendererOrchestratorSource.includes("block.id === 'keyMetrics' || block.id === 'metrics'"), 'Renderer orchestrator does not route Metrics through the integrity renderer.');
assert.ok(rendererOrchestratorSource.includes('METRIC_LAYOUT_UNDERSIZED'), 'Metrics must fail visibly instead of clipping long values.');
assert.ok(rendererOrchestratorSource.includes('metrics.length===5?3'), 'Five metrics must use the balanced 3+2 grid rather than a 4+1 grid.');
assert.ok(rendererOrchestratorSource.includes("ru: 'Ключевые метрики'"), 'Metrics section title must stay localized for Russian reports.');
assert.ok(!rendererOrchestratorSource.includes("ctx.text('Key Metrics'"), 'Metrics renderer still hardcodes an English title.');

assert.ok(blockRendererSource.includes('No maxLines, slice(), ellipsis or hidden-count'), 'Renderer content-integrity contract is missing.');
assert.ok(layoutSource.includes('no clipping/truncation/content deletion'), 'Layout content-integrity contract is missing.');

console.log('P0 content-integrity regression checks passed.');