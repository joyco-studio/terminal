import type { LabExperiment } from "@/content/lab";

/**
 * Snapshot of the Lab registry, used when GitHub cannot be reached.
 * Regenerate from LAB_REGISTRY_URL when it drifts far from the live list.
 */
export const LAB_FALLBACK: readonly LabExperiment[] = [
  {
    slug: "spider-sense",
    title: "Spider Sense",
    href: "https://joyco-sense-tsl.vercel.app/",
    date: "2026-08-28",
    tags: ["webgl", "threejs", "TSL", "shader", "post-processing"],
  },
  {
    slug: "knight-grass",
    title: "Knight Grass",
    href: "https://knight-grass.vercel.app/",
    date: "2026-05-01",
    tags: ["react-three-fiber", "threejs", "glsl", "shaders", "rapier", "procedural", "grass", "third-person"],
  },
  {
    slug: "sdf-svg-playground",
    title: "SDF SVG Playground",
    href: "https://logo-shader-experiment.vercel.app/",
    date: "2026-04-27",
    tags: ["3d", "sdf", "threejs", "webgpu"],
  },
  {
    slug: "scene-scissor-clip",
    title: "Scene Scissor Clip",
    href: "https://scene-scissor-clip-pi.vercel.app/",
    date: "2026-03-15",
    tags: ["webgl"],
  },
  {
    slug: "dot-interactive",
    title: "Dot Interactive",
    href: "https://laboratory-dot-interactive.vercel.app/",
    date: "2026-03-12",
    tags: ["webgl", "glsl", "shader", "interactive", "mouse", "halftone", "dots", "pattern", "post-processing"],
  },
  {
    slug: "msdf-text-fluidsim",
    title: "MSDF Text & Fluidsim",
    href: "https://laboratory-msdf.vercel.app/",
    date: "2026-03-12",
    tags: ["three.js", "glsl", "shader", "text", "fluid simulation", "msdf", "typography", "webgl"],
  },
  {
    slug: "bichromatic-grain-post-pass",
    title: "Bichromatic grain post pass",
    href: "https://laboratory-bichromatic-grain.vercel.app/",
    date: "2026-03-12",
    tags: ["post-processing", "shader", "glsl", "duotone", "grain", "texture", "risograph", "webgl", "creative tools"],
  },
  {
    slug: "joyco-miami",
    title: "Joyco Miami",
    href: "https://miami.joyco.studio",
    date: "2026-03-11",
    tags: ["@react-three/fiber", "three.js", "susano"],
  },
];
