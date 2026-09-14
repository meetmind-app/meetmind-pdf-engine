const bidiModule = await import('https://cdn.jsdelivr.net/npm/bidi-js@1.1.0/dist/bidi.min.mjs');
const bidi = bidiModule.default();

export function reorderRtl(logical, shaped) {
  const source = String(logical ?? '');
  const visual = Array.from(String(shaped ?? source));
  const embedding = bidi.getEmbeddingLevels(source, 'rtl');

  for (const [index, replacement] of bidi.getMirroredCharactersMap(source, embedding).entries()) {
    if (index >= 0 && index < visual.length) visual[index] = replacement;
  }

  for (const [start, end] of bidi.getReorderSegments(source, embedding)) {
    let left = start;
    let right = end;
    while (left < right) {
      const value = visual[left];
      visual[left] = visual[right];
      visual[right] = value;
      left += 1;
      right -= 1;
    }
  }

  return visual.join('');
}
