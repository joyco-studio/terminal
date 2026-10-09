import { BAKED_WEIGHTS } from "@/gl/font-metrics";

export type RenderBackend = "webgpu" | "webgl2";

/** What the GPU boot has finished so far. Free of three imports on purpose:
 * the loader reads it before the GL bundle has even arrived. */
export interface BootProgress {
  backend: RenderBackend | null;
  fontsLoaded: number;
  fontsTotal: number;
  shadersReady: boolean;
}

export const INITIAL_BOOT_PROGRESS: BootProgress = {
  backend: null,
  fontsLoaded: 0,
  fontsTotal: BAKED_WEIGHTS.length,
  shadersReady: false,
};

/** Share of the bar each stage owns; fonts dominate the wait. */
const STAGE_WEIGHT = { device: 0.2, fonts: 0.6, shaders: 0.2 } as const;

/** 0..1 for the progress bar. */
export function bootRatio(progress: BootProgress): number {
  const device = progress.backend ? STAGE_WEIGHT.device : 0;
  const fonts = (progress.fontsLoaded / progress.fontsTotal) * STAGE_WEIGHT.fonts;
  const shaders = progress.shadersReady ? STAGE_WEIGHT.shaders : 0;
  return device + fonts + shaders;
}
