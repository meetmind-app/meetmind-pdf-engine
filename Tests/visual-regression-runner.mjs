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
  ['RU_REAL_001', path.join(__dirname, 'fixtures', 'RU_REAL_001.json')],
  ['RU_DENSE_002', path.join(__dirname, 'fixtures', 'RU_DENSE_002.json')],
  ['EN_ASYMMETRIC_001', path.join(__dirname, 'fixtures', 'EN_ASYMMETRIC_001.json')]
];

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

function chunkedBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });

const pdfLibPath = path.join(repoRoot, 'node_modules', 'pdf-lib', 'dist', 'pdf-lib.min.js');
const fontkitPath = path.join(repoRoot, 'node_modules', '@pdf-lib', 'fontkit', 'dist', 'fontkit.umd.min.js');
if (!fs.existsSync(pdfLibPath)) throw new Error(`Missing ${pdfLibPath}`);
if (!fs.existsSync(fontkitPath)) throw new Error(`Missing ${fontkitPath}`);

await page.route('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', route =>
  route.fulfill({ path: pdfLibPath })
);
await page.route('https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js', route =>
  route.fulfill({ path: fontkitPath })
);
await page.route('https://meetmind-app.github.io/meetmind-pdf-engine/**', route => {
  const localPath = safeLocalPath(route.request().url());
  if (!localPath || !fs.existsSync(localPath) || !fs.statSync(localPath).isFile()) {
    return route.fulfill({ status: 404, body: `Missing local visual-regression asset for ${route.request().url()}` });
  }
  return route.fulfill({
    path: localPath,
    headers: { 'access-control-allow-origin': '*' }
  });
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

const manifest = [];

for (const [name, fixturePath] of cases) {
  const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const report = normalizeCurrentWebPayload(raw);

  const generated = await page.evaluate(async reportValue => {
    const originalLog = console.log;
    const captured = [];
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

    try {
      const blob = await window.ExecutiveSlideEngine.generate(reportValue, {
        language: reportValue.language || 'en'
      });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return {
        base64: chunkedBase64(bytes),
        logs: captured
      };
    } finally {
      console.log = originalLog;
    }
  }, report);

  const pdfBytes = Buffer.from(generated.base64, 'base64');
  const pdfPath = path.join(outDir, `${name}.pdf`);
  fs.writeFileSync(pdfPath, pdfBytes);

  const pdf = await PDFDocument.load(pdfBytes);
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
    attempts: engineMeta.attempts || null
  });
}

fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), cases: manifest }, null, 2)
);

console.log(JSON.stringify(manifest, null, 2));
await browser.close();
