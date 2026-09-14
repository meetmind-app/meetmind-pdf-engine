/**
 * LOREVI Executive PDF Engine
 * RenderContext — RTL-safe PDF text hotfix
 *
 * pdf-lib does not apply Arabic shaping or the Unicode bidi algorithm when
 * drawing strings. For ar/fa we therefore convert Arabic letters to their
 * contextual presentation forms and reorder visual tokens before drawText().
 */

const ARABIC_FORMS = Object.freeze({
  '\u0621':['\uFE80','\uFE80',null,null], '\u0622':['\uFE81','\uFE82',null,null],
  '\u0623':['\uFE83','\uFE84',null,null], '\u0624':['\uFE85','\uFE86',null,null],
  '\u0625':['\uFE87','\uFE88',null,null], '\u0626':['\uFE89','\uFE8A','\uFE8B','\uFE8C'],
  '\u0627':['\uFE8D','\uFE8E',null,null], '\u0628':['\uFE8F','\uFE90','\uFE91','\uFE92'],
  '\u0629':['\uFE93','\uFE94',null,null], '\u062A':['\uFE95','\uFE96','\uFE97','\uFE98'],
  '\u062B':['\uFE99','\uFE9A','\uFE9B','\uFE9C'], '\u062C':['\uFE9D','\uFE9E','\uFE9F','\uFEA0'],
  '\u062D':['\uFEA1','\uFEA2','\uFEA3','\uFEA4'], '\u062E':['\uFEA5','\uFEA6','\uFEA7','\uFEA8'],
  '\u062F':['\uFEA9','\uFEAA',null,null], '\u0630':['\uFEAB','\uFEAC',null,null],
  '\u0631':['\uFEAD','\uFEAE',null,null], '\u0632':['\uFEAF','\uFEB0',null,null],
  '\u0633':['\uFEB1','\uFEB2','\uFEB3','\uFEB4'], '\u0634':['\uFEB5','\uFEB6','\uFEB7','\uFEB8'],
  '\u0635':['\uFEB9','\uFEBA','\uFEBB','\uFEBC'], '\u0636':['\uFEBD','\uFEBE','\uFEBF','\uFEC0'],
  '\u0637':['\uFEC1','\uFEC2','\uFEC3','\uFEC4'], '\u0638':['\uFEC5','\uFEC6','\uFEC7','\uFEC8'],
  '\u0639':['\uFEC9','\uFECA','\uFECB','\uFECC'], '\u063A':['\uFECD','\uFECE','\uFECF','\uFED0'],
  '\u0641':['\uFED1','\uFED2','\uFED3','\uFED4'], '\u0642':['\uFED5','\uFED6','\uFED7','\uFED8'],
  '\u0643':['\uFED9','\uFEDA','\uFEDB','\uFEDC'], '\u0644':['\uFEDD','\uFEDE','\uFEDF','\uFEE0'],
  '\u0645':['\uFEE1','\uFEE2','\uFEE3','\uFEE4'], '\u0646':['\uFEE5','\uFEE6','\uFEE7','\uFEE8'],
  '\u0647':['\uFEE9','\uFEEA','\uFEEB','\uFEEC'], '\u0648':['\uFEED','\uFEEE',null,null],
  '\u0649':['\uFEEF','\uFEF0',null,null], '\u064A':['\uFEF1','\uFEF2','\uFEF3','\uFEF4'],
  '\u067E':['\uFB56','\uFB57','\uFB58','\uFB59'], '\u0686':['\uFB7A','\uFB7B','\uFB7C','\uFB7D'],
  '\u0698':['\uFB8A','\uFB8B',null,null], '\u06A9':['\uFB8E','\uFB8F','\uFB90','\uFB91'],
  '\u06AF':['\uFB92','\uFB93','\uFB94','\uFB95'], '\u06CC':['\uFBFC','\uFBFD','\uFBFE','\uFBFF']
});

const RTL_MARK_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const ARABIC_CHAR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const COMBINING_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/;
const BREAK_JOIN_RE = /[\u200C\u200D]/;
const LTR_TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9._:/+%#@-]*$/;

function previousBase(chars, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (COMBINING_RE.test(chars[i])) continue;
    if (BREAK_JOIN_RE.test(chars[i]) || /\s/.test(chars[i])) return null;
    return chars[i];
  }
  return null;
}

function nextBase(chars, index) {
  for (let i = index + 1; i < chars.length; i += 1) {
    if (COMBINING_RE.test(chars[i])) continue;
    if (BREAK_JOIN_RE.test(chars[i]) || /\s/.test(chars[i])) return null;
    return chars[i];
  }
  return null;
}

function canJoinFromLeft(char) {
  const forms = ARABIC_FORMS[char];
  return Boolean(forms && forms[1]);
}

function canJoinToRight(char) {
  const forms = ARABIC_FORMS[char];
  return Boolean(forms && forms[2]);
}

function shapeArabic(text) {
  const chars = Array.from(String(text ?? ''));
  return chars.map((char, index) => {
    const forms = ARABIC_FORMS[char];
    if (!forms) return char === '\u200C' || char === '\u200D' ? '' : char;
    const prev = previousBase(chars, index);
    const next = nextBase(chars, index);
    const joinsPrev = Boolean(prev && canJoinToRight(prev) && canJoinFromLeft(char));
    const joinsNext = Boolean(next && canJoinToRight(char) && canJoinFromLeft(next));
    if (joinsPrev && joinsNext && forms[3]) return forms[3];
    if (joinsPrev && forms[1]) return forms[1];
    if (joinsNext && forms[2]) return forms[2];
    return forms[0] || char;
  }).join('');
}

function reverseArabicRun(value) {
  const units = [];
  for (const char of Array.from(value)) {
    if (COMBINING_RE.test(char) && units.length) units[units.length - 1] += char;
    else units.push(char);
  }
  return units.reverse().join('');
}

function tokenizeBidi(value) {
  return String(value ?? '').match(/[A-Za-z0-9][A-Za-z0-9._:/+%#@-]*|[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+|\s+|[^\sA-Za-z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g) || [];
}

function visualRtlText(value) {
  const logical = String(value ?? '');
  if (!RTL_MARK_RE.test(logical)) return logical;
  const shaped = shapeArabic(logical);
  const tokens = tokenizeBidi(shaped);
  return tokens.reverse().map(token => {
    if (LTR_TOKEN_RE.test(token)) return token;
    if (ARABIC_CHAR_RE.test(token)) return reverseArabicRun(token);
    return token;
  }).join('');
}

export class RenderContext {
  constructor(drawingSurface, tokens = null, options = {}) {
    this.surface = drawingSurface;
    this.tokens = tokens || {};
    this.report = options.report || null;
    this.rgb = options.rgb || null;
    this.defaultPageSize = options.pageSize || [
      this.tokens?.page?.width || 768,
      this.tokens?.page?.height || 512
    ];
  }

  getPageContext(pageSpec = {}) {
    const root = this;
    const size = pageSpec.size || { width: root.defaultPageSize[0], height: root.defaultPageSize[1] };
    const width = Number(size.width || root.defaultPageSize[0]);
    const height = Number(size.height || root.defaultPageSize[1]);
    const density = pageSpec.resolvedDensity || pageSpec.density || 'regular';
    const rawLanguage = String(
      root.report?._pdfLanguage || root.report?.report_language || root.report?.language || ''
    ).trim().toLowerCase().replace(/_/g, '-');
    const isRtl = ['ar', 'fa'].includes(rawLanguage.split('-')[0]);
    let page = null;

    const mirrorX = (x, objectWidth = 0) =>
      isRtl ? width - Number(x || 0) - Number(objectWidth || 0) : Number(x || 0);

    function color(value) {
      if (!value) return undefined;
      if (typeof value !== 'string') return value;
      let hex = value;
      if (root.tokens?.colors?.[value]) hex = root.tokens.colors[value];
      if (!/^#[0-9a-f]{6}$/i.test(hex) || typeof root.rgb !== 'function') return value;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return root.rgb(r, g, b);
    }

    function font(value) {
      if (!value) return root.surface.getFont('regular');
      if (typeof value !== 'string') return value;
      return root.surface.getFont(value) || root.surface.getFont('regular');
    }

    return {
      tokens: root.tokens,
      report: root.report,
      density,
      pageWidth: width,
      pageHeight: height,

      beginPage() {
        page = root.surface.addPage([width, height]);
        return page;
      },
      endPage() {},
      get page() { return page; },

      text(value, options = {}) {
        const sizePt = Number(options.size || 8);
        const topY = Number(options.y || 0);
        const logicalValue = String(value ?? '');
        const renderedValue = isRtl ? visualRtlText(logicalValue) : logicalValue;
        const renderedFont = font(options.font);
        const textWidth = isRtl ? renderedFont.widthOfTextAtSize(renderedValue, sizePt) : 0;
        return root.surface.drawText(renderedValue, {
          x: mirrorX(options.x, textWidth),
          y: height - topY - sizePt,
          size: sizePt,
          font: renderedFont,
          color: color(options.color),
          rotate: options.rotate
        });
      },

      rect(options = {}) {
        const h = Number(options.height || 0);
        const topY = Number(options.y || 0);
        return root.surface.drawRect({
          x: mirrorX(options.x, Number(options.width || 0)),
          y: height - topY - h,
          width: Number(options.width || 0),
          height: h,
          radius: Number(options.radius || 0),
          borderWidth: Number(options.borderWidth ?? options.strokeWidth ?? 0.5),
          color: color(options.fill || options.color),
          borderColor: color(options.stroke || options.borderColor),
          opacity: options.opacity
        });
      },

      line(options = {}) {
        const start = options.start || { x: options.x1, y: options.y1 };
        const end = options.end || { x: options.x2, y: options.y2 };
        return root.surface.drawLine({
          start: { x: mirrorX(start.x), y: height - Number(start.y || 0) },
          end: { x: mirrorX(end.x), y: height - Number(end.y || 0) },
          thickness: Number(options.thickness || options.width || 1),
          color: color(options.color || options.stroke)
        });
      },

      circle(options = {}) {
        return root.surface.drawCircle({
          x: mirrorX(options.x),
          y: height - Number(options.y || 0),
          radius: Number(options.radius || options.size || 1),
          size: Number(options.size || options.radius || 1),
          color: color(options.fill || options.color),
          borderColor: color(options.stroke || options.borderColor),
          borderWidth: Number(options.borderWidth || 0)
        });
      },

      svgPath(path, options = {}) {
        const size = Number(options.size || 24);
        const scale = size / 24;
        const topY = Number(options.y || 0);
        return root.surface.drawSvgPath(path, {
          x: mirrorX(options.x, size),
          y: height - topY - size,
          scale,
          color: options.fill ? color(options.fill) : undefined,
          borderColor: color(options.stroke || options.color),
          borderWidth: Number(options.borderWidth ?? 0.8),
          opacity: options.opacity ?? 1
        });
      },

      image(key, bytes, options = {}) {
        const h = Number(options.height || 0);
        return root.surface.drawImage(key, bytes, {
          ...options,
          x: mirrorX(options.x, Number(options.width || 0)),
          y: height - Number(options.y || 0) - h
        });
      },

      measureText(text, fontName, sizePt) {
        const value = isRtl ? visualRtlText(text) : text;
        return root.surface.measureText(value, fontName, sizePt);
      },
      getFont(name) { return root.surface.getFont(name); }
    };
  }

  finalize() {}
  save() { return this.surface.save(); }
}

export { shapeArabic, visualRtlText };