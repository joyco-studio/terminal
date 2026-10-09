/** Axis-aligned rect in cell units: x right, y down, one cell = 1×1. */
export interface CellRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Segment = readonly [x0: number, y0: number, x1: number, y1: number];

/** Double-line box drawing: the two rails sit around the cell's centre. */
const OUTER = 0.3;
const INNER = 0.7;
const STROKE = 0.1;

/** Centrelines per glyph, in unit-cell coordinates. */
const BOX_SEGMENTS: Readonly<Record<string, readonly Segment[]>> = {
  "═": [
    [0, OUTER, 1, OUTER],
    [0, INNER, 1, INNER],
  ],
  "║": [
    [OUTER, 0, OUTER, 1],
    [INNER, 0, INNER, 1],
  ],
  "╔": [
    [OUTER, OUTER, 1, OUTER],
    [OUTER, OUTER, OUTER, 1],
    [INNER, INNER, 1, INNER],
    [INNER, INNER, INNER, 1],
  ],
  "╗": [
    [0, OUTER, INNER, OUTER],
    [INNER, OUTER, INNER, 1],
    [0, INNER, OUTER, INNER],
    [OUTER, INNER, OUTER, 1],
  ],
  "╚": [
    [OUTER, 0, OUTER, INNER],
    [OUTER, INNER, 1, INNER],
    [INNER, 0, INNER, OUTER],
    [INNER, OUTER, 1, OUTER],
  ],
  "╝": [
    [INNER, 0, INNER, INNER],
    [0, INNER, INNER, INNER],
    [OUTER, 0, OUTER, OUTER],
    [0, OUTER, OUTER, OUTER],
  ],
};

const FULL_BLOCK = "█";

function segmentToRect([x0, y0, x1, y1]: Segment, column: number, row: number): CellRect {
  const half = STROKE / 2;
  const left = Math.min(x0, x1) - half;
  const top = Math.min(y0, y1) - half;
  return {
    x: column + left,
    y: row + top,
    width: Math.abs(x1 - x0) + STROKE,
    height: Math.abs(y1 - y0) + STROKE,
  };
}

function glyphRects(char: string, column: number, row: number): CellRect[] {
  if (char === FULL_BLOCK) return [{ x: column, y: row, width: 1, height: 1 }];
  const segments = BOX_SEGMENTS[char] ?? [];
  return segments.map((segment) => segmentToRect(segment, column, row));
}

export interface AsciiCells {
  rects: CellRect[];
  columns: number;
  rows: number;
}

/** Converts block/box-drawing ASCII art into filled rects, one cell per char. */
export function asciiToCells(art: string): AsciiCells {
  const lines = art.split("\n");
  const rects = lines.flatMap((line, row) =>
    Array.from(line).flatMap((char, column) => glyphRects(char, column, row)),
  );
  return {
    rects,
    columns: Math.max(...lines.map((line) => Array.from(line).length)),
    rows: lines.length,
  };
}
