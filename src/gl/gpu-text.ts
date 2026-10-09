import { defineFamily } from "lettra/three";
import { createAsciiLogo, type AsciiLogo, type AsciiPlacement } from "@/gl/ascii-logo";
import { createBoxLayer } from "@/gl/box-layer";
import { collectBoxRuns } from "@/gl/box-runs";
import { parseCssColor } from "@/gl/css-color";
import { FONT_SOURCES } from "@/gl/font-metrics";
import { INITIAL_BOOT_PROGRESS, type BootProgress, type RenderBackend } from "@/gl/boot-progress";
import type { GlitchRect } from "@/gl/crt";
import { createStage } from "@/gl/stage";
import {
  REDUCED_MOTION_QUERY,
  WINDOW_OPEN_MS,
  prefersReducedMotion,
} from "@/terminal/window-motion";
import { createTextLayer } from "@/gl/text-layer";
import { collectTextRuns } from "@/gl/text-runs";

const ASCII_SELECTOR = "[data-gl-ascii]";
/** Element whose `data-gl-window` value changes when a window opens or swaps content. */
const WINDOW_SELECTOR = "[data-gl-window]";
const NO_REGION = { left: 0, top: 0, right: 0, bottom: 0 } as const;
/** The logo glitches on its own now and then: a short burst at random gaps. */
const LOGO_GLITCH = { minGapMs: 4000, maxGapMs: 9000, durationMs: 280 } as const;

function randomGap(): number {
  return LOGO_GLITCH.minGapMs + Math.random() * (LOGO_GLITCH.maxGapMs - LOGO_GLITCH.minGapMs);
}

/** 0 → peak → 0 over t in [0, 1]; 0 outside it. */
function burstEnvelope(t: number): number {
  return t >= 0 && t <= 1 ? Math.sin(Math.PI * t) : 0;
}

function toViewportFractions(rect: DOMRect): GlitchRect {
  return {
    left: rect.left / window.innerWidth,
    top: rect.top / window.innerHeight,
    right: rect.right / window.innerWidth,
    bottom: rect.bottom / window.innerHeight,
  };
}
/** The tube's power-on; content effects start as the picture opens. */
const POWER_ON_MS = 1400;
const CONTENT_REVEAL_DELAY_MS = 450;
/** DOM events that change what is painted without a mutation: typing, caret, focus. */
const RESYNC_EVENTS = ["input", "keyup", "focusin", "focusout"] as const;
/** Paint order: boxes under glyphs, like the DOM's backgrounds under text. */
const RENDER_ORDER = { boxes: 0, glyphs: 1 } as const;

export interface GpuTextSession {
  backend: RenderBackend;
  dispose(): void;
}


function measureAscii(pre: HTMLElement): AsciiPlacement | null {
  const textNode = pre.firstChild;
  if (!(textNode instanceof Text)) return null;

  const firstLine = textNode.data.split("\n")[0];
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, firstLine.length);
  const lineWidth = range.getBoundingClientRect().width;
  range.detach();

  const style = getComputedStyle(pre);
  const rect = pre.getBoundingClientRect();
  return {
    x: rect.left + parseFloat(style.paddingLeft) - pre.scrollLeft + window.scrollX,
    y: rect.top + parseFloat(style.paddingTop) + window.scrollY,
    cellWidth: lineWidth / Array.from(firstLine).length,
    cellHeight: parseFloat(style.lineHeight),
  };
}

/** Places the logo and returns its drawn area as viewport fractions. */
function syncLogo(logo: AsciiLogo, pre: HTMLElement): GlitchRect {
  const placement = measureAscii(pre);
  if (!placement) return NO_REGION;
  logo.place(placement);
  logo.setColor(parseCssColor(getComputedStyle(pre).color));

  // the art's own cells, not the <pre>, which stretches to the column width
  const left = placement.x - window.scrollX;
  const top = placement.y - window.scrollY;
  return toViewportFractions(
    new DOMRect(left, top, logo.columns * placement.cellWidth, logo.rows * placement.cellHeight),
  );
}

/**
 * Takes over drawing every glyph under `root`: DOM keeps layout, semantics
 * and input, lettra draws the text on a WebGPU (or WebGL2) canvas on top.
 * Resolves once the first frame is compiled, reporting each stage on the way.
 */
export async function startGpuText(
  root: HTMLElement,
  onProgress: (progress: BootProgress) => void = () => {},
): Promise<GpuTextSession> {
  let progress = INITIAL_BOOT_PROGRESS;
  const report = (next: Partial<BootProgress>) => {
    progress = { ...progress, ...next };
    onProgress(progress);
  };

  const family = defineFamily({ src: FONT_SOURCES });
  const screenColor = getComputedStyle(document.body).backgroundColor;
  const loadFonts = FONT_SOURCES.map(({ weight }) =>
    family.load({ weight }).then(() => report({ fontsLoaded: progress.fontsLoaded + 1 })),
  );
  const createDevice = createStage(document.body, screenColor).then((created) => {
    report({ backend: created.backend });
    return created;
  });
  const [stage] = await Promise.all([createDevice, ...loadFonts]);
  family.warmup(stage.renderer);

  const boxes = createBoxLayer();
  boxes.mesh.renderOrder = RENDER_ORDER.boxes;
  stage.content.add(boxes.mesh);

  const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const applyMotion = () => {
    stage.setMotion(!motionQuery.matches);
    boxes.setMotion(!motionQuery.matches);
  };
  applyMotion();
  motionQuery.addEventListener("change", applyMotion);

  const textLayer = createTextLayer({
    group: stage.content,
    family,
    renderOrder: RENDER_ORDER.glyphs,
    reducedMotion: prefersReducedMotion,
  });

  const asciiSource = root.querySelector<HTMLElement>(ASCII_SELECTOR);
  const logo = asciiSource ? createAsciiLogo(asciiSource.textContent ?? "") : null;
  if (logo) {
    logo.mesh.renderOrder = RENDER_ORDER.glyphs;
    stage.content.add(logo.mesh);
  }

  // window glitch: restarts whenever the window appears or shows a new command
  let windowKey: string | null = null;
  let windowGlitchStart = Number.NEGATIVE_INFINITY;
  let windowRect: GlitchRect = NO_REGION;
  const trackWindow = () => {
    const element = root.querySelector<HTMLElement>(WINDOW_SELECTOR);
    const key = element?.dataset.glWindow ?? null;
    if (key && key !== windowKey) windowGlitchStart = performance.now();
    windowKey = key;
    if (!element) {
      windowRect = NO_REGION;
      return;
    }
    windowRect = toViewportFractions(element.getBoundingClientRect());
  };

  /** Glitch damage for an opening window: full at open, decaying to zero. */
  const windowGlitch = (now: number): number => {
    if (prefersReducedMotion()) return 0;
    const progress = (now - windowGlitchStart) / WINDOW_OPEN_MS;
    return Math.max(0, 1 - progress) ** 2;
  };

  // logo glitch: a short burst every few seconds, at random
  let logoRect: GlitchRect = NO_REGION;
  let logoBurstStart = Number.NEGATIVE_INFINITY;
  let nextLogoBurst = performance.now() + randomGap();

  const sync = () => {
    trackWindow();
    boxes.sync(collectBoxRuns(root));
    textLayer.sync(collectTextRuns(root), performance.now());
    if (logo && asciiSource) logoRect = syncLogo(logo, asciiSource);
  };

  let pendingFrame = 0;
  const scheduleSync = () => {
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      sync();
    });
  };

  const mutations = new MutationObserver(scheduleSync);
  mutations.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  const resizes = new ResizeObserver(scheduleSync);
  resizes.observe(root);
  for (const type of RESYNC_EVENTS) root.addEventListener(type, scheduleSync);
  document.addEventListener("selectionchange", scheduleSync);
  // scroll does not bubble; capture catches the panel's inner scroll too
  document.addEventListener("scroll", scheduleSync, { capture: true });
  void document.fonts.ready.then(scheduleSync);

  sync();
  await stage.compile();
  report({ shadersReady: true });

  // the boot effects play now that something can see them
  const powerOnStart = performance.now();
  const revealAt = powerOnStart + (prefersReducedMotion() ? 0 : CONTENT_REVEAL_DELAY_MS);
  textLayer.replayDecode(revealAt);

  if (process.env.NODE_ENV === "development") {
    Object.assign(window, {
      __gpuText: { stage, runs: () => collectTextRuns(root), boxes: () => collectBoxRuns(root) },
    });
  }
  stage.start(() => {
    const now = performance.now();
    textLayer.update(now);
    const power = prefersReducedMotion() ? 1 : (now - powerOnStart) / POWER_ON_MS;
    stage.setPower(Math.min(1, power));
    stage.setRegionGlitch("window", windowRect, windowGlitch(now));
    if (now >= nextLogoBurst) {
      logoBurstStart = now;
      nextLogoBurst = now + randomGap();
    }
    const logoDamage = prefersReducedMotion() ? 0 : burstEnvelope((now - logoBurstStart) / LOGO_GLITCH.durationMs);
    stage.setRegionGlitch("logo", logoRect, logoDamage);
  });

  return {
    backend: stage.backend,
    dispose() {
      cancelAnimationFrame(pendingFrame);
      mutations.disconnect();
      resizes.disconnect();
      for (const type of RESYNC_EVENTS) root.removeEventListener(type, scheduleSync);
      document.removeEventListener("selectionchange", scheduleSync);
      document.removeEventListener("scroll", scheduleSync, { capture: true });
      motionQuery.removeEventListener("change", applyMotion);
      boxes.dispose();
      textLayer.dispose();
      logo?.dispose();
      stage.dispose();
      family.dispose();
    },
  };
}
