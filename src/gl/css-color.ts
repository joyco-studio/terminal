export interface RgbaColor {
  /** sRGB channels, 0..1. */
  r: number;
  g: number;
  b: number;
  a: number;
}

const CHANNEL_MAX = 255;
const cache = new Map<string, RgbaColor>();
let probe: CanvasRenderingContext2D | null = null;

function getProbe(): CanvasRenderingContext2D {
  if (probe) return probe;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("2D canvas unavailable for color parsing");
  probe = context;
  return context;
}

/**
 * Resolves any computed CSS color (rgb, oklch, lab…) to sRGB by painting one
 * pixel. Computed styles keep modern color spaces verbatim, which three's
 * Color parser does not read.
 */
export function parseCssColor(value: string): RgbaColor {
  const cached = cache.get(value);
  if (cached) return cached;

  const context = getProbe();
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  const color = {
    r: r / CHANNEL_MAX,
    g: g / CHANNEL_MAX,
    b: b / CHANNEL_MAX,
    a: a / CHANNEL_MAX,
  };
  cache.set(value, color);
  return color;
}
