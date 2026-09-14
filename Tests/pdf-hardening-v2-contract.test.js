const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const architecture = fs.readFileSync(path.join(root, 'Renderer', 'architecture-v2.js'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'Layout_Engine', 'layout-engine.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'Renderer', 'renderer.js'), 'utf8');
const blockRenderers = fs.readFileSync(path.join(root, 'Renderer', 'renderers', 'block-renderers.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'executive-slide-engine.js'), 'utf8');

// P0: dense architecture must never deliberately kill the entire export.
assert.ok(
  !architecture.includes('throw new Error(\n                `ARCHITECTURE_LAYOUT_UNDERSIZED'),
  'Dense architecture still throws ARCHITECTURE_LAYOUT_UNDERSIZED instead of reflowing/falling back.'
);
assert.ok(
  architecture.includes('splitSectionRows') && !architecture.includes('sections.slice(0, sectionCount)'),
  'Architecture sections beyond the first row can still be silently discarded.'
);
assert.ok(
  architecture.includes('ITEM_ICON_GAP') && architecture.includes('itemGeometry'),
  'Architecture icons do not have an explicit non-overlapping text gutter.'
);
assert.ok(
  architecture.includes('drawHorizontalConnector') && architecture.includes('drawVerticalConnector'),
  'Architecture process connectors still depend on potentially missing font glyphs.'
);
assert.ok(
  layout.includes('fullWidthNaturalHeight') && renderer.includes('fullWidthNaturalHeight'),
  'Exact full-width Architecture measurement is not propagated into page packing.'
);
assert.ok(
  renderer.includes('rowCellW') && !renderer.includes('const offset=(cols-rowCount)'),
  'Incomplete metric rows still reserve an avoidable empty grid slot.'
);
assert.ok(
  blockRenderers.includes("||'—'"),
  'Missing task owner/due values do not have the required em-dash fallback.'
);

// P0 performance: immutable engine assets must not be forcibly re-downloaded
// on every generate() call.
assert.ok(
  !/async function fetchBytes[\s\S]*?cache:\s*['\"]no-store['\"]/.test(engine),
  'PDF assets are still fetched with cache:no-store on every generation.'
);
assert.ok(engine.includes("cache: 'force-cache'"), 'Versioned PDF assets do not use browser caching.');
assert.ok(engine.includes('assetBytesCache'), 'Immutable PDF asset bytes are not cached in memory.');
for (const phase of ['dependencies', 'assetPreparation', 'composition', 'layout', 'render', 'save', 'total']) {
  assert.ok(engine.includes(`timings.${phase}`), `Generation timing ${phase} is not exposed.`);
}
assert.ok(
  engine.includes('getLastGenerationDiagnostics') && engine.includes("Object.defineProperty(blob, 'lorevi'"),
  'Generation diagnostics are not available through both the Blob and public engine API.'
);

console.log('PDF hardening v2 contract passed.');
