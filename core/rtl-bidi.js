import bidiFactory from 'https://cdn.jsdelivr.net/npm/bidi-js@1.1.0/+esm';

const bidi = bidiFactory();

/**
 * Resolve one logical line into visual-order directional runs.
 *
 * bidi-js owns Unicode Bidirectional Algorithm (UAX #9) resolution. We only
 * reorder whole level runs here: the OpenType engine must receive every run in
 * logical order so it can apply GSUB/GPOS shaping correctly.
 */
export function resolveVisualRuns(value, paragraphDirection = 'rtl') {
  const source = String(value ?? '');
  if (!source) return [];

  const embedding = bidi.getEmbeddingLevels(source, paragraphDirection);
  const levels = embedding.levels;
  const mirroredCharacters = bidi.getMirroredCharactersMap(source, levels);
  const logicalRuns = [];

  let runStart = 0;
  let runLevel = levels[0] ?? (paragraphDirection === 'rtl' ? 1 : 0);

  for (let index = 0; index < source.length;) {
    const codePoint = source.codePointAt(index);
    const width = codePoint > 0xFFFF ? 2 : 1;
    const level = levels[index] ?? runLevel;

    if (index > runStart && level !== runLevel) {
      logicalRuns.push(makeRun(source, runStart, index, runLevel, mirroredCharacters));
      runStart = index;
      runLevel = level;
    }

    index += width;
  }

  logicalRuns.push(makeRun(source, runStart, source.length, runLevel, mirroredCharacters));

  // UAX #9 L2: reverse contiguous run sequences from the highest embedding
  // level down to the lowest odd level. Character order inside a run remains
  // logical and is handled later by Fontkit's OpenType layout engine.
  const visualRuns = logicalRuns.slice();
  const maxLevel = Math.max(...visualRuns.map(run => run.level));
  const oddLevels = visualRuns.map(run => run.level).filter(level => level % 2 === 1);
  const lowestOddLevel = oddLevels.length ? Math.min(...oddLevels) : maxLevel + 1;

  for (let level = maxLevel; level >= lowestOddLevel; level -= 1) {
    let start = 0;
    while (start < visualRuns.length) {
      while (start < visualRuns.length && visualRuns[start].level < level) start += 1;
      if (start >= visualRuns.length) break;

      let end = start + 1;
      while (end < visualRuns.length && visualRuns[end].level >= level) end += 1;
      reverseRange(visualRuns, start, end - 1);
      start = end;
    }
  }

  return visualRuns;
}

function makeRun(source, start, end, level, mirroredCharacters) {
  let text = '';

  for (let index = start; index < end;) {
    const codePoint = source.codePointAt(index);
    const width = codePoint > 0xFFFF ? 2 : 1;
    text += mirroredCharacters.get(index) ?? source.slice(index, index + width);
    index += width;
  }

  return Object.freeze({
    text,
    level,
    direction: level % 2 === 1 ? 'rtl' : 'ltr'
  });
}

function reverseRange(items, start, end) {
  while (start < end) {
    const value = items[start];
    items[start] = items[end];
    items[end] = value;
    start += 1;
    end -= 1;
  }
}
