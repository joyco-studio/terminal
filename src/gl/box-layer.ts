import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicNodeMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Color,
} from "three/webgpu";
import {
  float,
  fract,
  instancedBufferAttribute,
  mod,
  positionWorld,
  select,
  step,
  time,
  uniform,
} from "three/tsl";
import type { BoxRun } from "@/gl/box-runs";

/** Upper bound on painted rects; dotted leaders are the bulk of it. */
const CAPACITY = 4096;
/** Matches the `diagonal-bg` utility: a 1px line every 16px. */
const HATCH_PERIOD = 16;
const HATCH_LINE = 1;
/** Block cursor blinks twice a second, on for half of each cycle. */
const CARET_BLINK_HZ = 1;

export interface BoxLayer {
  mesh: InstancedMesh;
  sync(boxes: readonly BoxRun[]): void;
  setMotion(enabled: boolean): void;
  dispose(): void;
}

/**
 * Every non-text paint (fills, borders, dots, rules, cursor, focus ring) as
 * one instanced draw. Patterns are resolved per fragment in TSL.
 */
export function createBoxLayer(): BoxLayer {
  const geometry = new PlaneGeometry(1, 1);
  geometry.translate(0.5, -0.5, 0);

  const colors = new InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4);
  const patterns = new InstancedBufferAttribute(new Float32Array(CAPACITY), 1);
  colors.setUsage(DynamicDrawUsage);
  patterns.setUsage(DynamicDrawUsage);

  const fill = instancedBufferAttribute<"vec4">(colors);
  const pattern = instancedBufferAttribute<"float">(patterns);
  const motion = uniform(1);

  // diagonal hatch in document space, so it scrolls with the page
  const diagonal = mod(positionWorld.x.add(positionWorld.y), float(HATCH_PERIOD));
  const hatch = step(diagonal, float(HATCH_LINE));
  const blinkOn = step(fract(time.mul(CARET_BLINK_HZ)), float(0.5));
  const caret = select(motion.greaterThan(0.5), blinkOn, float(1));
  const mask = select(
    pattern.lessThan(0.5),
    float(1),
    select(pattern.lessThan(1.5), hatch, caret),
  );

  const material = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  material.colorNode = fill.rgb;
  material.opacityNode = fill.a.mul(mask);

  const mesh = new InstancedMesh(geometry, material, CAPACITY);
  mesh.count = 0;
  mesh.frustumCulled = false;
  const matrix = new Matrix4();
  const color = new Color();

  return {
    mesh,
    sync(boxes) {
      const count = Math.min(boxes.length, CAPACITY);
      for (let index = 0; index < count; index++) {
        const box = boxes[index];
        matrix.makeScale(box.width, box.height, 1).setPosition(box.x, -box.y, 0);
        mesh.setMatrixAt(index, matrix);
        // the instanced attribute bypasses color management, so convert here
        color.setRGB(box.color.r, box.color.g, box.color.b, SRGBColorSpace);
        colors.setXYZW(index, color.r, color.g, color.b, box.color.a);
        patterns.setX(index, box.pattern);
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      colors.needsUpdate = true;
      patterns.needsUpdate = true;
      if (boxes.length > CAPACITY) console.warn(`box layer capped at ${CAPACITY} rects`);
    },
    setMotion(enabled) {
      motion.value = enabled ? 1 : 0;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}

