import { parseCssColor, type RgbaColor } from "@/gl/css-color";
import { ADVANCE_EM, ASCENT_EM, CONTENT_HEIGHT_EM } from "@/gl/font-metrics";
import { measureInputLine } from "@/gl/input-metrics";

/** How the box layer's shader fills a quad. Values match `box-layer.ts`. */
export const BoxPattern = {
  solid: 0,
  hatch: 1,
  caret: 2,
  /** Chrome's dotted border: dots one border-width wide, one gap apart. */
  dottedX: 3,
  dottedY: 4,
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
  /** Dot size in px for the dotted patterns; unused otherwise. */
  patternSize?: number;
}

const SKIP_SELECTOR = "[data-gl-ascii], .sr-only";
const HATCH_ATTRIBUTE = "data-gl-hatch";
const OWN_FOCUS_SELECTOR = "[data-gl-own-focus]";
const CLIP_SELECTOR = "[data-gl-clip]";
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

function borderBoxes(rect: DocRect, style: CSSStyleDeclaration): BoxRun[] {
  return SIDES.flatMap((side): BoxRun[] => {
    const width = parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`));
    const lineStyle = style.getPropertyValue(`border-${side.toLowerCase()}-style`);
    const color = parseCssColor(style.getPropertyValue(`border-${side.toLowerCase()}-color`));
    if (!width || lineStyle === "none" || !isVisible(color)) return [];

    const segment = borderSegment(rect, side, width);
    if (lineStyle !== "dotted") return [{ ...segment, color, pattern: BoxPattern.solid }];
    // one rect per border, dots resolved in the shader: a long leader is one instance, not hundreds
    const horizontal = side === "Top" || side === "Bottom";
    const pattern = horizontal ? BoxPattern.dottedX : BoxPattern.dottedY;
    return [{ ...segment, color, pattern, patternSize: width }];
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

/** Intersects a box with the scroll region it lives in; null when nothing is left. */
function clipBox(box: BoxRun, clip: DocRect): BoxRun | null {
  const left = Math.max(box.x, clip.x);
  const top = Math.max(box.y, clip.y);
  const right = Math.min(box.x + box.width, clip.x + clip.width);
  const bottom = Math.min(box.y + box.height, clip.y + clip.height);
  if (right <= left || bottom <= top) return null;
  return { ...box, x: left, y: top, width: right - left, height: bottom - top };
}

function clipToScrollRegion(element: Element, boxes: BoxRun[]): BoxRun[] {
  // parent first: a scroll region paints its own border and background unclipped
  const region = element.parentElement?.closest(CLIP_SELECTOR);
  if (!region) return boxes;
  const clip = toDocRect(region.getBoundingClientRect());
  return boxes.flatMap((box) => clipBox(box, clip) ?? []);
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
  return clipToScrollRegion(element, boxes);
}

/**
 * The focus ring CSS would draw, so keyboard focus survives the hidden DOM.
 * Widgets marked `data-gl-own-focus` show focus themselves (the menu's fill,
 * the prompt's block cursor) and get no ring.
 */
function focusRingBoxes(root: HTMLElement): BoxRun[] {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLElement) || !root.contains(focused)) return [];
  if (focused.matches(OWN_FOCUS_SELECTOR)) return [];
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
