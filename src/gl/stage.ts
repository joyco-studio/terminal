import { Color, Group, OrthographicCamera, SRGBColorSpace, Scene, WebGPURenderer } from "three/webgpu";
import { parseCssColor } from "@/gl/css-color";
import { createCrtPipeline } from "@/gl/crt";

const MAX_PIXEL_RATIO = 2;
const CAMERA_DEPTH = 10;

import type { RenderBackend } from "@/gl/boot-progress";

export type { RenderBackend };

export interface Stage {
  renderer: WebGPURenderer;
  /** Children are placed in document px, y negated (y-up world). */
  content: Group;
  backend: RenderBackend;
  /** Compiles every pipeline in the scene plus the CRT pass, off the first frame. */
  compile(): Promise<void>;
  start(onFrame: (now: number) => void): void;
  /** Animated tube artefacts (flicker, roll, grain) follow reduced motion. */
  setMotion(enabled: boolean): void;
  setPower(value: number): void;
  dispose(): void;
}

/** Swallows pointer input so the DOM underneath keeps keyboard focus. */
function blockPointer(event: Event): void {
  event.preventDefault();
}

const POINTER_EVENTS = ["pointerdown", "mousedown", "click", "dblclick", "contextmenu"] as const;

/** Fixed over everything, owning the pointer (and hiding it). */
const CANVAS_STYLE = {
  position: "fixed",
  inset: "0",
  zIndex: "10",
  pointerEvents: "auto",
  cursor: "none",
} satisfies Partial<CSSStyleDeclaration>;

/**
 * Opaque fullscreen canvas over the page, orthographic in CSS px, drawn
 * through the CRT pipeline. It covers the DOM entirely: the DOM still owns
 * layout, focus and the accessibility tree, the canvas owns every pixel and
 * eats the pointer, so the terminal is keyboard-only by construction.
 * Scrolling slides `content` instead of re-measuring the DOM.
 */
export async function createStage(canvasParent: HTMLElement, screenColor: string): Promise<Stage> {
  const renderer = new WebGPURenderer({
    antialias: true,
    alpha: true,
    forceWebGL: new URLSearchParams(window.location.search).has("forceWebGL"),
  });
  await renderer.init();
  const screen = parseCssColor(screenColor);
  renderer.setClearColor(new Color().setRGB(screen.r, screen.g, screen.b, SRGBColorSpace), 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, CANVAS_STYLE);
  canvasParent.append(canvas);
  for (const type of POINTER_EVENTS) canvas.addEventListener(type, blockPointer);

  const camera = new OrthographicCamera(0, 1, 0, -1, -CAMERA_DEPTH, CAMERA_DEPTH);
  const scene = new Scene();
  const content = new Group();
  scene.add(content);

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.right = width;
    camera.bottom = -height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);
  const crt = createCrtPipeline(renderer, scene, camera);

  const backend: RenderBackend =
    "isWebGPUBackend" in renderer.backend && renderer.backend.isWebGPUBackend ? "webgpu" : "webgl2";

  return {
    renderer,
    content,
    backend,
    async compile() {
      await renderer.compileAsync(scene, camera);
      crt.render();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    },
    start(onFrame) {
      renderer.setAnimationLoop((now: number) => {
        onFrame(now);
        content.position.y = window.scrollY;
        content.position.x = -window.scrollX;
        crt.render();
      });
    },
    setMotion: crt.setMotion,
    setPower: crt.setPower,
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      for (const type of POINTER_EVENTS) canvas.removeEventListener(type, blockPointer);
      crt.dispose();
      canvas.remove();
      renderer.dispose();
    },
  };
}
