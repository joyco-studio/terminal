/**
 * Vertical metrics of Roboto Mono (hhea table, 2048 units per em), the face
 * both the DOM and the baked atlases use. They turn a DOM text box into the
 * baseline lettra anchors to.
 */
const UNITS_PER_EM = 2048;
const HHEA_ASCENT = 2146;
const HHEA_DESCENT = 555;

const ADVANCE = 1229;

/** Horizontal advance of every glyph (monospace), in em. */
export const ADVANCE_EM = ADVANCE / UNITS_PER_EM;

/** Line top to baseline, in em. */
export const ASCENT_EM = HHEA_ASCENT / UNITS_PER_EM;

/** Height of the font's content area, in em. */
export const CONTENT_HEIGHT_EM = (HHEA_ASCENT + HHEA_DESCENT) / UNITS_PER_EM;

/** Weights baked by `lettra bake` into public/fonts (see fonts-src/README.md). */
export const BAKED_WEIGHTS = [400, 500, 600, 700] as const;

export const FONT_SOURCES = BAKED_WEIGHTS.map((weight) => ({
  json: `/fonts/roboto-mono-${weight}.json`,
  atlas: `/fonts/roboto-mono-${weight}.png`,
  weight,
}));
