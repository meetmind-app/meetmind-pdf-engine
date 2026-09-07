'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const rendererPath = path.join(repoRoot, 'Renderer', 'renderer.js');
const rendererSource = fs.readFileSync(rendererPath, 'utf8');

function block(id, x, y, width, height, layout = {}) {
  return {
    id,
    geometry: { x, y, width, height },
    layout: { density: 'compact', ...layout }
  };
}

function runPacked(layoutResult, version) {
  const host = {
    MeetMindLayoutEngine: Object.freeze({
      version,
      layout() { return layoutResult; }
    })
  };
  const sandbox = {
    window: host,
    globalThis: host,
    module: { exports: {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(rendererSource, sandbox, { filename: `renderer-${version}.js` });
  const wrapped = host.MeetMindLayoutEngine;
  assert.ok(wrapped.version.includes('page-pack-'), 'Page-packing layout extension was not installed.');
  return wrapped.layout({});
}

const originalResult = {
  pageCount: 1,
  valid: true,
  density: 'compact',
  pages: [{
    number: 1,
    density: 'compact',
    blocks: [
      block('header', 10, 8, 748, 39),
      block('stats', 10, 51, 748, 17),
      block('summary', 10, 72, 320, 90),
      block('metrics', 334, 72, 424, 90),
      block('risks', 10, 166, 748, 100),
      block('tasks', 10, 270, 292, 62, { naturalHeight: 45, adaptiveComposition: true, compositionAxis: 'row' }),
      block('architecture', 306, 270, 452, 62, { naturalHeight: 72, adaptiveComposition: true, compositionAxis: 'row' }),
      block('footer', 10, 477, 748, 28, { sharedBottomBand: true })
    ]
  }]
};

const result = runPacked(originalResult, 'test-layout');
assert.ok(result.pagePackingApplied, 'Sparse page did not report page packing.');

const page = result.pages[0];
const tasks = page.blocks.find(b => b.id === 'tasks');
const architecture = page.blocks.find(b => b.id === 'architecture');
const footer = page.blocks.find(b => b.id === 'footer');

assert.strictEqual(tasks.geometry.x, architecture.geometry.x, 'Sparse final pair should stack on the same left edge.');
assert.strictEqual(tasks.geometry.width, architecture.geometry.width, 'Sparse final pair should stack at the same full width.');
assert.ok(architecture.geometry.y > tasks.geometry.y + tasks.geometry.height, 'Architecture must move below Tasks when stack packing is selected.');
assert.strictEqual(tasks.layout.pagePacking, 'stack-final-pair-balanced');
assert.strictEqual(architecture.layout.pagePacking, 'stack-final-pair-balanced');
assert.ok(
  tasks.geometry.height < 70 && architecture.geometry.height < 85,
  'Sparse semantic cards were stretched far beyond their natural content height.'
);
const topWhitespace = tasks.geometry.y - 270;
const bottomWhitespace = footer.geometry.y - (architecture.geometry.y + architecture.geometry.height);
assert.ok(topWhitespace > 0 && bottomWhitespace > 0, 'Genuine sparse-report whitespace should be external to semantic cards.');
assert.ok(Math.abs(topWhitespace - bottomWhitespace) < 1, 'External sparse whitespace should be visually balanced around the final semantic stack.');

// Small residual whitespace should keep the row and only extend it modestly;
// it must not gratuitously change reading order or create giant empty cards.
const tightResult = {
  ...originalResult,
  pages: [{
    ...originalResult.pages[0],
    blocks: originalResult.pages[0].blocks.map(b => {
      if (b.id === 'tasks' || b.id === 'architecture') {
        return block(b.id, b.geometry.x, 405, b.geometry.width, 60, { naturalHeight: 55, adaptiveComposition: true, compositionAxis: 'row' });
      }
      return b;
    })
  }]
};

const tight = runPacked(tightResult, 'test-layout-2');
const tightPage = tight.pages[0];
const tightTasks = tightPage.blocks.find(b => b.id === 'tasks');
const tightArch = tightPage.blocks.find(b => b.id === 'architecture');
assert.strictEqual(tightTasks.geometry.y, tightArch.geometry.y, 'Tight page must keep Tasks and Architecture on the same row.');
assert.strictEqual(tightTasks.geometry.x, 10, 'Tight Tasks row should preserve its horizontal placement.');
assert.strictEqual(tightArch.geometry.x, 306, 'Tight Architecture row should preserve its horizontal placement.');
assert.ok(tightTasks.geometry.height <= 70, 'Tight Tasks card expansion exceeded the approved modest cap.');
assert.ok(tightArch.geometry.height <= 70, 'Tight Architecture card expansion exceeded the approved modest cap.');
assert.ok(tightTasks.geometry.y > 405, 'Residual whitespace should be balanced instead of being absorbed entirely into card height.');
assert.ok(
  footer.geometry.y - (tightTasks.geometry.y + tightTasks.geometry.height) >= 0,
  'Balanced row must remain above the footer band.'
);

console.log('Sparse page-packing regression checks passed.');
