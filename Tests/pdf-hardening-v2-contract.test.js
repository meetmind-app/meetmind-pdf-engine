const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const architecture = fs.readFileSync(path.join(root, 'Renderer', 'architecture-v2.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'executive-slide-engine.js'), 'utf8');

// P0: dense architecture must never deliberately kill the entire export.
assert.ok(
  !architecture.includes('throw new Error(\n                `ARCHITECTURE_LAYOUT_UNDERSIZED'),
  'Dense architecture still throws ARCHITECTURE_LAYOUT_UNDERSIZED instead of reflowing/falling back.'
);

// P0 performance: immutable engine assets must not be forcibly re-downloaded
// on every generate() call.
assert.ok(
  !/async function fetchBytes[\s\S]*?cache:\s*['\"]no-store['\"]/.test(engine),
  'PDF assets are still fetched with cache:no-store on every generation.'
);

console.log('PDF hardening v2 contract passed.');
