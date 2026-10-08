import { CONTENT_HEIGHT_EM } from "@/gl/font-metrics";

export interface InputLine {
  /** Viewport px of the first glyph's left edge, after horizontal scroll. */
  left: number;
  /** Viewport px of the font content area's top. */
  top: number;
  fontSize: number;
  letterSpacing: number;
}

/** Where a single-line input draws its text: browsers center the line box. */
export function measureInputLine(input: HTMLInputElement): InputLine {
  const style = getComputedStyle(input);
  const rect = input.getBoundingClientRect();
  const fontSize = parseFloat(style.fontSize);
  const borderTop = parseFloat(style.borderTopWidth);
  const paddingTop = parseFloat(style.paddingTop);
  const contentHeight =
    rect.height -
    borderTop -
    parseFloat(style.borderBottomWidth) -
    paddingTop -
    parseFloat(style.paddingBottom);

  return {
    left: rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft) - input.scrollLeft,
    top: rect.top + borderTop + paddingTop + (contentHeight - fontSize * CONTENT_HEIGHT_EM) / 2,
    fontSize,
    letterSpacing: parseFloat(style.letterSpacing) || 0,
  };
}
