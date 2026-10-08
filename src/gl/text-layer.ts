import type { Group } from "three/webgpu";
import { SRGBColorSpace } from "three/webgpu";
import { createText, scramble } from "lettra/three";
import type { FontFamily, LoadedVariant, ScrambleEffect, TextHandle } from "lettra/three";
import { parseCssColor } from "@/gl/css-color";
import type { TextRun } from "@/gl/text-runs";

/** Glyphs the decode effect cycles through: same ink box in a mono face. */
const SCRAMBLE_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/";
const SCRAMBLE_RATE = 24;
const DECODE_DURATION_MS = 360;
const DECODE_STAGGER_MS = 8;
const DECODE_MAX_DELAY_MS = 280;

interface DecodeTween {
  start: number;
  duration: number;
}

interface LiveText {
  handle: TextHandle<ScrambleEffect>;
  run: TextRun;
  weight: number;
  decode: DecodeTween | null;
}

export interface TextLayerOptions {
  group: Group;
  family: FontFamily;
  renderOrder: number;
  reducedMotion: () => boolean;
}

export interface TextLayer {
  sync(runs: readonly TextRun[], now: number): void;
  update(now: number): void;
  dispose(): void;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function resolveVariant(family: FontFamily, weight: number): LoadedVariant {
  const variant = family.get({ weight });
  if (!variant) throw new Error(`Roboto Mono ${weight} is not loaded`);
  return variant;
}

/** Baked px per CSS px: lettra lays out in the atlas' units. */
function layoutScale(variant: LoadedVariant, run: TextRun): number {
  return run.fontSize / variant.font.size;
}

function applyRun(live: LiveText, run: TextRun, variant: LoadedVariant): void {
  const { handle } = live;
  const scale = layoutScale(variant, run);
  const textChanged = live.run.text !== run.text || live.run.letterSpacing !== run.letterSpacing;
  if (textChanged) handle.setText(run.text, { letterSpacing: run.letterSpacing / scale, mode: "nowrap" });

  handle.mesh.scale.setScalar(scale);
  handle.mesh.position.set(run.x, -run.baseline, 0);

  const color = parseCssColor(run.color);
  handle.uniforms.fill.value.setRGB(color.r, color.g, color.b, SRGBColorSpace);
  handle.uniforms.opacity.value = color.a;
  live.run = run;
}

/**
 * Mirrors DOM text runs as lettra meshes. Runs are matched by key, so a line
 * that only moved keeps its mesh; lines that appear decode in through the
 * scramble effect.
 */
export function createTextLayer({ group, family, renderOrder, reducedMotion }: TextLayerOptions): TextLayer {
  const live = new Map<string, LiveText>();

  const create = (run: TextRun, decode: DecodeTween | null): LiveText => {
    const variant = resolveVariant(family, run.fontWeight);
    const scale = layoutScale(variant, run);
    const effect = scramble({ font: variant.font, chars: SCRAMBLE_POOL, rate: SCRAMBLE_RATE });
    const handle = createText({
      variant,
      text: run.text,
      layout: { letterSpacing: run.letterSpacing / scale, mode: "nowrap" },
      geometry: { anchor: "baseline-left", scale: 1 },
      material: { effect },
    });
    handle.mesh.frustumCulled = false;
    handle.mesh.renderOrder = renderOrder;
    handle.uniforms.scramble.value = decode ? 1 : 0;
    group.add(handle.mesh);

    const entry: LiveText = { handle, run, weight: variant.weight, decode };
    applyRun(entry, run, variant);
    return entry;
  };

  const remove = (key: string, entry: LiveText) => {
    group.remove(entry.handle.mesh);
    entry.handle.dispose({ map: false });
    live.delete(key);
  };

  return {
    sync(runs, now) {
      const seen = new Set<string>();
      let created = 0;

      for (const run of runs) {
        seen.add(run.key);
        const existing = live.get(run.key);
        const variant = resolveVariant(family, run.fontWeight);

        if (existing && existing.weight === variant.weight) {
          applyRun(existing, run, variant);
          continue;
        }
        if (existing) remove(run.key, existing);

        const delay = Math.min(created * DECODE_STAGGER_MS, DECODE_MAX_DELAY_MS);
        const decode = reducedMotion() ? null : { start: now + delay, duration: DECODE_DURATION_MS };
        live.set(run.key, create(run, decode));
        created++;
      }

      for (const [key, entry] of live) {
        if (!seen.has(key)) remove(key, entry);
      }
    },

    update(now) {
      for (const entry of live.values()) {
        if (!entry.decode) continue;
        const progress = Math.min(1, Math.max(0, (now - entry.decode.start) / entry.decode.duration));
        entry.handle.uniforms.scramble.value = 1 - easeOutCubic(progress);
        if (progress === 1) entry.decode = null;
      }
    },

    dispose() {
      for (const [key, entry] of live) remove(key, entry);
    },
  };
}
