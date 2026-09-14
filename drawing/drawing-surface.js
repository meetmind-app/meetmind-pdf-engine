/**
 * drawing-surface.js
 * LOREVI Executive PDF Engine
 *
 * Low-level PDF drawing backend. Arabic/Persian text is laid out by Fontkit's
 * OpenType GSUB/GPOS engine and painted as vector glyph outlines. pdf-lib's
 * native drawText remains the fast path for every LTR report language.
 */

import { resolveVisualRuns } from '../core/rtl-bidi.js';

const RTL_LANGUAGES = new Set(['ar', 'fa']);
const FONT_WEIGHTS = Object.freeze({ regular: 400, medium: 500, semibold: 600, bold: 700 });
const OPENTYPE_LANGUAGES = Object.freeze({ ar: 'ARA', fa: 'FAR' });

function normalizeLanguage(value) {
  return String(value || 'en').trim().toLowerCase().replace(/_/g, '-').split('-')[0];
}

export class DrawingSurface {
  constructor(pdfDocument, options = {}) {
    this.pdf = pdfDocument;
    this.currentPage = null;
    this.pages = [];
    this.fonts = new Map();
    this.images = new Map();
    this.fontkit = options.fontkit || null;
    this.pdfLib = options.pdfLib || null;
    this.language = normalizeLanguage(options.language);
    this.nativeRtlLayout = RTL_LANGUAGES.has(this.language);
    this.defaultTextColor = typeof options.rgb === 'function'
      ? options.rgb(0, 0, 0)
      : undefined;
    this.layoutFonts = new Map();
    this.fontNames = new WeakMap();
    this.layoutCache = new Map();
  }

  static async create({ PDFDocument, fontkit, pdfLib, language = 'en', rgb } = {}) {
    const pdf = await PDFDocument.create();
    if (fontkit) pdf.registerFontkit(fontkit);
    const surface = new DrawingSurface(pdf, { fontkit, pdfLib, language, rgb });
    if (surface.nativeRtlLayout && pdfLib?.StandardFonts?.Helvetica) {
      surface.actualTextFont = await pdf.embedFont(pdfLib.StandardFonts.Helvetica);
    }
    return surface;
  }

  async registerFont(name, bytes) {
    if (this.fonts.has(name)) return this.fonts.get(name);

    if (this.nativeRtlLayout && typeof this.fontkit?.create !== 'function') {
      throw new Error('Fontkit OpenType layout is required for Arabic/Persian PDF rendering.');
    }

    const registeredFont = this.nativeRtlLayout
      ? Object.freeze({ name })
      : await this.pdf.embedFont(bytes);
    this.fonts.set(name, registeredFont);
    this.fontNames.set(registeredFont, name);

    if (this.nativeRtlLayout && typeof this.fontkit?.create === 'function') {
      const sourceBytes = bytes instanceof Uint8Array
        ? bytes.slice()
        : new Uint8Array(bytes.slice(0));
      const baseFont = this.fontkit.create(sourceBytes);
      const weight = FONT_WEIGHTS[name] || FONT_WEIGHTS.regular;
      const layoutFont = baseFont.variationAxes?.wght && typeof baseFont.getVariation === 'function'
        ? baseFont.getVariation({ wght: weight })
        : baseFont;
      this.layoutFonts.set(name, layoutFont);
    }

    return registeredFont;
  }

  getFont(name) {
    return this.fonts.get(name);
  }

  addPage(size = [842, 595]) {
    const page = this.pdf.addPage(size);
    this.pages.push(page);
    this.currentPage = page;
    return page;
  }

  getCurrentPage() {
    return this.currentPage;
  }

  setCurrentPage(page) {
    this.currentPage = page;
  }

  drawText(text, { x, y, size = 12, font, color, rotate } = {}) {
    this.#assertPage();
    const value = String(text ?? '');
    const fontName = this.fontNames.get(font) || 'regular';
    const layoutFont = this.layoutFonts.get(fontName);

    if (!this.nativeRtlLayout || !layoutFont || !value) {
      this.currentPage.drawText(value, { x, y, size, font, color, rotate });
      return;
    }

    const layout = this.#layoutText(value, fontName, size);
    let runX = Number(x || 0);

    // /ActualText retains the original logical Unicode line for extraction;
    // the visible content remains the correctly shaped vector outline layer.
    const markedContent = this.#beginActualText(value, Number(x || 0), Number(y || 0));
    try {
      for (const run of layout.runs) {
        const path = this.#runPath(run.glyphRun);
        if (path) {
          this.currentPage.drawSvgPath(path, {
            x: runX,
            y: Number(y || 0),
            scale: Number(size || 12) / run.font.unitsPerEm,
            rotate,
            color: color || this.defaultTextColor,
            borderWidth: 0
          });
        }
        runX += run.width;
      }
    } finally {
      if (markedContent) this.currentPage.pushOperators(this.pdfLib.endMarkedContent());
    }
  }

  drawRect({ x, y, width, height, radius = 0, borderWidth = 1, color, borderColor, opacity } = {}) {
    this.#assertPage();
    // radius reserved for future backend support
    this.currentPage.drawRectangle({
      x, y, width, height, borderWidth, color, borderColor, opacity
    });
  }

  drawCircle({ x, y, radius, size, color, borderColor, borderWidth = 1 } = {}) {
    this.#assertPage();
    if (typeof this.currentPage.drawCircle === 'function') {
      this.currentPage.drawCircle({
        x, y, size: size ?? radius, color, borderColor, borderWidth
      });
    } else {
      throw new Error('PDF backend does not support drawCircle().');
    }
  }

  drawLine({ start, end, thickness = 1, color } = {}) {
    this.#assertPage();
    this.currentPage.drawLine({ start, end, thickness, color });
  }

  drawSvgPath(path, { x = 0, y = 0, scale = 1, color, borderColor, borderWidth = 1, opacity = 1 } = {}) {
    this.#assertPage();
    if (typeof this.currentPage.drawSvgPath !== 'function') {
      throw new Error('PDF backend does not support drawSvgPath().');
    }
    this.currentPage.drawSvgPath(String(path || ''), {
      x, y, scale, color, borderColor, borderWidth, opacity
    });
  }

  async drawImage(key, bytes, options = {}) {
    this.#assertPage();
    let image = this.images.get(key);
    if (!image) {
      try { image = await this.pdf.embedPng(bytes); }
      catch { image = await this.pdf.embedJpg(bytes); }
      this.images.set(key, image);
    }
    this.currentPage.drawImage(image, options);
  }

  measureText(text, fontName, size = 12) {
    if (this.nativeRtlLayout && this.layoutFonts.has(fontName)) {
      return this.#layoutText(String(text ?? ''), fontName, size).width;
    }

    const font = this.fonts.get(fontName);
    if (!font) return String(text ?? '').length * size * 0.55;
    return font.widthOfTextAtSize(String(text ?? ''), size);
  }

  async save() {
    return this.pdf.save();
  }

  #layoutText(text, fontName, size) {
    const cacheKey = `${fontName}\u0000${size}\u0000${text}`;
    const cached = this.layoutCache.get(cacheKey);
    if (cached) return cached;

    const font = this.layoutFonts.get(fontName);
    if (!font) return { runs: [], width: 0 };

    const language = OPENTYPE_LANGUAGES[this.language] || null;
    const runs = resolveVisualRuns(text, 'rtl').map(run => {
      const script = run.direction === 'rtl' ? 'arab' : undefined;
      const glyphRun = font.layout(run.text, undefined, script, language, run.direction);
      return Object.freeze({
        ...run,
        font,
        glyphRun,
        width: glyphRun.advanceWidth * Number(size || 12) / font.unitsPerEm
      });
    });

    const result = Object.freeze({
      runs: Object.freeze(runs),
      width: runs.reduce((sum, run) => sum + run.width, 0)
    });

    if (this.layoutCache.size > 4096) this.layoutCache.clear();
    this.layoutCache.set(cacheKey, result);
    return result;
  }

  #runPath(glyphRun) {
    const paths = [];
    let cursorX = 0;

    for (let index = 0; index < glyphRun.glyphs.length; index += 1) {
      const glyph = glyphRun.glyphs[index];
      const position = glyphRun.positions[index];

      if (glyph?.path?.commands?.length) {
        // Fontkit paths use a Y-up font coordinate system. pdf-lib's SVG path
        // helper flips Y, so pre-flip once to preserve the font baseline.
        paths.push(
          glyph.path
            .translate(cursorX + Number(position?.xOffset || 0), Number(position?.yOffset || 0))
            .scale(1, -1)
            .toSVG()
        );
      }

      cursorX += Number(position?.xAdvance || 0);
    }

    return paths.join('');
  }

  #beginActualText(value, x, y) {
    const PDFOperator = this.pdfLib?.PDFOperator;
    const PDFOperatorNames = this.pdfLib?.PDFOperatorNames;
    const PDFName = this.pdfLib?.PDFName;
    const PDFHexString = this.pdfLib?.PDFHexString;

    if (!PDFOperator || !PDFOperatorNames || !PDFName || !PDFHexString) return false;

    const properties = this.pdf.context.obj({
      ActualText: PDFHexString.fromText(String(value ?? ''))
    });
    this.currentPage.pushOperators(
      PDFOperator.of(
        PDFOperatorNames.BeginMarkedContentSequence,
        [PDFName.of('Span'), properties]
      )
    );

    // Poppler and several PDF viewers expose /ActualText only when the marked
    // sequence contains a text-showing operator. The invisible ASCII anchor is
    // replaced by the logical Persian/Arabic line during extraction.
    if (this.actualTextFont) {
      this.currentPage.drawText('.', {
        x,
        y,
        size: 0.01,
        font: this.actualTextFont,
        opacity: 0
      });
    }
    return true;
  }

  #assertPage() {
    if (!this.currentPage) {
      throw new Error('DrawingSurface: no active page.');
    }
  }
}
