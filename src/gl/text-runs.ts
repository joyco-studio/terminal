import { ASCENT_EM } from "@/gl/font-metrics";
import { measureInputLine } from "@/gl/input-metrics";

/** One visual line of DOM text, measured in document px. */
export interface TextRun {
  /** Stable while the source node lives and the line keeps its index. */
  key: string;
  text: string;
  x: number;
  baseline: number;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  color: string;
}

/** Subtrees another layer draws (the ASCII logo) or nobody sees. */
const SKIP_SELECTOR = "[data-gl-ascii], .sr-only";

const sourceIds = new WeakMap<object, number>();
let nextSourceId = 0;

function sourceId(source: object): number {
  const existing = sourceIds.get(source);
  if (existing !== undefined) return existing;
  const id = nextSourceId++;
  sourceIds.set(source, id);
  return id;
}

interface TypeStyle {
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  color: string;
  uppercase: boolean;
}

function readTypeStyle(style: CSSStyleDeclaration, color = style.color): TypeStyle {
  return {
    fontSize: parseFloat(style.fontSize),
    fontWeight: Number(style.fontWeight),
    letterSpacing: parseFloat(style.letterSpacing) || 0,
    color,
    uppercase: style.textTransform === "uppercase",
  };
}

function toRun(key: string, rawText: string, x: number, top: number, type: TypeStyle): TextRun {
  const collapsed = rawText.replace(/\s+/g, " ").trimEnd();
  return {
    key,
    text: type.uppercase ? collapsed.toUpperCase() : collapsed,
    x,
    baseline: top + type.fontSize * ASCENT_EM,
    fontSize: type.fontSize,
    fontWeight: type.fontWeight,
    letterSpacing: type.letterSpacing,
    color: type.color,
  };
}

interface LineSlice {
  start: number;
  end: number;
  left: number;
  top: number;
}

/** Splits a text node into its rendered lines by measuring each character. */
function measureLines(node: Text, range: Range): LineSlice[] {
  const lines: LineSlice[] = [];
  let current: LineSlice | null = null;

  for (let index = 0; index < node.data.length; index++) {
    range.setStart(node, index);
    range.setEnd(node, index + 1);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    const startsNewLine = !current || Math.abs(rect.top - current.top) > rect.height / 2;
    // lettra's layout drops leading spaces, so a line starts at its first glyph
    if (startsNewLine && /\s/.test(node.data[index])) continue;
    if (startsNewLine) {
      current = { start: index, end: index + 1, left: rect.left, top: rect.top };
      lines.push(current);
    } else if (current) {
      current.end = index + 1;
    }
  }
  return lines;
}

function textNodeRuns(node: Text, range: Range, scroll: DOMPointReadOnly): TextRun[] {
  const parent = node.parentElement;
  if (!parent) return [];
  const type = readTypeStyle(getComputedStyle(parent));
  const id = sourceId(node);

  return measureLines(node, range).map((line, index) =>
    toRun(
      `${id}:${index}`,
      node.data.slice(line.start, line.end),
      line.left + scroll.x,
      line.top + scroll.y,
      type,
    ),
  );
}

function inputRun(input: HTMLInputElement, scroll: DOMPointReadOnly): TextRun | null {
  const style = getComputedStyle(input);
  const showsPlaceholder = input.value.length === 0;
  const text = showsPlaceholder ? input.placeholder : input.value;
  if (!text) return null;

  const color = showsPlaceholder ? getComputedStyle(input, "::placeholder").color : style.color;
  const type = readTypeStyle(style, color);
  const line = measureInputLine(input);

  return toRun(`${sourceId(input)}:input`, text, line.left + scroll.x, line.top + scroll.y, type);
}

function isDrawable(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent || node.data.trim().length === 0) return false;
  return !parent.closest(SKIP_SELECTOR);
}

/** Every visible line of text under `root`, plus text inputs, in document px. */
export function collectTextRuns(root: HTMLElement): TextRun[] {
  const scroll = new DOMPointReadOnly(window.scrollX, window.scrollY);
  const range = document.createRange();
  const runs: TextRun[] = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof Text && isDrawable(node)) runs.push(...textNodeRuns(node, range, scroll));
  }

  for (const input of root.querySelectorAll<HTMLInputElement>('input[type="text"]')) {
    const run = inputRun(input, scroll);
    if (run) runs.push(run);
  }

  range.detach();
  return runs.filter((run) => run.text.trim().length > 0);
}
