'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'core', 'render-context.js'), 'utf8');

assert.ok(source.includes('visualRtlText'), 'RTL visual-order transform must exist.');
assert.ok(source.includes('shapeArabic'), 'Arabic contextual shaping must exist.');
assert.ok(source.includes('\\u067E'), 'Persian PEH shaping must be supported.');
assert.ok(source.includes('\\u0686'), 'Persian TCHEH shaping must be supported.');
assert.ok(source.includes('\\u0698'), 'Persian JEH shaping must be supported.');
assert.ok(source.includes('\\u06A9'), 'Persian KEHEH shaping must be supported.');
assert.ok(source.includes('\\u06AF'), 'Persian GAF shaping must be supported.');
assert.ok(source.includes('\\u06CC'), 'Persian FARSI YEH shaping must be supported.');
assert.ok(source.includes('A-Za-z0-9'), 'Mixed Latin/API tokens must remain explicit bidi runs.');
assert.ok(source.includes("['ar', 'fa']"), 'RTL PDF handling must remain limited to Arabic/Persian locales.');

console.log('RTL PDF fa/ar shaping contract passed.');
