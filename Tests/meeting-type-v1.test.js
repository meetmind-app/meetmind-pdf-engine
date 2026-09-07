'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(repoRoot, 'Renderer', 'meeting-type-v1.js'), 'utf8');

const headerCalls = [];
const host = {
  blockRenderers: Object.freeze({
    version: 'base',
    header(block, ctx) { headerCalls.push({ block, ctx }); }
  })
};
const window = { ExecutiveSlideEngine: host };
const sandbox = { window };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'meeting-type-v1.js' });

const renderer = window.ExecutiveSlideEngine.blockRenderers.header;
assert.strictEqual(typeof renderer, 'function', 'Meeting Type v1 did not install the header renderer.');

function makeContext(report, language = 'ru') {
  const textCalls = [];
  const rectCalls = [];
  return {
    report,
    options: { language },
    textCalls,
    rectCalls,
    measureText(text, font, size) {
      return String(text || '').length * Number(size || 5) * 0.48;
    },
    rect(args) { rectCalls.push(args); },
    text(text, args) { textCalls.push({ text: String(text), args }); }
  };
}

const block = { pageNumber: 1, geometry: { x: 10, y: 9, width: 748, height: 39 } };

const explicit = makeContext({
  language: 'ru',
  meeting_type: 'interview',
  meeting_type_label: 'Интервью с кандидатом на Head of Product'
});
renderer(block, explicit);
assert.strictEqual(headerCalls.length, 1, 'Base header renderer must remain active.');
assert.ok(
  explicit.textCalls.some(call => call.text === 'Интервью с кандидатом на Head of Product'),
  'Explicit meeting_type_label was not rendered.'
);
assert.ok(explicit.rectCalls.length >= 1, 'Meeting type badge background was not rendered.');

const fallback = makeContext({ language: 'ru', meeting_type: 'strategy' });
renderer(block, fallback);
assert.ok(
  fallback.textCalls.some(call => call.text === 'Стратегическая встреча'),
  'Localized fallback from meeting_type was not rendered.'
);

const continuation = makeContext({ language: 'ru', meeting_type: 'strategy' });
renderer({ ...block, pageNumber: 2 }, continuation);
assert.ok(
  !continuation.textCalls.some(call => call.text === 'Стратегическая встреча'),
  'Meeting type badge must not repeat on continuation pages.'
);

console.log('Meeting Type v1 regression passed.');
