import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicNodeMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three/webgpu";
import { float, instancedBufferAttribute, smoothstep, uniform } from "three/tsl";
import { asciiToCells } from "@/gl/ascii-cells";
import type { RgbaColor } from "@/gl/css-color";

/** Width of the soft edge on the left-to-right reveal, in reveal units. */
const REVEAL_FEATHER = 0.08;

export interface AsciiLogo {
  mesh: InstancedMesh;
  /** 0 hidden → 1 fully drawn, sweeping left to right by column. */
  reveal: { value: number };
  place(placement: AsciiPlacement): void;
  setColor(color: RgbaColor): void;
  dispose(): void;
}

export interface AsciiPlacement {
  /** Document px of the art's top-left cell. */
  x: number;
  y: number;
  cellWidth: number;
  cellHeight: number;
}

/** One instanced quad per block or box-drawing stroke, drawn in one call. */
export function createAsciiLogo(art: string): AsciiLogo {
  const { rects, columns } = asciiToCells(art);

  const geometry = new PlaneGeometry(1, 1);
  // origin at the quad's top-left so instance transforms read like CSS boxes
  geometry.translate(0.5, -0.5, 0);

  const revealOrder = new Float32Array(rects.map((rect) => rect.column / columns));
  const reveal = uniform(0);
  const tint = uniform(new Color(1, 1, 1));
  const alpha = uniform(1);

  const order = instancedBufferAttribute<"float">(revealOrder, "float");
  const sweep = reveal.mul(float(1 + REVEAL_FEATHER));
  const material = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  material.colorNode = tint;
  material.opacityNode = smoothstep(order, order.add(REVEAL_FEATHER), sweep).mul(alpha);

  const mesh = new InstancedMesh(geometry, material, rects.length);
  const matrix = new Matrix4();
  rects.forEach((rect, index) => {
    matrix.makeScale(rect.width, rect.height, 1).setPosition(rect.x, -rect.y, 0);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;

  return {
    mesh,
    reveal,
    place({ x, y, cellWidth, cellHeight }) {
      mesh.position.set(x, -y, 0);
      mesh.scale.set(cellWidth, cellHeight, 1);
    },
    setColor(color) {
      tint.value.setRGB(color.r, color.g, color.b, SRGBColorSpace);
      alpha.value = color.a;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
