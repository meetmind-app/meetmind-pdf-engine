'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(repoRoot, 'Renderer', 'architecture-v2.js'), 'utf8');

const host = {
  blockRenderers: Object.freeze({ version: 'base' }),
  icons: {
    get() {
      return { nodes: [['path', { d: 'M 1 1 L 2 2' }]] };
    }
  }
};
const window = { ExecutiveSlideEngine: host };
const sandbox = { window };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'architecture-v2.js' });

const renderer = window.ExecutiveSlideEngine.blockRenderers.architecture;
assert.strictEqual(typeof renderer, 'function', 'Architecture v2 renderer did not install.');

function createContext(language = 'en') {
  const textCalls = [];
  const lineCalls = [];
  return {
    textCalls,
    lineCalls,
    density: 'regular',
    options: { language },
    report: { language },
    tokens: {},
    measureText(text, font, size) {
      return String(text || '').length * Number(size || 6) * 0.48;
    },
    rect() {},
    svgPath() {},
    line(options) {
      lineCalls.push(options);
    },
    text(text, options) {
      textCalls.push({ text: String(text), options });
    }
  };
}

const geometry = { x: 10, y: 10, width: 748, height: 150 };
const components = {
  id: 'architecture',
  geometry,
  data: {
    sections: [{
      title: 'Components',
      layout: 'components',
      items: [
        { title: 'Catalog', description: 'Structured data.', type: 'data' },
        { title: 'API', description: 'External access.', type: 'integration' }
      ]
    }]
  }
};

const componentCtx = createContext();
renderer(components, componentCtx);
assert.ok(
  componentCtx.lineCalls.length === 0,
  'Components mode must not invent directional arrows.'
);

const process = {
  id: 'architecture',
  geometry,
  data: {
    sections: [{
      title: 'Processing',
      layout: 'process',
      items: [
        { title: 'Normalize', description: 'Normalize input.', type: 'process' },
        { title: 'Generate', description: 'Generate output.', type: 'process' }
      ]
    }]
  }
};

const processCtx = createContext();
renderer(process, processCtx);
assert.ok(
  processCtx.lineCalls.length >= 3,
  'Explicit process mode must render a vector directional connector.'
);
assert.ok(
  !processCtx.textCalls.some(call => ['→', '←', '↓'].includes(call.text)),
  'Process connectors must not depend on a font containing arrow glyphs.'
);

const rtlCtx = createContext('ar');
renderer(process, rtlCtx);
assert.ok(
  rtlCtx.lineCalls.length >= 3,
  'RTL process mode must retain vector connectors for RenderContext mirroring.'
);

const multiRow = {
  id: 'architecture',
  geometry: { x: 10, y: 10, width: 748, height: 240 },
  data: {
    sections: Array.from({ length: 5 }, (_, index) => ({
      title: `Section ${index + 1}`,
      layout: 'components',
      items: [{ title: `Item ${index + 1}`, description: `Description ${index + 1}` }]
    }))
  }
};
const multiRowCtx = createContext();
renderer(multiRow, multiRowCtx);
assert.ok(
  multiRowCtx.textCalls.some(call => call.text === 'Section 5') &&
    multiRowCtx.textCalls.some(call => call.text === 'Item 5'),
  'Architecture renderer silently dropped a section beyond the first four.'
);

console.log('Architecture & Process v2 semantic regression passed.');
