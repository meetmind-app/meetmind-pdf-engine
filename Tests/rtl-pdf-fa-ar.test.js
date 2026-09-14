'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const surfaceSource = fs.readFileSync(path.join(root, 'drawing', 'drawing-surface.js'), 'utf8');
const contextSource = fs.readFileSync(path.join(root, 'core', 'render-context.js'), 'utf8');
const bidiSource = fs.readFileSync(path.join(root, 'core', 'rtl-bidi.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'executive-slide-engine.js'), 'utf8');

assert.ok(surfaceSource.includes('font.layout('), 'RTL renderer must use the Fontkit OpenType layout engine.');
assert.ok(surfaceSource.includes('glyph.path'), 'RTL renderer must paint shaped glyph outlines.');
assert.ok(surfaceSource.includes('resolveVisualRuns'), 'RTL renderer must preserve mixed-direction visual runs.');
assert.ok(surfaceSource.includes('ActualText'), 'RTL renderer must retain logical Unicode extraction metadata.');
assert.ok(bidiSource.includes('getEmbeddingLevels'), 'RTL renderer must resolve UAX #9 embedding levels.');
assert.ok(bidiSource.includes('getMirroredCharactersMap'), 'RTL renderer must mirror paired punctuation.');
assert.ok(contextSource.includes("['ar', 'fa']"), 'Native RTL rendering must remain limited to Arabic/Persian locales.');
assert.ok(contextSource.includes('root.surface.measureText(logicalValue'), 'RTL alignment must measure the logical string with the native layout engine.');
assert.ok(!contextSource.includes('ARABIC_FORMS'), 'Manual Arabic presentation-form tables must not return.');
assert.ok(!contextSource.includes('shapeArabic'), 'Manual Arabic shaping must not return.');
assert.ok(engineSource.includes("const isRtl = ['ar', 'fa'].includes(normalizeLanguage(language))"), 'RTL footer link annotations must follow the mirrored brand position.');

const fontkit = require(path.join(root, 'drawing', 'fontkit.umd.min.js'));
const fontBytes = fs.readFileSync(path.join(root, 'fonts', 'NotoSansArabic-Variable.ttf'));
const font = fontkit.create(fontBytes).getVariation({ wght: 500 });
const sample = 'پنل مدیریت جذب و رزومه';
const glyphRun = font.layout(sample, undefined, 'arab', 'FAR', 'rtl');
const nominalGlyphIds = Array.from(sample).map(char => font.glyphForCodePoint(char.codePointAt(0)).id);
const shapedGlyphIds = glyphRun.glyphs.map(glyph => glyph.id);

assert.ok(glyphRun.positions.length === glyphRun.glyphs.length, 'Every shaped glyph must have an explicit position.');
assert.ok(glyphRun.advanceWidth > 0, 'Shaped Persian text must have a measurable advance width.');
assert.notDeepStrictEqual(shapedGlyphIds, nominalGlyphIds, 'OpenType GSUB must replace nominal Persian glyphs.');
assert.ok(
  glyphRun.glyphs.some(glyph => /\.(init|medi|fina)/.test(glyph.name || '')),
  'Persian glyphs must include contextual initial/medial/final forms.'
);

for (const char of Array.from('پچژکگی')) {
  assert.ok(font.hasGlyphForCodePoint(char.codePointAt(0)), `Persian glyph ${char} is missing from Noto Sans Arabic.`);
}

const arabicRun = font.layout('مراجعة خطة إطلاق المنتج', undefined, 'arab', 'ARA', 'rtl');
assert.ok(arabicRun.advanceWidth > 0, 'Arabic text must have a measurable shaped width.');
assert.ok(
  arabicRun.glyphs.some(glyph => /\.(init|medi|fina)/.test(glyph.name || '')),
  'Arabic glyphs must include contextual initial/medial/final forms.'
);

console.log('RTL PDF fa/ar OpenType shaping contract passed.');
