import { parseCssColor, type RgbaColor } from "@/gl/css-color";
import { ADVANCE_EM, ASCENT_EM, CONTENT_HEIGHT_EM } from "@/gl/font-metrics";
import { measureInputLine } from "@/gl/input-metrics";

/** How the box layer's shader fills a quad. Values match `box-layer.ts`. */
export const BoxPattern = {
  solid: 0,
  hatch: 1,
  caret: 2,
} as const;

export type BoxPattern = (typeof BoxPattern)[keyof typeof BoxPattern];

/** A filled rect in document px. */
export interface BoxRun {
  x: number;
  y: number;
  width: number;
  height: number;
  color: RgbaColor;
  pattern: BoxPattern;
}

const SKIP_SELECTOR = "[data-gl-ascii], .sr-only";
const HATCH_ATTRIBUTE = "data-gl-hatch";
const UNDERLINE_THICKNESS = 1;
const SIDES = ["Top", "Right", "Bottom", "Left"] as const;
type Side = (typeof SIDES)[number];

interface DocRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function toDocRect(rect: DOMRectReadOnly): DocRect {
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  };
}

function isVisible(color: RgbaColor): boolean {
  return color.a > 0;
}

function borderSegment(rect: DocRect, side: Side, width: number): DocRect {
  const segments: Record<Side, DocRect> = {
    Top: { x: rect.x, y: rect.y, width: rect.width, height: width },
    Bottom: { x: rect.x, y: rect.y + rect.height - width, width: rect.width, height: width },
    Left: { x: rect.x, y: rect.y, width, height: rect.height },
    Right: { x: rect.x + rect.width - width, y: rect.y, width, height: rect.height },
  };
  return segments[side];
}

/** Chrome draws a dotted border as dots one border-width wide, one gap apart. */
function dots(segment: DocRect, dot: number): DocRect[] {
  const horizontal = segment.width >= segment.height;
  const length = horizontal ? segment.width : segment.height;
  const count = Math.floor(length / (dot * 2));
  return Array.from({ length: count }, (_, index) => {
    const offset = index * dot * 2;
    return horizontal
      ? { x: segment.x + offset, y: segment.y, width: dot, height: dot }
      : { x: segment.x, y: segment.y + offset, width: dot, height: dot };
  });
}

function borderBoxes(rect: DocRect, style: CSSStyleDeclaration): BoxRun[] {
  return SIDES.flatMap((side) => {
    const width = parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`));
    const lineStyle = style.getPropertyValue(`border-${side.toLowerCase()}-style`);
    const color = parseCssColor(style.getPropertyValue(`border-${side.toLowerCase()}-color`));
    if (!width || lineStyle === "none" || !isVisible(color)) return [];

    const segment = borderSegment(rect, side, width);
    const pieces = lineStyle === "dotted" ? dots(segment, width) : [segment];
    return pieces.map((piece) => ({ ...piece, color, pattern: BoxPattern.solid }));
  });
}

function underlineBoxes(element: Element, style: CSSStyleDeclaration): BoxRun[] {
  if (!style.textDecorationLine.includes("underline")) return [];
  const color = parseCssColor(style.textDecorationColor);
  const fontSize = parseFloat(style.fontSize);
  const offset = parseFloat(style.textUnderlineOffset) || 0;

  return Array.from(element.getClientRects(), (line) => {
    const rect = toDocRect(line);
    return {
      x: rect.x,
      y: rect.y + fontSize * ASCENT_EM + offset,
      width: rect.width,
      height: UNDERLINE_THICKNESS,
      color,
      pattern: BoxPattern.solid,
    };
  });
}

function elementBoxes(element: Element): BoxRun[] {
  const rect = toDocRect(element.getBoundingClientRect());
  if (rect.width === 0 || rect.height === 0) return [];

  const style = getComputedStyle(element);
  const boxes: BoxRun[] = [];
  const background = parseCssColor(style.backgroundColor);
  if (isVisible(background)) boxes.push({ ...rect, color: background, pattern: BoxPattern.solid });

  if (element.hasAttribute(HATCH_ATTRIBUTE)) {
    const ink = parseCssColor(style.getPropertyValue("--diagonal-bg-ink").trim() || "transparent");
    boxes.push({ ...rect, color: ink, pattern: BoxPattern.hatch });
  }

  boxes.push(...borderBoxes(rect, style), ...underlineBoxes(element, style));
  return boxes;
}

/** The focus ring CSS would draw, so keyboard focus survives the hidden DOM. */
function focusRingBoxes(root: HTMLElement): BoxRun[] {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLElement) || !root.contains(focused)) return [];
  if (!focused.matches(":focus-visible")) return [];

  const style = getComputedStyle(focused);
  const width = parseFloat(style.outlineWidth);
  const color = parseCssColor(style.outlineColor);
  if (!width || style.outlineStyle === "none" || !isVisible(color)) return [];

  const inset = toDocRect(focused.getBoundingClientRect());
  const offset = parseFloat(style.outlineOffset) || 0;
  const ring = {
    x: inset.x - offset - width,
    y: inset.y - offset - width,
    width: inset.width + (offset + width) * 2,
    height: inset.height + (offset + width) * 2,
  };
  return SIDES.map((side) => ({ ...borderSegment(ring, side, width), color, pattern: BoxPattern.solid }));
}

/** Block cursor at the input's caret: one glyph cell, blinking in the shader. */
function caretBox(root: HTMLElement): BoxRun[] {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLInputElement) || !root.contains(focused)) return [];

  const line = measureInputLine(focused);
  const advance = line.fontSize * ADVANCE_EM + line.letterSpacing;
  const position = focused.selectionStart ?? focused.value.length;
  return [
    {
      x: line.left + position * advance + window.scrollX,
      y: line.top + window.scrollY,
      width: line.fontSize * ADVANCE_EM,
      height: line.fontSize * CONTENT_HEIGHT_EM,
      color: parseCssColor(getComputedStyle(focused).caretColor),
      pattern: BoxPattern.caret,
    },
  ];
}

/** Everything under `root` that paints without being text, in paint order. */
export function collectBoxRuns(root: HTMLElement): BoxRun[] {
  const elements = [root, ...root.querySelectorAll("*")].filter(
    (element) => !element.closest(SKIP_SELECTOR),
  );
  return [...elements.flatMap(elementBoxes), ...caretBox(root), ...focusRingBoxes(root)];
}
