const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const architecture = fs.readFileSync(path.join(root, 'Renderer', 'architecture-v2.js'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'Layout_Engine', 'layout-engine.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'executive-slide-engine.js'), 'utf8');

// P0 guardrails for the hardening branch. The implementation may retain a
// diagnostic error string, but production rendering must not throw it.
const fatalArchitectureThrow = /throw\s+new\s+Error\s*\([\s\S]{0,160}ARCHITECTURE_LAYOUT_UNDERSIZED/;
assert(!fatalArchitectureThrow.test(architecture),
  'Architecture renderer must not abort the whole PDF because a dense section needs reflow');
assert(layout.includes('measureArchitecture'), 'Architecture must remain layout-measured');
assert(/asset(Bytes)?Cache/i.test(engine),
  'PDF immutable fonts/images should be cached across exports');

console.log('PDF hardening v2 static guardrails: OK');
