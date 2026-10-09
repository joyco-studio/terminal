import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicNodeMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three/webgpu";
import { uniform } from "three/tsl";
import { asciiToCells } from "@/gl/ascii-cells";
import type { RgbaColor } from "@/gl/css-color";

export interface AsciiLogo {
  mesh: InstancedMesh;
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
  const { rects } = asciiToCells(art);

  const geometry = new PlaneGeometry(1, 1);
  // origin at the quad's top-left so instance transforms read like CSS boxes
  geometry.translate(0.5, -0.5, 0);

  const tint = uniform(new Color(1, 1, 1));
  const alpha = uniform(1);
  const material = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  material.colorNode = tint;
  material.opacityNode = alpha;

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
