import { RenderPipeline } from "three/webgpu";
import type { Camera, Node, Scene, WebGPURenderer } from "three/webgpu";
import {
  Fn,
  abs,
  clamp,
  dot,
  exp,
  float,
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
  /** UV shift of red/blue at the screen edge; ~1px on a 1080p tube. */
  aberration: 0.004,
  scanlinePeriodPx: 3,
  scanlineDepth: 0.22,
  maskDepth: 0.07,
  vignette: 0.32,
  noise: 0.035,
  flicker: 0.012,
  rollSpeed: 0.09,
  rollGain: 0.035,
  bloomStrength: 0.35,
  bloomRadius: 0.4,
  bloomThreshold: 0.12,
} as const;

const APERTURE_COLUMNS = 3;

type Vec2Node = Node<"vec2">;
const FLICKER_HZ = 57;
/** Large enough that consecutive frames reseed every pixel. */
const GRAIN_TIME_SEED = 7919;

export interface CrtPipeline {
  render(): void;
  setMotion(enabled: boolean): void;
  dispose(): void;
}

export function createCrtPipeline(renderer: WebGPURenderer, scene: Scene, camera: Camera): CrtPipeline {
  const motion = uniform(1);
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
    const spread = fromCenter.mul(SETTINGS.aberration);

    const color = vec3(
      sceneColor.sample(coord.add(spread)).r,
      sceneColor.sample(coord).g,
      sceneColor.sample(coord.sub(spread)).b,
    ).toVar();

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
    setMotion(enabled) {
      motion.value = enabled ? 1 : 0;
    },
    dispose() {
      glow.dispose();
      pipeline.dispose();
    },
  };
}
