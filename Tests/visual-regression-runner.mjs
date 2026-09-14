import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(__dirname, 'visual-output');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const cases = [
  ['FA_RTL_001', path.join(__dirname, 'fixtures', 'FA_RTL_001.json')],
  ['RU_DENSE_002', path.join(__dirname, 'fixtures', 'RU_DENSE_002.json')],
  ['EN_ASYMMETRIC_001', path.join(__dirname, 'fixtures', 'EN_ASYMMETRIC_001.json')],
  ['AR_RTL_001', path.join(__dirname, 'fixtures', 'AR_RTL_001.json')],
  ['RU_REAL_001', path.join(__dirname, 'fixtures', 'RU_REAL_001.json')],
  ['RU_CONTRACT_V11_001', path.join(__dirname, 'fixtures', 'RU_CONTRACT_V11_001.json')],
  ['RU_ARCH_DENSE_V2', path.join(__dirname, 'fixtures', 'RU_ARCH_DENSE_V2.json')],
  ['EN_ARCH_DENSE_V2', path.join(__dirname, 'fixtures', 'EN_ARCH_DENSE_V2.json')],
];

const timingKeys = [
  'dependencies',
  'assetPreparation',
  'composition',
  'layout',
  'render',
  'save',
  'total'
];

function assertGenerationDiagnostics(name, diagnostics) {
  if (!diagnostics || typeof diagnostics !== 'object') {
    throw new Error(`${name}: generation diagnostics are missing.`);
  }
  for (const key of timingKeys) {
    const value = diagnostics.timings?.[key];
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${name}: timing ${key} must be a finite non-negative number.`);
    }
  }
  for (const key of ['hits', 'misses', 'entries']) {
    const value = diagnostics.assetCache?.[key];
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${name}: asset cache ${key} must be a non-negative integer.`);
    }
  }
}

function normalizeCurrentWebPayload(report) {
  return {
    ...report,
    summary: report.summary ?? report.executive_brief ?? report.executive_summary ?? '',
    metrics: report.metrics ?? report.key_metrics ?? report.keyMetrics ?? [],
    insights: report.insights ?? report.key_takeaways ?? [],
    decisions: report.decisions ?? [],
    risks: report.risks ?? [],
    tasks: report.tasks ?? report.action_items ?? [],
    architecture: report.architecture ?? { sections: [] },
    owners: report.owners ?? report.responsibles ?? [],
    participants: Array.isArray(report.participants) ? report.participants : []
  };
}

function safeLocalPath(urlString) {
  const url = new URL(urlString);
  const prefix = '/meetmind-pdf-engine/';
  if (!url.pathname.startsWith(prefix)) return null;
  const relative = decodeURIComponent(url.pathname.slice(prefix.length));
  const resolved = path.resolve(repoRoot, relative || 'Tests/visual-harness.html');
  if (!resolved.startsWith(repoRoot + path.sep) && resolved !== repoRoot) return null;
  return resolved;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });

const pdfLibPath = path.join(repoRoot, 'node_modules', 'pdf-lib', 'dist', 'pdf-lib.min.js');
const fontkitPath = path.join(repoRoot, 'node_modules', '@pdf-lib', 'fontkit', 'dist', 'fontkit.umd.min.js');
const bidiPath = path.join(repoRoot, 'node_modules', 'bidi-js', 'dist', 'bidi.min.mjs');
if (!fs.existsSync(pdfLibPath)) throw new Error(`Missing ${pdfLibPath}`);
if (!fs.existsSync(fontkitPath)) throw new Error(`Missing ${fontkitPath}`);
if (!fs.existsSync(bidiPath)) throw new Error(`Missing ${bidiPath}`);

await page.route('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', route =>
  route.fulfill({ path: pdfLibPath })
);
await page.route('https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js', route =>
  route.fulfill({ path: fontkitPath })
);
await page.route('https://cdn.jsdelivr.net/npm/bidi-js@1.1.0/+esm', route =>
  route.fulfill({ path: bidiPath, contentType: 'text/javascript' })
);
const immutableAssetRequests = [];
await page.route('https://meetmind-app.github.io/meetmind-pdf-engine/**', route => {
  const requestUrl = new URL(route.request().url());
  if (requestUrl.pathname.includes('/fonts/') || requestUrl.pathname.includes('/Renderer/assets/')) {
    immutableAssetRequests.push(route.request().url());
  }
  const localPath = safeLocalPath(route.request().url());
  if (!localPath || !fs.existsSync(localPath) || !fs.statSync(localPath).isFile()) {
    return route.fulfill({ status: 404, body: `Missing local visual-regression asset for ${route.request().url()}` });
  }
  return route.fulfill({ path: localPath });
});

page.on('pageerror', error => console.error('[browser pageerror]', error));
page.on('console', message => {
  if (message.type() === 'error' || message.type() === 'warning') {
    console.log(`[browser ${message.type()}] ${message.text()}`);
  }
});

await page.goto('https://meetmind-app.github.io/meetmind-pdf-engine/Tests/visual-harness.html', {
  waitUntil: 'domcontentloaded'
});
await page.waitForFunction(() => typeof window.ExecutiveSlideEngine?.generate === 'function');

const bidiContract = await page.evaluate(async () => {
  const { resolveVisualRuns } = await import(
    'https://meetmind-app.github.io/meetmind-pdf-engine/core/rtl-bidi.js'
  );
  return {
    mixed: resolveVisualRuns('ناسازگاری با Google Calendar مطرح شد.'),
    brackets: resolveVisualRuns('(نسخه API 2)')
  };
});

if (bidiContract.mixed[1]?.text !== 'Google Calendar') {
  throw new Error('RTL bidi contract failed: embedded Latin phrase lost LTR order.');
}
if (bidiContract.brackets[0]?.text !== '(' || !bidiContract.brackets.at(-1)?.text.startsWith(')')) {
  throw new Error('RTL bidi contract failed: paired punctuation was not mirrored.');
}

const manifest = [];

for (const [name, fixturePath] of cases) {
  const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const report = normalizeCurrentWebPayload(raw);

  const generated = await page.evaluate(async reportValue => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const captured = [];
    const warnings = [];
    console.log = (...args) => {
      captured.push(args.map(value => {
        if (value && typeof value === 'object') {
          try { return JSON.parse(JSON.stringify(value)); }
          catch { return String(value); }
        }
        return String(value);
      }));
      originalLog(...args);
    };
    console.warn = (...args) => {
      warnings.push(args.map(value => String(value)).join(' '));
      originalWarn(...args);
    };

    try {
      const blob = await window.ExecutiveSlideEngine.generate(reportValue, {
        language: reportValue.language || 'en'
      });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
      }
      return {
        base64: btoa(binary),
        logs: captured,
        warnings,
        diagnostics: blob.lorevi || null,
        lastDiagnostics: window.ExecutiveSlideEngine.getLastGenerationDiagnostics?.() || null
      };
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
    }
  }, report);

  const architectureWarnings = generated.warnings.filter(message =>
    message.includes('ARCHITECTURE_EMERGENCY_SCALE') ||
    message.includes('ARCHITECTURE_LAYOUT_OVERFLOW')
  );
  if (architectureWarnings.length) {
    throw new Error(`${name}: ${architectureWarnings.join(' | ')}`);
  }

  const pdfBytes = Buffer.from(generated.base64, 'base64');
  const pdfPath = path.join(outDir, `${name}.pdf`);
  fs.writeFileSync(pdfPath, pdfBytes);

  const pdf = await PDFDocument.load(pdfBytes);
  assertGenerationDiagnostics(name, generated.diagnostics);
  if (JSON.stringify(generated.diagnostics) !== JSON.stringify(generated.lastDiagnostics)) {
    throw new Error(`${name}: public last-generation diagnostics differ from Blob diagnostics.`);
  }
  if (name.endsWith('_ARCH_DENSE_V2') && pdf.getPageCount() > 2) {
    throw new Error(`${name}: dense hardening fixture exceeded the two-page product contract.`);
  }
  const engineLog = [...generated.logs].reverse().find(entry =>
    Array.isArray(entry) && String(entry[0] || '').includes('Golden PDF generated')
  );
  const engineMeta = engineLog && engineLog[1] && typeof engineLog[1] === 'object'
    ? engineLog[1]
    : {};

  manifest.push({
    case: name,
    fixture: path.relative(repoRoot, fixturePath),
    pdf: path.relative(repoRoot, pdfPath),
    bytes: pdfBytes.length,
    pageCount: pdf.getPageCount(),
    density: engineMeta.density || null,
    attempts: engineMeta.attempts || null,
    timings: generated.diagnostics.timings,
    assetCache: generated.diagnostics.assetCache
  });
}

// A second export in the same page session must reuse the already fetched,
// versioned font/image byte promises. This is stronger than relying on the
// browser HTTP cache because it proves generate() itself issues no new fetch.
const repeatRaw = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'EN_ARCH_DENSE_V2.json'),
  'utf8'
));
const repeatReport = normalizeCurrentWebPayload(repeatRaw);
const requestsBeforeRepeat = immutableAssetRequests.length;
const repeat = await page.evaluate(async reportValue => {
  const blob = await window.ExecutiveSlideEngine.generate(reportValue, {
    language: reportValue.language || 'en'
  });
  return {
    diagnostics: blob.lorevi || null,
    lastDiagnostics: window.ExecutiveSlideEngine.getLastGenerationDiagnostics?.() || null
  };
}, repeatReport);
assertGenerationDiagnostics('EN_ARCH_DENSE_V2_REPEAT', repeat.diagnostics);
if (immutableAssetRequests.length !== requestsBeforeRepeat) {
  throw new Error('Warm export re-fetched immutable font or header assets.');
}
if (repeat.diagnostics.assetCache.misses !== 0 || repeat.diagnostics.assetCache.hits < 5) {
  throw new Error(
    `Warm export cache contract failed: ${JSON.stringify(repeat.diagnostics.assetCache)}`
  );
}
if (JSON.stringify(repeat.diagnostics) !== JSON.stringify(repeat.lastDiagnostics)) {
  throw new Error('Warm export public diagnostics do not match Blob diagnostics.');
}

fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    immutableAssetRequestCount: immutableAssetRequests.length,
    repeatExport: repeat.diagnostics,
    cases: manifest
  }, null, 2)
);

console.log(JSON.stringify(manifest, null, 2));
await browser.close();
