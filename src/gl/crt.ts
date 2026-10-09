import { RenderPipeline } from "three/webgpu";
import type { Camera, Node, Scene, WebGPURenderer } from "three/webgpu";
import {
  Fn,
  abs,
  clamp,
  dot,
  exp,
  float,
  floor,
  fract,
  hash,
  length,
  max,
  mix,
  mod,
  pass,
  screenCoordinate,
  screenSize,
  sin,
  smoothstep,
  step,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

/**
 * Tube look, tuned for legibility first: the terminal has to stay readable
 * at 13px, so every term is a nudge, not a filter.
 */
const SETTINGS = {
  curvature: 0.045,
  /** >1 shrinks the picture inside the glass so the edges clear the bezel. */
  overscan: 1.05,
  cornerRadius: 0.035,
  /** UV shift of red/blue per unit from centre: subtle at the corners, none in the middle. */
  aberration: 0.0016,
  scanlinePeriodPx: 3,
  scanlineDepth: 0.22,
  maskDepth: 0.07,
  vignette: 0.32,
  noise: 0.035,
  flicker: 0.012,
  rollSpeed: 0.09,
  rollGain: 0.035,
  bloomStrength: 0.22,
  bloomRadius: 0.4,
  /** Above mid-grey: white glows without washing out the blue next to it. */
  bloomThreshold: 0.45,
} as const;

const APERTURE_COLUMNS = 3;

/** The lit area: a dot becomes a line that opens like a curtain. */
const CURTAIN = {
  /** Over a 1.4 s power-on: line in ~55 ms, curtain open by ~220 ms. */
  lineEnd: 0.04,
  openStart: 0.03,
  openEnd: 0.16,
  minBeam: 0.0015,
  /** Soft edge of the lit area, in UV. */
  edge: 0.008,
  lineThickness: 0.003,
  edgeGlowWidth: 0.006,
  beamGain: 0.9,
  /** Cold blue-white of a fresh beam. */
  beamTint: [0.82, 0.9, 1] as [number, number, number],
} as const;

/** Digital-ish damage layered over the power-on, gone once sync locks. */
const GLITCH = {
  /** How often the torn bands are re-rolled. */
  fps: 14,
  /** Horizontal bands across the screen. */
  bands: 36,
  /** Share of bands torn at the start (fades with lock). */
  tornShare: 0.35,
  /** Max sideways shift of a torn band, in UV. */
  tearReach: 0.12,
  /** Extra red/blue split on torn bands, in UV. */
  split: 0.01,
  /** Chance per frame of a signal dropout at the start. */
  dropoutShare: 0.3,
  dropoutLevel: 0.35,
  /** Static noise strength at the start. */
  static: 0.09,
} as const;

/** Power-on timeline in `power` units (0..1) and its exposure. */
const POWER_ON = {
  /** Brightness ramps from black to full by here. */
  warmEnd: 0.45,
  /** Faint grey glow of the freshly charged face, peaking here. */
  glowEnd: 0.12,
  glow: 0.06,
  /** The picture sharpens between these two. */
  focusStart: 0.15,
  focusEnd: 0.6,
  /** Blur reach in UV while out of focus. */
  blur: 0.006,
  /** Sync locks between these two: glitch and jitter fade out over it. */
  lockStart: 0.12,
  lockEnd: 0.65,
  /** Horizontal line jitter before lock. */
  jitter: 0.012,
  jitterRowPx: 3,
  jitterHz: 60,
  /** One brightness overshoot as it locks, then it settles. */
  overshoot: 0.18,
} as const;

type Vec2Node = Node<"vec2">;
const FLICKER_HZ = 57;
/** Large enough that consecutive frames reseed every pixel. */
const GRAIN_TIME_SEED = 7919;

export interface CrtPipeline {
  render(): void;
  setMotion(enabled: boolean): void;
  /** 0 = tube off (black), 1 = picture settled. Drive it to play the power-on. */
  setPower(value: number): void;
  dispose(): void;
}

export function createCrtPipeline(renderer: WebGPURenderer, scene: Scene, camera: Camera): CrtPipeline {
  const motion = uniform(1);
  const power = uniform(0);
  const sceneColor = pass(scene, camera).getTextureNode("output");

  /** Convex tube: pushes the centre out, edges stay pinned to the frame. */
  const barrel = (coord: Vec2Node): Vec2Node => {
    const centered = coord.sub(0.5).mul(2);
    const bulge = float(1).sub(dot(centered, centered).mul(SETTINGS.curvature));
    const corner = float(1).sub(SETTINGS.curvature * 2);
    return centered.div(bulge).mul(corner).mul(SETTINGS.overscan).mul(0.5).add(0.5);
  };

  /** Rounded-rect mask of the glass, soft over ~1px. */
  const glass = (coord: Vec2Node) => {
    const fromCenter = abs(coord.sub(0.5)).sub(float(0.5 - SETTINGS.cornerRadius));
    const outside = length(max(fromCenter, vec2(0))).sub(SETTINGS.cornerRadius);
    return smoothstep(float(0.002), float(-0.002), outside);
  };

  const tube = Fn(() => {
    const coord = barrel(uv());
    const fromCenter = coord.sub(0.5);

    // power-on, old-TV style with glitch: a dot stretches into a scan line
    // that opens from the centre like a curtain. Inside it the picture warms
    // up out of focus, with torn bands, jitter and dropouts until sync locks,
    // then sharpens and overshoots once before settling. The picture itself
    // is never scaled or scrolled; only the lit area grows.
    const warm = smoothstep(0, POWER_ON.warmEnd, power);
    const unfocused = float(1).sub(smoothstep(POWER_ON.focusStart, POWER_ON.focusEnd, power));
    const unlocked = float(1).sub(smoothstep(POWER_ON.lockStart, POWER_ON.lockEnd, power));
    const scanRow = floor(coord.y.mul(screenSize.y).div(POWER_ON.jitterRowPx));
    const jitter = hash(scanRow.add(floor(time.mul(POWER_ON.jitterHz))))
      .sub(0.5)
      .mul(POWER_ON.jitter)
      .mul(unlocked);
    // glitch: while unlocked, random horizontal bands tear sideways with a
    // colour split, re-rolled several times a second and thinning out
    const glitchFrame = floor(time.mul(GLITCH.fps));
    const band = floor(coord.y.mul(GLITCH.bands));
    const isTorn = step(float(1).sub(unlocked.mul(GLITCH.tornShare)), hash(band.add(glitchFrame.mul(31.7))));
    const tear = hash(band.mul(7.13).add(glitchFrame)).sub(0.5).mul(GLITCH.tearReach).mul(isTorn);
    const base = vec2(coord.x.add(jitter).add(tear), coord.y);

    const spread = fromCenter
      .mul(SETTINGS.aberration)
      .add(vec2(isTorn.mul(unlocked).mul(GLITCH.split), 0));
    const tap = (offset: Vec2Node) => {
      const at = base.add(offset);
      return vec3(sceneColor.sample(at.add(spread)).r, sceneColor.sample(at).g, sceneColor.sample(at.sub(spread)).b);
    };
    // five-tap cross blur that collapses to a single tap once in focus
    const reach = unfocused.mul(POWER_ON.blur);
    const color = tap(vec2(0))
      .mul(2)
      .add(tap(vec2(reach, 0)))
      .add(tap(vec2(reach.negate(), 0)))
      .add(tap(vec2(0, reach)))
      .add(tap(vec2(0, reach.negate())))
      .div(6)
      .toVar();

    const overshoot = smoothstep(POWER_ON.lockStart, POWER_ON.lockEnd, power)
      .mul(float(1).sub(smoothstep(POWER_ON.lockEnd, 1, power)))
      .mul(POWER_ON.overshoot);
    const chargeGlow = smoothstep(0, POWER_ON.glowEnd, power)
      .mul(float(1).sub(smoothstep(POWER_ON.glowEnd, POWER_ON.focusEnd, power)))
      .mul(POWER_ON.glow);

    // signal dropouts: whole frames sag, and static bursts over the picture
    const dropout = step(float(1).sub(unlocked.mul(GLITCH.dropoutShare)), hash(glitchFrame.mul(13.31)));
    const sag = mix(float(1), float(GLITCH.dropoutLevel), dropout);
    const pixel = screenCoordinate.x.add(screenCoordinate.y.mul(screenSize.x));
    // squared so the snow clears well before the tearing does
    const staticBurst = hash(pixel.add(glitchFrame.mul(GRAIN_TIME_SEED))).mul(unlocked.pow(2)).mul(GLITCH.static);

    // the curtain: lit area grows from the centre line
    const lineWidth = max(smoothstep(0, CURTAIN.lineEnd, power), CURTAIN.minBeam);
    const opening = smoothstep(CURTAIN.openStart, CURTAIN.openEnd, power);
    const litHalfHeight = mix(float(CURTAIN.minBeam), float(0.5), opening);
    const distanceX = abs(fromCenter.x);
    const distanceY = abs(fromCenter.y);
    const litX = smoothstep(lineWidth.mul(0.5), lineWidth.mul(0.5).sub(CURTAIN.edge), distanceX);
    const litY = smoothstep(litHalfHeight.add(CURTAIN.edge), litHalfHeight, distanceY);
    const scanBeam = exp(distanceY.div(CURTAIN.lineThickness).pow(2).negate())
      .mul(float(1).sub(opening))
      .mul(litX);
    // brightest mid-opening, gone once the curtain is fully open
    const curtainEdge = exp(distanceY.sub(litHalfHeight).div(CURTAIN.edgeGlowWidth).pow(2).negate())
      .mul(opening.mul(float(1).sub(opening)).mul(4))
      .mul(litX);

    const picture = color.mul(warm).mul(sag).mul(overshoot.add(1)).add(chargeGlow).add(staticBurst);
    color.assign(
      picture
        .mul(litX.mul(litY))
        .add(vec3(...CURTAIN.beamTint).mul(scanBeam.add(curtainEdge).mul(CURTAIN.beamGain))),
    );

    const pixelY = coord.y.mul(screenSize.y);
    const scanline = sin(pixelY.mul(Math.PI / SETTINGS.scanlinePeriodPx)).mul(0.5).add(0.5);
    color.mulAssign(float(1).sub(scanline.mul(SETTINGS.scanlineDepth)));

    const column = mod(screenCoordinate.x, float(APERTURE_COLUMNS));
    const aperture = vec3(
      smoothstep(float(1), float(0), column),
      smoothstep(float(0), float(1), column).mul(smoothstep(float(2), float(1), column)),
      smoothstep(float(1), float(2), column),
    );
    color.mulAssign(mix(vec3(1), aperture.mul(0.5).add(0.75), float(SETTINGS.maskDepth)));

    const rollBand = fract(coord.y.mul(0.5).sub(time.mul(SETTINGS.rollSpeed))).sub(0.5).mul(10);
    const roll = exp(rollBand.mul(rollBand).negate()).mul(SETTINGS.rollGain).mul(motion);
    const flicker = sin(time.mul(FLICKER_HZ)).mul(SETTINGS.flicker).mul(motion);
    // hash takes a scalar seed: flatten the pixel to its row-major index
    const pixelIndex = screenCoordinate.x.add(screenCoordinate.y.mul(screenSize.x));
    const grain = hash(pixelIndex.add(fract(time).mul(motion).mul(GRAIN_TIME_SEED)))
      .sub(0.5)
      .mul(SETTINGS.noise);
    color.addAssign(roll.add(grain));
    color.mulAssign(float(1).add(flicker));

    const falloff = float(1).sub(dot(fromCenter, fromCenter).mul(SETTINGS.vignette * 4));
    color.mulAssign(clamp(falloff, 0, 1));

    // the picture ends, with rounded corners, where the scene's UVs leave 0..1
    return vec4(color.mul(glass(coord)), 1);
  });

  const picture = tube();
  const glow = bloom(picture, SETTINGS.bloomStrength, SETTINGS.bloomRadius, SETTINGS.bloomThreshold);

  const pipeline = new RenderPipeline(renderer);
  pipeline.outputNode = picture.add(glow);

  return {
    render() {
      pipeline.render();
    },
    setPower(value) {
      power.value = value;
    },
    setMotion(enabled) {
      motion.value = enabled ? 1 : 0;
    },
    dispose() {
      glow.dispose();
      pipeline.dispose();
    },
  };
}
